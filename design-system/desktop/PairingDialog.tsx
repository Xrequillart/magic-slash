import { useEffect, useState, type AnimationEvent } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import { CircleCheck, CircleX } from './icons'
import { Loader } from './Loader'
import { Modal } from './Modal'
import { ModalHeader } from './ModalHeader'
import { ProgressBar } from './ProgressBar'
import { QrCode } from './QrCode'
import { Text } from './Text'

/**
 * PAIRING AN IPHONE WITH THIS MAC, from the QR to the verdict: the Remote access page's
 * dialog, one window for the four phases the main process walks it through.
 *
 * - `waiting`: the QR is up, with the seconds it has left. A token lives 60 s and the main
 *   process swaps in a fresh one on its own, so this simply redraws when `qr` changes.
 * - `confirm`: a phone scanned it. Its four-digit code is shown BIG, for the reader to
 *   compare with the one on the iPhone, and nothing pairs until they approve.
 * - `paired`: done. The caller closes the dialog after a moment.
 * - `rejected`: the token expired, was already used, or the reader declined. Says which,
 *   and offers to start over.
 *
 * THE CODE IS THE SECURITY, not decoration. The QR can be photographed off a screen; the
 * comparison is what proves that the phone asking is the phone in the reader's hand. So
 * it is the largest thing on the panel in that phase, one tile per digit, and the hint
 * above it says in words what to do with it.
 *
 * THE COUNTDOWN TICKS HERE, from `expiresAt`. It is presentation: a clock the main process
 * would otherwise have to push down the bridge every second. The re-encode does not tick
 * with it (see `QrCode`).
 *
 * DATA IN, CALLBACKS OUT. Every word arrives translated; the two that carry a figure or a
 * name are functions, `MenuBarQuestion`'s `moreOptions` move. Escape, like `Modal`'s, is
 * the caller's.
 */

export type PairingDialogPhase = 'waiting' | 'confirm' | 'paired' | 'rejected'
export type PairingDialogRejection = 'expired' | 'used' | 'declined'

export interface PairingDialogLabels {
  /** The dialog's name: "Pair an iPhone". */
  title: string
  /** The close button's tooltip. */
  close: string
  /** Over the QR: what to do with it. */
  scan: string
  /** The QR, for a screen reader. */
  qr: string
  /** Under the QR, while the code is being made. */
  preparing: string
  /** Under the QR: "Expires in 42 s". */
  expiresIn: (seconds: number) => string
  /** Over the four digits: "Check that the iPhone shows the same code." */
  confirmHint: string
  /** Under the four digits: "Requested by Xavier's iPhone". */
  requestedBy: (deviceName: string) => string
  approve: string
  decline: string
  pairedTitle: string
  pairedHint: string
  rejectedTitle: string
  /** Why, one sentence per reason. */
  rejected: Record<PairingDialogRejection, string>
  retry: string
}

export interface PairingDialogProps {
  phase: PairingDialogPhase
  /** The QR's text, in `waiting`. Absent while the first token is being made. */
  qr?: string
  /** Epoch ms at which `qr` stops being accepted. */
  expiresAt?: number
  /** The four digits, in `confirm`. */
  code?: string
  /** The phone asking, in `confirm`. */
  deviceName?: string
  /** Why, in `rejected`. Absent reads as `expired`. */
  reason?: PairingDialogRejection
  labels: PairingDialogLabels
  onApprove: () => void
  onDecline: () => void
  onRetry: () => void
  /** The close button and the dimmed ground. The caller cancels the pairing. */
  onClose: () => void
  /** The answer in flight: that button spins and both stop answering. */
  pending?: 'approve' | 'decline'
  /** How long a token lives, for the bar under the QR. 60 s, the main process's figure. */
  lifetimeMs?: number
  backdropClassName?: string
  className?: string
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  /** Passed straight to `Modal`: see its note on why a drawing of the app needs it. */
  portalTo?: HTMLElement | null
}

/** The QR's side in pixels. The loader's box is the same, so nothing jumps when it lands. */
const QR_SIZE = 192

export function PairingDialog({
  phase,
  qr,
  expiresAt,
  code,
  deviceName,
  reason,
  labels,
  onApprove,
  onDecline,
  onRetry,
  onClose,
  pending,
  lifetimeMs = 60_000,
  backdropClassName,
  className = '',
  onAnimationEnd,
  portalTo,
}: PairingDialogProps) {
  return (
    <Modal
      onClose={onClose}
      backdropClassName={backdropClassName}
      onAnimationEnd={onAnimationEnd}
      portalTo={portalTo}
      className={`mx-4 w-full max-w-sm ${className}`.trim()}
    >
      <ModalHeader title={labels.title} onClose={onClose} closeTitle={labels.close} gutter="wide" />
      <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-1 text-center">
        {phase === 'waiting' && (
          <Waiting qr={qr} expiresAt={expiresAt} lifetimeMs={lifetimeMs} labels={labels} />
        )}
        {phase === 'confirm' && (
          <>
            <Text size="sm" tone="secondary">{labels.confirmHint}</Text>
            <Digits code={code ?? ''} />
            {deviceName && <Text size="sm" tone="secondary">{labels.requestedBy(deviceName)}</Text>}
            <div className="flex w-full gap-2">
              <Button
                tone="neutral"
                size="sm"
                onClick={onDecline}
                busy={pending === 'decline'}
                disabled={pending !== undefined}
                className="flex-1"
              >
                {labels.decline}
              </Button>
              <Button
                tone="accent"
                size="sm"
                onClick={onApprove}
                busy={pending === 'approve'}
                disabled={pending !== undefined}
                className="flex-1"
              >
                {labels.approve}
              </Button>
            </div>
          </>
        )}
        {phase === 'paired' && (
          <Verdict tone="success" title={labels.pairedTitle} body={labels.pairedHint} />
        )}
        {phase === 'rejected' && (
          <>
            <Verdict tone="danger" title={labels.rejectedTitle} body={labels.rejected[reason ?? 'expired']} />
            <div className="flex w-full gap-2">
              <Button tone="neutral" size="sm" onClick={onClose} className="flex-1">{labels.close}</Button>
              <Button tone="accent" size="sm" onClick={onRetry} className="flex-1">{labels.retry}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function Waiting({
  qr,
  expiresAt,
  lifetimeMs,
  labels,
}: {
  qr?: string
  expiresAt?: number
  lifetimeMs: number
  labels: PairingDialogLabels
}) {
  const now = useNow(expiresAt !== undefined)
  const left = expiresAt === undefined ? 0 : Math.max(0, expiresAt - now)

  return (
    <>
      <Text size="sm" tone="secondary">{labels.scan}</Text>
      {qr ? (
        <QrCode value={qr} label={labels.qr} size={QR_SIZE} />
      ) : (
        <div className="flex items-center justify-center rounded-xl bg-surface" style={{ width: QR_SIZE, height: QR_SIZE }}>
          <Loader tone="muted" label={labels.preparing} />
        </div>
      )}
      <div className="flex w-full flex-col gap-1.5" style={{ maxWidth: QR_SIZE }}>
        <ProgressBar value={qr ? (left / lifetimeMs) * 100 : 0} tone="accent" size="xs" transition={false} />
        <Text size="xs" tone="secondary" className="tabular-nums">
          {qr && expiresAt !== undefined ? labels.expiresIn(Math.ceil(left / 1000)) : labels.preparing}
        </Text>
      </div>
    </>
  )
}

/** The four digits, a tile each, at the size a reader compares from across a desk. */
function Digits({ code }: { code: string }) {
  return (
    <div className="flex gap-2" aria-label={code}>
      {code.split('').map((digit, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="flex h-16 w-12 items-center justify-center rounded-xl bg-surface-strong"
        >
          <Text size="2xl" weight="bold" className="tabular-nums">{digit}</Text>
        </span>
      ))}
    </div>
  )
}

/** Spelled in full, per tone, so Tailwind finds every class. */
const VERDICTS = {
  success: { plate: 'bg-green/10 text-green', glyph: CircleCheck },
  danger: { plate: 'bg-red/10 text-red', glyph: CircleX },
} as const

function Verdict({ tone, title, body }: { tone: keyof typeof VERDICTS; title: string; body: string }) {
  const { plate, glyph } = VERDICTS[tone]
  return (
    <>
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${plate}`}>
        <Icon glyph={glyph} size="lg" tone="inherit" />
      </span>
      <Text size="md" weight="bold">{title}</Text>
      <Text size="sm" tone="secondary">{body}</Text>
    </>
  )
}

/** The clock, once a second, only while there is something to count down to. */
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])
  return now
}
