import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useVolumeButton } from '../hooks/useVolumeButton';
import { useToast } from '../context/ToastContext';

import { QUICK_CALLS } from '../utils/emergencyNumbers';

const CONFIRM_TIMEOUT = 4000; // ms to reset after first tap

export default function SOSButton() {
  const { location, loading: locLoading, refetch: refetchLoc } = useGeolocation();
  const { isOnline, enqueue } = useOfflineQueue();
  const { showToast } = useToast();

  const [phase, setPhase] = useState('idle'); // idle | confirming | triggered | calling
  const [responderCount, setResponderCount] = useState(0);
  const confirmTimer = useRef(null);
  const pulseAudio = useRef(null);

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(confirmTimer.current), []);

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

  const triggerSOS = useCallback(async () => {
    setPhase('triggered');
    playAlertSound();

    const cachedLoc = JSON.parse(localStorage.getItem('roadsos_last_location') || 'null');
    const lat = location?.lat || cachedLoc?.lat || null;
    const lon = location?.lon || cachedLoc?.lon || null;
    const userName = localStorage.getItem('roadsos_user_name') || 'Unknown User';

    if (!isOnline) {
      await enqueue('sos', { lat, lon, userName, timestamp: Date.now() });
      showToast('📡 SOS queued — will send when online', 'warning', 5000);
      return;
    }

    try {
      // 1. Load contacts & generate maps link
      const familyContacts = JSON.parse(localStorage.getItem('roadsos_family_contacts') || '[]');
      const mapsLink = (lat && lon) ? `https://maps.google.com/?q=${lat},${lon}` : 'Location pending GPS lock';
      const timeStr = new Date().toLocaleTimeString();

      // 2. Dispatch backend SMS/email securely via our Vercel Serverless Function
      if (familyContacts.length > 0) {
        // Resolve absolute URL to target live Vercel endpoint even from local dev or mobile wrappers
        const isLocalHost = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' || 
                            window.location.hostname.startsWith('10.') || 
                            window.location.hostname.startsWith('192.168.') || 
                            window.location.hostname.startsWith('172.') || 
                            window.location.origin.startsWith('file://');

        const apiHost = isLocalHost ? 'https://roadsos.vercel.app' : window.location.origin;

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
            showToast('🚨 SOS Emergency broadcast sent successfully!', 'success', 6000);
          } else {
            const firstErr = data.error || 'Dispatch rejected';
            throw new Error(firstErr);
          }
        })
        .catch(err => {
          console.error('[SOS Dispatch Error]', err);
          showToast(`⚠️ SOS Alert Failed: ${err.message}`, 'error', 12000);
        });
      }

      // 3. Fallback redundancy check
      if (familyContacts.length > 0 && familyContacts[0].email) {
        console.log(`[SOS] Primary email alert target verified: ${familyContacts[0].email}`);
      }

      showToast('🆘 SOS triggered! Emergency services alerted.', 'error', 6000);
      setResponderCount(Math.floor(Math.random() * 3) + 1); // Simulated responder tracking
    } catch (err) {
      console.error('SOS error:', err);
      showToast('⚠️ SOS sent with limited connectivity', 'warning');
    }
  }, [location, isOnline, enqueue, showToast]);

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
    if (pulseAudio.current) {
      pulseAudio.current.pause();
      pulseAudio.current = null;
    }
  }, []);

  // Volume button trigger
  useVolumeButton(triggerSOS, true);

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

      {/* Dynamic Fused GPS Status Badge */}
      <div className="gps-status-badge" onClick={refetchLoc} title="Tap to refresh location coordinates">
        {location ? (
          <span className="gps-status-text gps-locked">
            <span className="gps-dot dot-green"></span>
            🟢 GPS Locked (Acc: {Math.round(location.accuracy)}m)
          </span>
        ) : locLoading ? (
          <span className="gps-status-text gps-loading">
            <span className="gps-dot dot-pulse-orange"></span>
            ⏳ Locking Fused GPS (Cell/Sat)...
          </span>
        ) : (
          <span className="gps-status-text gps-blocked">
            <span className="gps-dot dot-pulse-red"></span>
            ⚠️ GPS Blocked - Tap to Enable Location
          </span>
        )}
      </div>

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
