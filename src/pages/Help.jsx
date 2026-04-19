// ─── Help.jsx ──────────────────────────────────────────────────────────────
// Save as: src/pages/Help.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageNav } from './About'

const faqs = [
  {
    q: 'How do I book a ride?',
    a: 'Go to the Rider Dashboard. Type your pickup area in the first search box — e.g. "Banjara Hills" or a pincode. Then type your destination. Once both show a green ✓, the estimated fare and route appear on the map. Tap Request Ride.'
  },
  {
    q: 'What is the 15-second confirm timer?',
    a: 'When the system finds a driver for your request, a countdown appears for 15 seconds. You can Confirm to proceed or Cancel. If the timer runs out with no response, the system automatically tries the next nearest available driver.'
  },
  {
    q: 'Can I call my driver?',
    a: 'Yes. Once a driver accepts your trip, a green "Call Driver" button appears on the active trip card. Tapping it opens your phone dialler directly with their number.'
  },
  {
    q: 'How is the fare calculated?',
    a: 'Fares use Haversine distance (straight-line) between pickup and dropoff, starting at ₹30 base + ₹12/km. The final fare the driver sees on completion uses the same formula. Surge multipliers may apply (shown clearly before payment).'
  },
  {
    q: 'What payment methods are supported?',
    a: 'UPI, Card, Cash, and Wallet. You choose after the driver marks the trip Completed. The fare was already estimated before you booked — no surprises.'
  },
  {
    q: 'Can a driver take multiple rides at once?',
    a: 'No. A driver can only have one active trip (REQUESTED / ACCEPTED / IN_PROGRESS) at a time. If they try to accept a second ride the backend returns a 409 Conflict error. The matching engine also skips busy drivers when searching for a match.'
  },
  {
    q: 'How does a driver accept a ride?',
    a: 'The driver goes Online from the Status tab, loads a trip ID from the Load tab, then switches to the Trip tab where a prominent yellow Accept Ride banner appears. They must explicitly tap Accept — it won\'t auto-accept.'
  },
  {
    q: 'What happens if a driver cancels or doesn\'t respond?',
    a: 'The system skips that driver and picks the next nearest available driver from Redis GEO. The rider sees the trip stay in REQUESTED state until a driver accepts.'
  },
  {
    q: 'How do I register?',
    a: 'Tap "Create a free account" on the login page. Choose Rider or Driver, fill in your name, email, phone, and password. Drivers also select their vehicle type. You can also sign up via Google.'
  },
  {
    q: 'What is surge pricing?',
    a: 'When driver availability is low a surge multiplier (e.g. 1.5×) is applied to the base fare. It\'s shown on the trip card before you pay so you always know what you\'re being charged.'
  },
  {
    q: 'How does the location search work?',
    a: 'The search boxes use the Nominatim geocoding API (free, no API key). Type at least 3 characters and a live dropdown of matching areas appears. Select one and the map recenters to that location, with pickup and dropoff pins shown.'
  },
  {
    q: 'Where is my data stored?',
    a: 'Ride records are stored in PostgreSQL with PostGIS spatial extensions. Driver live locations are stored in Redis GEO for sub-millisecond proximity queries and removed when a trip ends.'
  },
]

export default function Help() {
  const [open, setOpen] = useState(null)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box;margin:0;padding:0; }
        body { font-family:'Inter',sans-serif;background:#f8fafc; }
        .hp-hero { background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:60px 24px 80px;text-align:center; }
        .hp-hero h1 { font-size:42px;font-weight:800;color:#fff;letter-spacing:-1.5px;margin-bottom:10px; }
        .hp-hero p { font-size:16px;color:rgba(255,255,255,0.8);max-width:480px;margin:0 auto; }
        .hp-body { max-width:760px;margin:-28px auto 0;padding:0 20px 80px; }
        .sec-title { font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;margin:28px 0 14px; }
        .faq-card { background:#fff;border:1px solid #f1f5f9;border-radius:14px;margin-bottom:8px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.04); }
        .faq-q { display:flex;justify-content:space-between;align-items:center;padding:16px 20px;cursor:pointer; }
        .faq-q:hover { background:#f8fafc; }
        .faq-q-text { font-size:14px;font-weight:700;color:#1e293b;padding-right:12px; }
        .faq-icon { font-size:16px;color:#667eea;flex-shrink:0; }
        .faq-a { padding:0 20px 16px;font-size:14px;color:#64748b;line-height:1.7;border-top:1px solid #f1f5f9;padding-top:12px; }
        .contact-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px; }
        .contact-card { background:#fff;border:1px solid #f1f5f9;border-radius:14px;padding:20px;text-align:center;box-shadow:0 1px 6px rgba(0,0,0,0.04);text-decoration:none;display:block;transition:transform 0.2s; }
        .contact-card:hover { transform:translateY(-2px); }
        .contact-icon { font-size:26px;margin-bottom:10px; }
        .contact-title { font-size:14px;font-weight:700;color:#1e293b;margin-bottom:4px; }
        .contact-sub { font-size:12px;color:#94a3b8; }
        @media (max-width:600px) { .contact-grid { grid-template-columns:1fr; } }
      `}</style>

      <PageNav active="/help" />

      <div className="hp-hero">
        <h1>❓ Help Centre</h1>
        <p>Everything you need to know about RideMatch — for riders and drivers.</p>
      </div>

      <div className="hp-body">
        <div className="sec-title">Frequently Asked Questions</div>

        {faqs.map((faq, i) => (
          <div key={i} className="faq-card">
            <div className="faq-q" onClick={() => setOpen(open === i ? null : i)}>
              <span className="faq-q-text">{faq.q}</span>
              <span className="faq-icon">{open === i ? '▲' : '▼'}</span>
            </div>
            {open === i && <div className="faq-a">{faq.a}</div>}
          </div>
        ))}

        <div className="sec-title">Contact Support</div>
        <div className="contact-grid">
          {[
            { icon: '💬', title: 'Live Chat', sub: 'Chat with our support bot', href: '/chat' },
            { icon: '✉️', title: 'Email Us', sub: 'support@ridematch.app', href: 'mailto:support@ridematch.app' },
            { icon: '📞', title: 'Call Us', sub: '+91 1800 123 4567', href: 'tel:+911800123456' },
          ].map(c => (
            <a key={c.title} href={c.href} className="contact-card">
              <div className="contact-icon">{c.icon}</div>
              <div className="contact-title">{c.title}</div>
              <div className="contact-sub">{c.sub}</div>
            </a>
          ))}
        </div>
      </div>
    </>
  )
}