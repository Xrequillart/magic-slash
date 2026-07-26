import React from 'react'
import ReactDOM from 'react-dom/client'
import { TrayPopover } from './pages/TrayPopover'
import { initTheme } from './theme'
import './index.css'

// Paint the stored theme before React renders anything.
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TrayPopover />
  </React.StrictMode>
)
