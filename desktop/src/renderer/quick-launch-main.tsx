import React from 'react'
import ReactDOM from 'react-dom/client'
import { QuickLaunch } from './pages/QuickLaunch'
import { initTheme } from './theme'
import { initI18n } from './i18n'
import './index.css'

// Paint the stored theme and adopt the stored language before React renders
// anything — both arrive as launch arguments, so the first frame is already right.
initTheme()
initI18n()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QuickLaunch />
  </React.StrictMode>
)
