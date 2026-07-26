import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { initTheme } from './theme'
import { AppGate } from './components/AppGate'
import './index.css'

// Paint the stored theme before React renders anything.
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppGate>
      <App />
    </AppGate>
  </React.StrictMode>
)
