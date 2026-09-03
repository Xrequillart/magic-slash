import { CloudOff, WifiOff, Loader2, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'
import type { GateStatus } from '../hooks/useConnectivity'
import { useStore } from '../store'
import { LoginScreen } from './LoginScreen'
import { showToast, dismissToast } from './Toast'
import { useT } from '../i18n'
import { BTN_PRIMARY } from '../theme/controls'

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center h-screen bg-transparent text-ink">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">{children}</div>
    </div>
  )
}

function Checking() {
  const t = useT()
  return (
    <FullScreen>
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
      <p className="text-ink/60">{t('app.connecting')}</p>
    </FullScreen>
  )
}

function CloudNotConfigured() {
  const t = useT()
  return (
    <FullScreen>
      <div className="p-3 bg-red/10 rounded-xl">
        <CloudOff className="w-7 h-7 text-red" />
      </div>
      <h2 className="text-lg font-semibold">{t('gate.cloudNotConfigured.title')}</h2>
      <p className="text-sm text-text-secondary">
        {t('gate.cloudNotConfigured.body')}
      </p>
    </FullScreen>
  )
}

function ConnectionLost({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  return (
    <FullScreen>
      <div className="p-3 bg-yellow/10 rounded-xl">
        <WifiOff className="w-7 h-7 text-yellow" />
      </div>
      <h2 className="text-lg font-semibold">{t('gate.connectionLost.title')}</h2>
      <p className="text-sm text-text-secondary">
        {t('gate.connectionLost.body')}
      </p>
      <button
        onClick={onRetry}
        className={BTN_PRIMARY}
      >
        <RotateCcw className="w-3.5 h-3.5" />
        {t('common.retry')}
      </button>
    </FullScreen>
  )
}

/**
 * Warns about a lost connection without taking the interface away: a persistent
 * toast while the backend is unreachable, closed and replaced by a short
 * confirmation once it answers again. Only for an app that already rendered —
 * a cold start with no reachable backend still gets the full-screen block,
 * because there would be nothing behind the toast.
 */
function useOfflineToast(status: GateStatus, everOk: boolean, onRetry: () => void) {
  const t = useT()
  // State, not a ref: acting on the toast closes it (the container drops any
  // toast whose action fires), so clearing the id has to re-run this effect —
  // which puts the warning back if the backend is still unreachable. A manual
  // close keeps the id, so a dismissed warning stays dismissed.
  const [toastId, setToastId] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'unreachable' && everOk) {
      if (toastId === null) {
        setToastId(showToast(t('toast.connectionLost'), 'warning', {
          persistent: true,
          actions: [{
            label: t('common.retry'),
            icon: <RotateCcw className="w-3.5 h-3.5" />,
            onClick: () => { setToastId(null); void onRetry() },
          }],
        }))
      }
      return
    }
    if (toastId !== null) {
      dismissToast(toastId)
      setToastId(null)
      if (status === 'ok') showToast(t('toast.connectionRestored'), 'success')
    }
  }, [status, everOk, onRetry, t, toastId])
}

/**
 * Mandatory cloud gate wrapping the entire app. Children (the real App) render
 * when the backend is reachable AND the user is authenticated — and stay
 * rendered through a later connection loss, which is surfaced as a toast rather
 * than a wall. Signing out, a missing cloud config, and a first launch that
 * never reached the backend remain hard blocks.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const { status, everOk, recheck } = useConnectivity()
  const clearTerminals = useStore((s) => s.clearTerminals)

  useOfflineToast(status, everOk, recheck)

  // Losing the session drops the terminal state. The store outlives this gate
  // (it is a module singleton, and children only unmount), so the next account
  // to sign in would otherwise land on the previous one's tabs. Deliberately
  // scoped to 'unauthorized': 'unreachable' keeps the sessions running, and
  // useTerminals rebuilds the list from the main process once it clears.
  useEffect(() => {
    if (status === 'unauthorized') clearTerminals()
  }, [status, clearTerminals])

  switch (status) {
    case 'ok':
      return <>{children}</>
    case 'checking':
      return <Checking />
    case 'disabled':
      return <CloudNotConfigured />
    case 'unreachable':
      // Once the app has been up, losing the backend no longer hides it: the
      // caches are hydrated, so reads keep working and a failed write already
      // raises its own toast. Only a cold start — nothing hydrated, nothing to
      // show — still blocks.
      return everOk ? <>{children}</> : <ConnectionLost onRetry={recheck} />
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
