import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { AppGate } from './components/AppGate'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppGate>
      <App />
    </AppGate>
  </React.StrictMode>
)
