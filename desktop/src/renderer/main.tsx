import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { initTheme } from './theme'
import { initI18n } from './i18n'
import { AppGate } from './components/AppGate'
import './index.css'

// Paint the stored theme and adopt the stored language before React renders
// anything — both arrive as launch arguments, so the first frame is already right.
initTheme()
initI18n()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppGate>
      <App />
    </AppGate>
  </React.StrictMode>
)
