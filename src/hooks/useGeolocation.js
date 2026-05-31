import { useState, useEffect, useCallback } from 'react';

const getInitialLocation = () => {
  const cached = localStorage.getItem('roadsos_last_location');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
        // Return cached location as active right away
        return { ...parsed, isFallback: false };
      }
    } catch (_) {}
  }
  return null; // No fallback coordinates at all
};

/**
 * Robust phone-resilient geolocation hook.
 * - Instantly initializes with the last cached location or null (no fake fallbacks).
 * - Fires multiple concurrent geolocation requests.
 * - Updates fluidly whenever a precise GPS fix or a native APK injection is received.
 */
export function useGeolocation() {
  const [location, setLocation] = useState(getInitialLocation);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState('prompt'); // prompt | granted | denied

  const updatePermissionStatus = useCallback(async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermission(result.state);
        result.onchange = () => setPermission(result.state);
      } catch (e) {
        console.warn('[Geolocation] Permissions query error:', e);
      }
    }
  }, []);

  const handleNewCoordinate = useCallback((newLat, newLon, newAccuracy = 10, source = 'Unknown') => {
    const lat = parseFloat(newLat);
    const lon = parseFloat(newLon);
    const accuracy = parseFloat(newAccuracy);

    if (isNaN(lat) || isNaN(lon)) return;

    console.log(`[GPS Update] ${source} → ${lat.toFixed(5)}, ${lon.toFixed(5)} (±${Math.round(accuracy)}m)`);

    const loc = { lat, lon, accuracy, timestamp: Date.now(), isFallback: false };

    setLocation((current) => {
      // 1. If currently null, always set to the new coordinate
      if (!current) {
        return loc;
      }

      // 2. If the new accuracy is better than what we have, update it
      if (accuracy < current.accuracy) {
        return loc;
      }

      // 3. If the user has moved, update the location so the map tracks them fluidly
      const latDiff = Math.abs(current.lat - lat);
      const lonDiff = Math.abs(current.lon - lon);
      if (latDiff > 0.0001 || lonDiff > 0.0001) {
        return loc;
      }

      return current;
    });

    // Save globally so all subsequent sessions start here
    try {
      localStorage.setItem('roadsos_last_location', JSON.stringify(loc));
      localStorage.setItem('roadsos_last_loc', JSON.stringify({ lat, lon }));
    } catch (e) {
      console.warn('[Storage] LocalStorage write blocked (typical in Safari Private mode):', e);
    }
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser');
      setLoading(false);
      return;
    }

    if (
      window.location.protocol === 'http:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setError('🔒 Location blocked on HTTP. Deploy to HTTPS for GPS permissions.');
      setLoading(false);
      return;
    }

    setLoading(true);

    // ── Request 1: Fast cell-tower/Wi-Fi fix (typically < 2s, accuracy 100–1500m) ──
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleNewCoordinate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'Browser Cell/Wi-Fi');
        setLoading(false);
        setPermission('granted');
        setError(null);
      },
      (err) => console.warn('[GPS] Fast fix failed:', err.message),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
    );

    // ── Request 2: High-accuracy satellite GPS (typically 5–10s, accuracy < 20m) ──
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleNewCoordinate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'Browser Satellite GPS');
        setLoading(false);
        setPermission('granted');
        setError(null);
      },
      (err) => {
        console.warn('[GPS] Satellite fix failed:', err.message);
        setLoading(false);
        if (err.code === 1) {
          setPermission('denied');
          setError('⚠️ Location permission denied. Please enable location services to use RoadSOS emergency features.');
        } else {
          setError('⚠️ Awaiting GPS satellite lock. Please stand by or move to an open area.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [handleNewCoordinate]);

  useEffect(() => {
    updatePermissionStatus();
    getLocation();

    // ── Native Android APK GPS injection ──
    window.updateNativeLocation = (lat, lon, accuracy = 10) => {
      handleNewCoordinate(lat, lon, accuracy, 'Native APK Bridge');
      setLoading(false);
      setPermission('granted');
      setError(null);
    };

    if (!navigator.geolocation) return;

    // ── Continuous watch for location changes while app is open ──
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        handleNewCoordinate(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, 'Browser GPS Watch');
        setPermission('granted');
        setError(null);
      },
      (err) => {
        console.warn('[GPS Watch]', err.message);
        if (err.code === 1) setPermission('denied');
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      delete window.updateNativeLocation;
    };
  }, [updatePermissionStatus, getLocation, handleNewCoordinate]);

  return { location, error, loading, permission, refetch: getLocation };
}
