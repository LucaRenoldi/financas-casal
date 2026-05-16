import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#18181C',
          color: '#F0F0F5',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '99px',
          fontSize: '13px',
          fontFamily: 'Sora, sans-serif',
          fontWeight: '500',
          padding: '10px 18px',
        },
        success: { iconTheme: { primary: '#00C896', secondary: '#0A0A0B' } },
        error: { iconTheme: { primary: '#F87171', secondary: '#0A0A0B' } },
      }}
    />
  </React.StrictMode>
)
