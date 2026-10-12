import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConfirmDialog,
  EmptyState,
  PairingDialog,
  SectionHeader,
  SettingsCard,
  type SettingsCardRow,
  type StatusTone,
} from '@ds/desktop'
import { QrCode, Smartphone, Unlink } from '@ds/desktop/icons'
import type { RemoteDevice, RemotePairing, RemoteRelayStatus, RemoteState } from '../../../types'
import { showToast } from '../../components/Toast'
import { useDialog } from '../../hooks/useDialog'
import { useLocale, useT, type MessageKey, type Translate } from '../../i18n'
import { useToggleRow } from './ToggleRow'

/**
 * Remote access: pairing an iPhone with this Mac, and the iPhones already paired (#352).
 *
 * EVERYTHING HERE IS THE MAIN PROCESS'S, asked over `window.electronAPI.remote`. The page
 * holds no key and no token: it flips remote mode, drives a pairing the main process runs,
 * and revokes devices. `onState` keeps the relay's health and the device list current;
 * `onPairing` walks the dialog through its phases.
 *
 * REMOTE MODE IS MAC-LOCAL AND OFF BY DEFAULT, so it is not a cloud toggle: the switch is
 * `useToggleRow`'s optimistic write against IPC, reverted if the main process refuses.
 * While it is off nothing is offered to pair with, but the devices stay listed: a stolen
 * phone has to be revocable whether or not this Mac is currently reachable.
 */

/** How long the success state stays up before the dialog closes itself. */
const PAIRED_LINGER_MS = 1500

const STATUS: Record<Exclude<RemoteRelayStatus, 'off'>, { text: MessageKey; hint: MessageKey; tone: StatusTone }> = {
  live: { text: 'remote.status.live', hint: 'remote.status.liveHint', tone: 'green' },
  reconnecting: { text: 'remote.status.reconnecting', hint: 'remote.status.reconnectingHint', tone: 'yellow' },
  'signed-out': { text: 'remote.status.signedOut', hint: 'remote.status.signedOutHint', tone: 'neutral' },
}

export function RemoteAccessPage() {
  const t = useT()
  const locale = useLocale()
  const [state, setState] = useState<RemoteState | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    window.electronAPI.remote
      .getState()
      .then((next) => live && setState(next))
      .catch((error) => {
        console.error('[remote] could not read the state:', error)
        if (live) setFailed(true)
      })
    const off = window.electronAPI.remote.onState((next) => setState(next))
    return () => {
      live = false
      off()
    }
  }, [])

  const mode = useToggleRow({
    label: t('remote.mode.label'),
    help: t('remote.mode.help'),
    value: state?.enabled ?? false,
    onChange: async (next) => setState(await window.electronAPI.remote.setEnabled(next)),
    errorMessage: t('remote.mode.error'),
  })

  const pairing = usePairing(t)

  // ── Revocation ──
  const [revokeTarget, setRevokeTarget] = useState<RemoteDevice | null>(null)
  const [revoking, setRevoking] = useState(false)
  const revoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      setState(await window.electronAPI.remote.revokeDevice(revokeTarget.phoneId))
      showToast(t('remote.revoked'))
      setRevokeTarget(null)
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setRevoking(false)
    }
  }

  const cancelRevoke = useCallback(() => {
    if (!revoking) setRevokeTarget(null)
  }, [revoking])
  // Escape and the entrance animation. Rendered on `revokeTarget`, not `mounted`: there is
  // no device left to name once it is cleared, so the dialog leaves without an exit animation.
  const revokeDialog = useDialog(revokeTarget !== null, cancelRevoke)

  if (failed) return <EmptyState icon={Smartphone}>{t('remote.mode.error')}</EmptyState>
  if (!state) return <EmptyState busy>{t('remote.loading')}</EmptyState>

  const relay = state.status === 'off' ? null : state.status
  const rows: SettingsCardRow[] = [{ id: 'mode', ...mode }]
  if (state.enabled && relay) {
    rows.push({
      id: 'relay',
      label: t('remote.status.label'),
      hint: t(STATUS[relay].hint, { name: state.macName }),
      control: { kind: 'status', label: t(STATUS[relay].text), tone: STATUS[relay].tone },
    })
  }
  if (state.enabled) {
    rows.push({
      id: 'pair',
      label: t('remote.pair.label'),
      hint: t(state.status === 'live' ? 'remote.pair.help' : 'remote.pair.needsLive'),
      control: {
        kind: 'button',
        size: 'sm',
        tone: 'accent',
        icon: QrCode,
        children: t('remote.pair.button'),
        // Pairing goes through the relay: the phone's request and our answer both ride it.
        disabled: state.status !== 'live',
        onClick: pairing.open,
      },
    })
  }

  const deviceRow = (device: RemoteDevice): SettingsCardRow => ({
    id: device.phoneId,
    label: device.name,
    icon: Smartphone,
    hint: t('remote.devices.pairedOn', {
      date: new Date(device.pairedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
    }),
    control: {
      kind: 'button',
      size: 'sm',
      tone: 'danger',
      icon: Unlink,
      children: t('remote.revoke'),
      disabled: revoking,
      onClick: () => setRevokeTarget(device),
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <SettingsCard rows={rows} />
      <div>
        <SectionHeader icon={Smartphone} title={t('remote.devices')} count={state.devices.length} />
        {state.devices.length === 0 ? (
          <EmptyState icon={Smartphone}>{t('remote.devices.empty')}</EmptyState>
        ) : (
          <SettingsCard rows={state.devices.map(deviceRow)} note={t('remote.devices.note')} />
        )}
      </div>

      {pairing.view && (
        <PairingDialog
          {...pairing.view}
          pending={pairing.pending}
          onApprove={pairing.approve}
          onDecline={pairing.decline}
          onRetry={pairing.open}
          onClose={pairing.close}
          {...pairing.motion}
          labels={{
            title: t('remote.pair.label'),
            close: t('remote.pair.close'),
            scan: t('remote.pair.scan'),
            qr: t('remote.pair.qr'),
            preparing: t('remote.pair.preparing'),
            expiresIn: (seconds) => t('remote.pair.expiresIn', { seconds: String(seconds) }),
            confirmHint: t('remote.pair.confirmHint'),
            requestedBy: (device) => t('remote.pair.requestedBy', { device }),
            approve: t('remote.pair.approve'),
            decline: t('remote.pair.decline'),
            pairedTitle: t('remote.pair.pairedTitle'),
            pairedHint: t('remote.pair.pairedHint'),
            rejectedTitle: t('remote.pair.rejectedTitle'),
            rejected: {
              expired: t('remote.pair.rejected.expired'),
              used: t('remote.pair.rejected.used'),
              declined: t('remote.pair.rejected.declined'),
            },
            retry: t('remote.pair.retry'),
          }}
        />
      )}

      {revokeTarget && (
        <ConfirmDialog
          tone="danger"
          title={t('remote.revoke.title', { name: revokeTarget.name })}
          body={t('remote.revoke.body')}
          confirmLabel={t('remote.revoke')}
          cancelLabel={t('common.cancel')}
          busy={revoking}
          onConfirm={revoke}
          onCancel={cancelRevoke}
          {...revokeDialog.motion}
        />
      )}
    </div>
  )
}

/**
 * The pairing on screen: what the dialog shows, and the four things it can ask for.
 *
 * `view` is null while no dialog is open. Opening shows `waiting` with no QR straight
 * away, so the dialog is up before the main process has answered; the first token lands
 * from `startPairing`'s result or from `onPairing`, whichever comes first.
 *
 * CLOSING WHILE IT IS LIVE CANCELS IT. A token left valid behind a closed dialog would be
 * a QR nobody is watching that a phone could still scan.
 */
function usePairing(t: Translate) {
  const [view, setView] = useState<RemotePairing | null>(null)
  const [pending, setPending] = useState<'approve' | 'decline' | undefined>()
  const viewRef = useRef(view)
  viewRef.current = view

  // Follow the main process while the dialog is open.
  const isOpen = view !== null
  useEffect(() => {
    if (!isOpen) return
    const off = window.electronAPI.remote.onPairing((next) => {
      setPending(undefined)
      // Null is the pairing ending on the main side (remote mode switched off, say). A
      // success already on screen keeps its moment; anything else simply closes.
      setView((current) => (next === null ? (current?.phase === 'paired' ? current : null) : next))
    })
    return () => {
      off()
    }
  }, [isOpen])

  // The success state closes itself.
  const phase = view?.phase
  useEffect(() => {
    if (phase !== 'paired') return
    const timer = setTimeout(() => setView(null), PAIRED_LINGER_MS)
    return () => clearTimeout(timer)
  }, [phase])

  const open = useCallback(async () => {
    setPending(undefined)
    setView({ phase: 'waiting' })
    try {
      const started = await window.electronAPI.remote.startPairing()
      if (!started) {
        setView(null)
        showToast(t('remote.pair.unavailable'), 'error')
        return
      }
      // Keep whatever `onPairing` already delivered: it is at least as fresh.
      setView((current) => (current && (current.qr || current.phase !== 'waiting') ? current : started))
    } catch (error) {
      setView(null)
      showToast(error instanceof Error ? error.message : t('remote.pair.unavailable'), 'error')
    }
  }, [t])

  const close = useCallback(() => {
    const current = viewRef.current?.phase
    if (current === 'waiting' || current === 'confirm') {
      window.electronAPI.remote.cancelPairing().catch((error) => console.error('[remote] cancel failed:', error))
    }
    setPending(undefined)
    setView(null)
  }, [])

  const answer = useCallback(
    async (which: 'approve' | 'decline') => {
      setPending(which)
      try {
        if (which === 'approve') await window.electronAPI.remote.approvePairing()
        else await window.electronAPI.remote.declinePairing()
      } catch (error) {
        setPending(undefined)
        showToast(error instanceof Error ? error.message : t('remote.pair.failed'), 'error')
      }
    },
    [t],
  )

  const dialog = useDialog(isOpen, close)

  return {
    view,
    motion: dialog.motion,
    pending,
    open: () => void open(),
    close,
    approve: () => void answer('approve'),
    decline: () => void answer('decline'),
  }
}
