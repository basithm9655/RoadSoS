import { EMERGENCY_NUMBERS } from '../utils/emergencyNumbers';

export default function EmergencyNumbers() {
  return (
    <div className="page emergency-page">
      <div className="page-header">
        <h1 className="page-title">📞 Emergency Numbers</h1>
      </div>
      <p className="page-sub">India's complete emergency directory</p>

      <div className="emergency-grid">
        {EMERGENCY_NUMBERS.map(num => (
          <div key={num.id} className="emergency-card" style={{ '--card-color': num.color }}>
            <div className="emergency-card-top">
              <span className="emergency-icon">{num.icon}</span>
              <div className="emergency-info">
                <h3 className="emergency-name">{num.name}</h3>
                <p className="emergency-desc">{num.description}</p>
              </div>
            </div>
            <div className="emergency-card-bottom">
              <span className="emergency-number">{num.number}</span>
              <a href={`tel:${num.number}`} className="emergency-call-btn" style={{ background: num.color }}>
                📞 Call
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="emergency-note">
        <p>📌 Save 112 — it works when 100/101/108 are unreachable</p>
      </div>
    </div>
  );
}
