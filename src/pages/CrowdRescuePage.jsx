import { useState, useEffect, useCallback } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { haversine, formatDistance } from '../utils/haversine';

const BROADCAST = new BroadcastChannel('roadsos_rescue');

export default function CrowdRescuePage() {
  const { user } = useAuth();
  const { location } = useGeolocation();
  const { showToast } = useToast();
  const [isVolunteer, setIsVolunteer] = useState(() => localStorage.getItem('roadsos_is_volunteer') === 'true');
  const [alertSent, setAlertSent] = useState(false);
  const [incomingAlerts, setIncomingAlerts] = useState([]);
  const [respondersCount, setRespondersCount] = useState(0);
  const [responding, setResponding] = useState(false);

  // Listen for rescue broadcasts
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'SOS_ALERT' && isVolunteer) {
        setIncomingAlerts(prev => [e.data, ...prev].slice(0, 10));
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
        showToast('🆘 Nearby SOS received!', 'error', 8000);
      }
      if (e.data?.type === 'RESPONDER_ACK') {
        setRespondersCount(p => p + 1);
      }
    };
    BROADCAST.addEventListener('message', handler);
    return () => BROADCAST.removeEventListener('message', handler);
  }, [isVolunteer, showToast]);

  function toggleVolunteer() {
    const next = !isVolunteer;
    setIsVolunteer(next);
    localStorage.setItem('roadsos_is_volunteer', String(next));
    showToast(next ? '✅ Registered as volunteer' : '🔕 Volunteer mode off', next ? 'success' : 'info');
  }

  function sendRescueAlert() {
    if (!location) { showToast('📡 Getting location...', 'warning'); return; }
    const userName = localStorage.getItem('roadsos_user_name') || 'Unknown User';
    const payload = {
      type: 'SOS_ALERT',
      userName,
      lat: location.lat,
      lon: location.lon,
      mapsLink: `https://maps.google.com/?q=${location.lat},${location.lon}`,
      timestamp: Date.now(),
    };
    BROADCAST.postMessage(payload);
    setAlertSent(true);
    showToast('📡 Rescue alert broadcast to nearby volunteers', 'success', 5000);
  }

  function respondToAlert(alert) {
    setResponding(true);
    BROADCAST.postMessage({ type: 'RESPONDER_ACK', uid: user?.uid });
    showToast("✅ You're responding — navigate to victim", 'success');
  }

  return (
    <div className="page crowd-rescue-page">
      <div className="page-header">
        <h1 className="page-title">🤝 Crowd Rescue</h1>
      </div>
      <p className="page-sub">Local volunteer network for rapid response</p>

      {/* Volunteer Toggle */}
      <div className="volunteer-toggle-card">
        <div className="toggle-info">
          <span className="toggle-icon">{isVolunteer ? '✅' : '⭕'}</span>
          <div>
            <h3>Volunteer Mode</h3>
            <p>{isVolunteer ? 'You will receive nearby SOS alerts' : 'Enable to receive alerts'}</p>
          </div>
        </div>
        <button
          className={`toggle-btn ${isVolunteer ? 'toggle-on' : 'toggle-off'}`}
          onClick={toggleVolunteer}
        >
          {isVolunteer ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Send Rescue Alert */}
      <div className="rescue-send-card">
        <h3>🆘 Need crowd help?</h3>
        <p>Broadcast your SOS to all volunteers within range via your device</p>
        {!alertSent ? (
          <button className="rescue-alert-btn" onClick={sendRescueAlert}>
            📡 Broadcast Rescue Alert
          </button>
        ) : (
          <div className="alert-sent-status">
            <div className="sent-success">✅ Alert Broadcast!</div>
            <p>{respondersCount} volunteer{respondersCount !== 1 ? 's' : ''} responding</p>
            <div className="responder-wave">
              {Array(respondersCount).fill(0).map((_, i) => (
                <span key={i} className="responder-dot">🧑</span>
              ))}
            </div>
            <button className="cancel-rescue-btn" onClick={() => { setAlertSent(false); setRespondersCount(0); }}>
              Cancel Alert
            </button>
          </div>
        )}
      </div>

      {/* Incoming Alerts (for volunteers) */}
      {isVolunteer && (
        <div className="incoming-alerts-section">
          <h3 className="section-title">📡 Incoming Alerts</h3>
          {incomingAlerts.length === 0 ? (
            <div className="empty-state-small">
              <p>No alerts yet — standing by 🟢</p>
            </div>
          ) : (
            incomingAlerts.map((alert, i) => {
              const dist = location
                ? haversine(location.lat, location.lon, alert.lat, alert.lon)
                : null;
              return (
                <div key={i} className="incoming-alert-card">
                  <div className="alert-header">
                    <span className="alert-pulse">🆘</span>
                    <div>
                      <h4>{alert.userName}</h4>
                      <p className="alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                    </div>
                    {dist && <span className="alert-distance">{formatDistance(dist)}</span>}
                  </div>
                  <div className="alert-actions">
                    <a href={alert.mapsLink} target="_blank" rel="noreferrer" className="alert-nav-btn">
                      🗺 Navigate
                    </a>
                    <button
                      className="alert-respond-btn"
                      onClick={() => respondToAlert(alert)}
                      disabled={responding}
                    >
                      {responding ? '✅ Responding' : '🏃 I\'m on my way'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* How it works */}
      <div className="how-it-works">
        <h3>How Crowd Rescue works</h3>
        <div className="steps">
          <div className="step"><span className="step-num">1</span><p>Register as volunteer</p></div>
          <div className="step"><span className="step-num">2</span><p>SOS broadcast sent via BroadcastChannel</p></div>
          <div className="step"><span className="step-num">3</span><p>Nearby volunteers see alert</p></div>
          <div className="step"><span className="step-num">4</span><p>Respond & navigate to victim</p></div>
        </div>
      </div>
    </div>
  );
}
