import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'

export default function Register() {
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', role:'RIDER', vehicleType:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await api.post('/auth/register', form)
      toast.success('🎉 Account created! Please sign in.')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed'
      setError(msg)
      toast.error(msg)
    }
    finally { setLoading(false) }
  }

  const inp = { width:'100%', padding:'13px 16px 13px 44px', border:'1.5px solid #e2e8f0', borderRadius:12, fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif', color:'#1e293b', background:'#fff', transition:'border-color 0.2s, box-shadow 0.2s' }
  const focus = e => { e.target.style.borderColor='#11998e'; e.target.style.boxShadow='0 0 0 3px rgba(17,153,142,0.12)' }
  const blur  = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif}
        .rg-root{min-height:100vh;display:flex;flex-direction:column}
        .rg-topbar{background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);padding:0 28px;height:52px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 12px rgba(17,153,142,0.3)}
        .rg-topbar-brand{display:flex;align-items:center;gap:8px;text-decoration:none}
        .rg-topbar-brand span{font-size:17px;font-weight:800;color:#fff}
        .rg-topbar-links{display:flex;gap:6px}
        .rg-toplink{color:rgba(255,255,255,0.9);text-decoration:none;font-size:12px;font-weight:600;background:rgba(255,255,255,0.2);padding:5px 12px;border-radius:8px;transition:background 0.2s}
        .rg-toplink:hover{background:rgba(255,255,255,0.3)}
        .rg-body{flex:1;display:flex}
        .rg-left{width:42%;background:linear-gradient(160deg,#11998e 0%,#38ef7d 60%,#a8edea 100%);display:flex;flex-direction:column;justify-content:space-between;padding:52px;position:relative;overflow:hidden}
        .rg-left::before{content:'';position:absolute;width:400px;height:400px;background:rgba(255,255,255,0.1);border-radius:50%;bottom:-80px;right:-120px}
        .rg-hero-title{font-size:40px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-1.5px;margin-bottom:12px}
        .rg-hero-desc{color:rgba(255,255,255,0.8);font-size:14px;line-height:1.65;margin-bottom:28px}
        .rg-perk{display:flex;align-items:center;gap:14px;margin-bottom:12px}
        .rg-perk-icon{width:40px;height:40px;background:rgba(255,255,255,0.22);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
        .rg-perk-title{font-size:14px;font-weight:700;color:#fff}
        .rg-perk-sub{font-size:12px;color:rgba(255,255,255,0.75);margin-top:2px}
        .rg-bar{height:3px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden;margin-bottom:28px}
        .rg-bar-fill{height:100%;width:60%;background:#fff;border-radius:2px}
        .rg-right{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 56px;background:#f8fafc;overflow-y:auto}
        .rg-form-box{width:100%;max-width:440px}
        .rg-title{font-size:28px;font-weight:800;color:#1e293b;letter-spacing:-0.8px;margin-bottom:6px}
        .rg-sub{color:#94a3b8;font-size:14px;margin-bottom:24px}
        .err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:12px 16px;border-radius:12px;margin-bottom:16px;font-size:14px;display:flex;align-items:center;gap:8px}
        .role-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
        .role-card{padding:16px;background:#fff;border:2px solid #e2e8f0;border-radius:14px;cursor:pointer;transition:all 0.2s;text-align:center}
        .role-card:hover{border-color:#11998e;background:#f0fdf9}
        .role-card.sel{border-color:#11998e;background:#f0fdf9}
        .role-card-icon{font-size:26px;margin-bottom:8px}
        .role-card-title{font-size:14px;font-weight:700;color:#1e293b;margin-bottom:2px}
        .role-card.sel .role-card-title{color:#11998e}
        .role-card-desc{font-size:12px;color:#94a3b8}
        .divider{display:flex;align-items:center;gap:14px;margin:18px 0;color:#94a3b8;font-size:13px}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:#e2e8f0}
        .fld{margin-bottom:14px}
        .fld-lbl{display:block;font-size:11px;font-weight:700;color:#64748b;margin-bottom:7px;text-transform:uppercase;letter-spacing:0.4px}
        .fld-wrap{position:relative}
        .fld-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;opacity:0.4;pointer-events:none}
        .fld-sel{width:100%;padding:13px 44px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:15px;outline:none;font-family:'Inter',sans-serif;color:#1e293b;background:#fff;appearance:none;cursor:pointer;transition:border-color 0.2s}
        .sel-arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#94a3b8;pointer-events:none;font-size:12px}
        .sub-btn{width:100%;padding:14px;background:linear-gradient(135deg,#11998e 0%,#38ef7d 100%);border:none;border-radius:14px;color:#fff;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(17,153,142,0.3);font-family:'Inter',sans-serif;margin-top:8px}
        .sub-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(17,153,142,0.4)}
        .sub-btn:disabled{opacity:0.6;cursor:not-allowed}
        .login-link{text-align:center;color:#94a3b8;font-size:14px;margin-top:18px}
        .login-link a{color:#11998e;font-weight:600;text-decoration:none}
        .hint{font-size:11px;color:#94a3b8;margin-top:5px}
        .car-scene{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
        .float-car{position:absolute;font-size:32px;animation:floatCar linear infinite;opacity:0.18}
        .float-car:nth-child(1){left:8%;animation-duration:12s;animation-delay:0s;top:20%}
        .float-car:nth-child(2){left:72%;animation-duration:9s;animation-delay:-3s;top:60%}
        .float-car:nth-child(3){left:40%;animation-duration:15s;animation-delay:-6s;top:10%}
        .float-car:nth-child(4){left:20%;animation-duration:11s;animation-delay:-2s;top:75%}
        .float-car:nth-child(5){left:85%;animation-duration:13s;animation-delay:-8s;top:35%}
        .float-car:nth-child(6){left:55%;animation-duration:10s;animation-delay:-4s;top:85%}
        @keyframes floatCar{0%{transform:translateY(0px) rotate(-5deg) scale(1)}25%{transform:translateY(-30px) rotate(5deg) scale(1.05)}50%{transform:translateY(-10px) rotate(-3deg) scale(0.97)}75%{transform:translateY(-40px) rotate(8deg) scale(1.03)}100%{transform:translateY(0px) rotate(-5deg) scale(1)}}
        .road-line{position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(to top,rgba(0,0,0,0.15),transparent);z-index:0}
        .moving-car{position:absolute;bottom:20px;font-size:28px;animation:driveCar 8s linear infinite;opacity:0.35}
        .moving-car:nth-child(8){animation-delay:0s}
        .moving-car:nth-child(9){animation-delay:-4s;bottom:8px;font-size:22px;opacity:0.22}
        @keyframes driveCar{from{left:-60px}to{left:110%}}
        @media(max-width:768px){.rg-left{display:none}.rg-right{padding:40px 24px}}
      `}</style>

      <div className="rg-root">
        <div className="rg-topbar">
          <Link to="/" className="rg-topbar-brand"><span>🚗</span><span>RideMatch</span></Link>
          <div className="rg-topbar-links">
            <Link to="/about" className="rg-toplink">ℹ️ About</Link>
            <Link to="/help" className="rg-toplink">❓ Help</Link>
          </div>
        </div>

        <div className="rg-body">
          <div className="rg-left">
            <div className="car-scene">
              {['🚗','🚕','🚙','🏎️','🚗','🚕'].map((c,i) => <div key={i} className="float-car">{c}</div>)}
              <div className="road-line"></div>
              <div className="moving-car">🚗</div>
              <div className="moving-car">🚕</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, zIndex:1 }}>
              <div style={{ width:42, height:42, background:'rgba(255,255,255,0.28)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🚗</div>
              <span style={{ fontSize:22, fontWeight:800, color:'#fff' }}>RideMatch</span>
            </div>
            <div style={{ zIndex:1 }}>
              <div className="rg-bar"><div className="rg-bar-fill"></div></div>
              <h2 className="rg-hero-title">Start your<br />journey today</h2>
              <p className="rg-hero-desc">Safe, fast, and affordable rides across Hyderabad.</p>
              {[
                { icon:'⚡', title:'Instant matching', sub:'Matched in under 60 seconds' },
                { icon:'🛡️', title:'Verified drivers', sub:'Background-checked & rated' },
                { icon:'💳', title:'Flexible payments', sub:'UPI, Card, Cash or Wallet' },
              ].map(p => (
                <div key={p.title} className="rg-perk">
                  <div className="rg-perk-icon">{p.icon}</div>
                  <div><div className="rg-perk-title">{p.title}</div><div className="rg-perk-sub">{p.sub}</div></div>
                </div>
              ))}
            </div>
            <div style={{ color:'rgba(255,255,255,0.7)', fontSize:13, zIndex:1 }}>Trusted by 12,000+ daily riders</div>
          </div>

          <div className="rg-right">
            <div className="rg-form-box">
              <div className="rg-title">Create account</div>
              <p className="rg-sub">Fill in your details to get started</p>

              {error && <div className="err">⚠️ {error}</div>}

              <div className="fld">
                <label className="fld-lbl">I want to</label>
                <div className="role-cards">
                  <div className={`role-card ${form.role==='RIDER'?'sel':''}`} onClick={() => setForm({...form, role:'RIDER', vehicleType:''})}>
                    <div className="role-card-icon">🧍</div>
                    <div className="role-card-title">Book Rides</div>
                    <div className="role-card-desc">I'm a rider</div>
                  </div>
                  <div className={`role-card ${form.role==='DRIVER'?'sel':''}`} onClick={() => setForm({...form, role:'DRIVER'})}>
                    <div className="role-card-icon">🚗</div>
                    <div className="role-card-title">Drive & Earn</div>
                    <div className="role-card-desc">I'm a driver</div>
                  </div>
                </div>
              </div>

              <div className="divider">fill your details</div>

              <form onSubmit={handleSubmit}>
                <div className="fld">
                  <label className="fld-lbl">Full Name</label>
                  <div className="fld-wrap">
                    <span className="fld-icon">👤</span>
                    <input type="text" placeholder="e.g. Nagaja Goud" value={form.name}
                      onChange={e => setForm({...form, name:e.target.value})}
                      style={inp} required onFocus={focus} onBlur={blur} />
                  </div>
                </div>
                <div className="fld">
                  <label className="fld-lbl">Email Address</label>
                  <div className="fld-wrap">
                    <span className="fld-icon">✉️</span>
                    <input type="email" placeholder="you@example.com" value={form.email}
                      onChange={e => setForm({...form, email:e.target.value})}
                      style={inp} required onFocus={focus} onBlur={blur} />
                  </div>
                </div>
                <div className="fld">
                  <label className="fld-lbl">Mobile Number</label>
                  <div className="fld-wrap">
                    <span className="fld-icon">📱</span>
                    <input type="tel" placeholder="+91 98765 43210" value={form.phone}
                      onChange={e => setForm({...form, phone:e.target.value})}
                      style={inp} required onFocus={focus} onBlur={blur} />
                  </div>
                </div>
                <div className="fld">
                  <label className="fld-lbl">Password</label>
                  <div className="fld-wrap">
                    <span className="fld-icon">🔒</span>
                    <input type={showPw?'text':'password'} placeholder="Create a strong password"
                      value={form.password} onChange={e => setForm({...form, password:e.target.value})}
                      style={{ ...inp, paddingRight:46 }} required onFocus={focus} onBlur={blur} />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#94a3b8' }}>
                      {showPw?'🙈':'👁️'}
                    </button>
                  </div>
                  <p className="hint">At least 8 characters recommended</p>
                </div>
                {form.role === 'DRIVER' && (
                  <div className="fld">
                    <label className="fld-lbl">Vehicle Type</label>
                    <div className="fld-wrap">
                      <span className="fld-icon">🚙</span>
                      <select value={form.vehicleType} onChange={e => setForm({...form, vehicleType:e.target.value})}
                        className="fld-sel" required
                        onFocus={e => e.target.style.borderColor='#11998e'}
                        onBlur={e => e.target.style.borderColor='#e2e8f0'}>
                        <option value="" disabled>Select your vehicle</option>
                        <option value="Bike">🏍️ Bike / Two-Wheeler</option>
                        <option value="Auto">🛺 Auto Rickshaw</option>
                        <option value="Hatchback">🚗 Hatchback (Swift, i20…)</option>
                        <option value="Sedan">🚘 Sedan (Honda City…)</option>
                        <option value="SUV">🚙 SUV (Innova, Fortuner…)</option>
                      </select>
                      <span className="sel-arrow">▼</span>
                    </div>
                  </div>
                )}
                <button type="submit" className="sub-btn" disabled={loading}>
                  {loading ? '⏳ Creating account…' : '→ Create My Account'}
                </button>
              </form>
              <p className="login-link">Already have an account? <Link to="/login">Sign in here</Link></p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}