import { useState, useEffect, useRef } from 'react';
import AmbulanceCard from '../components/AmbulanceCard';
import { useGeolocation } from '../hooks/useGeolocation';
import { useToast } from '../context/ToastContext';
import { subscribePendingSOSEvents, acceptSOSEvent, updateAmbulanceLocation } from '../utils/firebaseHelpers';
import { useAuth } from '../context/AuthContext';

const DEMO_PIN = '1234';

export default function AmbulanceDashboard() {
  const { user } = useAuth();
  const { location } = useGeolocation();
  const { showToast } = useToast();
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem('roadsos_amb_login') === 'true');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [sosEvents, setSosEvents] = useState([]);
  const [available, setAvailable] = useState(true);
  const [driverName, setDriverName] = useState(() => localStorage.getItem('roadsos_driver_name') || '');
  const locationInterval = useRef(null);
  const unsubRef = useRef(null);

  // Subscribe to SOS events when logged in
  useEffect(() => {
    if (!loggedIn) return;
    try {
      unsubRef.current = subscribePendingSOSEvents((events) => {
        setSosEvents(events.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      });
    } catch (err) {
      console.warn('Firestore unavailable, using demo data');
      // Demo SOS events when Firebase isn't configured
      setSosEvents([
        {
          id: 'demo-1', userName: 'Rajan Kumar', lat: 12.9915, lon: 80.2336,
          timestamp: { seconds: Math.floor(Date.now() / 1000) - 120 }, status: 'pending'
        },
        {
          id: 'demo-2', userName: 'Priya S', lat: 13.0067, lon: 80.2206,
          timestamp: { seconds: Math.floor(Date.now() / 1000) - 45 }, status: 'pending'
        },
      ]);
    }

    // Update location every 30 seconds
    if (location) {
      locationInterval.current = setInterval(() => {
        if (location && user?.uid) {
          updateAmbulanceLocation(user.uid, location.lat, location.lon, available).catch(() => {});
        }
      }, 30000);
    }

    return () => {
      unsubRef.current?.();
      clearInterval(locationInterval.current);
    };
  }, [loggedIn, user, location, available]);

  function handleLogin(e) {
    e.preventDefault();
    if (pin === DEMO_PIN) {
      setLoggedIn(true);
      localStorage.setItem('roadsos_amb_login', 'true');
      localStorage.setItem('roadsos_driver_name', driverName || 'Driver');
      showToast('✅ Logged in as ambulance driver', 'success');
    } else {
      setPinError('Incorrect PIN. Demo PIN: 1234');
    }
  }

  function handleLogout() {
    setLoggedIn(false);
    localStorage.removeItem('roadsos_amb_login');
    unsubRef.current?.();
    clearInterval(locationInterval.current);
  }

  async function handleAccept(eventId) {
    try {
      await acceptSOSEvent(eventId, user?.uid || 'driver');
      setSosEvents(prev => prev.filter(e => e.id !== eventId));
      showToast('✅ SOS accepted — navigate to victim', 'success');
    } catch (err) {
      showToast('Error accepting SOS', 'error');
    }
  }

  if (!loggedIn) {
    return (
      <div className="page ambulance-login-page">
        <div className="login-card">
          <div className="login-icon">🚑</div>
          <h1 className="login-title">Ambulance Driver Login</h1>
          <p className="login-sub">Emergency Response Panel</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Driver Name</label>
              <input
                className="form-input"
                placeholder="Your name"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>PIN *</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter PIN (demo: 1234)"
                value={pin}
                onChange={e => { setPin(e.target.value); setPinError(''); }}
                required
                maxLength={6}
              />
              {pinError && <p className="input-error">{pinError}</p>}
            </div>
            <button type="submit" className="btn-primary login-btn">
              🔐 Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page ambulance-dashboard-page">
      <div className="amb-header">
        <div className="amb-header-left">
          <span className="amb-icon">🚑</span>
          <div>
            <h1 className="amb-title">Dashboard</h1>
            <p className="amb-driver">{localStorage.getItem('roadsos_driver_name') || 'Driver'}</p>
          </div>
        </div>
        <div className="amb-header-right">
          <button
            className={`availability-toggle ${available ? 'avail-on' : 'avail-off'}`}
            onClick={() => setAvailable(p => !p)}
          >
            {available ? '🟢 Available' : '🔴 Busy'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>↩</button>
        </div>
      </div>

      <div className="amb-stats">
        <div className="amb-stat">
          <span className="stat-value">{sosEvents.length}</span>
          <span className="stat-label">Pending SOS</span>
        </div>
        <div className="amb-stat">
          <span className="stat-value">{location ? '✅' : '⏳'}</span>
          <span className="stat-label">GPS</span>
        </div>
        <div className="amb-stat">
          <span className="stat-value">{available ? 'ON' : 'OFF'}</span>
          <span className="stat-label">Status</span>
        </div>
      </div>

      <h2 className="section-title">🆘 Live SOS Alerts</h2>

      {sosEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h3>No pending alerts</h3>
          <p>All clear — awaiting emergency calls</p>
        </div>
      ) : (
        <div className="sos-events-list">
          {sosEvents.map(event => (
            <AmbulanceCard
              key={event.id}
              event={event}
              driverLocation={location}
              onAccept={handleAccept}
              onNavigate={() => {}}
            />
          ))}
        </div>
      )}

      <div className="amb-footer-note">
        <p>📡 Live updates from Firestore • Location updated every 30s</p>
      </div>
    </div>
  );
}
