import axios from 'axios'
import { getToken } from './auth'

const api = axios.create({
  baseURL: 'https://ride-matching-engine-production.up.railway.app/api'
})

api.interceptors.request.use(cfg => {
  const token = getToken()
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      sessionStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api