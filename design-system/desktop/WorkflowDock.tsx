import { useRef, useState } from 'react'
import { useReactFlow } from '@xyflow/react'

import { Button } from './Button'
import { ButtonIcon } from './ButtonIcon'
import { Menu } from './Menu'
import { Icon } from './Icon'
import { CircleAlert, LocateFixed, Plus, Redo2, Undo2, X, ZoomIn, ZoomOut } from './icons'
import type { WorkflowProblemItem } from './WorkflowProblems'

/**
 * THE EDITOR'S DOCK: a floating bar at the bottom centre of the canvas, holding what
 * the editor does to the whole flow rather than to what is selected.
 *
 * Left to right: add a step, undo and redo, the zoom, the problems, and the draft's
 * fate (discard, save), then a close button when the caller has one to give. The selection's own controls are the inspector's, which is
 * why nothing here needs one.
 *
 * DRAWN BY `WorkflowCanvas`, INSIDE ITS FLOW, and never by hand: the zoom buttons and
 * the "+" read xyflow's store (`useReactFlow`), which only a child of the flow can.
 *
 * THE "+" SAYS WHERE. It hands back its own button, for the skill picker to hang from,
 * and the canvas point at the middle of the view: a new step lands where the admin is
 * looking, linked to nothing yet.
 *
 * THE PROBLEMS ARE A BADGE, not a list over the canvas: their count in red, and a menu
 * of them on a press, each one centring the view on the step it names. Nothing is drawn
 * while there is none.
 *
 * Every word arrives translated, the problems' count included.
 */

export interface WorkflowDockLabels {
  /** The bar's accessible name: "Workflow tools". */
  dock: string
  add: string
  undo: string
  redo: string
  zoomIn: string
  zoomOut: string
  /** Back onto the whole flow, the camera recentred: "Recenter on the workflow". */
  fit: string
  /** The badge's tooltip and the menu's title: "2 problems to fix before saving". */
  problems: string
  discard: string
  save: string
  /** "Close the editor", when there is a close button: `onClose`. */
  close?: string
}

export interface WorkflowDockProps {
  labels: WorkflowDockLabels
  /** The "+": its button, and the canvas point at the middle of the view. No "+" without it. */
  onAdd?: (anchor: HTMLElement, position: { x: number; y: number }) => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  problems?: WorkflowProblemItem[]
  /** A problem was picked: centre on the step it names. */
  onFocusProblem?: (nodeId: string) => void
  /** Discard and Save are live only with something to save. */
  dirty?: boolean
  saving?: boolean
  /** Save also needs no problem: the caller's call. */
  canSave?: boolean
  onSave?: () => void
  onDiscard?: () => void
  /** A close button at the end of the bar. None without it: the full-screen editor closes from its title bar. */
  onClose?: () => void
}

/** How far a zoom button moves, and how long it takes. */
const ZOOM = { duration: 200 }
const FIT = { padding: 0.12, maxZoom: 1, duration: 300 }

/** Half a new card, so the one the "+" adds is centred in the view rather than hung off its middle. */
const CARD_HALF = { x: 112, y: 29 }

export function WorkflowDock({
  labels,
  onAdd,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  problems = [],
  onFocusProblem,
  dirty = false,
  saving = false,
  canSave = false,
  onSave,
  onDiscard,
  onClose,
}: WorkflowDockProps) {
  const { zoomIn, zoomOut, fitView, screenToFlowPosition } = useReactFlow()
  const addRef = useRef<HTMLButtonElement>(null)
  const problemsRef = useRef<HTMLButtonElement>(null)
  const [problemsOpen, setProblemsOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const add = () => {
    const button = addRef.current
    // The view is the canvas the dock floats in: its box, not the window's.
    const pane = barRef.current?.closest('.react-flow')?.getBoundingClientRect()
    if (!button || !pane || !onAdd) return
    const centre = screenToFlowPosition({ x: pane.left + pane.width / 2, y: pane.top + pane.height / 2 })
    onAdd(button, { x: centre.x - CARD_HALF.x, y: centre.y - CARD_HALF.y })
  }

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label={labels.dock}
      className="nodrag nopan flex items-center gap-1 rounded-2xl border border-line bg-bg-secondary p-1.5 shadow-lg"
    >
      {onAdd && (
        <>
          <ButtonIcon ref={addRef} icon={Plus} title={labels.add} onClick={add} tone="solid" size="lg" />
          <Divider />
        </>
      )}
      {(onUndo || onRedo) && (
        <>
          <ButtonIcon icon={Undo2} title={labels.undo} onClick={() => onUndo?.()} disabled={!canUndo} tone="ghost" size="lg" />
          <ButtonIcon icon={Redo2} title={labels.redo} onClick={() => onRedo?.()} disabled={!canRedo} tone="ghost" size="lg" />
          <Divider />
        </>
      )}
      <ButtonIcon icon={ZoomOut} title={labels.zoomOut} onClick={() => void zoomOut(ZOOM)} tone="ghost" size="lg" />
      <ButtonIcon icon={ZoomIn} title={labels.zoomIn} onClick={() => void zoomIn(ZOOM)} tone="ghost" size="lg" />
      <ButtonIcon icon={LocateFixed} title={labels.fit} onClick={() => void fitView(FIT)} tone="ghost" size="lg" />
      {problems.length > 0 && (
        <>
          <Divider />
          <button
            ref={problemsRef}
            type="button"
            title={labels.problems}
            aria-label={labels.problems}
            aria-haspopup="menu"
            onClick={() => setProblemsOpen((open) => !open)}
            className="flex h-8 items-center gap-1.5 rounded-xl bg-red/10 px-2.5 text-xs font-semibold text-red transition-colors hover:bg-red/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
          >
            <Icon glyph={CircleAlert} size="sm" tone="inherit" />
            {problems.length}
          </button>
          <Menu
            open={problemsOpen}
            onClose={() => setProblemsOpen(false)}
            anchor={problemsRef.current}
            label={labels.problems}
            header={{ title: labels.problems, icon: CircleAlert }}
            groups={[{
              items: problems.map((problem) => ({ id: problem.id, label: problem.message, disabled: !problem.nodeId })),
            }]}
            onSelect={(item) => {
              const nodeId = problems.find((problem) => problem.id === item.id)?.nodeId
              if (nodeId) onFocusProblem?.(nodeId)
            }}
            width={340}
          />
        </>
      )}
      {(onSave || onDiscard) && (
        <>
          <Divider />
          {onDiscard && (
            <Button tone="ghost" size="md" disabled={!dirty || saving} onClick={onDiscard}>{labels.discard}</Button>
          )}
          {onSave && (
            <Button tone="accent" size="md" busy={saving} disabled={!dirty || !canSave} onClick={onSave}>{labels.save}</Button>
          )}
        </>
      )}
      {onClose && (
        <>
          <Divider />
          <ButtonIcon icon={X} title={labels.close ?? ''} onClick={onClose} tone="ghost" size="lg" />
        </>
      )}
    </div>
  )
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px bg-line" />
}
