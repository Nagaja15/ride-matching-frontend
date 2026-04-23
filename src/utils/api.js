import axios from 'axios'
import { getToken } from './auth'

const PROD_URL = 'https://ride-matching-engine-production.up.railway.app/api'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || PROD_URL
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