import React from 'react'
import ReactDOM from 'react-dom/client'
import { QuickLaunch } from './pages/QuickLaunch'
import { initTheme } from './theme'
import './index.css'

// Paint the stored theme before React renders anything.
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QuickLaunch />
  </React.StrictMode>
)
