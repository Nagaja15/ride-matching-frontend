import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { saveAuth } from '../utils/auth'

export default function Login() {
  const [tab, setTab] = useState('email')
  const [form, setForm] = useState({ email: '', password: '' })
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()

  const handleEmailLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await api.post('/auth/login', form)
      saveAuth(res.data.token, res.data.role, res.data.email, res.data.id, res.data.name)
      toast.success(`Welcome back${res.data.name ? ', ' + res.data.name : ''}! 👋`)
      setTimeout(() => navigate(res.data.role === 'RIDER' ? '/rider' : '/driver'), 800)
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password'
      setError(msg)
      toast.error(msg)
    }
    finally { setLoading(false) }
  }

  const inp = { width:'100%', padding:'13px 16px 13px 44px', border:'1.5px solid #e2e8f0', borderRadius:12, fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif', color:'#1e293b', background:'#fff', transition:'border-color 0.2s, box-shadow 0.2s' }
  const focus = e => { e.target.style.borderColor='#667eea'; e.target.style.boxShadow='0 0 0 3px rgba(102,126,234,0.12)' }
  const blur  = e => { e.target.style.borderColor='#e2e8f0'; e.target.style.boxShadow='none' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif}
        .ln-root{min-height:100vh;display:flex;flex-direction:column}
        .ln-topbar{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:0 28px;height:52px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 12px rgba(102,126,234,0.3)}
        .ln-topbar-brand{display:flex;align-items:center;gap:8px;text-decoration:none}
        .ln-topbar-brand span{font-size:17px;font-weight:800;color:#fff;letter-spacing:-0.3px}
        .ln-topbar-links{display:flex;gap:6px}
        .ln-toplink{color:rgba(255,255,255,0.9);text-decoration:none;font-size:12px;font-weight:600;background:rgba(255,255,255,0.15);padding:5px 12px;border-radius:8px;transition:background 0.2s}
        .ln-toplink:hover{background:rgba(255,255,255,0.25)}
        .ln-body{flex:1;display:flex}
        .ln-left{width:50%;background:linear-gradient(145deg,#667eea 0%,#764ba2 60%,#f093fb 100%);display:flex;flex-direction:column;justify-content:space-between;padding:52px 60px;position:relative;overflow:hidden}
        .ln-left::before{content:'';position:absolute;width:500px;height:500px;background:rgba(255,255,255,0.07);border-radius:50%;top:-120px;right:-160px}
        .ln-left::after{content:'';position:absolute;width:300px;height:300px;background:rgba(255,255,255,0.05);border-radius:50%;bottom:-60px;left:-80px}
        .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:100px;padding:7px 16px;color:#fff;font-size:13px;font-weight:600;margin-bottom:24px}
        .hero-dot{width:7px;height:7px;background:#4ade80;border-radius:50%;animation:hdot 2s ease-in-out infinite}
        @keyframes hdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
        .hero-title{font-size:48px;font-weight:800;color:#fff;line-height:1.1;letter-spacing:-2px;margin-bottom:16px}
        .hero-desc{color:rgba(255,255,255,0.75);font-size:16px;line-height:1.7;max-width:380px;margin-bottom:40px}
        .stats{display:flex;gap:36px}
        .sv{font-size:28px;font-weight:800;color:#fff}
        .sl{font-size:13px;color:rgba(255,255,255,0.6);margin-top:2px}
        .trust{display:flex;align-items:center;gap:12px;z-index:1}
        .avs{display:flex}
        .av{width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;margin-left:-8px}
        .av:first-child{margin-left:0}
        .trust-txt{font-size:13px;color:rgba(255,255,255,0.75)}
        .ln-right{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 56px;background:#f8fafc;overflow-y:auto}
        .form-box{width:100%;max-width:420px}
        .form-title{font-size:30px;font-weight:800;color:#1e293b;letter-spacing:-0.8px;margin-bottom:6px}
        .form-sub{color:#94a3b8;font-size:15px;margin-bottom:28px}
        .err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:12px 16px;border-radius:12px;margin-bottom:18px;font-size:14px;display:flex;align-items:center;gap:8px}
        .info{background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;padding:12px 16px;border-radius:12px;margin-bottom:18px;font-size:13px;line-height:1.5}
        .auth-tabs{display:flex;background:#f1f5f9;border-radius:12px;padding:4px;margin-bottom:22px}
        .auth-tab{flex:1;padding:10px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:'Inter',sans-serif}
        .auth-tab.on{background:#fff;color:#667eea;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
        .auth-tab.off{background:transparent;color:#94a3b8}
        .fld{margin-bottom:16px}
        .fld-lbl{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:7px}
        .fld-wrap{position:relative}
        .fld-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;opacity:0.45;pointer-events:none}
        .divider{display:flex;align-items:center;gap:14px;margin:20px 0;color:#94a3b8;font-size:13px}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:#e2e8f0}
        .soc-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
        .soc-btn{padding:12px;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;color:#374151;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;font-family:'Inter',sans-serif}
        .soc-btn:hover{border-color:#667eea;background:#f8f7ff;color:#667eea}
        .sub-btn{width:100%;padding:14px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border:none;border-radius:14px;color:#fff;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(102,126,234,0.3);font-family:'Inter',sans-serif}
        .sub-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(102,126,234,0.4)}
        .sub-btn:disabled{opacity:0.6;cursor:not-allowed}
        .reg-link{text-align:center;color:#94a3b8;font-size:14px;margin-top:22px}
        .reg-link a{color:#667eea;font-weight:600;text-decoration:none}
        .phone-row{display:flex;gap:8px}
        .cc{padding:13px 12px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:14px;font-weight:600;color:#374151;background:#f8fafc;white-space:nowrap}
        .car-scene{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
        .float-car{position:absolute;font-size:32px;animation:floatCar linear infinite;opacity:0.18}
        .float-car:nth-child(1){left:8%;animation-duration:12s;animation-delay:0s;top:20%}
        .float-car:nth-child(2){left:72%;animation-duration:9s;animation-delay:-3s;top:60%}
        .float-car:nth-child(3){left:40%;animation-duration:15s;animation-delay:-6s;top:10%}
        .float-car:nth-child(4){left:20%;animation-duration:11s;animation-delay:-2s;top:75%}
        .float-car:nth-child(5){left:85%;animation-duration:13s;animation-delay:-8s;top:35%}
        .float-car:nth-child(6){left:55%;animation-duration:10s;animation-delay:-4s;top:85%}
        @keyframes floatCar{0%{transform:translateY(0px) rotate(-5deg) scale(1)}25%{transform:translateY(-30px) rotate(5deg) scale(1.05)}50%{transform:translateY(-10px) rotate(-3deg) scale(0.97)}75%{transform:translateY(-40px) rotate(8deg) scale(1.03)}100%{transform:translateY(0px) rotate(-5deg) scale(1)}}
        .road-line{position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(to top,rgba(0,0,0,0.2),transparent);z-index:0}
        .moving-car{position:absolute;bottom:20px;font-size:28px;animation:driveCar 8s linear infinite;opacity:0.4}
        .moving-car:nth-child(8){animation-delay:0s}
        .moving-car:nth-child(9){animation-delay:-4s;bottom:8px;font-size:22px;opacity:0.25}
        @keyframes driveCar{from{left:-60px}to{left:110%}}
        @media(max-width:768px){.ln-left{display:none}.ln-right{padding:40px 24px}}
      `}</style>

      <div className="ln-root">
        <div className="ln-topbar">
          <Link to="/" className="ln-topbar-brand"><span>🚗</span><span>RideMatch</span></Link>
          <div className="ln-topbar-links">
            <Link to="/about" className="ln-toplink">ℹ️ About</Link>
            <Link to="/help" className="ln-toplink">❓ Help</Link>
          </div>
        </div>

        <div className="ln-body">
          <div className="ln-left">
            <div className="car-scene">
              {['🚗','🚕','🚙','🏎️','🚗','🚕'].map((c,i) => <div key={i} className="float-car">{c}</div>)}
              <div className="road-line"></div>
              <div className="moving-car">🚗</div>
              <div className="moving-car">🚕</div>
            </div>
            <div style={{ zIndex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:48, height:48, background:'rgba(255,255,255,0.25)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🚗</div>
                <span style={{ fontSize:26, fontWeight:800, color:'#fff', letterSpacing:'-0.5px' }}>RideMatch</span>
              </div>
            </div>
            <div style={{ zIndex:1 }}>
              <div className="hero-badge"><span className="hero-dot"></span>Live across Hyderabad</div>
              <h2 className="hero-title">Your ride,<br />on demand.</h2>
              <p className="hero-desc">Book in seconds. Track in real-time. Pay your way.</p>
              <div className="stats">
                <div><div className="sv">2.4K+</div><div className="sl">Active Drivers</div></div>
                <div><div className="sv">98%</div><div className="sl">On-time rate</div></div>
                <div><div className="sv">4.9★</div><div className="sl">Avg. rating</div></div>
              </div>
            </div>
            <div className="trust" style={{ zIndex:1 }}>
              <div className="avs">{['👨','👩','🧑','👦'].map((e,i) => <div key={i} className="av">{e}</div>)}</div>
              <div className="trust-txt"><strong style={{ color:'#fff' }}>12,000+ riders</strong> trust RideMatch daily</div>
            </div>
          </div>

          <div className="ln-right">
            <div className="form-box">
              <div className="form-title">Welcome back</div>
              <p className="form-sub">Sign in to your RideMatch account</p>

              <div className="auth-tabs">
                <button className={`auth-tab ${tab==='email'?'on':'off'}`} onClick={() => { setTab('email'); setError('') }}>✉️ Email</button>
                <button className={`auth-tab ${tab==='phone'?'on':'off'}`} onClick={() => { setTab('phone'); setError('') }}>📱 Phone OTP</button>
              </div>

              {error && <div className="err">⚠️ {error}<button onClick={() => setError('')} style={{ marginLeft:'auto', background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:16 }}>✕</button></div>}

              {tab === 'email' && (
                <form onSubmit={handleEmailLogin}>
                  <div className="fld">
                    <label className="fld-lbl">Email Address</label>
                    <div className="fld-wrap">
                      <span className="fld-icon">✉️</span>
                      <input type="email" placeholder="you@example.com" value={form.email}
                        onChange={e => setForm({...form, email:e.target.value})}
                        style={inp} required onFocus={focus} onBlur={blur} />
                    </div>
                  </div>
                  <div className="fld" style={{ marginBottom:8 }}>
                    <label className="fld-lbl">Password</label>
                    <div className="fld-wrap">
                      <span className="fld-icon">🔒</span>
                      <input type={showPw?'text':'password'} placeholder="Enter your password"
                        value={form.password} onChange={e => setForm({...form, password:e.target.value})}
                        style={{ ...inp, paddingRight:46 }} required onFocus={focus} onBlur={blur} />
                      <button type="button" onClick={() => setShowPw(!showPw)} style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#94a3b8' }}>
                        {showPw?'🙈':'👁️'}
                      </button>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', marginBottom:20 }}>
                    <a href="#" style={{ fontSize:13, color:'#667eea', textDecoration:'none', fontWeight:600 }}>Forgot password?</a>
                  </div>
                  <button type="submit" className="sub-btn" disabled={loading}>
                    {loading ? '⏳ Signing in…' : '→ Sign In'}
                  </button>
                </form>
              )}

              {tab === 'phone' && (
                <div>
                  <div className="info">📱 <strong>Phone OTP coming soon!</strong><br />Use <strong>Email login</strong> for now.</div>
                  <div className="fld">
                    <label className="fld-lbl">Mobile Number</label>
                    <div className="phone-row">
                      <div className="cc">🇮🇳 +91</div>
                      <input type="tel" maxLength={10} placeholder="98765 43210" value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/,''))}
                        style={{ ...inp, paddingLeft:16, flex:1 }} onFocus={focus} onBlur={blur} />
                    </div>
                  </div>
                  <button className="sub-btn" disabled style={{ opacity:0.5, cursor:'not-allowed' }}>📱 Send OTP (Coming Soon)</button>
                  <button className="sub-btn" onClick={() => setTab('email')} style={{ marginTop:10, background:'#f1f5f9', color:'#667eea', boxShadow:'none', border:'1px solid #e2e8f0' }}>← Use Email Login</button>
                </div>
              )}

              <div className="divider">or continue with</div>
              <div className="soc-row">
                <button className="soc-btn" style={{ opacity:0.55, cursor:'not-allowed' }}><span style={{ fontSize:18, fontWeight:800 }}>G</span> Google (Soon)</button>
                <button className="soc-btn" onClick={() => setTab('phone')}><span>📱</span> Phone OTP</button>
              </div>
              <p className="reg-link">New to RideMatch? <Link to="/register">Create a free account</Link></p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}