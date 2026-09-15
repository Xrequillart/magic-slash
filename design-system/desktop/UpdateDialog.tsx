import type { AnimationEvent } from 'react'
import { Card } from './Card'
import { Icon } from './Icon'
import { AlertTriangle, CheckCircle, Download } from './icons'
import { Modal } from './Modal'
import { ProgressBar } from './ProgressBar'
import { Text } from './Text'

/**
 * THE APP TELLING YOU IT IS ABOUT TO BECOME A NEWER APP.
 *
 * A `Modal` holding a `Card`, on `RepositorySelector`'s precedent — the dialog carries
 * the ground and the stacking, the card carries the plate, and everything inside is
 * `Icon`, `Text` and `ProgressBar`. Four stages, one shape: a mark, a line naming what
 * is happening, and underneath it whatever that stage has to show.
 *
 * IT REPLACED A ROW IN THE LEFT SIDEBAR, and the change is not cosmetic. That row let
 * you keep working through the download and then asked whether to restart; this holds
 * the screen from the moment a release is found until the app relaunches. The whole
 * sequence is one uninterrupted thing now, which is why it is one component rather
 * than four states scattered down a column.
 *
 * NO CLOSE ON THE GROUND. `Modal`'s `onClose` is deliberately not wired: a click
 * outside must not dismiss an app that is halfway through replacing itself. The one
 * way out is `onPostpone`, offered only while the countdown runs — at every other
 * stage there is nothing a person could usefully decide.
 *
 * WHAT IT DOES NOT KNOW: that there is an updater at all. No IPC, no timer, no
 * arithmetic on seconds — the countdown arrives already counted and already worded,
 * because "Restarting in 4s" needs a translator and the tick needs to survive this
 * component re-rendering for other reasons.
 */

/** Where the update has got to. One per thing the dialog can be looking at. */
export type UpdateStage =
  /** A release was found. The transfer starts by itself, so there is nothing to press. */
  | { type: 'available'; version: string }
  /** It is coming down. `percent` is 0 to 100; `ProgressBar` clamps it. */
  | { type: 'downloading'; percent: number }
  /** On disk, and the relaunch is counting down. `remaining` of `total` seconds left. */
  | { type: 'ready'; version: string; remaining: number; total: number }
  /** The transfer broke. The release is still there, so this one is retryable. */
  | { type: 'failed' }

export interface UpdateDialogProps {
  stage: UpdateStage
  /** The heading for each stage, translated. Whichever one `stage` selects is drawn. */
  availableLabel: string
  downloadingLabel: string
  readyLabel: string
  failedLabel: string
  /**
   * The version, spelled by the caller — "v0.95.0". Drawn verbatim under the heading,
   * for the reason `Sidebar`'s own version line gives: which prefix a version wears is
   * not this dialog's question. Absent on the two stages that have no version in hand.
   */
  version?: string
  /**
   * "Restarting in 4s…", ALREADY COUNTED AND ALREADY WORDED. The seconds are in
   * `stage.remaining` as well, but only so the bar can be drawn from them — the
   * sentence is the caller's because a French one puts a space before the unit and an
   * English one does not.
   */
  countdownLabel: string
  /** The one way out, and only while the countdown runs. Translated. */
  postponeLabel: string
  onPostpone: () => void
  /** Pull it again after a failed transfer. Translated. */
  retryLabel: string
  onRetry: () => void
  /** The caller's enter and exit animation — see `Modal`, which owns neither. */
  backdropClassName?: string
  className?: string
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  /** Passed straight to `Modal` — see its note on why a drawing of the app needs it. */
  portalTo?: HTMLElement | null
}

/** The mark each stage wears, and the colour it wears it in. */
const MARKS = {
  available: { glyph: Download, className: 'text-accent' },
  downloading: { glyph: Download, className: 'text-accent' },
  ready: { glyph: CheckCircle, className: 'text-accent' },
  failed: { glyph: AlertTriangle, className: 'text-red' },
} as const

export function UpdateDialog({
  stage,
  availableLabel,
  downloadingLabel,
  readyLabel,
  failedLabel,
  version,
  countdownLabel,
  postponeLabel,
  onPostpone,
  retryLabel,
  onRetry,
  backdropClassName,
  className = '',
  onAnimationEnd,
  portalTo,
}: UpdateDialogProps) {
  const heading = {
    available: availableLabel,
    downloading: downloadingLabel,
    ready: readyLabel,
    failed: failedLabel,
  }[stage.type]
  const mark = MARKS[stage.type]

  return (
    <Modal
      labelledBy="update-dialog-title"
      backdropClassName={backdropClassName}
      onAnimationEnd={onAnimationEnd}
      portalTo={portalTo}
      className={`w-full max-w-sm mx-4 ${className}`.trim()}
    >
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {/* `tone="inherit"` and the colour on the class: the mark is the one thing
              here that carries the stage's meaning, so it is not the theme's icon grey. */}
          <Icon glyph={mark.glyph} size="lg" tone="inherit" className={`shrink-0 ${mark.className}`} />
          <div className="flex flex-col min-w-0">
            <span id="update-dialog-title">
              <Text size="sm" weight="bold" className="truncate" title={heading}>
                {heading}
              </Text>
            </span>
            {version && (
              <Text size="xs" tone="secondary" className="opacity-60 truncate">
                {version}
              </Text>
            )}
          </div>
        </div>

        {stage.type === 'downloading' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Text size="xs" tone="secondary" className="opacity-60">
                {downloadingLabel}
              </Text>
              <Text size="xs" weight="bold" tone="inherit" className="text-accent">
                {`${Math.round(clamp(stage.percent))}%`}
              </Text>
            </div>
            {/* `accent` and no thresholds: this is the app reporting its own download,
                where green would read as a verdict on something that has not finished
                happening, and an orange at 40% as a problem with a healthy transfer. */}
            <ProgressBar value={stage.percent} tone="accent" label={downloadingLabel} />
          </div>
        )}

        {stage.type === 'ready' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Text size="xs" tone="secondary" className="opacity-60">
                {countdownLabel}
              </Text>
              {/* DRAINING, not filling: what the bar measures is the time you have left
                  to stop this, so it empties as that time runs out.

                  `transition={false}` for the reason `ProgressBar`'s own note gives, one
                  order of magnitude up: the value steps once a second and a 500ms ease
                  would spend half of every step catching up with a number that has
                  already moved. A countdown that lags is a countdown you cannot trust. */}
              <ProgressBar
                value={stage.total > 0 ? (stage.remaining / stage.total) * 100 : 0}
                tone="accent"
                label={countdownLabel}
                transition={false}
              />
            </div>
            <div className="flex justify-end">
              <DialogButton label={postponeLabel} onClick={onPostpone} />
            </div>
          </div>
        )}

        {stage.type === 'failed' && (
          <div className="flex justify-end">
            <DialogButton label={retryLabel} onClick={onRetry} />
          </div>
        )}
      </Card>
    </Modal>
  )
}

/**
 * The quiet button this dialog offers at most one of.
 *
 * Outlined and secondary at both call sites on purpose: neither "Later" nor "Try
 * again" is the thing the dialog wants you to do — the restart happens by itself and
 * the retry is a second chance at something that should not have needed one. A filled
 * button here would be the dialog asking for a decision it is not actually waiting on.
 *
 * Drawn by hand rather than composed, because this folder has no text button yet.
 * `ButtonIcon` is the only button in it and a glyph alone cannot say "Later".
 */
function DialogButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg border border-line-subtle text-text-secondary hover:text-ink hover:border-line transition-colors"
    >
      <Text size="xs" tone="inherit">
        {label}
      </Text>
    </button>
  )
}

/**
 * `ProgressBar` clamps the bar itself, but the PERCENTAGE is read here — and a caller
 * doing its own arithmetic must not be able to print "104%" beside a bar that stopped
 * at full.
 */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, value))
}
