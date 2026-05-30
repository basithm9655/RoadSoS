import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { setUser } from '../utils/firebaseHelpers';
import { Link } from 'react-router-dom';

const APP_VERSION = '1.0.0';

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(() => localStorage.getItem('roadsos_user_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('roadsos_user_phone') || '');
  const [aiKey, setAiKey] = useState(() => localStorage.getItem('roadsos_ai_key') || '');
  const [isVolunteer, setIsVolunteer] = useState(() => localStorage.getItem('roadsos_is_volunteer') === 'true');
  const [notifPermission, setNotifPermission] = useState(Notification?.permission || 'default');

  function saveProfile() {
    localStorage.setItem('roadsos_user_name', name);
    localStorage.setItem('roadsos_user_phone', phone);
    if (user?.uid) setUser(user.uid, { name, phone }).catch(() => {});
    showToast('✅ Profile saved', 'success');
  }

  function saveApiKey() {
    localStorage.setItem('roadsos_ai_key', aiKey);
    showToast('✅ API key saved', 'success');
  }

  function toggleVolunteer() {
    const next = !isVolunteer;
    setIsVolunteer(next);
    localStorage.setItem('roadsos_is_volunteer', String(next));
    showToast(next ? '✅ Registered as volunteer' : '🔕 Volunteer mode disabled', next ? 'success' : 'info');
  }

  async function requestNotifications() {
    if (!('Notification' in window)) { showToast('Notifications not supported', 'error'); return; }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') showToast('✅ Notifications enabled', 'success');
    else showToast('⚠️ Notification permission denied', 'warning');
  }

  function sendTestNotification() {
    if (notifPermission !== 'granted') { requestNotifications(); return; }
    new Notification('🚨 RoadSOS Test', {
      body: 'Test notification working! You will receive SOS alerts here.',
      icon: '/pwa-192x192.png',
    });
    showToast('✅ Test notification sent', 'success');
  }

  function clearAllData() {
    if (confirm('Clear all local data? This will remove contacts and settings.')) {
      localStorage.clear();
      showToast('🗑️ All data cleared', 'info');
      window.location.reload();
    }
  }

  return (
    <div className="page settings-page">
      <div className="page-header">
        <h1 className="page-title">⚙️ Settings</h1>
      </div>

      {/* Profile */}
      <div className="settings-section">
        <h2 className="settings-section-title">👤 My Profile</h2>
        <div className="form-group">
          <label>Your Name</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Name shown in SOS alerts" />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your mobile number" />
        </div>
        <button className="btn-primary" onClick={saveProfile}>Save Profile</button>
      </div>

      {/* AI API Key */}
      <div className="settings-section">
        <h2 className="settings-section-title">🤖 AI Chatbot Key</h2>
        <p className="settings-note">Get your API key from <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a></p>
        <div className="form-group">
          <input
            className="form-input"
            type="password"
            value={aiKey}
            onChange={e => setAiKey(e.target.value)}
            placeholder="sk-ant-..."
          />
        </div>
        <button className="btn-secondary" onClick={saveApiKey}>Save API Key</button>
      </div>

      {/* Volunteer */}
      <div className="settings-section">
        <h2 className="settings-section-title">🤝 Volunteer Mode</h2>
        <div className="settings-toggle-row">
          <div>
            <p className="settings-toggle-label">Register as Community Volunteer</p>
            <p className="settings-note">Receive SOS alerts from people near you</p>
          </div>
          <button
            className={`toggle-btn ${isVolunteer ? 'toggle-on' : 'toggle-off'}`}
            onClick={toggleVolunteer}
          >
            {isVolunteer ? 'ON' : 'OFF'}
          </button>
        </div>
        <a
          href="https://forms.google.com"
          target="_blank"
          rel="noreferrer"
          className="settings-link-btn"
        >
          🩺 Join First Aid Community →
        </a>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <h2 className="settings-section-title">🔔 Notifications</h2>
        <div className="notif-status">
          Status: <span className={`notif-badge ${notifPermission === 'granted' ? 'badge-green' : notifPermission === 'denied' ? 'badge-red' : 'badge-gray'}`}>
            {notifPermission}
          </span>
        </div>
        <div className="settings-btn-row">
          <button className="btn-secondary" onClick={requestNotifications}>Request Permission</button>
          <button className="btn-secondary" onClick={sendTestNotification}>Send Test</button>
        </div>
      </div>

      {/* Ambulance */}
      <div className="settings-section">
        <h2 className="settings-section-title">🚑 Ambulance Panel</h2>
        <Link to="/ambulance-dashboard" className="settings-link-btn">
          Open Ambulance Dashboard →
        </Link>
      </div>

      {/* Danger Zone */}
      <div className="settings-section settings-danger">
        <h2 className="settings-section-title">⚠️ Data</h2>
        <button className="btn-danger" onClick={clearAllData}>🗑️ Clear All Local Data</button>
      </div>

      {/* App Info */}
      <div className="settings-section settings-info">
        <div className="app-info">
          <span className="app-info-icon">🚨</span>
          <div>
            <p className="app-name">RoadSOS</p>
            <p className="app-version">Version {APP_VERSION}</p>
            <p className="app-uid">UID: {user?.uid?.slice(0, 12)}...</p>
          </div>
        </div>
      </div>

      {/* Platform Notes */}
      <div className="settings-section">
        <h2 className="settings-section-title">📱 Platform Notes</h2>
        <div className="platform-notes">
          <div className="platform-note">
            <h4>🤖 Android Volume Button SOS</h4>
            <p>Volume-down ×3 triggers SOS when app is in foreground. For background/lock screen trigger, package this app as an APK using TWA (Trusted Web Activity) + AccessibilityService.</p>
          </div>
          <div className="platform-note">
            <h4>🍎 iOS Back Tap SOS</h4>
            <p>Go to Settings → Accessibility → Touch → Back Tap → Double/Triple Tap → Select "Open URL" and set to: <code>https://your-domain.com/?action=sos</code></p>
          </div>
          <div className="platform-note">
            <h4>🎤 Google Assistant</h4>
            <p>Say "Hey Google, open RoadSOS" to launch the app. For custom App Actions, register via Google Actions Console with BII: CALL_EMERGENCY_HELPLINE.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
