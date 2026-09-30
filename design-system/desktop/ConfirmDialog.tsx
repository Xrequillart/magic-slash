import type { AnimationEvent, Ref } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { Icon } from './Icon'
import { AlertTriangle } from './icons'
import { Modal } from './Modal'
import { Text } from './Text'

/**
 * "ARE YOU SURE?": a question, one line on what it means, and the two answers.
 *
 * Written for the app's archive confirmation (⌘W on an agent, or the title bar's
 * button), which was the last dialog in `App.tsx` drawn by hand: a fixed overlay, a
 * bordered panel, two buttons spelled out class by class. It is `Modal` and `Card` now,
 * with the mark, the heading and the two `Button`s this folder already has.
 *
 * THE MARK SAYS HOW SERIOUS IT IS (`tone`). `warning` (the default) is the yellow
 * triangle, for something that can be taken back or costs little: an archived agent
 * keeps its history. `danger` is the red one, for what cannot. The confirm button is
 * `danger` either way: it is the action the question is about.
 *
 * TWO EQUAL BUTTONS, cancel then confirm, each half the row: the dialog is small, and a
 * right-aligned pair would leave the left half of it empty.
 *
 * THE KEYBOARD IS THE CALLER'S, like `Modal`'s Escape: Enter to confirm, Escape to
 * cancel. `confirmRef` is there so the caller can put the focus on the confirm button
 * when the dialog opens, which is what makes Enter mean "yes" visibly.
 *
 * DATA IN, CALLBACKS OUT. Every word arrives translated.
 */

export type ConfirmDialogTone = 'warning' | 'danger'

export interface ConfirmDialogProps {
  /** The question: "Archive this session?". */
  title: string
  /** What answering yes means, in one line: "It leaves your list, and its history is kept." */
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  /** Also what a press on the dimmed ground does. */
  onCancel: () => void
  /** How serious the question is, drawn by the mark. `warning` unless it cannot be undone. */
  tone?: ConfirmDialogTone
  /** The confirm button, for the caller to focus when the dialog opens. */
  confirmRef?: Ref<HTMLButtonElement>
  /** The caller's enter and exit animation: see `Modal`, which owns neither. */
  backdropClassName?: string
  className?: string
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  /** Passed straight to `Modal`: see its note on why a drawing of the app needs it. */
  portalTo?: HTMLElement | null
}

/** Spelled in full, per tone, so Tailwind finds every class. */
const MARKS: Record<ConfirmDialogTone, string> = {
  warning: 'bg-yellow/10 text-yellow',
  danger: 'bg-red/10 text-red',
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'warning',
  confirmRef,
  backdropClassName,
  className = '',
  onAnimationEnd,
  portalTo,
}: ConfirmDialogProps) {
  return (
    <Modal
      onClose={onCancel}
      labelledBy="confirm-dialog-title"
      backdropClassName={backdropClassName}
      onAnimationEnd={onAnimationEnd}
      portalTo={portalTo}
      className={`mx-4 w-full max-w-sm ${className}`.trim()}
    >
      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${MARKS[tone]}`}>
            <Icon glyph={AlertTriangle} size="sm" tone="inherit" />
          </span>
          <span id="confirm-dialog-title" className="min-w-0">
            <Text size="md" weight="bold">{title}</Text>
          </span>
        </div>
        <Text size="sm" tone="secondary">{body}</Text>
        <div className="flex gap-2">
          <Button tone="neutral" size="sm" onClick={onCancel} className="flex-1">{cancelLabel}</Button>
          <Button ref={confirmRef} tone="danger" size="sm" onClick={onConfirm} className="flex-1">{confirmLabel}</Button>
        </div>
      </Card>
    </Modal>
  )
}
