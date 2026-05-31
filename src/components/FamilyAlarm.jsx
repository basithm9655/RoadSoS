import { useEffect, useRef } from 'react';

export default function FamilyAlarm({ contacts = [], onDismiss, userName = 'Someone' }) {
  const audioCtx = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Flashing effect via body class
    document.body.classList.add('alarm-active');

    // Web Audio API siren
    try {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const playSiren = () => {
        if (!audioCtx.current) return;
        const osc = audioCtx.current.createOscillator();
        const gain = audioCtx.current.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.current.destination);
        osc.type = 'sawtooth';
        gain.gain.value = 0.3;
        osc.frequency.setValueAtTime(440, audioCtx.current.currentTime);
        osc.frequency.linearRampToValueAtTime(880, audioCtx.current.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(440, audioCtx.current.currentTime + 1.0);
        osc.start();
        osc.stop(audioCtx.current.currentTime + 1.05);
      };
      playSiren();
      intervalRef.current = setInterval(playSiren, 1200);
    } catch (_) {}

    // Vibrate pattern
    if (navigator.vibrate) navigator.vibrate([500, 300, 500, 300, 1000]);

    return () => {
      document.body.classList.remove('alarm-active');
      clearInterval(intervalRef.current);
      if (audioCtx.current) { audioCtx.current.close(); audioCtx.current = null; }
    };
  }, []);

  const location = JSON.parse(localStorage.getItem('roadsos_last_location') || 'null');
  const mapsLink = location ? `https://maps.google.com/?q=${location.lat},${location.lon}` : null;

  return (
    <div className="family-alarm-overlay">
      <div className="alarm-flash-bg" />
      <div className="alarm-content">
        <div className="alarm-icon">🆘</div>
        <h1 className="alarm-title">SOS ACTIVATED</h1>
        <p className="alarm-user">{userName} needs help!</p>

        <div className="alarm-contacts">
          <p className="alarm-contacts-label">Notifying family:</p>
          {contacts.map((c, i) => (
            <div key={i} className="alarm-contact-item">
              <span className="alarm-contact-dot" />
              <span>{c.name} — {c.phone}</span>
              <span className="alarm-sending">Alerting...</span>
            </div>
          ))}
        </div>

        {mapsLink && (
          <a href={mapsLink} target="_blank" rel="noreferrer" className="alarm-location-btn">
            📍 View Location
          </a>
        )}

        <a href="tel:108" className="alarm-call-btn">
          📞 CALL 108
        </a>

        <button className="alarm-dismiss-btn" onClick={onDismiss}>
          ✅ I'm Responding — Dismiss
        </button>
      </div>
    </div>
  );
}
