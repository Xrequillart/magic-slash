import { CloudOff, WifiOff, Loader2, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'
import { LoginScreen } from './LoginScreen'

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center h-screen bg-transparent text-white">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">{children}</div>
    </div>
  )
}

function Checking() {
  return (
    <FullScreen>
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
      <p className="text-white/60">Connecting…</p>
    </FullScreen>
  )
}

function CloudNotConfigured() {
  return (
    <FullScreen>
      <div className="p-3 bg-red/10 rounded-xl">
        <CloudOff className="w-7 h-7 text-red" />
      </div>
      <h2 className="text-lg font-semibold">Cloud not configured</h2>
      <p className="text-sm text-text-secondary">
        Magic Slash requires its cloud backend, but it isn’t configured in this build. Please
        reinstall an official build or set the Supabase environment before launching.
      </p>
    </FullScreen>
  )
}

function ConnectionLost({ onRetry }: { onRetry: () => void }) {
  return (
    <FullScreen>
      <div className="p-3 bg-yellow/10 rounded-xl">
        <WifiOff className="w-7 h-7 text-yellow" />
      </div>
      <h2 className="text-lg font-semibold">Connection lost</h2>
      <p className="text-sm text-text-secondary">
        Magic Slash can’t reach its backend. Check your internet connection — the app stays
        locked until the connection is restored.
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Retry
      </button>
    </FullScreen>
  )
}

/**
 * Mandatory cloud gate wrapping the entire app. Children (the real App) render
 * ONLY when the backend is reachable AND the user is authenticated. Every other
 * state is a hard block — no offline mode, no grace period.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const { status, recheck } = useConnectivity()

  switch (status) {
    case 'ok':
      return <>{children}</>
    case 'checking':
      return <Checking />
    case 'disabled':
      return <CloudNotConfigured />
    case 'unreachable':
      return <ConnectionLost onRetry={recheck} />
    case 'unauthorized':
    default:
      // Blocking auth wall: the modal cannot be dismissed (there is nothing
      // behind it). On sign-in we re-probe connectivity to unlock the app.
      return (
        <div className="h-screen bg-transparent">
          <LoginScreen isOpen onClose={() => {}} onSignedIn={recheck} />
        </div>
      )
  }
}
