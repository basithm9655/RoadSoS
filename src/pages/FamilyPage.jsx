import { useState, useEffect } from 'react';
import FamilyAlarm from '../components/FamilyAlarm';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { updateFamilyContacts } from '../utils/firebaseHelpers';

const RELATIONS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Other'];

export default function FamilyPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', relation: 'Parent' });
  const [showAlarm, setShowAlarm] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('roadsos_family_contacts') || '[]');
    setContacts(saved);
  }, []);

  function saveContacts(updated) {
    setContacts(updated);
    localStorage.setItem('roadsos_family_contacts', JSON.stringify(updated));
    if (user?.uid) updateFamilyContacts(user.uid, updated).catch(() => {});
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    const updated = [...contacts];
    if (editIdx !== null) updated[editIdx] = form;
    else updated.push(form);
    saveContacts(updated);
    setForm({ name: '', email: '', relation: 'Parent' });
    setShowForm(false);
    setEditIdx(null);
    showToast(editIdx !== null ? '✅ Contact updated' : '✅ Contact added', 'success');
  }

  function handleDelete(idx) {
    const updated = contacts.filter((_, i) => i !== idx);
    saveContacts(updated);
    showToast('🗑️ Contact removed', 'info');
  }

  function handleEdit(idx) {
    setForm(contacts[idx]);
    setEditIdx(idx);
    setShowForm(true);
  }

  function sendTestAlert() {
    if (contacts.length === 0) { showToast('Add contacts first', 'warning'); return; }
    const location = JSON.parse(localStorage.getItem('roadsos_last_location') || 'null');
    const mapsLink = location ? `https://maps.google.com/?q=${location.lat},${location.lon}` : 'Location pending GPS lock';
    const timeStr = new Date().toLocaleTimeString();

    showToast('⏳ Dispatching test email alerts...', 'info', 2000);

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
        userName: 'Test User (RoadSOS Setup)',
        mapsLink,
        time: timeStr,
        contacts
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
        showToast('✉️ SOS Test email dispatched successfully!', 'success', 6000);
      } else {
        const firstErr = data.error || 'Test dispatch rejected';
        throw new Error(firstErr);
      }
    })
    .catch(err => {
      console.error('[Test SOS Error]', err);
      showToast(`⚠️ SOS Setup Error: ${err.message}`, 'error', 12000);
    });
  }

  return (
    <div className="page family-page">
      {showAlarm && (
        <FamilyAlarm contacts={contacts} onDismiss={() => setShowAlarm(false)} userName="You" />
      )}

      <div className="page-header">
        <h1 className="page-title">👨‍👩‍👧 Family & Friends</h1>
        <button className="add-btn" onClick={() => { setShowForm(true); setEditIdx(null); setForm({ name: '', email: '', relation: 'Parent' }); }}>
          + Add
        </button>
      </div>

      <p className="page-sub">These contacts will receive email notifications in emergencies</p>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editIdx !== null ? 'Edit Contact' : 'Add Contact'}</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Contact name" required className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="family@example.com" type="email" required className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Relation</label>
                <select value={form.relation} onChange={e => setForm(p => ({ ...p, relation: e.target.value }))} className="form-input">
                  {RELATIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No contacts yet</h3>
          <p>Add family members to alert in emergencies</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add First Contact</button>
        </div>
      ) : (
        <div className="contacts-list">
          {contacts.map((c, i) => (
            <div key={i} className="contact-card">
              <div className="contact-avatar">{c.name[0]?.toUpperCase() || '?'}</div>
              <div className="contact-info">
                <h3 className="contact-name">{c.name}</h3>
                <p className="contact-phone">✉️ {c.email}</p>
                <span className="contact-relation">{c.relation}</span>
              </div>
              <div className="contact-actions">
                <a href={`mailto:${c.email}`} className="icon-btn">✉️</a>
                <button className="icon-btn" onClick={() => handleEdit(i)}>✏️</button>
                <button className="icon-btn icon-btn-danger" onClick={() => handleDelete(i)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {contacts.length > 0 && (
        <div className="family-action-row">
          <button className="test-alert-btn" onClick={sendTestAlert}>
            📤 Send Test Email Alert
          </button>
          <button className="alarm-preview-btn" onClick={() => setShowAlarm(true)}>
            🔴 Preview SOS Alarm
          </button>
        </div>
      )}

      <div className="family-info-card">
        <h3>How alerts work</h3>
        <ul>
          <li>📍 Your active GPS coordinates are fetched</li>
          <li>✉️ Email notification is dispatched automatically</li>
          <li>🔔 Integrates securely with Google Forms & Apps Script automation</li>
          <li>🔁 Live updates are synchronized securely</li>
        </ul>
      </div>
    </div>
  );
}
