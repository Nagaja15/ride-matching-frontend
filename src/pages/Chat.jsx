// src/pages/Chat.jsx
import { useState, useEffect, useRef } from 'react'
import { PageNav } from './About'

const QUICK_REPLIES = [
  "How do I book a ride?",
  "Why can't driver accept my trip?",
  "How is the fare calculated?",
  "Can I call my driver?",
  "What payment methods work?",
]

function botReply(msg) {
  const m = msg.toLowerCase()
  if (m.includes('book') || m.includes('request') || m.includes('ride'))
    return "To book a ride: go to the Rider Dashboard → type your pickup area (e.g. \"Banjara Hills\") → type your destination → select from the autocomplete list → check the fare estimate → tap Request Ride. 🚗"
  if (m.includes('multiple') || m.includes('already') || m.includes('busy') || m.includes('accept') || m.includes('driver'))
    return "A driver can only hold ONE active trip at a time. The backend blocks accepting a second ride with a 409 error. The matching engine also automatically skips busy drivers when searching. If your ride stays in REQUESTED it means all nearby drivers are occupied."
  if (m.includes('fare') || m.includes('price') || m.includes('cost') || m.includes('calculat'))
    return "Fare = ₹30 base + ₹12/km. Distance is calculated using the Haversine formula between pickup and dropoff. Surge multipliers (e.g. 1.5×) may apply during peak hours — always shown before payment. 💰"
  if (m.includes('call') || m.includes('contact driver') || m.includes('phone'))
    return "Once your driver accepts the trip, a green 📞 Call Driver button appears on the trip card. Tap it to open your dialler with their number. It shows for ACCEPTED and IN_PROGRESS status only."
  if (m.includes('pay') || m.includes('payment') || m.includes('upi') || m.includes('cash') || m.includes('card') || m.includes('wallet'))
    return "Payment options: 📱 UPI, 💳 Card, 💵 Cash, 👛 Wallet. You choose after the driver marks the trip Completed. Tap your method then press Pay. The fare was already shown before booking so there are no surprises."
  if (m.includes('timer') || m.includes('15') || m.includes('confirm') || m.includes('countdown'))
    return "When a driver is matched, a 15-second countdown timer appears. You can Confirm ✓ to proceed or Cancel. If the timer runs out, the system picks the next nearest available driver automatically."
  if (m.includes('cancel'))
    return "Riders can cancel before the driver starts the ride. Drivers can cancel from REQUESTED or ACCEPTED status. After cancellation the driver is removed from Redis GEO (offline) and must go online again."
  if (m.includes('register') || m.includes('sign up') || m.includes('account'))
    return "Create an account at /register. Choose Rider or Driver, fill in name, email, phone, and password. Drivers also select vehicle type (Bike, Auto, Hatchback, Sedan, SUV). You can also register via Google."
  if (m.includes('surge') || m.includes('peak') || m.includes('price high'))
    return "Surge pricing kicks in when demand outpaces supply. The multiplier (e.g. 1.5×) is shown on the trip card before payment so you always know what to expect. 🔥"
  if (m.includes('websocket') || m.includes('live') || m.includes('real') || m.includes('notification'))
    return "RideMatch uses WebSocket (STOMP over SockJS) to push real-time updates to the rider. When a driver accepts, starts, or completes a trip you get notified instantly — no page refresh needed. 📡"
  if (m.includes('map') || m.includes('location') || m.includes('search') || m.includes('pincode'))
    return "The location search uses the free Nominatim geocoding API (no API key needed). Type 3+ characters and a live dropdown appears. Select a result and the map moves to that location with pickup/dropoff pins shown. OSRM draws the actual road route."
  if (m.includes('hello') || m.includes('hi') || m.includes('hey') || m.includes('help'))
    return "Hi! 👋 I'm the RideMatch support bot. I can help with bookings, payments, driver issues, or anything else about the app. What do you need?"
  if (m.includes('thanks') || m.includes('thank you') || m.includes('great') || m.includes('ok'))
    return "Happy to help! Let me know if you have any other questions. 😊"
  return "I'll flag this for a human agent. In the meantime, check the Help Centre at /help for instant answers. Is there anything else I can help with?"
}

// Fixed: delay is computed ONCE outside the render cycle, not during render
const REPLY_DELAY_MS = 900

export default function Chat() {
  const getTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: "Hi there! 👋 Welcome to RideMatch support. I can help with bookings, payments, driver issues, or any other questions. What's on your mind?",
      time: getTime()
    }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = (text) => {
    const msg = (text || input).trim()
    if (!msg) return

    const userTime = getTime()
    setMessages(prev => [...prev, { from: 'user', text: msg, time: userTime }])
    setInput('')
    setTyping(true)

    // ✅ FIX: delay is a plain constant — no Math.random() inside render
    setTimeout(() => {
      const botTime = getTime()
      setTyping(false)
      setMessages(prev => [...prev, { from: 'bot', text: botReply(msg), time: botTime }])
    }, REPLY_DELAY_MS)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box;margin:0;padding:0; }
        html,body,#root { height:100%; }
        body { font-family:'Inter',sans-serif;background:#f8fafc; }
        .ch-root { height:100vh;display:flex;flex-direction:column;font-family:'Inter',sans-serif; }
        .ch-header-bar { background:#fff;border-bottom:1px solid #f1f5f9;padding:12px 24px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 6px rgba(0,0,0,0.04); }
        .ch-av { width:42px;height:42px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0; }
        .ch-name { font-size:15px;font-weight:700;color:#1e293b; }
        .ch-status { display:flex;align-items:center;gap:5px;font-size:12px;color:#10b981;margin-top:2px; }
        .ch-online-dot { width:7px;height:7px;border-radius:50%;background:#10b981;animation:pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .ch-msgs { flex:1;overflow-y:auto;padding:16px 20px 8px;display:flex;flex-direction:column;gap:12px;max-width:720px;margin:0 auto;width:100%; }
        .msg-w { display:flex;flex-direction:column; }
        .msg-w.user { align-items:flex-end; }
        .msg-w.bot  { align-items:flex-start; }
        .msg-row { display:flex;align-items:flex-end;gap:8px; }
        .msg-row.user { flex-direction:row-reverse; }
        .bot-av { width:30px;height:30px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0; }
        .bubble { max-width:75%;padding:12px 16px;border-radius:16px;font-size:14px;line-height:1.6; }
        .bubble.user { background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-bottom-right-radius:4px; }
        .bubble.bot  { background:#fff;color:#1e293b;border:1px solid #f1f5f9;border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.04); }
        .msg-time { font-size:10px;color:#94a3b8;margin-top:4px;padding:0 4px; }
        .typing-bub { display:flex;align-items:center;gap:5px;padding:12px 16px;background:#fff;border:1px solid #f1f5f9;border-radius:16px;border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,0.04); }
        .t-dot { width:7px;height:7px;border-radius:50%;background:#94a3b8;animation:tbounce 1.2s ease-in-out infinite; }
        .t-dot:nth-child(2){animation-delay:0.2s}
        .t-dot:nth-child(3){animation-delay:0.4s}
        @keyframes tbounce { 0%,80%,100%{transform:scale(1);opacity:0.5} 40%{transform:scale(1.3);opacity:1} }
        .quick-row { display:flex;gap:8px;flex-wrap:wrap;padding:8px 20px;max-width:720px;margin:0 auto;width:100%; }
        .quick-btn { padding:7px 14px;background:#fff;border:1.5px solid #e2e8f0;border-radius:100px;font-size:12px;font-weight:600;color:#374151;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.2s;white-space:nowrap; }
        .quick-btn:hover { border-color:#667eea;color:#667eea;background:#f8f7ff; }
        .ch-input-area { background:#fff;border-top:1px solid #f1f5f9;padding:13px 20px;box-shadow:0 -2px 10px rgba(0,0,0,0.04); }
        .ch-input-row { display:flex;gap:10px;max-width:720px;margin:0 auto; }
        .ch-input { flex:1;padding:12px 16px;border:1.5px solid #e2e8f0;border-radius:14px;font-size:14px;font-family:'Inter',sans-serif;color:#1e293b;outline:none;transition:border-color 0.2s; }
        .ch-input:focus { border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,0.1); }
        .ch-send { padding:12px 20px;background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:transform 0.2s;white-space:nowrap; }
        .ch-send:hover { transform:translateY(-1px); }
      `}</style>

      <PageNav active="/chat" />

      {/* Agent header */}
      <div className="ch-header-bar">
        <div className="ch-av">🚗</div>
        <div>
          <div className="ch-name">RideMatch Support</div>
          <div className="ch-status">
            <span className="ch-online-dot"></span>
            Online · usually replies instantly
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="ch-msgs">
        {messages.map((m, i) => (
          <div key={i} className={`msg-w ${m.from}`}>
            <div className={`msg-row ${m.from}`}>
              {m.from === 'bot' && <div className="bot-av">🚗</div>}
              <div className={`bubble ${m.from}`}>{m.text}</div>
            </div>
            <div className="msg-time">{m.time}</div>
          </div>
        ))}
        {typing && (
          <div className="msg-w bot">
            <div className="msg-row bot">
              <div className="bot-av">🚗</div>
              <div className="typing-bub">
                <span className="t-dot"></span>
                <span className="t-dot"></span>
                <span className="t-dot"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef}></div>
      </div>

      {/* Quick reply chips — shown only at conversation start */}
      {messages.length <= 2 && (
        <div className="quick-row">
          {QUICK_REPLIES.map(q => (
            <button key={q} className="quick-btn" onClick={() => send(q)}>{q}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="ch-input-area">
        <div className="ch-input-row">
          <input
            className="ch-input"
            placeholder="Ask about rides, payments, drivers…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button className="ch-send" onClick={() => send()}>Send →</button>
        </div>
      </div>
    </>
  )
}