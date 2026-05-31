import { useState, useEffect, useCallback } from 'react';

/**
 * Robust phone-resilient hook for geolocation.
 * Includes auto-fallback to low accuracy (WiFi/Cell) if High Accuracy GPS times out.
 */
export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState('prompt'); // prompt | granted | denied

  const updatePermissionStatus = useCallback(async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermission(result.state);
        result.onchange = () => {
          setPermission(result.state);
        };
      } catch (e) {
        console.warn('Permissions query error:', e);
      }
    }
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      setLoading(false);
      const cached = localStorage.getItem('roadsos_last_location');
      if (cached) setLocation(JSON.parse(cached));
      return;
    }

    // Security warning for HTTP testing on actual phones
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setError('🔒 Location blocked on insecure HTTP. Please deploy to HTTPS (Vercel) to authorize GPS permissions.');
      setLoading(false);
      const cached = localStorage.getItem('roadsos_last_location');
      if (cached) setLocation(JSON.parse(cached));
      return;
    }

    setLoading(true);

    // Fast low-accuracy tower/network config (returns in < 1 sec)
    const towerOptions = {
      enableHighAccuracy: false,
      timeout: 2000,
      maximumAge: 5000
    };

    // Slow high-accuracy satellite GPS config
    const gpsOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 10000
    };

    let locationResolved = false;

    function handleResolvedLocation(pos, source) {
      console.log(`[Geolocation] Location resolved from ${source} (Accuracy: ${pos.coords.accuracy}m)`);
      const loc = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp
      };
      
      // Update location immediately if we haven't locked onto a more accurate source yet
      setLocation((current) => {
        if (current && current.accuracy <= loc.accuracy) {
          // Keep the existing location if it has better or equal accuracy
          return current;
        }
        return loc;
      });

      setLoading(false);
      setPermission('granted');
      setError(null);

      // Store in caches
      localStorage.setItem('roadsos_last_location', JSON.stringify(loc));
      localStorage.setItem('roadsos_last_loc', JSON.stringify({ lat: loc.lat, lon: loc.lon }));
      locationResolved = true;
    }

    // 1. Instantly trigger tower/network query for a rapid 1-second lock
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleResolvedLocation(pos, 'Network/Tower');
      },
      (err) => {
        console.warn(`[Geolocation] Fast network location query failed: ${err.message}`);
      },
      towerOptions
    );

    // 2. Simultaneously start high-accuracy GPS satellite query in the background
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleResolvedLocation(pos, 'GPS Satellites');
      },
      (err) => {
        console.warn(`[Geolocation] High-accuracy GPS query failed: ${err.message}`);
        // If we haven't resolved any location from network either, report the error and read from cache
        if (!locationResolved) {
          setError(err.message || 'Could not resolve location coordinates');
          setLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            setPermission('denied');
          }
          const cached = localStorage.getItem('roadsos_last_location');
          if (cached) setLocation(JSON.parse(cached));
        }
      },
      gpsOptions
    );
  }, []);

  useEffect(() => {
    updatePermissionStatus();
    getLocation();

    if (!navigator.geolocation) return;

    // Use phone-resilient watch settings
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp
        };
        setLocation(loc);
        setPermission('granted');
        setError(null);
        localStorage.setItem('roadsos_last_location', JSON.stringify(loc));
        localStorage.setItem('roadsos_last_loc', JSON.stringify({ lat: loc.lat, lon: loc.lon }));
      },
      (err) => {
        console.warn('Geolocation watch warning:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission('denied');
        }
      },
      { enableHighAccuracy: false, maximumAge: 15000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [getLocation, updatePermissionStatus]);

  return { location, error, loading, permission, refetch: getLocation };
}
