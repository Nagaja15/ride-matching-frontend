import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '600',
          padding: '12px 20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
        success: {
          iconTheme: { primary: '#1db954', secondary: '#fff' },
          style: {
            background: '#0a1f0a',
            border: '1px solid #1db95440',
            color: '#1db954',
          }
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fff' },
          style: {
            background: '#1f0a0a',
            border: '1px solid #ef444440',
            color: '#ef4444',
          }
        }
      }}
    />
    <App />
  </StrictMode>
)