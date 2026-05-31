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

    // High accuracy configuration
    const highAccuracyOptions = {
      enableHighAccuracy: true,
      timeout: 8000, // Wait up to 8 seconds for high quality GPS sat lock
      maximumAge: 10000
    };

    // Low accuracy configuration (Auto fallback)
    const lowAccuracyOptions = {
      enableHighAccuracy: false,
      timeout: 15000, // Generous timeout for tower/WiFi triangulation
      maximumAge: 30000
    };

    function successCallback(pos) {
      const loc = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp
      };
      setLocation(loc);
      setLoading(false);
      setPermission('granted');
      setError(null);
      
      // Save location in BOTH cache keys to align with map page seamlessly
      localStorage.setItem('roadsos_last_location', JSON.stringify(loc));
      localStorage.setItem('roadsos_last_loc', JSON.stringify({ lat: loc.lat, lon: loc.lon }));
    }

    function failCallback(err) {
      console.warn(`GPS High Accuracy failed (Code ${err.code}): ${err.message}. Retrying with Low Accuracy...`);
      
      // Try low-accuracy triangulation fallback
      navigator.geolocation.getCurrentPosition(
        successCallback,
        (fallbackErr) => {
          console.error('Low accuracy geolocation fallback also failed:', fallbackErr);
          setError(fallbackErr.message || 'Could not resolve location coordinates');
          setLoading(false);
          if (fallbackErr.code === fallbackErr.PERMISSION_DENIED) {
            setPermission('denied');
          }
          
          // Last resort: read from localStorage
          const cached = localStorage.getItem('roadsos_last_location');
          if (cached) setLocation(JSON.parse(cached));
        },
        lowAccuracyOptions
      );
    }

    navigator.geolocation.getCurrentPosition(successCallback, failCallback, highAccuracyOptions);
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
