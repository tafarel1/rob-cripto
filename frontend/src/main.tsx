import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '@/App'
import './index.css'
import { SocketProvider } from '@/contexts/SocketContext'
import { UXProvider } from '@/contexts/UXContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocketProvider>
      <UXProvider>
        <App />
      </UXProvider>
    </SocketProvider>
  </StrictMode>,
)


if (import.meta.env.PROD && 'serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost') && document.visibilityState === 'visible') {
  // Defer to vite-plugin-pwa auto-generated register script
  const s = document.createElement('script')
  s.src = '/registerSW.js'
  s.async = true
  document.head.appendChild(s)
}
