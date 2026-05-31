import { useState, useRef, useEffect } from 'react';
import ChatMessage, { TypingIndicator } from '../components/ChatMessage';
import { useToast } from '../context/ToastContext';

// Gemini AI Prompt & Presets
const SYSTEM_PROMPT = `You are RoadSOS First Aid Assistant — an emergency first aid guidance AI. 
Your role: Help users with step-by-step first aid instructions during road accidents and emergencies.
Rules:
- Always start by asking ONE clarifying question about the emergency situation
- Give clear, numbered step-by-step first aid instructions
- Always remind users to call 108 (ambulance) for professional help
- Be calm, clear, and concise — user may be in panic
- Do NOT provide medical diagnosis
- Do NOT recommend specific medications
- Use simple language — avoid medical jargon
- If the situation is life-threatening, instruct them to call 108 immediately first`;

const QUICK_PROMPTS = [
  { label: '🔴 Unconscious', text: 'Someone is unconscious and not responding. What should I do?' },
  { label: '🩸 Heavy Bleeding', text: 'There is heavy bleeding from a wound. How do I stop it?' },
  { label: '🦴 Fracture', text: 'I suspect someone has a broken bone or fracture.' },
  { label: '❤️ Heart Attack', text: 'Someone shows heart attack symptoms — chest pain, sweating, breathlessness.' },
  { label: '🔥 Burns', text: 'Someone has severe burns. What should I do immediately?' },
  { label: '😮 Choking', text: 'An adult is choking and cannot breathe. Help!' },
];

const SHEET_CSV_URL = import.meta.env.VITE_COMMUNITY_SHEET_URL ||
  'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0';

const JOIN_FORM_URL = import.meta.env.VITE_COMMUNITY_FORM_URL || 'https://forms.google.com';

const ROLE_COLORS = {
  Doctor: '#E53935',
  Nurse: '#1565C0',
  Paramedic: '#2E7D32',
  'First Aider': '#6A1B9A',
};

const STATIC_VOLUNTEERS = [
  { Name: 'Dr. Arun Kumar', Role: 'Doctor', Phone: '9876543210', Area: 'Coimbatore', Available: 'yes' },
  { Name: 'Nurse Priya R', Role: 'Nurse', Phone: '9123456789', Area: 'Coimbatore', Available: 'yes' },
  { Name: 'Ramesh P', Role: 'Paramedic', Phone: '8765432109', Area: 'Tiruppur', Available: 'no' },
  { Name: 'Dr. Meena S', Role: 'Doctor', Phone: '7654321098', Area: 'Salem', Available: 'yes' },
  { Name: 'James T', Role: 'First Aider', Phone: '6543210987', Area: 'Erode', Available: 'yes' },
  { Name: 'Dr. Rajesh Sharma', Role: 'Doctor', Phone: '9944332211', Area: 'Chennai', Available: 'yes' },
  { Name: 'Nurse Sarah M', Role: 'Nurse', Phone: '9845123456', Area: 'Bangalore', Available: 'yes' },
  { Name: 'Vikram Singh', Role: 'Paramedic', Phone: '8877665544', Area: 'Mumbai', Available: 'yes' },
];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] || '' }), {});
  });
}

export default function ChatbotPage() {
  const { showToast } = useToast();
  
  // Tab Switcher state: ai | community
  const [activeTab, setActiveTab] = useState('ai');

  // AI Chat State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Volunteer State
  const [volunteers, setVolunteers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('');

  // Scroll Chat to bottom
  useEffect(() => {
    if (activeTab === 'ai') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typing, activeTab]);

  // Load volunteers on mount/tab change
  useEffect(() => {
    if (activeTab === 'community') {
      const cached = localStorage.getItem('roadsos_community');
      if (cached) {
        try { setVolunteers(JSON.parse(cached)); setLoadingVolunteers(false); } catch (_) {}
      }
      loadCommunity();
    }
  }, [activeTab]);

  async function loadCommunity() {
    setLoadingVolunteers(true);
    try {
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error('Sheet fetch failed');
      const text = await res.text();
      const sheetData = parseCSV(text);
      const merged = [...sheetData, ...STATIC_VOLUNTEERS.filter(sv => !sheetData.some(sd => sd.Phone === sv.Phone))];
      setVolunteers(merged);
      localStorage.setItem('roadsos_community', JSON.stringify(merged));
    } catch (err) {
      console.warn('Community load sheet warning:', err);
      setVolunteers(STATIC_VOLUNTEERS);
    } finally {
      setLoadingVolunteers(false);
    }
  }

  // AI Send Handler — Gemini API
  async function sendMessage(text) {
    if (!text.trim()) return;

    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
      showToast('⚠️ Gemini API key not configured', 'error');
      return;
    }

    const userMsg = { role: 'user', content: text.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setTyping(true);

    try {
      // Build Gemini conversation history format
      const contents = newMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: { maxOutputTokens: 1024, temperature: 0.4 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini API error ${res.status}`);
      }

      const data = await res.json();
      const aiContent =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Could not generate a response. Please call 108.';

      setMessages(prev => [...prev, { role: 'assistant', content: aiContent, timestamp: Date.now() }]);
    } catch (err) {
      console.error('Gemini chatbot error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${err.message}\n\n**Please call 108 immediately for professional emergency help.**`,
        timestamp: Date.now(),
      }]);
      showToast('AI error — call 108 for help', 'error');
    } finally {
      setTyping(false);
    }
  }

  function handleSend() {
    sendMessage(input);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  // Filter volunteer calculations
  const roles = ['all', ...new Set(volunteers.map(v => v.Role).filter(Boolean))];
  const areas = [...new Set(volunteers.map(v => v.Area).filter(Boolean))];
  const filteredVolunteers = volunteers.filter(v => {
    const matchRole = roleFilter === 'all' || v.Role === roleFilter;
    const matchArea = !areaFilter || (v.Area || '').toLowerCase().includes(areaFilter.toLowerCase());
    const matchSearch = !search ||
      (v.Name || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.Area || '').toLowerCase().includes(search.toLowerCase());
    return matchRole && matchArea && matchSearch;
  });

  return (
    <div className="page firstaid-hub-page">
      <div className="page-header">
        <h1 className="page-title">🩺 First Aid Hub</h1>
        {activeTab === 'community' && (
          <button className="key-btn" onClick={loadCommunity} disabled={loadingVolunteers}>
            {loadingVolunteers ? '⏳' : '🔄'}
          </button>
        )}
      </div>

      {/* Dynamic Hub Tab switcher bar */}
      <div className="hub-tab-bar" style={{
        display: 'flex',
        gap: '6px',
        background: 'var(--bg-card)',
        padding: '6px',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        marginBottom: '20px'
      }}>
        <button 
          onClick={() => setActiveTab('ai')} 
          style={{
            flex: 1,
            background: activeTab === 'ai' ? 'var(--primary-color)' : 'transparent',
            border: 'none',
            color: 'white',
            padding: '10px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          💬 AI Guide
        </button>
        <button 
          onClick={() => setActiveTab('community')} 
          style={{
            flex: 1,
            background: activeTab === 'community' ? 'var(--primary-color)' : 'transparent',
            border: 'none',
            color: 'white',
            padding: '10px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🤝 Volunteers
        </button>
      </div>

      {/* TAB 1: AI Assistant */}
      {activeTab === 'ai' && (
        <div className="tab-content ai-tab">
          <div className="chat-container">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="welcome-icon">🤖</div>
                <h2>First Aid Assistant</h2>
                <p>Describe your emergency and I'll guide you through first aid steps.</p>
                <p className="welcome-note">Always call 108 for professional help.</p>

                <div className="quick-prompts">
                  {QUICK_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      className="quick-prompt-btn"
                      onClick={() => sendMessage(p.text)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} message={msg} />
                ))}
                {typing && <TypingIndicator />}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="chat-input-bar">
            <a href="tel:108" className="chat-call-108" title="Call 108">🚑</a>
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Describe the emergency..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || typing}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: First Aid Community Volunteers */}
      {activeTab === 'community' && (
        <div className="tab-content community-tab">
          <p className="page-sub" style={{ marginTop: '-10px', marginBottom: '16px' }}>
            Local emergency medical responders in your zone
          </p>

          <a href={JOIN_FORM_URL} target="_blank" rel="noreferrer" className="join-community-btn">
            🩺 Join as a Volunteer Rescuer
          </a>

          <div className="search-bar-wrap">
            <input
              className="search-input"
              placeholder="🔍 Search volunteers or cities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            {roles.map(r => (
              <button
                key={r}
                className={`filter-tab ${roleFilter === r ? 'filter-tab-active' : ''}`}
                onClick={() => setRoleFilter(r)}
              >
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          <div className="area-filter">
            <select className="form-input" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
              <option value="">All Regions</option>
              {areas.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>

          {loadingVolunteers && volunteers.length === 0 ? (
            <div className="community-grid">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="volunteer-card skeleton-card">
                  <div className="skeleton-pulse" style={{ height: '120px', borderRadius: '16px' }} />
                </div>
              ))}
            </div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="empty-state">
              <p>No responders found matching criteria</p>
            </div>
          ) : (
            <div className="community-grid">
              {filteredVolunteers.map((v, i) => {
                const isAvailable = (v.Available || '').toLowerCase() === 'yes';
                const color = ROLE_COLORS[v.Role] || '#475569';
                return (
                  <div key={i} className="volunteer-card">
                    <div className="volunteer-card-header">
                      <div className="volunteer-avatar" style={{ background: color }}>
                        {v.Name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="volunteer-meta">
                        <h3 className="volunteer-name">{v.Name}</h3>
                        <span className="volunteer-role" style={{ background: color }}>{v.Role}</span>
                      </div>
                      <div className={`availability-dot ${isAvailable ? 'available' : 'unavailable'}`} />
                    </div>
                    <div className="volunteer-details">
                      <span className="volunteer-area">📍 {v.Area}</span>
                      <span className={`volunteer-status ${isAvailable ? 'status-available' : 'status-busy'}`}>
                        {isAvailable ? '✅ Available' : '🔴 Busy'}
                      </span>
                    </div>
                    {v.Phone && (
                      <a href={`tel:${v.Phone}`} className="volunteer-call-btn" style={{ background: isAvailable ? 'var(--accent-blue)' : '#334155' }}>
                        📞 Contact: {v.Phone}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
