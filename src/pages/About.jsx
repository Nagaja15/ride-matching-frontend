import { Link } from 'react-router-dom'

// Shared nav used across About / Help / Chat
export function PageNav({ active }) {
  return (
    <nav style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 20px rgba(102,126,234,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚗</div>
        <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>RideMatch</span>
      </Link>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { to: '/about', label: 'ℹ️ About' },
          { to: '/help',  label: '❓ Help' },
          { to: '/chat',  label: '💬 Chat' },
          { to: '/login', label: 'Login' },
        ].map(n => (
          <Link key={n.to} to={n.to} style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, background: active === n.to ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', padding: '7px 14px', borderRadius: 10, transition: 'background 0.2s', border: active === n.to ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent' }}>
            {n.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

const features = [
  { icon: '🚗', title: 'Ride Matching Engine', desc: 'Redis GEO GEOSEARCH finds the nearest available driver in sub-millisecond time. Automatically skips drivers who are already on active trips.' },
  { icon: '⚡', title: '15-Second Confirm Timer', desc: 'When a driver is matched the rider gets a 15-second countdown to confirm. Auto-cancels and tries the next driver if no response — exactly like real Uber.' },
  { icon: '📡', title: 'Real-Time WebSocket', desc: 'Live status updates pushed to the rider the moment anything changes — driver accepted, ride started, completed. No polling.' },
  { icon: '🗺️', title: 'Live Route on Map', desc: 'OSRM calculates a real road-network route between pickup and dropoff. Autocomplete search via Nominatim — no API key needed.' },
  { icon: '🔒', title: 'No Multiple Rides', desc: 'A driver cannot accept a second ride while they have an active trip. The backend blocks it at both the assignment and accept level.' },
  { icon: '💳', title: 'Payment + Rating', desc: 'UPI, Card, Cash, or Wallet — rider selects at completion. Fare estimated before booking via Haversine. Rider rates driver 1-5 stars after payment.' },
  { icon: '📞', title: 'Call Driver', desc: 'Once a trip is accepted, a Call Driver button appears. Tapping it opens the phone dialler directly with the driver number.' },
  { icon: '🔥', title: 'Surge Pricing', desc: 'Configurable surge multiplier (default 1.0x). Applied at fare calculation time and shown to the rider before booking.' },
]

const techStack = [
  { cat: 'Backend', items: ['Spring Boot 3.2 — REST API + WebSocket', 'PostgreSQL + PostGIS — Spatial data', 'Redis GEO (Memurai) — Live driver locations', 'Apache Kafka — Async event streaming', 'Spring Security + JWT — Auth', 'Flyway — DB migrations', 'Lombok + Hibernate Spatial — Less boilerplate'] },
  { cat: 'Frontend', items: ['React 18 + Vite — SPA', 'React Leaflet — Maps', 'Nominatim — Free geocoding', 'OSRM — Road routing engine', 'WebSocket + STOMP — Real-time push', 'Axios — HTTP client'] },
  { cat: 'APIs Used', items: ['POST /api/rider/request', 'GET  /api/rider/trips', 'GET  /api/trips/{id}', 'PATCH /api/driver/trips/{id}/accept', 'PATCH /api/driver/trips/{id}/start', 'PATCH /api/driver/trips/{id}/complete', 'POST /api/rider/trips/{id}/pay', 'POST /api/rider/trips/{id}/rate'] },
]

export default function About() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box;margin:0;padding:0; }
        body { font-family:'Inter',sans-serif;background:#f8fafc; }
        .ab-hero { background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:80px 24px 100px;text-align:center;position:relative;overflow:hidden; }
        .ab-hero::before { content:'';position:absolute;width:500px;height:500px;background:rgba(255,255,255,0.07);border-radius:50%;top:-150px;right:-100px;pointer-events:none; }
        .ab-badge { display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:100px;padding:7px 16px;color:#fff;font-size:13px;font-weight:600;margin-bottom:24px; }
        .ab-dot { width:7px;height:7px;background:#4ade80;border-radius:50%;animation:pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.5)} }
        .ab-hero h1 { font-size:52px;font-weight:800;color:#fff;letter-spacing:-2px;margin-bottom:16px;line-height:1.1; }
        .ab-hero p { font-size:17px;color:rgba(255,255,255,0.8);max-width:600px;margin:0 auto 32px;line-height:1.7; }
        .ab-btns { display:flex;gap:12px;justify-content:center;flex-wrap:wrap; }
        .ab-btn-w { padding:13px 22px;background:#fff;border:none;border-radius:12px;color:#667eea;font-size:14px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:transform 0.2s; }
        .ab-btn-w:hover { transform:translateY(-2px); }
        .ab-btn-o { padding:13px 22px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:12px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;text-decoration:none;display:inline-flex;align-items:center;gap:6px; }
        .section { max-width:1100px;margin:0 auto;padding:64px 24px; }
        .sec-head { font-size:30px;font-weight:800;color:#1e293b;letter-spacing:-0.8px;margin-bottom:8px; }
        .sec-sub { font-size:15px;color:#94a3b8;margin-bottom:40px; }
        .feat-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px; }
        .feat-card { background:#fff;border:1px solid #f1f5f9;border-radius:16px;padding:20px;box-shadow:0 1px 8px rgba(0,0,0,0.04);transition:transform 0.2s,box-shadow 0.2s; }
        .feat-card:hover { transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.09); }
        .feat-icon { font-size:28px;margin-bottom:12px; }
        .feat-title { font-size:15px;font-weight:700;color:#1e293b;margin-bottom:6px; }
        .feat-desc { font-size:13px;color:#64748b;line-height:1.6; }
        .tech-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px; }
        .tech-card { background:#fff;border:1px solid #f1f5f9;border-radius:16px;padding:20px;box-shadow:0 1px 8px rgba(0,0,0,0.04); }
        .tech-cat { font-size:11px;font-weight:700;color:#667eea;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:14px; }
        .tech-item { font-size:13px;color:#374151;padding:7px 0;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:8px; }
        .tech-item:last-child { border-bottom:none; }
        .tech-dot { width:6px;height:6px;border-radius:50%;background:#667eea;flex-shrink:0; }
        .arch-box { background:linear-gradient(135deg,#f8fafc,#eff6ff);border:1px solid #dbeafe;border-radius:16px;padding:28px; }
        .arch-flow { display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:24px; }
        .arch-node { background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:8px 14px;font-size:13px;font-weight:700;color:#1e293b; }
        .arch-node.hi { background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-color:transparent; }
        .arch-arrow { color:#667eea;font-size:16px;flex-shrink:0; }
        .arch-details { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
        .arch-detail { background:#fff;border-radius:10px;padding:10px 14px; }
        .arch-detail-lbl { font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:'0.4px';margin-bottom:4px; }
        .arch-detail-val { font-size:13px;font-weight:600;color:#1e293b; }
        .bg-white-section { background:#fff; }
      `}</style>

      <PageNav active="/about" />

      {/* Hero */}
      <div className="ab-hero">
        <div className="ab-badge"><span className="ab-dot"></span>Real-Time Ride Matching System</div>
        <h1>RideMatch</h1>
        <p>Built with Spring Boot, Redis GEO, PostGIS, Kafka, and React. An Uber-scale ride matching engine — every design decision made for a reason.</p>
        <div className="ab-btns">
          <Link to="/register" className="ab-btn-w">🚗 Try as Rider</Link>
          <Link to="/register" className="ab-btn-o">🚕 Try as Driver</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="ab-btn-o">⭐ GitHub</a>
        </div>
      </div>

      {/* Features */}
      <div className="section">
        <div className="sec-head">What's built</div>
        <p className="sec-sub">Production-grade features aligned with the Uber dispatch architecture</p>
        <div className="feat-grid">
          {features.map(f => (
            <div key={f.title} className="feat-card">
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="bg-white-section">
        <div className="section">
          <div className="sec-head">System Architecture</div>
          <p className="sec-sub">Geospatial index → matching engine → WebSocket push — the same flow as real Uber</p>
          <div className="arch-box">
            <div className="arch-flow">
              {['React App', '→', 'Spring Boot', '→', 'Redis GEO', '→', 'PostGIS', '→', 'Kafka', '→', 'WebSocket'].map((n, i) => (
                n === '→' ? <span key={i} className="arch-arrow">→</span>
                  : <div key={i} className={`arch-node ${n === 'Spring Boot' ? 'hi' : ''}`}>{n}</div>
              ))}
            </div>
            <div className="arch-details">
              {[
                { l: 'Driver location writes', v: 'Redis GEO — sub-ms, in-memory' },
                { l: 'Proximity search', v: 'GEOSEARCH within 5 km radius' },
                { l: 'Ride data persistence', v: 'PostgreSQL + PostGIS (durable)' },
                { l: 'Async event streaming', v: 'Kafka topic: ride.requested' },
                { l: 'Real-time push', v: 'WebSocket / STOMP /topic/rider/{id}' },
                { l: 'Auth', v: 'JWT + Spring Security (RIDER / DRIVER roles)' },
              ].map(r => (
                <div key={r.l} className="arch-detail">
                  <div className="arch-detail-lbl">{r.l}</div>
                  <div className="arch-detail-val">{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="section">
        <div className="sec-head">Tech Stack & APIs</div>
        <p className="sec-sub">Every dependency chosen deliberately — ready to explain in any interview</p>
        <div className="tech-grid">
          {techStack.map(t => (
            <div key={t.cat} className="tech-card">
              <div className="tech-cat">{t.cat}</div>
              {t.items.map(it => (
                <div key={it} className="tech-item">
                  <span className="tech-dot"></span>{it}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}