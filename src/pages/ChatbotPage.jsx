import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

// ─── Gemini System Prompt ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are RoadSOS First Aid Assistant — an emergency first aid AI for road accidents in India.
Your role: Provide calm, clear, step-by-step first aid instructions.
Rules:
- ALWAYS remind users to call 108 (ambulance) as the very first line if life-threatening
- Give numbered, easy-to-follow steps
- Be brief and clear — user may be panicking
- Do NOT diagnose medical conditions or recommend medications
- Use simple everyday language, avoid medical jargon
- If unsure, always default to: "Call 108 immediately"
- Format responses with line breaks for easy reading`;

// ─── Quick Prompts ────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: '🔴 Unconscious',    text: 'Someone is unconscious and not responding. What do I do?' },
  { label: '🩸 Bleeding',       text: 'There is heavy bleeding from a wound. How do I stop it?' },
  { label: '🦴 Fracture',       text: 'I suspect someone has a broken bone.' },
  { label: '❤️ Heart Attack',   text: 'Someone has chest pain and difficulty breathing — possible heart attack.' },
  { label: '🔥 Burns',          text: 'Someone has serious burns. What should I do immediately?' },
  { label: '😮 Choking',        text: 'An adult is choking and cannot breathe.' },
  { label: '🤕 Head Injury',    text: 'Someone hit their head hard and is confused.' },
  { label: '🐍 Snake Bite',     text: 'Someone was bitten by a snake. What do I do?' },
];

// ─── Volunteer Data ───────────────────────────────────────────────────────────
const ROLE_COLORS   = { Doctor: '#EF4444', Nurse: '#3B82F6', Paramedic: '#10B981', 'First Aider': '#8B5CF6' };
const ROLE_ICONS    = { Doctor: '👨‍⚕️', Nurse: '👩‍⚕️', Paramedic: '🚑', 'First Aider': '🩹' };

const STATIC_VOLUNTEERS = [
  { Name: 'Dr. Arun Kumar',   Role: 'Doctor',      Phone: '9876543210', Area: 'Coimbatore', Available: 'yes' },
  { Name: 'Nurse Priya R',    Role: 'Nurse',        Phone: '9123456789', Area: 'Coimbatore', Available: 'yes' },
  { Name: 'Ramesh P',         Role: 'Paramedic',    Phone: '8765432109', Area: 'Tiruppur',   Available: 'no'  },
  { Name: 'Dr. Meena S',      Role: 'Doctor',       Phone: '7654321098', Area: 'Salem',      Available: 'yes' },
  { Name: 'James T',          Role: 'First Aider',  Phone: '6543210987', Area: 'Erode',      Available: 'yes' },
  { Name: 'Dr. Rajesh Sharma',Role: 'Doctor',       Phone: '9944332211', Area: 'Chennai',    Available: 'yes' },
  { Name: 'Nurse Sarah M',    Role: 'Nurse',        Phone: '9845123456', Area: 'Bangalore',  Available: 'yes' },
  { Name: 'Vikram Singh',     Role: 'Paramedic',    Phone: '8877665544', Area: 'Mumbai',     Available: 'yes' },
];

const SHEET_CSV_URL = import.meta.env.VITE_COMMUNITY_SHEET_URL || '';
const JOIN_FORM_URL = import.meta.env.VITE_COMMUNITY_FORM_URL  || 'https://forms.google.com';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    return headers.reduce((o, h, i) => ({ ...o, [h]: values[i] || '' }), {});
  });
}

// Simple markdown → HTML (bold, italic, numbered lists, line breaks)
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^(\d+)\.\s/gm, '<span class="md-num">$1.</span> ')
    .replace(/\n/g, '<br />');
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatbotPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab]   = useState('ai');

  // AI
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [typing, setTyping]         = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  // Volunteers
  const [volunteers, setVolunteers]           = useState([]);
  const [loadingVol, setLoadingVol]           = useState(false);
  const [search, setSearch]                   = useState('');
  const [roleFilter, setRoleFilter]           = useState('all');

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Load volunteers when tab opens
  useEffect(() => {
    if (activeTab !== 'community') return;
    const cached = localStorage.getItem('roadsos_community');
    if (cached) { try { setVolunteers(JSON.parse(cached)); } catch (_) {} }
    loadCommunity();
  }, [activeTab]);

  async function loadCommunity() {
    setLoadingVol(true);
    try {
      if (!SHEET_CSV_URL) throw new Error('No sheet URL');
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error('fetch failed');
      const data = parseCSV(await res.text());
      const merged = [...data, ...STATIC_VOLUNTEERS.filter(sv => !data.some(d => d.Phone === sv.Phone))];
      setVolunteers(merged);
      localStorage.setItem('roadsos_community', JSON.stringify(merged));
    } catch {
      setVolunteers(STATIC_VOLUNTEERS);
    } finally {
      setLoadingVol(false);
    }
  }

  // ─── Gemini 2.5 Flash Send ────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || typing) return;

    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) {
      showToast('⚠️ Add VITE_GEMINI_API_KEY in Vercel environment variables', 'error');
      return;
    }

    const userMsg = { role: 'user', content: msg, ts: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setTyping(true);

    try {
      const contents = history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents,
            generationConfig: { maxOutputTokens: 1024, temperature: 0.35 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        || '⚠️ No response. Please call 108 immediately.';

      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch (err) {
      console.error('Gemini error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${err.message}\n\nPlease **call 108** for professional emergency help.`,
        ts: Date.now(),
        isError: true,
      }]);
      showToast('AI unavailable — call 108', 'error');
    } finally {
      setTyping(false);
    }
  }, [input, messages, typing, showToast]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // Volunteer filters
  const roles = ['all', ...new Set(volunteers.map(v => v.Role).filter(Boolean))];
  const filtered = volunteers.filter(v => {
    const matchRole = roleFilter === 'all' || v.Role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || (v.Name||'').toLowerCase().includes(q) || (v.Area||'').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  return (
    <div className="page firstaid-hub-page" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <h1 className="page-title">🩺 First Aid Hub</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'ai' && messages.length > 0 && (
            <button
              className="key-btn"
              onClick={() => setMessages([])}
              title="Clear chat"
              style={{ fontSize: '13px' }}
            >
              🗑️
            </button>
          )}
          {activeTab === 'community' && (
            <button className="key-btn" onClick={loadCommunity} disabled={loadingVol}>
              {loadingVol ? '⏳' : '🔄'}
            </button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex', gap: '6px', flexShrink: 0,
        background: 'rgba(30,41,59,0.5)', padding: '5px', borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px',
      }}>
        {[
          { id: 'ai',        label: '💬 AI Guide' },
          { id: 'community', label: '🤝 Volunteers' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, border: 'none', cursor: 'pointer', borderRadius: '10px', padding: '10px 8px',
            fontSize: '12px', fontWeight: '800', transition: 'all 0.2s ease',
            background: activeTab === tab.id
              ? 'linear-gradient(135deg, #EF4444, #DC2626)'
              : 'transparent',
            color: 'white',
            boxShadow: activeTab === tab.id ? '0 4px 12px rgba(239,68,68,0.4)' : 'none',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: AI Chat ── */}
      {activeTab === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* Chat area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '4px 0 8px',
            display: 'flex', flexDirection: 'column',
          }}>
            {messages.length === 0 ? (
              <WelcomeScreen onPrompt={sendMessage} />
            ) : (
              <>
                {messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}
                {typing && <TypingBubble />}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input Bar */}
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0,
            padding: '10px 0 4px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <a href="tel:108" style={{
              width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg,#EF4444,#DC2626)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
              marginBottom: '1px',
            }} title="Call 108 Emergency">🚑</a>

            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Describe the emergency…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1, resize: 'none', overflow: 'hidden',
                background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '10px 14px',
                color: 'white', fontSize: '14px', fontFamily: 'inherit',
                lineHeight: '1.4', outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
              onBlur={e => e.target.style.borderColor  = 'rgba(255,255,255,0.08)'}
            />

            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || typing}
              style={{
                width: 42, height: 42, borderRadius: '12px', flexShrink: 0,
                background: input.trim() && !typing
                  ? 'linear-gradient(135deg,#3B82F6,#2563EB)' : 'rgba(30,41,59,0.5)',
                border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: input.trim() ? '0 4px 12px rgba(59,130,246,0.4)' : 'none',
                marginBottom: '1px',
              }}
            >➤</button>
          </div>
        </div>
      )}

      {/* ── TAB 2: Volunteers ── */}
      {activeTab === 'community' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <a href={JOIN_FORM_URL} target="_blank" rel="noreferrer" className="join-community-btn">
            🩺 Register as a Volunteer Rescuer
          </a>

          {/* Search */}
          <input
            className="search-input"
            placeholder="🔍 Search name or city…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: '12px' }}
          />

          {/* Role filter */}
          <div className="filter-tabs" style={{ marginBottom: '16px' }}>
            {roles.map(r => (
              <button key={r}
                className={`filter-tab ${roleFilter === r ? 'filter-tab-active' : ''}`}
                onClick={() => setRoleFilter(r)}
              >
                {r === 'all' ? '👥 All' : `${ROLE_ICONS[r] || ''} ${r}`}
              </button>
            ))}
          </div>

          {/* Cards */}
          {loadingVol && volunteers.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton-pulse" style={{ height: 110, borderRadius: 16 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: '#64748B' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <p>No volunteers match your search</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map((v, i) => <VolunteerCard key={i} v={v} />)}
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#475569', marginTop: '20px', paddingBottom: '16px' }}>
            📌 Community data updated regularly · Always call 108 in emergencies
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────
function WelcomeScreen({ onPrompt }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '20px', marginBottom: '12px',
        background: 'linear-gradient(135deg,#EF4444,#DC2626)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', boxShadow: '0 8px 24px rgba(239,68,68,0.35)',
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
      }}>🤖</div>

      <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'white', marginBottom: '6px' }}>
        First Aid Assistant
      </h2>
      <p style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', marginBottom: '4px' }}>
        Powered by Gemini 2.5 Flash
      </p>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '8px', padding: '6px 12px', marginBottom: '20px',
      }}>
        <span style={{ fontSize: '14px' }}>🚑</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#FCA5A5' }}>
          Life-threatening? Call 108 first
        </span>
      </div>

      <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        Quick Emergency Guide
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
        {QUICK_PROMPTS.map((p, i) => (
          <button key={i} onClick={() => onPrompt(p.text)} style={{
            background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px', padding: '12px 10px', cursor: 'pointer',
            color: 'white', fontSize: '12px', fontWeight: '700', textAlign: 'left',
            transition: 'all 0.2s ease', lineHeight: '1.3',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', marginBottom: '10px',
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '8px',
            background: 'linear-gradient(135deg,#EF4444,#DC2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
          }}>🤖</div>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>First Aid AI</span>
        </div>
      )}
      <div style={{
        maxWidth: '88%', padding: '12px 14px', borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
        background: isUser
          ? 'linear-gradient(135deg,#3B82F6,#2563EB)'
          : msg.isError ? 'rgba(239,68,68,0.15)' : 'rgba(30,41,59,0.7)',
        border: isUser ? 'none' : `1px solid ${msg.isError ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
        fontSize: '14px', lineHeight: '1.6', color: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
      />
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────
function TypingBubble() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
      <div style={{
        width: 24, height: 24, borderRadius: '8px',
        background: 'linear-gradient(135deg,#EF4444,#DC2626)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
      }}>🤖</div>
      <div style={{
        background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '4px 16px 16px 16px', padding: '12px 16px',
        display: 'flex', gap: '5px', alignItems: 'center',
      }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: '#94A3B8',
            display: 'inline-block',
            animation: `typingDot 1.4s infinite ${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Volunteer Card ───────────────────────────────────────────────────────────
function VolunteerCard({ v }) {
  const available = (v.Available || '').toLowerCase() === 'yes';
  const color     = ROLE_COLORS[v.Role] || '#475569';
  const icon      = ROLE_ICONS[v.Role]  || '👤';

  return (
    <div className="volunteer-card">
      <div className="volunteer-card-header">
        <div className="volunteer-avatar" style={{ background: color, fontSize: '20px' }}>
          {icon}
        </div>
        <div className="volunteer-meta">
          <h3 className="volunteer-name">{v.Name}</h3>
          <span className="volunteer-role" style={{ background: color }}>{v.Role}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div className={`availability-dot ${available ? 'available' : 'unavailable'}`} />
          <span style={{
            fontSize: '10px', fontWeight: '700',
            color: available ? '#10B981' : '#64748B',
          }}>
            {available ? 'Available' : 'Busy'}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '12px', color: '#94A3B8', fontWeight: '600',
      }}>
        <span>📍 {v.Area}</span>
        {v.opening_hours && <span>🕐 {v.opening_hours}</span>}
      </div>

      {v.Phone && (
        <a
          href={`tel:${v.Phone}`}
          className="volunteer-call-btn"
          style={{
            background: available
              ? 'linear-gradient(135deg,#10B981,#059669)'
              : 'rgba(30,41,59,0.8)',
            opacity: available ? 1 : 0.7,
          }}
        >
          📞 {available ? 'Call Now' : 'Try Calling'}: {v.Phone}
        </a>
      )}
    </div>
  );
}
