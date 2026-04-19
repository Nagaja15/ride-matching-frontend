import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { connectWebSocket, disconnectWebSocket } from '../utils/websocket'
import { getEmail, logout } from '../utils/auth'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => { if (center) map.setView(center, 14) }, [center, map])
  return null
}

const STATUS = {
  REQUESTED:   { color:'#f59e0b', label:'New Ride' },
  ACCEPTED:    { color:'#3b82f6', label:'Accepted' },
  IN_PROGRESS: { color:'#8b5cf6', label:'In Progress' },
  COMPLETED:   { color:'#10b981', label:'Completed' },
  PAID:        { color:'#059669', label:'Paid' },
  CANCELLED:   { color:'#ef4444', label:'Cancelled' },
}

async function geocodeSearch(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q+', India')}&format=json&limit=4`,{ headers:{'Accept-Language':'en'} })
  return r.json()
}

export default function DriverDashboard() {
  const navigate = useNavigate()
  const email = getEmail()
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const locDebounce = useRef(null)
  const chatEndRef = useRef(null)

  const [isOnline, setIsOnline] = useState(false)
  const [activeTrip, setActiveTrip] = useState(null)
  const [pendingOffer, setPendingOffer] = useState(null)
  const [offerTimer, setOfferTimer] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [earnings, setEarnings] = useState(0)
  const [tripsCompleted, setTripsCompleted] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [tripIdInput, setTripIdInput] = useState('')
  const [driverId, setDriverId] = useState(null)
  const [driverProfile, setDriverProfile] = useState(null)
  const [location, setLocation] = useState({ longitude:78.4867, latitude:17.3850 })
  const [locQuery, setLocQuery] = useState('')
  const [locSugs, setLocSugs] = useState([])
  const [locBusy, setLocBusy] = useState(false)
  const [locName, setLocName] = useState('Hyderabad')
  const [isStreaming, setIsStreaming] = useState(false)

  useEffect(() => {
    fetchDriverProfile()
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocation({ longitude:pos.coords.longitude, latitude:pos.coords.latitude })
      })
    }
    return () => {
      disconnectWebSocket()
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) clearInterval(streamRef.current)
    }
  }, [])

  useEffect(() => { if (driverId) connectWebSocket(driverId, 'DRIVER', handleWsMessage) }, [driverId])

  useEffect(() => {
    if (streamRef.current) clearInterval(streamRef.current)
    if (activeTrip && ['ACCEPTED','IN_PROGRESS'].includes(activeTrip.status)) {
      setIsStreaming(true)
      streamRef.current = setInterval(async () => {
        try { await api.post('/driver/location/stream', { longitude:location.longitude, latitude:location.latitude }) }
        catch { /* empty */ }
      }, 4000)
    } else { setIsStreaming(false) }
    return () => { if (streamRef.current) clearInterval(streamRef.current) }
  }, [activeTrip?.status, activeTrip?.id, location])

  useEffect(() => {
    if (activeTrip && ['ACCEPTED','IN_PROGRESS'].includes(activeTrip.status)) {
      loadChatMessages(activeTrip.id)
    }
  }, [activeTrip?.status, activeTrip?.id])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }) }, [chatMessages])

  const fetchDriverProfile = async () => {
    try {
      const res = await api.get('/driver/profile')
      setDriverId(res.data.id)
      setDriverProfile(res.data)
    } catch { setDriverId(2) }
  }

  const loadChatMessages = async (id) => {
    try { const r = await api.get(`/trips/${id}/messages`); setChatMessages(r.data||[]) } catch { /* empty */ }
  }

  const handleWsMessage = (msg) => {
    if (msg.type === 'CHAT_MESSAGE') {
      setChatMessages(prev => [...prev, msg])
      if (!showChat) toast('💬 Message from rider', { icon:'📱' })
      return
    }
    setNotifications(prev => [{ ...msg, time:new Date().toLocaleTimeString() }, ...prev].slice(0,10))
    if (msg.type === 'RIDE_OFFER') {
      setPendingOffer(msg)
      startOfferTimer(msg.timeoutSeconds || 30)
      toast('🔔 New ride request!', { icon:'🚗', duration:5000 })
    } else if (msg.type === 'TRIP_UPDATE' || msg.status) {
      setActiveTrip(prev => prev ? { ...prev, ...msg } : prev)
    }
  }

  const startOfferTimer = (seconds) => {
    setOfferTimer(seconds)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setOfferTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setPendingOffer(null); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const acceptOffer = async (tripId) => {
    clearInterval(timerRef.current); setPendingOffer(null); setLoading(true); setError('')
    try {
      const res = await api.patch(`/driver/trips/${tripId}/accept`)
      setActiveTrip(res.data)
      toast.success('✅ Ride accepted! Head to pickup location.')
    } catch (err) {
      if (err.response?.status === 409) setError('Trip already taken by another driver.')
      else setError(err.response?.data?.message || 'Failed to accept trip')
      toast.error('Failed to accept trip')
    } finally { setLoading(false) }
  }

  const declineOffer = () => { clearInterval(timerRef.current); setPendingOffer(null); setOfferTimer(30) }

  const onLocChange = v => {
    setLocQuery(v)
    clearTimeout(locDebounce.current)
    if (v.length < 3) { setLocSugs([]); return }
    locDebounce.current = setTimeout(async () => {
      setLocBusy(true)
      try { setLocSugs(await geocodeSearch(v)) } catch { setLocSugs([]) }
      finally { setLocBusy(false) }
    }, 450)
  }

  const selectLoc = p => {
    const name = p.display_name.split(',')[0]
    setLocation({ longitude:parseFloat(p.lon), latitude:parseFloat(p.lat) })
    setLocName(name); setLocQuery(name); setLocSugs([])
  }

  const goOnline = async () => {
    setLoading(true); setError('')
    try {
      await api.post('/driver/location', location)
      setIsOnline(true)
      toast.success(`✅ Online at ${locName}! Waiting for ride requests.`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to go online. Is Redis running?'
      setError(msg); toast.error(msg)
    } finally { setLoading(false) }
  }

  const goOffline = async () => {
    setLoading(true)
    try {
      await api.delete('/driver/location')
      setIsOnline(false)
      if (streamRef.current) clearInterval(streamRef.current)
      toast('📴 You are now offline.', { icon:'🔴' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to go offline') }
    finally { setLoading(false) }
  }

  const updateLocation = async () => {
    try {
      await api.post('/driver/location', location)
      toast.success('📍 Location updated!')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update location') }
  }

  const updateStatus = async (tripId, action) => {
    setLoading(true); setError('')
    try {
      const res = await api.patch(`/driver/trips/${tripId}/${action}`)
      setActiveTrip(res.data)
      if (action==='complete' && res.data.fare) {
        setEarnings(prev => prev + parseFloat(res.data.fare))
        setTripsCompleted(prev => prev + 1)
        toast.success(`🏁 Ride complete! Earned ₹${res.data.fare}`)
      }
      if (action==='start') toast('🚀 Ride started!', { icon:'🚗' })
      if (action==='complete' || action==='cancel') {
        if (streamRef.current) clearInterval(streamRef.current)
        setTimeout(() => { setActiveTrip(null); setError(''); setShowChat(false); setChatMessages([]) }, 3000)
      }
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${action}`
      setError(msg); toast.error(msg)
    } finally { setLoading(false) }
  }

  const loadTrip = async () => {
    if (!tripIdInput) return
    setLoading(true); setError('')
    try { const r = await api.get(`/trips/${tripIdInput}`); setActiveTrip(r.data) }
    catch { toast.error('Trip not found') }
    finally { setLoading(false) }
  }

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeTrip) return
    try {
      await api.post(`/trips/${activeTrip.id}/message`, { text: chatInput.trim() })
      setChatInput('')
    } catch { toast.error('Message failed') }
  }

  const si = activeTrip ? (STATUS[activeTrip.status]||{}) : {}

  return (
    <div style={{ minHeight:'100vh', background:'#0f0f0f', fontFamily:'Inter,sans-serif', color:'white' }}>
      <header style={{ background:'#1a1a1a', borderBottom:'1px solid #2a2a2a', padding:'0 24px', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'22px' }}>🚕</span>
          <span style={{ fontSize:'18px', fontWeight:'800' }}>RideMatch</span>
          <span style={{ background:'#f59e0b', color:'black', fontSize:'11px', fontWeight:'700', padding:'2px 8px', borderRadius:'10px' }}>DRIVER</span>
          {driverProfile?.vehicleType && (
            <span style={{ background:'#2a2a2a', color:'#999', fontSize:'11px', padding:'2px 8px', borderRadius:'8px' }}>{driverProfile.vehicleType}</span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:'18px', fontWeight:'800', color:'#1db954', margin:0 }}>₹{earnings.toFixed(0)}</p>
            <p style={{ fontSize:'11px', color:'#444', margin:0 }}>{tripsCompleted} trips today</p>
          </div>
          {isStreaming && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'#001a30', padding:'4px 10px', borderRadius:'20px', border:'1px solid #3b82f630' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#3b82f6', animation:'pulse 1s infinite' }}></div>
              <span style={{ fontSize:'11px', color:'#3b82f6', fontWeight:'600' }}>Streaming</span>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:'6px', background:isOnline?'#1a2f1a':'#2f1a1a', padding:'6px 12px', borderRadius:'20px', border:`1px solid ${isOnline?'#1db95430':'#ef444430'}` }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:isOnline?'#1db954':'#ef4444', animation:isOnline?'pulse 2s infinite':'none' }}></div>
            <span style={{ fontSize:'13px', fontWeight:'700', color:isOnline?'#1db954':'#ef4444' }}>{isOnline?'Online':'Offline'}</span>
          </div>
          <span style={{ color:'#555', fontSize:'13px' }}>{email}</span>
          <button onClick={()=>{ logout(); navigate('/login') }} style={{ background:'#2a2a2a', border:'1px solid #3a3a3a', color:'#ccc', padding:'6px 14px', borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>Logout</button>
        </div>
      </header>

      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', height:'calc(100vh - 60px)' }}>
        <div style={{ background:'#1a1a1a', borderRight:'1px solid #2a2a2a', overflowY:'auto', padding:'20px' }}>

          {/* Pending offer */}
          {pendingOffer && (
            <div style={{ background:'#0a1800', border:'2px solid #1db954', borderRadius:'16px', padding:'18px', marginBottom:'16px', animation:'glow 1.5s ease-in-out infinite alternate' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                <h3 style={{ color:'#1db954', fontWeight:'800', fontSize:'16px', margin:0 }}>🔔 New Ride Request!</h3>
                <span style={{ fontSize:'26px', fontWeight:'800', color:offerTimer<=10?'#ef4444':'#f59e0b' }}>{offerTimer}s</span>
              </div>
              <div style={{ background:'#2a2a2a', borderRadius:'4px', height:'6px', marginBottom:'14px', overflow:'hidden' }}>
                <div style={{ height:'100%', background:offerTimer<=10?'#ef4444':'#1db954', width:`${(offerTimer/30)*100}%`, transition:'width 1s linear, background 0.3s' }}></div>
              </div>
              <div style={{ background:'#111', borderRadius:'10px', padding:'12px', marginBottom:'14px' }}>
                <div style={{ marginBottom:'8px' }}>
                  <p style={{ fontSize:'11px', color:'#666', margin:0 }}>📍 PICKUP</p>
                  <p style={{ fontSize:'13px', color:'#ccc', margin:'2px 0 0' }}>
                    {pendingOffer.pickupCoordinates ? `${pendingOffer.pickupCoordinates[1].toFixed(4)}°N, ${pendingOffer.pickupCoordinates[0].toFixed(4)}°E` : 'Loading...'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize:'11px', color:'#666', margin:0 }}>🏁 DROPOFF</p>
                  <p style={{ fontSize:'13px', color:'#ccc', margin:'2px 0 0' }}>
                    {pendingOffer.dropoffCoordinates ? `${pendingOffer.dropoffCoordinates[1].toFixed(4)}°N, ${pendingOffer.dropoffCoordinates[0].toFixed(4)}°E` : 'Loading...'}
                  </p>
                </div>
                {pendingOffer.surgeMultiplier > 1 && (
                  <div style={{ marginTop:'8px', padding:'6px 10px', background:'#2a1800', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'12px', color:'#f97316', fontWeight:'700' }}>🔥 Surge Active!</span>
                    <span style={{ fontSize:'16px', fontWeight:'800', color:'#f97316' }}>{pendingOffer.surgeMultiplier}x</span>
                  </div>
                )}
              </div>
              {error && <div style={{ background:'#2f1a1a', border:'1px solid #ef444430', color:'#ef4444', padding:'8px 12px', borderRadius:'8px', marginBottom:'10px', fontSize:'12px' }}>⚠️ {error}</div>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <button onClick={declineOffer} style={{ background:'#2a2a2a', border:'1px solid #ef444430', color:'#ef4444', padding:'12px', borderRadius:'10px', cursor:'pointer', fontWeight:'700', fontSize:'14px' }}>✕ Decline</button>
                <button onClick={()=>acceptOffer(pendingOffer.tripId)} disabled={loading} style={{ background:'#1db954', border:'none', color:'white', padding:'12px', borderRadius:'10px', cursor:'pointer', fontWeight:'800', fontSize:'14px' }}>
                  {loading?'...':'✓ Accept'}
                </button>
              </div>
            </div>
          )}

          {/* Driver status */}
          <div style={{ background:'#242424', borderRadius:'16px', padding:'18px', marginBottom:'16px' }}>
            <h2 style={{ fontSize:'14px', fontWeight:'700', color:'#999', marginBottom:'14px' }}>📡 DRIVER STATUS</h2>
            {error && !pendingOffer && (
              <div style={{ background:'#2f1a1a', border:'1px solid #ef444430', color:'#ef4444', padding:'10px 12px', borderRadius:'8px', marginBottom:'12px', fontSize:'13px' }}>⚠️ {error}</div>
            )}
            <div style={{ position:'relative', marginBottom:'10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', background:'#1a1a1a', borderRadius:'10px', padding:'10px 12px', border:'1px solid #2a2a2a' }}>
                <span>📍</span>
                <input value={locQuery} onChange={e=>onLocChange(e.target.value)} placeholder="Search area or pincode"
                  style={{ flex:1, background:'none', border:'none', outline:'none', color:'white', fontSize:'13px' }} />
                {locBusy && <span style={{ fontSize:'12px', color:'#555' }}>⏳</span>}
              </div>
              {locSugs.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#2a2a2a', borderRadius:'10px', zIndex:1000, border:'1px solid #3a3a3a', overflow:'hidden', marginTop:'4px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
                  {locSugs.map((p,i) => (
                    <div key={i} onMouseDown={()=>selectLoc(p)}
                      style={{ padding:'10px 14px', cursor:'pointer', fontSize:'13px', color:'#ccc', borderBottom:i<locSugs.length-1?'1px solid #3a3a3a':'none' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#3a3a3a'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      📍 {p.display_name.split(',').slice(0,2).join(', ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:'6px', marginBottom:'12px' }}>
              <input type="number" step="0.0001" value={location.longitude} onChange={e=>setLocation({...location, longitude:parseFloat(e.target.value)})}
                style={{ flex:1, background:'#1a1a1a', border:'1px solid #3a3a3a', borderRadius:'8px', padding:'7px 9px', color:'#555', fontSize:'12px', outline:'none' }} />
              <input type="number" step="0.0001" value={location.latitude} onChange={e=>setLocation({...location, latitude:parseFloat(e.target.value)})}
                style={{ flex:1, background:'#1a1a1a', border:'1px solid #3a3a3a', borderRadius:'8px', padding:'7px 9px', color:'#555', fontSize:'12px', outline:'none' }} />
            </div>
            {!isOnline ? (
              <button onClick={goOnline} disabled={loading} style={{ width:'100%', background:loading?'#2a2a2a':'#1db954', border:'none', color:loading?'#555':'white', padding:'14px', borderRadius:'12px', fontSize:'16px', fontWeight:'800', cursor:loading?'not-allowed':'pointer' }}>
                {loading?'⏳ Connecting...':'🟢 Go Online'}
              </button>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <div style={{ fontSize:'12px', color:'#1db954', textAlign:'center', marginBottom:'4px' }}>
                  ✅ Online at {locName} (ID: {driverId})
                </div>
                <button onClick={updateLocation} style={{ background:'#1a2f1a', border:'1px solid #1db95430', color:'#1db954', padding:'10px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                  🔄 Update Location
                </button>
                <button onClick={goOffline} disabled={loading} style={{ background:'#2f1a1a', border:'1px solid #ef444430', color:'#ef4444', padding:'10px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                  🔴 Go Offline
                </button>
              </div>
            )}
          </div>

          {/* Load trip */}
          {isOnline && !activeTrip && !pendingOffer && (
            <div style={{ background:'#242424', borderRadius:'16px', padding:'18px', marginBottom:'16px' }}>
              <h2 style={{ fontSize:'14px', fontWeight:'700', color:'#999', marginBottom:'12px' }}>📋 LOAD TRIP</h2>
              <p style={{ fontSize:'12px', color:'#444', marginBottom:'10px' }}>Enter trip ID if you didn't receive a notification</p>
              <div style={{ display:'flex', gap:'8px' }}>
                <input type="number" placeholder="Trip ID e.g. 42" value={tripIdInput}
                  onChange={e=>setTripIdInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadTrip()}
                  style={{ flex:1, background:'#1a1a1a', border:'1px solid #3a3a3a', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', outline:'none' }} />
                <button onClick={loadTrip} disabled={loading||!tripIdInput}
                  style={{ background:(!loading&&tripIdInput)?'#1db954':'#2a2a2a', border:'none', color:(!loading&&tripIdInput)?'white':'#555', padding:'10px 16px', borderRadius:'8px', cursor:(!loading&&tripIdInput)?'pointer':'not-allowed', fontWeight:'700' }}>
                  Load
                </button>
              </div>
              <div style={{ marginTop:'14px', paddingTop:'14px', borderTop:'1px solid #2a2a2a' }}>
                {[{n:'1',t:'Go Online with your location'},{n:'2',t:'Ride offer popup appears automatically'},{n:'3',t:'Accept within 30 seconds'},{n:'4',t:'Start → Complete the ride'},{n:'⚠',t:'ONE active trip at a time',w:true}].map(s=>(
                  <div key={s.n} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'7px' }}>
                    <div style={{ width:'22px', height:'22px', borderRadius:'50%', background:s.w?'#2a1800':'#1a2f1a', border:`1px solid ${s.w?'#f59e0b30':'#1db95430'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:s.w?'#f59e0b':'#1db954', fontWeight:'800', flexShrink:0 }}>{s.n}</div>
                    <span style={{ fontSize:'12px', color:s.w?'#f59e0b':'#555', fontWeight:s.w?'700':'400' }}>{s.t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active trip */}
          {activeTrip && activeTrip.status !== 'REQUESTED' && (
            <div style={{ background:'#242424', borderRadius:'16px', padding:'18px', marginBottom:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                <h2 style={{ fontSize:'15px', fontWeight:'700', color:'white', margin:0 }}>Trip #{activeTrip.id}</h2>
                <span style={{ fontSize:'11px', fontWeight:'700', textTransform:'uppercase', color:si.color||'#666', background:si.color?`${si.color}15`:'#2a2a2a', padding:'3px 10px', borderRadius:'20px' }}>{si.label||activeTrip.status}</span>
              </div>

              {isStreaming && (
                <div style={{ background:'#001a30', border:'1px solid #3b82f630', borderRadius:'8px', padding:'6px 12px', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#3b82f6', animation:'pulse 1s infinite' }}></div>
                  <span style={{ fontSize:'11px', color:'#3b82f6' }}>📡 Streaming location to rider</span>
                </div>
              )}

              {error && <div style={{ background:'#2f1a1a', border:'1px solid #ef444430', color:'#ef4444', padding:'8px 12px', borderRadius:'8px', marginBottom:'12px', fontSize:'12px' }}>⚠️ {error}</div>}

              {/* Chat toggle */}
              {['ACCEPTED','IN_PROGRESS'].includes(activeTrip.status) && (
                <button onClick={()=>setShowChat(!showChat)} style={{ width:'100%', marginBottom:'12px', background:showChat?'#001a30':'#1a1a1a', border:`1px solid ${showChat?'#3b82f6':'#2a2a2a'}`, color:showChat?'#3b82f6':'#666', padding:'9px', borderRadius:'9px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                  💬 {showChat?'Hide Chat':'Message Rider'}
                </button>
              )}

              {/* Chat panel */}
              {showChat && ['ACCEPTED','IN_PROGRESS'].includes(activeTrip.status) && (
                <div style={{ background:'#111', borderRadius:'10px', padding:'10px', marginBottom:'12px', border:'1px solid #3b82f630' }}>
                  <div style={{ maxHeight:'150px', overflowY:'auto', marginBottom:'8px', display:'flex', flexDirection:'column', gap:'4px' }}>
                    {chatMessages.length===0
                      ? <p style={{ fontSize:'11px', color:'#444', textAlign:'center', padding:'12px 0' }}>No messages yet</p>
                      : chatMessages.map((m,i)=>(
                        <div key={i} style={{ display:'flex', justifyContent: m.role==='DRIVER'?'flex-end':'flex-start' }}>
                          <div style={{ maxWidth:'75%', background: m.role==='DRIVER'?'#f59e0b30':'#2a2a2a', borderRadius:'8px', padding:'6px 10px', fontSize:'12px', color: m.role==='DRIVER'?'#f59e0b':'#ccc' }}>
                            <p style={{ margin:0 }}>{m.text}</p>
                            <p style={{ margin:'2px 0 0', fontSize:'10px', color:'#555' }}>{m.sender}</p>
                          </div>
                        </div>
                      ))
                    }
                    <div ref={chatEndRef}></div>
                  </div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&sendMessage()}
                      placeholder="Type a message..."
                      style={{ flex:1, background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'7px', padding:'7px 10px', color:'white', fontSize:'12px', outline:'none' }} />
                    <button onClick={sendMessage} style={{ background:'#f59e0b', border:'none', color:'black', padding:'7px 12px', borderRadius:'7px', cursor:'pointer', fontSize:'12px', fontWeight:'700' }}>Send</button>
                  </div>
                </div>
              )}

              <div style={{ background:'#1a1a1a', borderRadius:'10px', padding:'12px', marginBottom:'14px' }}>
                {activeTrip.pickupCoordinates && (
                  <div style={{ marginBottom:'8px' }}>
                    <p style={{ fontSize:'11px', color:'#666', margin:0 }}>📍 PICKUP</p>
                    <p style={{ fontSize:'13px', color:'#ccc', margin:'2px 0 0' }}>{activeTrip.pickupCoordinates[1].toFixed(4)}°N, {activeTrip.pickupCoordinates[0].toFixed(4)}°E</p>
                  </div>
                )}
                {activeTrip.dropoffCoordinates && (
                  <div>
                    <p style={{ fontSize:'11px', color:'#666', margin:0 }}>🏁 DROPOFF</p>
                    <p style={{ fontSize:'13px', color:'#ccc', margin:'2px 0 0' }}>{activeTrip.dropoffCoordinates[1].toFixed(4)}°N, {activeTrip.dropoffCoordinates[0].toFixed(4)}°E</p>
                  </div>
                )}
              </div>

              {activeTrip.fare && (
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'14px', padding:'10px 14px', background:'#1a2f1a', borderRadius:'10px' }}>
                  <span style={{ fontSize:'13px', color:'#999' }}>Earnings</span>
                  <span style={{ fontSize:'20px', fontWeight:'800', color:'#1db954' }}>₹{activeTrip.fare}</span>
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {activeTrip.status==='ACCEPTED' && (
                  <>
                    <button onClick={()=>updateStatus(activeTrip.id,'start')} disabled={loading} style={{ background:'#3b82f6', border:'none', color:'white', padding:'13px', borderRadius:'10px', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
                      🚀 Start Ride — Rider is aboard
                    </button>
                    <button onClick={()=>updateStatus(activeTrip.id,'cancel')} disabled={loading} style={{ background:'#2a2a2a', border:'1px solid #ef444430', color:'#ef4444', padding:'10px', borderRadius:'10px', cursor:'pointer', fontSize:'13px', fontWeight:'600' }}>
                      Cancel Ride
                    </button>
                  </>
                )}
                {activeTrip.status==='IN_PROGRESS' && (
                  <button onClick={()=>updateStatus(activeTrip.id,'complete')} disabled={loading} style={{ background:'#1db954', border:'none', color:'white', padding:'13px', borderRadius:'10px', fontSize:'15px', fontWeight:'700', cursor:'pointer' }}>
                    🏁 Complete Ride — Reached destination
                  </button>
                )}
                {['COMPLETED','PAID','CANCELLED'].includes(activeTrip.status) && (
                  <button onClick={()=>{ setActiveTrip(null); setTripIdInput(''); setError(''); setShowChat(false); setChatMessages([]) }}
                    style={{ background:'#2a2a2a', border:'1px solid #3a3a3a', color:'#999', padding:'10px', borderRadius:'10px', cursor:'pointer', fontSize:'13px' }}>
                    + Ready for Next Ride
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Activity */}
          {notifications.length > 0 && (
            <div style={{ background:'#242424', borderRadius:'16px', padding:'18px' }}>
              <h2 style={{ fontSize:'14px', fontWeight:'700', color:'#999', marginBottom:'12px' }}>📡 ACTIVITY</h2>
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'200px', overflowY:'auto' }}>
                {notifications.map((n,i)=>(
                  <div key={i} style={{ background:'#1a1a1a', borderRadius:'8px', padding:'8px 12px', borderLeft:`3px solid ${STATUS[n.status]?.color||'#f59e0b'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:'12px', fontWeight:'700', color:STATUS[n.status]?.color||'#f59e0b' }}>{n.type||n.status}</span>
                      <span style={{ fontSize:'11px', color:'#444' }}>{n.time}</span>
                    </div>
                    {n.tripId && <p style={{ fontSize:'11px', color:'#555', margin:'2px 0 0' }}>Trip #{n.tripId}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MAP */}
        <div style={{ position:'relative' }}>
          <MapContainer center={[location.latitude, location.longitude]} zoom={14} style={{ height:'100%', width:'100%' }}>
            <MapUpdater center={[location.latitude, location.longitude]} />
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="© CartoDB" />
            <Marker position={[location.latitude, location.longitude]}>
              <Popup>🚕 <strong>{driverProfile?.name||'You'}</strong><br />{locName}<br />{isOnline?'✅ Online':'❌ Offline'}</Popup>
            </Marker>
            {activeTrip?.pickupCoordinates && (
              <Marker position={[activeTrip.pickupCoordinates[1], activeTrip.pickupCoordinates[0]]}>
                <Popup>🟢 Pickup point</Popup>
              </Marker>
            )}
            {activeTrip?.dropoffCoordinates && (
              <Marker position={[activeTrip.dropoffCoordinates[1], activeTrip.dropoffCoordinates[0]]}>
                <Popup>🔴 Dropoff point</Popup>
              </Marker>
            )}
            {pendingOffer?.pickupCoordinates && (
              <Marker position={[pendingOffer.pickupCoordinates[1], pendingOffer.pickupCoordinates[0]]}>
                <Popup>🔔 Pending Pickup</Popup>
              </Marker>
            )}
          </MapContainer>

          <div style={{ position:'absolute', top:'16px', right:'16px', zIndex:1000, display:'flex', flexDirection:'column', gap:'8px' }}>
            {[{l:"Today's Earnings",v:`₹${earnings.toFixed(0)}`,c:'#1db954'},{l:'Trips',v:tripsCompleted,c:'white'}].map(s=>(
              <div key={s.l} style={{ background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', borderRadius:'12px', padding:'12px 16px', border:'1px solid #2a2a2a', minWidth:'140px' }}>
                <p style={{ fontSize:'11px', color:'#555', margin:0 }}>{s.l}</p>
                <p style={{ fontSize:'22px', fontWeight:'800', color:s.c, margin:0 }}>{s.v}</p>
              </div>
            ))}
          </div>

          {isOnline && !activeTrip && !pendingOffer && (
            <div style={{ position:'absolute', bottom:'30px', left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', borderRadius:'12px', padding:'14px 24px', zIndex:1000, border:'1px solid #1db95430', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#1db954', animation:'pulse 1.5s infinite' }}></div>
              <span style={{ color:'white', fontSize:'14px', fontWeight:'600' }}>Online — Waiting for ride requests...</span>
            </div>
          )}

          <div style={{ position:'absolute', bottom:'30px', right:'16px', zIndex:1000, background:'rgba(0,0,0,0.75)', borderRadius:'8px', padding:'6px 10px', fontSize:'11px', color:'#444' }}>
            📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes glow  { from{box-shadow:0 0 12px #1db95450} to{box-shadow:0 0 28px #1db95490} }
        * { font-family: Inter, sans-serif; }
      `}</style>
    </div>
  )
}