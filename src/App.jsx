import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import RiderDashboard from './pages/RiderDashboard'
import DriverDashboard from './pages/DriverDashboard'
import { getToken, getRole } from './utils/auth'

function Guard({ role: required, children }) {
  const token = getToken()
  const role  = getRole()
  if (!token) return <Navigate to="/login" replace />
  if (required && role !== required)
    return <Navigate to={role === 'RIDER' ? '/rider' : '/driver'} replace />
  return children
}

export default function App() {
  const token = getToken()
  const role  = getRole()
  const home  = token ? (role === 'RIDER' ? '/rider' : '/driver') : '/login'
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={token ? <Navigate to={home} replace /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to={home} replace /> : <Register />} />
        <Route path="/rider"    element={<Guard role="RIDER"><RiderDashboard /></Guard>} />
        <Route path="/driver"   element={<Guard role="DRIVER"><DriverDashboard /></Guard>} />
        <Route path="*"         element={<Navigate to={home} replace />} />
      </Routes>
    </BrowserRouter>
  )
}