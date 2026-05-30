import { useState, useEffect, useCallback } from 'react';

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
      setError('Geolocation not supported');
      setLoading(false);
      const cached = localStorage.getItem('roadsos_last_location');
      if (cached) setLocation(JSON.parse(cached));
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setLocation(loc);
        setLoading(false);
        setPermission('granted');
        setError(null);
        localStorage.setItem('roadsos_last_location', JSON.stringify(loc));
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission('denied');
        }
        const cached = localStorage.getItem('roadsos_last_location');
        if (cached) setLocation(JSON.parse(cached));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    updatePermissionStatus();
    getLocation();

    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setLocation(loc);
        setPermission('granted');
        setError(null);
        localStorage.setItem('roadsos_last_location', JSON.stringify(loc));
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermission('denied');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [getLocation, updatePermissionStatus]);

  return { location, error, loading, permission, refetch: getLocation };
}
