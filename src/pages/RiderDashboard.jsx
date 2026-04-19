import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
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

const taxiIcon = new L.DivIcon({
  html: `<div style="background:#1db954;border:3px solid white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 0 0 4px rgba(29,185,84,0.3);">🚕</div>`,
  className: '', iconSize: [40,40], iconAnchor: [20,20]
})

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => { if (center) map.setView(center, 14) }, [center, map])
  return null
}

const STATUS = {
  REQUESTED:   { color:'#f59e0b', bg:'#1c1500', border:'#f59e0b30', label:'Finding Driver...' },
  ACCEPTED:    { color:'#3b82f6', bg:'#001020', border:'#3b82f630', label:'Driver Accepted ✅' },
  IN_PROGRESS: { color:'#8b5cf6', bg:'#0d0020', border:'#8b5cf630', label:'Ride in Progress 🚗' },
  COMPLETED:   { color:'#10b981', bg:'#001a0f', border:'#10b98130', label:'Completed 🏁' },
  PAID:        { color:'#059669', bg:'#001a0f', border:'#05966930', label:'Paid ✅' },
  CANCELLED:   { color:'#ef4444', bg:'#1a0000', border:'#ef444430', label:'Cancelled ❌' },
}

const VEHICLES = [
  { id:'Any',      icon:'🚗', label:'Any' },
  { id:'Bike',     icon:'🏍️', label:'Bike' },
  { id:'Auto',     icon:'🛺', label:'Auto' },
  { id:'Hatchback',icon:'🚗', label:'Hatchback' },
  { id:'Sedan',    icon:'🚘', label:'Sedan' },
  { id:'SUV',      icon:'🚙', label:'SUV' },
]

function estimateFare(p, d, surge=1) {
  if (!p || !d) return null
  const R = 6371
  const dLat = (d.lat-p.lat)*Math.PI/180
  const dLon = (d.lon-p.lon)*Math.PI/180
  const a = Math.sin(dLat/2)**2+Math.cos(p.lat*Math.PI/180)*Math.cos(d.lat*Math.PI/180)*Math.sin(dLon/2)**2
  const km = R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
  const base = Math.round((30+km*12)*surge)
  return { km: km.toFixed(1), low: base, high: Math.round(base*1.3), mins: Math.round(km*3+4) }
}

async function geocode(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q+', Hyderabad, India')}&format=json&limit=5`,{ headers:{'Accept-Language':'en'} })
  return r.json()
}

export default function RiderDashboard() {
  const navigate = useNavigate()
  const email = getEmail()
  const searchTimerRef = useRef(null)
  const pDebounce = useRef(null)
  const dDebounce = useRef(null)
  const chatEndRef = useRef(null)

  // State
  const [trips, setTrips] = useState([])
  const [activeTrip, setActiveTrip] = useState(null)
  const [driverInfo, setDriverInfo] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [vehicleType, setVehicleType] = useState('Any')
  const [rating, setRating] = useState(5)
  const [wsConnected, setWsConnected] = useState(false)
  const [onlineDrivers, setOnlineDrivers] = useState(0)
  const [mapCenter, setMapCenter] = useState([17.385, 78.4867])
  const [searchCountdown, setSearchCountdown] = useState(null)
  const [routeCoords, setRouteCoords] = useState([])
  const [gpsLoading, setGpsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showMap, setShowMap] = useState(false)
  const [, setRiderId] = useState(null)
  const [pickupQ, setPickupQ] = useState('')
  const [dropoffQ, setDropoffQ] = useState('')
  const [pickupSugs, setPickupSugs] = useState([])
  const [dropoffSugs, setDropoffSugs] = useState([])
  const [pickup, setPickup] = useState(null)
  const [dropoff, setDropoff] = useState(null)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => {
    loadTrips(); loadOnlineDrivers()
    const init = async () => {
      try {
        const res = await api.get('/rider/profile')
        const id = res.data.id
        setRiderId(id)
        localStorage.setItem('userId', String(id))
        connectWebSocket(id, 'RIDER', handleWsMessage)
      } catch {
        const stored = localStorage.getItem('userId')
        connectWebSocket(stored ? parseInt(stored) : 1, 'RIDER', handleWsMessage)
      }
      setWsConnected(true)
    }
    init()
    const iv = setInterval(loadOnlineDrivers, 15000)
    return () => {
      disconnectWebSocket(); clearInterval(iv)
      if (searchTimerRef.current) clearInterval(searchTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!pickup || !dropoff) { setRouteCoords([]); return }
    fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lon},${pickup.lat};${dropoff.lon},${dropoff.lat}?overview=simplified&geometries=geojson`)
      .then(r=>r.json()).then(d=>{ if(d.routes?.[0]) setRouteCoords(d.routes[0].geometry.coordinates.map(([ln,lt])=>[lt,ln])) })
      .catch(()=>setRouteCoords([]))
  }, [pickup, dropoff])

  useEffect(() => {
    if (activeTrip && ['ACCEPTED','IN_PROGRESS'].includes(activeTrip.status)) {
      loadDriverInfo(activeTrip.id)
      loadChatMessages(activeTrip.id)
    } else { setDriverInfo(null); setDriverLocation(null) }
  }, [activeTrip?.status, activeTrip?.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [chatMessages])

  const loadDriverInfo = async (id) => {
    try { const r = await api.get(`/trips/${id}/driver-info`); setDriverInfo(r.data) } catch { /* empty */ }
  }

  const loadChatMessages = async (id) => {
    try { const r = await api.get(`/trips/${id}/messages`); setChatMessages(r.data || []) } catch { /* empty */ }
  }

  const handleWsMessage = useCallback((msg) => {
    if (msg.type === 'DRIVER_LOCATION') {
      setDriverLocation({ lat: msg.driverLat, lon: msg.driverLon })
      return
    }
    if (msg.type === 'CHAT_MESSAGE') {
      setChatMessages(prev => [...prev, msg])
      if (!showChat) toast('💬 New message from driver', { icon:'📱' })
      return
    }
    setNotifications(prev => [{ ...msg, time: new Date().toLocaleTimeString() }, ...prev].slice(0,15))
    if (msg.tripId || msg.status) {
      setActiveTrip(prev => prev && prev.id===msg.tripId ? { ...prev, ...msg } : prev)
      if (msg.status === 'ACCEPTED') {
        if (searchTimerRef.current) clearInterval(searchTimerRef.current)
        setSearchCountdown(null)
        toast.success('🚗 Driver accepted your ride!')
        if (msg.driverName) setDriverInfo({ name:msg.driverName, phone:msg.driverPhone, vehicleType:msg.driverVehicle, rating:msg.driverRating })
        if (isMobile) setShowMap(true)
      }
      if (msg.status === 'IN_PROGRESS') toast('🚀 Ride started! Enjoy your journey.', { icon:'🚗' })
      if (msg.status === 'COMPLETED') { toast.success('🏁 Ride completed!'); setDriverLocation(null) }
      if (msg.status === 'CANCELLED') toast.error('❌ Ride cancelled.')
      loadTrips()
    }
  }, [showChat, isMobile])

  const loadTrips = async () => {
    try {
      const res = await api.get('/rider/trips')
      const data = res.data || []
      setTrips(data)
      const ago4h = new Date(Date.now() - 4*60*60*1000)
      const active = data.find(t =>
        ['REQUESTED','ACCEPTED','IN_PROGRESS','COMPLETED'].includes(t.status) &&
        t.paymentStatus !== 'PAID' && new Date(t.createdAt) > ago4h
      )
      setActiveTrip(active || null)
    } catch { /* empty */ }
  }

  const loadOnlineDrivers = async () => {
    try { const r = await api.get('/trips/drivers/online-count'); setOnlineDrivers(r.data.count ?? 0) }
    catch { setOnlineDrivers(0) }
  }

  const useGPS = () => {
    setGpsLoading(true)
    if (!navigator.geolocation) { toast.error('GPS not supported'); setGpsLoading(false); return }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude:lat, longitude:lon } = pos.coords
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
          const d = await r.json()
          const name = d.address?.suburb || d.address?.neighbourhood || d.display_name?.split(',')[0] || 'Current Location'
          setPickup({ lat, lon, name }); setPickupQ(name); setMapCenter([lat,lon])
        } catch { setPickup({ lat, lon, name:'Current Location' }); setPickupQ('Current Location') }
        setGpsLoading(false)
        toast.success('📍 Location set!')
      },
      () => { toast.error('Location access denied. Please enable GPS.'); setGpsLoading(false) }
    )
  }

  const onPickupChange = v => {
    setPickupQ(v); setPickup(null)
    clearTimeout(pDebounce.current)
    if (v.length < 2) { setPickupSugs([]); return }
    pDebounce.current = setTimeout(async () => { try { setPickupSugs(await geocode(v)) } catch { /* empty */ } }, 400)
  }

  const onDropoffChange = v => {
    setDropoffQ(v); setDropoff(null)
    clearTimeout(dDebounce.current)
    if (v.length < 2) { setDropoffSugs([]); return }
    dDebounce.current = setTimeout(async () => { try { setDropoffSugs(await geocode(v)) } catch { /* empty */ } }, 400)
  }

  // KEY FIX: onMouseDown prevents blur before click
  const selectPickup = p => {
    const loc = { lat: parseFloat(p.lat), lon: parseFloat(p.lon), name: p.display_name.split(',')[0] }
    setPickup(loc); setPickupQ(loc.name); setPickupSugs([]); setMapCenter([loc.lat, loc.lon])
  }

  const selectDropoff = p => {
    const loc = { lat: parseFloat(p.lat), lon: parseFloat(p.lon), name: p.display_name.split(',')[0] }
    setDropoff(loc); setDropoffQ(loc.name); setDropoffSugs([])
  }

  const requestRide = async () => {
    if (!pickup || !dropoff) { toast.error('Please select both pickup and dropoff'); return }
    setLoading(true); setError('')
    try {
      const res = await api.post('/rider/request', {
        pickupLongitude: pickup.lon, pickupLatitude: pickup.lat,
        dropoffLongitude: dropoff.lon, dropoffLatitude: dropoff.lat,
        vehicleType
      })
      setActiveTrip(res.data)
      toast('🔍 Searching for driver...', { icon:'🚗', duration: 5000 })
      let t = 30; setSearchCountdown(t)
      searchTimerRef.current = setInterval(() => {
        t--; setSearchCountdown(t)
        if (t <= 0) { clearInterval(searchTimerRef.current); setSearchCountdown(null) }
      }, 1000)
      loadTrips()
    } catch (err) {
      const msg = err.response?.data?.message || 'No drivers available nearby'
      setError(msg); toast.error(msg)
    } finally { setLoading(false) }
  }

  const payForRide = async id => {
    setLoading(true)
    try {
      const r = await api.post(`/rider/trips/${id}/pay`, { paymentMethod })
      setActiveTrip(r.data); loadTrips()
      toast.success(`💳 Payment successful via ${paymentMethod}!`)
    } catch (err) { toast.error(err.response?.data?.message || 'Payment failed') }
    finally { setLoading(false) }
  }

  const rateDriver = async id => {
    setLoading(true)
    try {
      const r = await api.post(`/rider/trips/${id}/rate`, { rating })
      setActiveTrip(r.data); loadTrips()
      toast.success(`⭐ Thanks for rating ${rating} stars!`)
    } catch (err) { toast.error(err.response?.data?.message || 'Rating failed') }
    finally { setLoading(false) }
  }

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeTrip) return
    try {
      await api.post(`/trips/${activeTrip.id}/message`, { text: chatInput.trim() })
      setChatInput('')
    } catch { toast.error('Message failed to send') }
  }

  const canRequest = !activeTrip || activeTrip.status==='CANCELLED' || (activeTrip.status==='PAID' && activeTrip.ratingByRider)
  const fare = estimateFare(pickup, dropoff)
  const si = activeTrip ? (STATUS[activeTrip.status] || {}) : {}

  const sug = (list, onSelect) => list.length > 0 && (
    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#1e1e1e', borderRadius:'10px', zIndex:9999, border:'1px solid #333', overflow:'hidden', marginTop:'3px', boxShadow:'0 12px 32px rgba(0,0,0,0.6)' }}>
      {list.map((p,i) => (
        <div key={i} onMouseDown={() => onSelect(p)}
          style={{ padding:'10px 14px', cursor:'pointer', fontSize:'13px', color:'#ccc', borderBottom:i<list.length-1?'1px solid #2a2a2a':'none', display:'flex', alignItems:'center', gap:'8px' }}
          onMouseEnter={e=>e.currentTarget.style.background='#2a2a2a'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          📍 {p.display_name.split(',').slice(0,3).join(', ')}
        </div>
      ))}
    </div>
  )

  const mapEl = (
    <div style={{ position:'relative', height: isMobile?'52vh':'100%', width:'100%' }}>
      <MapContainer center={mapCenter} zoom={13} style={{ height:'100%', width:'100%' }}>
        <MapUpdater center={mapCenter} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="© CartoDB" />
        {pickup  && <Marker position={[pickup.lat, pickup.lon]}><Popup>🟢 Pickup: {pickup.name}</Popup></Marker>}
        {dropoff && <Marker position={[dropoff.lat, dropoff.lon]}><Popup>🔴 Dropoff: {dropoff.name}</Popup></Marker>}
        {routeCoords.length > 0 && <Polyline positions={routeCoords} color="#1db954" weight={4} opacity={0.8}/>}
        {driverLocation && ['ACCEPTED','IN_PROGRESS'].includes(activeTrip?.status) && (
          <Marker position={[driverLocation.lat, driverLocation.lon]} icon={taxiIcon}>
            <Popup>🚕 {driverInfo?.name || 'Your Driver'}</Popup>
          </Marker>
        )}
      </MapContainer>

      {activeTrip?.status === 'REQUESTED' && (
        <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)', borderRadius:'12px', padding:'10px 20px', zIndex:1000, display:'flex', alignItems:'center', gap:'10px', border:'1px solid #f59e0b30', whiteSpace:'nowrap' }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', animation:'pulse 1s infinite' }}></div>
          <span style={{ color:'white', fontSize:'14px', fontWeight:'600' }}>Searching{searchCountdown ? ` (${searchCountdown}s)` : ''}...</span>
        </div>
      )}
      {activeTrip?.status === 'ACCEPTED' && (
        <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)', borderRadius:'12px', padding:'10px 20px', zIndex:1000, border:'1px solid #3b82f630', whiteSpace:'nowrap' }}>
          <p style={{ color:'#3b82f6', fontWeight:'700', fontSize:'14px', margin:0 }}>🚗 {driverInfo?.name||'Driver'} is on the way!</p>
        </div>
      )}
      {activeTrip?.status === 'IN_PROGRESS' && (
        <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)', borderRadius:'12px', padding:'10px 20px', zIndex:1000, border:'1px solid #8b5cf630', whiteSpace:'nowrap' }}>
          <p style={{ color:'#8b5cf6', fontWeight:'700', fontSize:'14px', margin:0 }}>🚀 Ride in progress!</p>
        </div>
      )}

      {!isMobile && (
        <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', display:'flex', gap:10, zIndex:1000 }}>
          {[{l:'Total Trips',v:trips.length},{l:'Completed',v:trips.filter(t=>['COMPLETED','PAID'].includes(t.status)).length},{l:'Total Spent',v:`₹${trips.filter(t=>t.fare).reduce((s,t)=>s+(parseFloat(t.fare)||0),0).toFixed(0)}`}].map(s=>(
            <div key={s.l} style={{ background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', borderRadius:'10px', padding:'10px 16px', border:'1px solid #2a2a2a', textAlign:'center', minWidth:'90px' }}>
              <p style={{ fontSize:'10px', color:'#555', margin:0 }}>{s.l}</p>
              <p style={{ fontSize:'18px', fontWeight:'800', color:'white', margin:0 }}>{s.v}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#0f0f0f', fontFamily:'Inter,sans-serif', color:'white' }}>
      <header style={{ background:'#1a1a1a', borderBottom:'1px solid #2a2a2a', padding:'0 16px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ fontSize:'20px' }}>🚗</span>
          <span style={{ fontSize:'16px', fontWeight:'800' }}>RideMatch</span>
          <span style={{ background:'#1db954', color:'white', fontSize:'10px', fontWeight:'700', padding:'2px 7px', borderRadius:'8px' }}>RIDER</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {!isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
              <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:onlineDrivers>0?'#1db954':'#555' }}></div>
              <span style={{ fontSize:'12px', color:'#999' }}><span style={{ color:'#1db954', fontWeight:'700' }}>{onlineDrivers}</span> online</span>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', gap:'5px', background:wsConnected?'#1a2f1a':'#2f1a1a', padding:'3px 8px', borderRadius:'16px' }}>
            <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:wsConnected?'#1db954':'#ef4444' }}></div>
            <span style={{ fontSize:'11px', color:wsConnected?'#1db954':'#ef4444' }}>{wsConnected?'Live':'Off'}</span>
          </div>
          {!isMobile && <span style={{ color:'#555', fontSize:'12px' }}>{email}</span>}
          <button onClick={() => { logout(); navigate('/login') }} style={{ background:'#2a2a2a', border:'1px solid #3a3a3a', color:'#ccc', padding:'5px 12px', borderRadius:'7px', cursor:'pointer', fontSize:'12px' }}>Logout</button>
        </div>
      </header>

      {isMobile && (
        <div style={{ background:'#1a1a1a', borderBottom:'1px solid #2a2a2a', display:'flex' }}>
          <button onClick={() => setShowMap(false)} style={{ flex:1, padding:'10px', background:!showMap?'#2a2a2a':'transparent', border:'none', color:!showMap?'white':'#666', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>📋 Details</button>
          <button onClick={() => setShowMap(true)} style={{ flex:1, padding:'10px', background:showMap?'#2a2a2a':'transparent', border:'none', color:showMap?'white':'#666', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>🗺️ Map {driverLocation?'🚕':''}</button>
        </div>
      )}

      <div style={{ display: isMobile?'block':'grid', gridTemplateColumns: isMobile?undefined:'380px 1fr', height: isMobile?undefined:'calc(100vh - 56px)' }}>

        {(!isMobile || !showMap) && (
          <div style={{ background:'#1a1a1a', borderRight: isMobile?'none':'1px solid #2a2a2a', overflowY:'auto', padding:'16px' }}>

            {/* Active trip */}
            {activeTrip && (
              <div style={{ background:si.bg||'#1a1a1a', borderRadius:'14px', padding:'14px', marginBottom:'14px', border:`1px solid ${si.border||'#2a2a2a'}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <span style={{ fontSize:'12px', fontWeight:'700', color:si.color, textTransform:'uppercase' }}>{si.label||activeTrip.status}</span>
                  <span style={{ background:`${si.color}20`, color:si.color, fontSize:'10px', fontWeight:'700', padding:'2px 8px', borderRadius:'16px' }}>Trip #{activeTrip.id}</span>
                </div>

                {activeTrip.status==='REQUESTED' && searchCountdown>0 && (
                  <div style={{ marginBottom:'10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                      <span style={{ fontSize:'11px', color:'#666' }}>Searching for driver</span>
                      <span style={{ fontSize:'11px', fontWeight:'700', color:'#f59e0b' }}>{searchCountdown}s</span>
                    </div>
                    <div style={{ background:'#2a2a2a', borderRadius:'3px', height:'3px', overflow:'hidden' }}>
                      <div style={{ height:'100%', background:'#f59e0b', width:`${(searchCountdown/30)*100}%`, transition:'width 1s linear' }}></div>
                    </div>
                  </div>
                )}

                {/* Driver card */}
                {driverInfo && ['ACCEPTED','IN_PROGRESS'].includes(activeTrip.status) && (
                  <div style={{ background:'#111', borderRadius:'10px', padding:'10px', marginBottom:'10px', border:'1px solid #1db95430' }}>
                    <p style={{ fontSize:'10px', color:'#1db954', fontWeight:'700', margin:'0 0 8px', textTransform:'uppercase' }}>🚗 Your Driver</p>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#1db95420', border:'2px solid #1db95440', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>🧑</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'15px', fontWeight:'700', color:'white', margin:0 }}>{driverInfo.name||'Driver'}</p>
                        <p style={{ fontSize:'11px', color:'#666', margin:'2px 0 0' }}>{driverInfo.vehicleType||'Car'} • ⭐{driverInfo.rating||'5.0'}</p>
                        <p style={{ fontSize:'11px', color:'#555', margin:'1px 0 0' }}>📱 {driverInfo.phone||'N/A'}</p>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                        <a href={`tel:${driverInfo.phone}`} style={{ background:'#1db954', color:'white', border:'none', padding:'6px 10px', borderRadius:'7px', cursor:'pointer', fontSize:'12px', fontWeight:'700', textDecoration:'none', textAlign:'center' }}>📞 Call</a>
                        <button onClick={() => setShowChat(!showChat)} style={{ background:'#3b82f6', color:'white', border:'none', padding:'6px 10px', borderRadius:'7px', cursor:'pointer', fontSize:'12px', fontWeight:'700' }}>💬 Chat</button>
                      </div>
                    </div>
                    {driverLocation && (
                      <div style={{ marginTop:'6px', display:'flex', alignItems:'center', gap:'6px', padding:'5px 8px', background:'#1a2f1a', borderRadius:'6px' }}>
                        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#1db954', animation:'pulse 1.5s infinite', flexShrink:0 }}></div>
                        <span style={{ fontSize:'11px', color:'#1db954' }}>Live tracking active — see map 🗺️</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat panel */}
                {showChat && activeTrip && ['ACCEPTED','IN_PROGRESS'].includes(activeTrip.status) && (
                  <div style={{ background:'#111', borderRadius:'10px', padding:'10px', marginBottom:'10px', border:'1px solid #3b82f630' }}>
                    <p style={{ fontSize:'11px', color:'#3b82f6', fontWeight:'700', margin:'0 0 8px' }}>💬 Chat with Driver</p>
                    <div style={{ maxHeight:'150px', overflowY:'auto', marginBottom:'8px', display:'flex', flexDirection:'column', gap:'4px' }}>
                      {chatMessages.length === 0
                        ? <p style={{ fontSize:'11px', color:'#444', textAlign:'center', padding:'16px 0' }}>No messages yet. Say hi!</p>
                        : chatMessages.map((m,i) => (
                          <div key={i} style={{ display:'flex', justifyContent: m.role==='RIDER'?'flex-end':'flex-start' }}>
                            <div style={{ maxWidth:'75%', background: m.role==='RIDER'?'#1db95430':'#2a2a2a', borderRadius:'8px', padding:'6px 10px', fontSize:'12px', color:m.role==='RIDER'?'#1db954':'#ccc' }}>
                              <p style={{ margin:0 }}>{m.text}</p>
                              <p style={{ margin:'2px 0 0', fontSize:'10px', color:'#555' }}>{m.sender} • {new Date(m.time).toLocaleTimeString()}</p>
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
                      <button onClick={sendMessage} style={{ background:'#3b82f6', border:'none', color:'white', padding:'7px 12px', borderRadius:'7px', cursor:'pointer', fontSize:'12px', fontWeight:'700' }}>Send</button>
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  {activeTrip.fare && (
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'12px', color:'#666' }}>Fare</span>
                      <span style={{ fontSize:'20px', fontWeight:'800', color:'#1db954' }}>₹{activeTrip.fare}</span>
                    </div>
                  )}
                  {activeTrip.distanceKm && (
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:'11px', color:'#666' }}>Distance</span>
                      <span style={{ fontSize:'12px', color:'#ccc' }}>{activeTrip.distanceKm} km</span>
                    </div>
                  )}
                  {activeTrip.surgeMultiplier > 1 && (
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:'11px', color:'#666' }}>Surge</span>
                      <span style={{ fontSize:'12px', fontWeight:'700', color:'#f97316' }}>🔥 {activeTrip.surgeMultiplier}x</span>
                    </div>
                  )}
                </div>

                {activeTrip.status==='COMPLETED' && activeTrip.paymentStatus!=='PAID' && (
                  <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #2a2a2a' }}>
                    <p style={{ fontSize:'12px', color:'#666', marginBottom:'8px', fontWeight:'700', textTransform:'uppercase' }}>Payment Method</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'8px' }}>
                      {[{id:'UPI',icon:'📱'},{id:'CARD',icon:'💳'},{id:'CASH',icon:'💵'},{id:'WALLET',icon:'👛'}].map(m=>(
                        <button key={m.id} onClick={()=>setPaymentMethod(m.id)} style={{ padding:'7px', borderRadius:'7px', cursor:'pointer', border:`2px solid ${paymentMethod===m.id?'#1db954':'#2a2a2a'}`, background:paymentMethod===m.id?'#1a2f1a':'#2a2a2a', color:paymentMethod===m.id?'#1db954':'#999', fontSize:'11px', fontWeight:'600' }}>
                          {m.icon} {m.id}
                        </button>
                      ))}
                    </div>
                    <button onClick={()=>payForRide(activeTrip.id)} disabled={loading} style={{ width:'100%', background:'#1db954', border:'none', color:'white', padding:'12px', borderRadius:'9px', fontSize:'14px', fontWeight:'700', cursor:'pointer' }}>
                      {loading?'⏳...': `💳 Pay ₹${activeTrip.fare} via ${paymentMethod}`}
                    </button>
                  </div>
                )}

                {activeTrip.status==='PAID' && !activeTrip.ratingByRider && (
                  <div style={{ marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #2a2a2a' }}>
                    <p style={{ fontSize:'12px', color:'#999', marginBottom:'8px', textAlign:'center' }}>Rate your driver</p>
                    <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginBottom:'8px' }}>
                      {[1,2,3,4,5].map(s=>(
                        <button key={s} onClick={()=>setRating(s)} style={{ fontSize:'24px', background:'none', border:'none', cursor:'pointer', opacity:rating>=s?1:0.25, transform:rating>=s?'scale(1.1)':'scale(1)', transition:'all 0.1s' }}>⭐</button>
                      ))}
                    </div>
                    <button onClick={()=>rateDriver(activeTrip.id)} disabled={loading} style={{ width:'100%', background:'#f59e0b', border:'none', color:'white', padding:'10px', borderRadius:'9px', fontSize:'13px', fontWeight:'700', cursor:'pointer' }}>
                      Submit {rating}★ Rating
                    </button>
                  </div>
                )}

                {activeTrip.ratingByRider && (
                  <div style={{ marginTop:'10px', textAlign:'center', paddingTop:'10px', borderTop:'1px solid #2a2a2a' }}>
                    <p style={{ fontSize:'18px' }}>{'⭐'.repeat(activeTrip.ratingByRider)}</p>
                    <button onClick={()=>{setActiveTrip(null);setShowChat(false)}} style={{ marginTop:'6px', background:'#1db954', border:'none', color:'white', padding:'8px 16px', borderRadius:'7px', cursor:'pointer', fontSize:'13px', fontWeight:'700' }}>+ Book New Ride</button>
                  </div>
                )}

                {!['REQUESTED','ACCEPTED','IN_PROGRESS'].includes(activeTrip.status) && (
                  <button onClick={()=>{setActiveTrip(null);setShowChat(false)}} style={{ width:'100%', marginTop:'8px', background:'transparent', border:'1px solid #2a2a2a', color:'#555', padding:'7px', borderRadius:'7px', cursor:'pointer', fontSize:'11px' }}>✕ Dismiss</button>
                )}
              </div>
            )}

            {/* Booking form */}
            {canRequest && (
              <div style={{ background:'#242424', borderRadius:'14px', padding:'16px', marginBottom:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                  <h2 style={{ fontSize:'14px', fontWeight:'700', color:'white', margin:0 }}>🚗 Where to?</h2>
                  {isMobile && <span style={{ fontSize:'12px', color:'#1db954', fontWeight:'600' }}>{onlineDrivers} online</span>}
                </div>

                {error && (
                  <div style={{ background:'#2f1a1a', border:'1px solid #ef444430', color:'#ef4444', padding:'9px 11px', borderRadius:'7px', marginBottom:'10px', fontSize:'12px', display:'flex', justifyContent:'space-between' }}>
                    <span>⚠️ {error}</span>
                    <button onClick={()=>setError('')} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}>✕</button>
                  </div>
                )}

                {/* GPS */}
                <button onClick={useGPS} disabled={gpsLoading} style={{ width:'100%', marginBottom:'8px', background:'#1a2f1a', border:'1px solid #1db95440', color:'#1db954', padding:'9px', borderRadius:'9px', cursor:'pointer', fontSize:'12px', fontWeight:'600', display:'flex', alignItems:'center', justifyContent:'center', gap:'5px' }}>
                  {gpsLoading?'⏳ Getting location...':'📍 Use My Current Location'}
                </button>

                {/* Pickup */}
                <div style={{ marginBottom:'6px', position:'relative' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'7px', background:'#1a1a1a', borderRadius:'9px', padding:'9px 11px', border:pickup?'1px solid #1db95440':'1px solid #2a2a2a' }}>
                    <div style={{ width:'9px', height:'9px', borderRadius:'50%', background:'#1db954', flexShrink:0 }}></div>
                    <input value={pickupQ} onChange={e=>onPickupChange(e.target.value)} placeholder="Pickup location"
                      style={{ background:'none', border:'none', outline:'none', color:'white', fontSize:'13px', flex:1 }} />
                    {pickup && <span style={{ fontSize:'10px', color:'#1db954', fontWeight:'700' }}>✓</span>}
                  </div>
                  {sug(pickupSugs, selectPickup)}
                </div>

                {/* Dropoff */}
                <div style={{ marginBottom:'12px', position:'relative' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'7px', background:'#1a1a1a', borderRadius:'9px', padding:'9px 11px', border:dropoff?'1px solid #ef444440':'1px solid #2a2a2a' }}>
                    <div style={{ width:'9px', height:'9px', borderRadius:'2px', background:'#ef4444', flexShrink:0 }}></div>
                    <input value={dropoffQ} onChange={e=>onDropoffChange(e.target.value)} placeholder="Dropoff location"
                      style={{ background:'none', border:'none', outline:'none', color:'white', fontSize:'13px', flex:1 }} />
                    {dropoff && <span style={{ fontSize:'10px', color:'#ef4444', fontWeight:'700' }}>✓</span>}
                  </div>
                  {sug(dropoffSugs, selectDropoff)}
                </div>

                {/* Vehicle picker */}
                <div style={{ marginBottom:'12px' }}>
                  <p style={{ fontSize:'11px', color:'#666', marginBottom:'7px', fontWeight:'700', textTransform:'uppercase' }}>Vehicle Type</p>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    {VEHICLES.map(v => (
                      <button key={v.id} onClick={()=>setVehicleType(v.id)} style={{ padding:'6px 10px', borderRadius:'8px', cursor:'pointer', border:`1.5px solid ${vehicleType===v.id?'#1db954':'#2a2a2a'}`, background:vehicleType===v.id?'#1a2f1a':'#1a1a1a', color:vehicleType===v.id?'#1db954':'#666', fontSize:'11px', fontWeight:'600', display:'flex', alignItems:'center', gap:'4px' }}>
                        {v.icon} {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fare estimate */}
                {fare && (
                  <div style={{ background:'#1a1a1a', borderRadius:'9px', padding:'9px 13px', marginBottom:'12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <span style={{ fontSize:'11px', color:'#666' }}>Estimated fare</span>
                      <div style={{ fontSize:'9px', color:'#444', marginTop:'1px' }}>{fare.km} km · ~{fare.mins} min</div>
                    </div>
                    <span style={{ fontSize:'15px', fontWeight:'800', color:'#1db954' }}>₹{fare.low}–₹{fare.high}</span>
                  </div>
                )}

                <button onClick={requestRide} disabled={loading||!pickup||!dropoff||onlineDrivers===0}
                  style={{ width:'100%', background:(loading||!pickup||!dropoff||onlineDrivers===0)?'#2a2a2a':'#1db954', border:'none', color:(loading||!pickup||!dropoff||onlineDrivers===0)?'#555':'white', padding:'13px', borderRadius:'11px', fontSize:'15px', fontWeight:'800', cursor:(loading||!pickup||!dropoff||onlineDrivers===0)?'not-allowed':'pointer' }}>
                  {loading?'⏳ Searching...':onlineDrivers===0?'🔴 No Drivers Online':(!pickup||!dropoff)?'Select locations above':'🚗 Request Ride'}
                </button>
                {onlineDrivers===0 && <p style={{ fontSize:'11px', color:'#555', textAlign:'center', marginTop:'6px' }}>Ask a driver to go online first</p>}
              </div>
            )}

            {/* Live updates */}
            <div style={{ background:'#242424', borderRadius:'14px', padding:'14px', marginBottom:'14px' }}>
              <h2 style={{ fontSize:'13px', fontWeight:'700', marginBottom:'10px', color:'#999' }}>🔔 LIVE UPDATES</h2>
              {notifications.length===0
                ? <p style={{ color:'#333', fontSize:'12px', textAlign:'center', padding:'12px 0' }}>Waiting for updates...</p>
                : <div style={{ display:'flex', flexDirection:'column', gap:'5px', maxHeight:'160px', overflowY:'auto' }}>
                    {notifications.map((n,i)=>(
                      <div key={i} style={{ background:'#1a1a1a', borderRadius:'7px', padding:'7px 10px', borderLeft:`3px solid ${STATUS[n.status]?.color||'#444'}` }}>
                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                          <span style={{ fontSize:'11px', fontWeight:'700', color:STATUS[n.status]?.color||'#ccc' }}>{n.status||n.type}</span>
                          <span style={{ fontSize:'10px', color:'#444' }}>{n.time}</span>
                        </div>
                        <p style={{ fontSize:'10px', color:'#555', margin:'1px 0 0' }}>Trip #{n.tripId}{n.fare&&n.fare!=='pending'?` • ₹${n.fare}`:''}</p>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Trip history */}
            <div style={{ background:'#242424', borderRadius:'14px', padding:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                <h2 style={{ fontSize:'13px', fontWeight:'700', color:'#999', margin:0 }}>📋 TRIP HISTORY</h2>
                <span style={{ fontSize:'11px', color:'#444' }}>{trips.length} trips</span>
              </div>
              {trips.length===0
                ? <p style={{ color:'#333', fontSize:'12px', textAlign:'center', padding:'12px 0' }}>No trips yet</p>
                : <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'280px', overflowY:'auto' }}>
                    {trips.map(t=>(
                      <div key={t.id} style={{ background:'#1a1a1a', borderRadius:'9px', padding:'10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <p style={{ fontSize:'12px', fontWeight:'600', color:'white', margin:0 }}>Trip #{t.id}</p>
                          <p style={{ fontSize:'10px', color:'#444', margin:'1px 0 0' }}>{new Date(t.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}{t.distanceKm&&` • ${t.distanceKm}km`}</p>
                          {t.ratingByRider && <p style={{ fontSize:'10px', color:'#f59e0b', margin:'1px 0 0' }}>{'⭐'.repeat(t.ratingByRider)}</p>}
                        </div>
                        <div style={{ textAlign:'right' }}>
                          {t.fare && <p style={{ fontSize:'14px', fontWeight:'700', color:'#1db954', margin:0 }}>₹{t.fare}</p>}
                          <span style={{ fontSize:'9px', fontWeight:'700', color:STATUS[t.status]?.color||'#555', textTransform:'uppercase' }}>{t.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        {(!isMobile || showMap) && mapEl}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes driverPulse { 0%,100%{box-shadow:0 0 0 0 rgba(29,185,84,0.5)} 50%{box-shadow:0 0 0 10px rgba(29,185,84,0)} }
        * { font-family: Inter, sans-serif; }
      `}</style>
    </div>
  )
}