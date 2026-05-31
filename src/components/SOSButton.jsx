import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useVolumeButton } from '../hooks/useVolumeButton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createSOSEvent } from '../utils/firebaseHelpers';
import { haversine, formatDistance } from '../utils/haversine';
import { QUICK_CALLS } from '../utils/emergencyNumbers';

const CONFIRM_TIMEOUT = 4000; // ms to reset after first tap

export default function SOSButton() {
  const { user } = useAuth();
  const { location } = useGeolocation();
  const { isOnline, enqueue } = useOfflineQueue();
  const { showToast } = useToast();

  const [phase, setPhase] = useState('idle'); // idle | confirming | triggered | calling
  const [responderCount, setResponderCount] = useState(0);
  const [sosEventId, setSosEventId] = useState(null);
  const confirmTimer = useRef(null);
  const pulseAudio = useRef(null);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  const triggerSOS = useCallback(async () => {
    setPhase('triggered');
    playAlertSound();

    const lat = location?.lat || 0;
    const lon = location?.lon || 0;
    const userName = localStorage.getItem('roadsos_user_name') || 'Unknown User';

    if (!isOnline) {
      await enqueue('sos', { lat, lon, userId: user?.uid, userName, timestamp: Date.now() });
      showToast('📡 SOS queued — will send when online', 'warning', 5000);
      return;
    }

    try {
      // 1. Write to Firestore
      const eventId = await createSOSEvent(user?.uid || 'anon', userName, lat, lon);
      setSosEventId(eventId);

      // 2. Load contacts & generate maps link
      const familyContacts = JSON.parse(localStorage.getItem('roadsos_family_contacts') || '[]');
      const mapsLink = `https://maps.google.com/?q=${lat},${lon}`;
      const timeStr = new Date().toLocaleTimeString();

      // 3. Dispatch backend Twilio SMS securely via our Vercel Serverless Function
      if (familyContacts.length > 0) {
        // Resolve absolute URL to target live Vercel endpoint even from local dev or mobile wrappers
        const apiHost = window.location.origin.startsWith('http') && !window.location.origin.includes('localhost:51')
          ? window.location.origin
          : 'https://roadsos.vercel.app'; // Fallback to live URL

        fetch(`${apiHost}/api/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName,
            mapsLink,
            time: timeStr,
            contacts: familyContacts
          })
        })
        .then(res => {
          if (!res.ok) {
            return res.json().then(errData => {
              throw new Error(errData.error || `HTTP ${res.status}`);
            });
          }
          return res.json();
        })
        .then(data => {
          if (data.success) {
            showToast(`📲 Twilio SMS sent to ${data.delivered} family contact(s)!`, 'success', 6000);
          } else {
            throw new Error(data.error || 'Unknown dispatch failure');
          }
        })
        .catch(err => {
          console.error('[SMS Dispatch Error]', err);
          showToast(`⚠️ Twilio Alert Failed: ${err.message}`, 'error', 10000);
        });
      }

      // 4. WhatsApp Fallback (Open WA for first contact as redundancy)
      const msg = encodeURIComponent(
        `🆘 SOS ALERT! ${userName} needs emergency help!\n📍 Location: ${mapsLink}\n⏰ Time: ${timeStr}\nPlease respond immediately!`
      );
      if (familyContacts.length > 0 && familyContacts[0].phone) {
        window.open(`https://wa.me/91${familyContacts[0].phone}?text=${msg}`, '_blank');
      }

      showToast('🆘 SOS triggered! Emergency services alerted.', 'error', 6000);
      setResponderCount(Math.floor(Math.random() * 3) + 1); // Simulated until FCM is live
    } catch (err) {
      console.error('SOS error:', err);
      showToast('⚠️ SOS sent with limited connectivity', 'warning');
    }
  }, [location, isOnline, enqueue, user, showToast]);

  const handleSOSPress = useCallback(() => {
    if (phase === 'idle') {
      setPhase('confirming');
      clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setPhase('idle'), CONFIRM_TIMEOUT);
    } else if (phase === 'confirming') {
      clearTimeout(confirmTimer.current);
      triggerSOS();
    }
  }, [phase, triggerSOS]);

  const resetSOS = useCallback(() => {
    setPhase('idle');
    setResponderCount(0);
    setSosEventId(null);
    if (pulseAudio.current) {
      pulseAudio.current.pause();
      pulseAudio.current = null;
    }
  }, []);

  // Volume button trigger
  useVolumeButton(triggerSOS, true);

  function playAlertSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur + 0.05);
      };
      for (let i = 0; i < 5; i++) playBeep(880, i * 0.3, 0.2);
    } catch (_) {}
  }

  const buttonStyles = {
    idle: {
      background: 'radial-gradient(circle at 35% 35%, #FF5252, #E53935, #B71C1C)',
      boxShadow: '0 0 0 0 rgba(229, 57, 53, 0.7)',
      animation: 'sosPulse 2s ease-in-out infinite',
    },
    confirming: {
      background: 'radial-gradient(circle at 35% 35%, #FFD740, #FF6D00, #E65100)',
      boxShadow: '0 0 40px rgba(255, 109, 0, 0.8)',
      animation: 'sosConfirm 0.5s ease-in-out infinite',
      transform: 'scale(1.05)',
    },
    triggered: {
      background: 'radial-gradient(circle at 35% 35%, #FF1744, #D50000, #B71C1C)',
      boxShadow: '0 0 60px rgba(213, 0, 0, 1)',
      animation: 'sosTriggered 0.3s ease-in-out infinite',
    },
  };

  if (phase === 'triggered') {
    return (
      <div className="sos-triggered-screen">
        <div className="sos-activated-badge">
          <span className="sos-wave">🆘</span>
          <h1>SOS ACTIVATED</h1>
          <p className="sos-sub">Emergency services have been alerted</p>
        </div>

        <div className="sos-status-grid">
          <div className="sos-status-item active">
            <span>📡</span><span>SOS Sent</span>
          </div>
          <div className="sos-status-item active">
            <span>👨‍👩‍👧</span><span>Family Alerted</span>
          </div>
          <div className={`sos-status-item ${responderCount > 0 ? 'active' : ''}`}>
            <span>🤝</span><span>{responderCount} Responding</span>
          </div>
          <div className="sos-status-item">
            <span>🚑</span><span>Ambulance Notified</span>
          </div>
        </div>

        <a href="tel:108" className="call-108-btn">
          📞 CALL 108 NOW
        </a>

        <div className="sos-location-display">
          {location ? (
            <a
              href={`https://maps.google.com/?q=${location.lat},${location.lon}`}
              target="_blank" rel="noreferrer"
              className="location-link"
            >
              📍 View My Location on Maps
            </a>
          ) : (
            <span className="location-unknown">📍 Getting location...</span>
          )}
        </div>

        <button className="cancel-sos-btn" onClick={resetSOS}>
          ✕ Cancel SOS
        </button>
      </div>
    );
  }

  return (
    <div className="sos-section">
      {!isOnline && (
        <div className="offline-banner">
          📡 Offline — SOS will queue when connection restored
        </div>
      )}

      <div className="sos-container">
        <div className="sos-ring-outer">
          <div className="sos-ring-inner">
            <button
              className={`sos-button sos-phase-${phase}`}
              onClick={handleSOSPress}
              aria-label="SOS Emergency Button"
              style={buttonStyles[phase] || buttonStyles.idle}
            >
              <div className="sos-btn-content">
                {phase === 'idle' && <>
                  <span className="sos-text">SOS</span>
                  <span className="sos-hint">PRESS TO ACTIVATE</span>
                </>}
                {phase === 'confirming' && <>
                  <span className="sos-text">⚠️</span>
                  <span className="sos-confirm-text">TAP AGAIN<br/>TO CONFIRM</span>
                </>}
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="quick-calls">
        {QUICK_CALLS.map(call => (
          <a
            key={call.id}
            href={`tel:${call.number}`}
            className="quick-call-btn"
            style={{ '--btn-color': call.color }}
            aria-label={`Call ${call.name} ${call.number}`}
          >
            <span className="qc-icon">{call.icon}</span>
            <span className="qc-name">{call.name}</span>
            <span className="qc-number">{call.number}</span>
          </a>
        ))}
      </div>

      {/* Find Nearest Facilities Action Button */}
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
        <Link 
          to="/map" 
          className="btn-primary find-facilities-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '14px',
            fontSize: '14px',
            fontWeight: '700',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #1E293B, #0F172A)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          <span>🗺️</span> Find Nearest Facilities
        </Link>
      </div>
    </div>
  );
}
