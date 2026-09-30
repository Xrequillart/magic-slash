import { useEffect, useRef, useState, type AnimationEvent } from 'react'

import { AppTitleBar } from './AppTitleBar'
import { Banner, type BannerVariant } from './Banner'
import { FolderGit2 } from './icons'
import { WorkflowCanvas, type WorkflowCanvasLabels, type WorkflowCanvasSelection } from './WorkflowCanvas'
import type { WorkflowDockLabels } from './WorkflowDock'
import { WorkflowInspector, type WorkflowInspectorLabels, type WorkflowInspectorProps, type WorkflowInspectorTarget } from './WorkflowInspector'
import type { WorkflowProblemItem } from './WorkflowProblems'
import { WorkflowSkillPicker, type WorkflowSkillOption, type WorkflowSkillPickerLabels } from './WorkflowSkillPicker'
import type { WorkflowCanvasLink, WorkflowCanvasNode } from './workflowLayout'

/**
 * THE WORKFLOW EDITOR, FULL SCREEN: the app's title bar across the top, naming what is
 * edited in its middle (`title`), and under it the canvas, framed 6px in from the window's
 * edges, with everything else floating on it.
 *
 *  - the title bar is `AppTitleBar` itself, so the window is still dragged by it and the
 *    traffic lights keep their corner (`trafficLightGutter`) while the editor covers the app;
 *  - top centre, the banners: a conflict, a change made elsewhere, a refused save;
 *  - on the right, the INSPECTOR, only while something is selected. A press on a card or
 *    a link opens it, a press on the ground or its X closes it;
 *  - at the bottom centre, the DOCK (`WorkflowDock`): add a step, undo and redo, the
 *    zoom, the problems, discard, save, close.
 *
 * A NEW STEP LANDS WHERE THE ADMIN IS LOOKING. The dock's "+" opens the skill picker off
 * its button, and the skill picked comes back to `onAdd` with the canvas point at the
 * middle of the view. It is linked to nothing: links are drawn from the cards' ports.
 *
 * IT FILLS ITS BOX. The app gives it the whole window (a fixed layer over everything);
 * the showcase, a stage. It holds the picker's anchor and nothing else: the flow, the
 * selection and the history are the caller's.
 *
 * IT MOVES, and the motion is `workflowCanvas.css`'s: the bar drops in, the canvas rises,
 * the cards arrive one after the other, the dock slides up from the bottom edge; the
 * inspector slides in from the right on a selection, back out on none, and swaps its
 * content in place from one selection to the next. LEAVING is asked for (`leaving`) and
 * played backwards, and `onLeft` says when it is over: the caller unmounts then.
 *
 * NO KEYBOARD OF ITS OWN. ⌘Z, Delete and Escape are the app's to bind, for `Modal`'s
 * reason: which of several open layers answers a key is a fact about the app's
 * layering, not about the shape of an editor.
 *
 * READ-ONLY (`readOnly`, a member who may not change the flow), the same screen with
 * nothing to change: no drag, no link to draw, a dock of zoom and close, and an
 * inspector that says how each step and link runs.
 *
 */

export interface WorkflowEditorBanner {
  id: string
  variant: BannerVariant
  message: string
  hint?: string
  action?: { label: string; onClick: () => void }
}

export interface WorkflowEditorLabels {
  canvas: WorkflowCanvasLabels
  inspector: WorkflowInspectorLabels
  picker: WorkflowSkillPickerLabels
  dock: WorkflowDockLabels
}

export interface WorkflowEditorProps {
  /** In the middle of the title bar: "Editing the workflow of magic-slash". */
  title: string
  /** On the title bar's left, the repository being edited, as a `Label`, in its own colour. */
  repository?: string
  repositoryColor?: string
  labels: WorkflowEditorLabels

  nodes: WorkflowCanvasNode[]
  links: WorkflowCanvasLink[]
  entry: string[]
  positions?: Readonly<Record<string, { x: number; y: number }>>
  selected: WorkflowCanvasSelection | null
  onSelect: (selection: WorkflowCanvasSelection | null) => void
  onMove: (id: string, position: { x: number; y: number }) => void
  onConnect: (from: string, to: string, outcome?: string) => void
  focusRequest?: { id: string; n: number } | null

  /** What the inspector shows for `selected`. */
  target: WorkflowInspectorTarget | null
  /** What a step may run, for the picker and the inspector alike. */
  skills: WorkflowSkillOption[]
  onChangeSkill: WorkflowInspectorProps['onChangeSkill']
  onChangeMode: WorkflowInspectorProps['onChangeMode']
  onRemove: WorkflowInspectorProps['onRemove']
  onChangeKind: WorkflowInspectorProps['onChangeKind']
  onChangeOutcome: WorkflowInspectorProps['onChangeOutcome']
  onRemoveLink: WorkflowInspectorProps['onRemoveLink']

  /** A skill was picked off the dock's "+": add it there, the middle of the view. */
  onAdd: (skill: string, position: { x: number; y: number }) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  problems: WorkflowProblemItem[]
  onFocusProblem: (nodeId: string) => void
  dirty: boolean
  saving: boolean
  canSave: boolean
  onSave: () => void
  onDiscard: () => void
  onClose: () => void

  banners?: WorkflowEditorBanner[]
  /** Look, don't touch: see above. */
  readOnly?: boolean
  /** Play the way out. `onLeft` fires once it has played. */
  leaving?: boolean
  onLeft?: () => void
  /** Keep the title bar's left corner clear of the traffic lights. */
  trafficLightGutter?: boolean
  /** Where the picker portals. `document.body` unless the theme is scoped, see `Menu`. */
  portalTo?: HTMLElement | null
  /** Margins, or the box. Not the ground. */
  className?: string
}

export function WorkflowEditor({
  title,
  repository,
  repositoryColor,
  labels,
  nodes,
  links,
  entry,
  positions,
  selected,
  onSelect,
  onMove,
  onConnect,
  focusRequest = null,
  target,
  skills,
  onChangeSkill,
  onChangeMode,
  onRemove,
  onChangeKind,
  onChangeOutcome,
  onRemoveLink,
  onAdd,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  problems,
  onFocusProblem,
  dirty,
  saving,
  canSave,
  onSave,
  onDiscard,
  onClose,
  banners = [],
  readOnly = false,
  leaving = false,
  onLeft,
  trafficLightGutter = false,
  portalTo,
  className = '',
}: WorkflowEditorProps) {
  // Where the picker hangs, and where the step it adds will land.
  const [picker, setPicker] = useState<{ anchor: HTMLElement; position: { x: number; y: number } } | null>(null)

  // The inspector outlives its selection by the length of its exit: what it showed last
  // slides out with it. `target` is rebuilt on every render of the caller, so only its
  // presence is watched.
  const last = useRef<WorkflowInspectorTarget | null>(null)
  if (target) last.current = target
  const [exiting, setExiting] = useState<WorkflowInspectorTarget | null>(null)
  const open = target !== null
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) setExiting(last.current)
    if (open) setExiting(null)
    wasOpen.current = open
  }, [open])
  const panel = target ?? exiting
  // One key per thing selected, so a new selection replays the swap and a re-render does not.
  const panelKey = !panel ? '' : panel.type === 'node' ? `node:${panel.step.id}` : `link:${panel.link.from}>${panel.link.to}`

  const onRootAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (leaving && event.target === event.currentTarget && event.animationName === 'ms-wfe-leave') onLeft?.()
  }

  return (
    <div
      className={`ms-wfe flex h-full w-full flex-col overflow-hidden bg-bg ${leaving ? 'ms-wfe-leaving ' : ''}${className}`.trim()}
      onAnimationEnd={onRootAnimationEnd}
    >
      <AppTitleBar
        trafficLightGutter={trafficLightGutter}
        label={repository ? { text: repository, icon: FolderGit2, color: repositoryColor } : undefined}
        titles={[{ id: 'workflow', label: title }]}
        close={{ title: labels.dock.close ?? '', onClick: onClose }}
        className="ms-wfe-bar flex-shrink-0"
      />
      {/* 6px in from the window on every side: the canvas is framed, not bled. */}
      <div className="relative min-h-0 flex-1 p-1.5">
        <div className="ms-wfe-stage h-full">
          <WorkflowCanvas
            nodes={nodes}
            links={links}
            entry={entry}
            labels={labels.canvas}
            className="h-full"
            editable
            selected={selected}
            onSelect={onSelect}
            positions={positions}
            onMove={readOnly ? undefined : onMove}
            onConnect={readOnly ? undefined : onConnect}
            focusRequest={focusRequest}
            // The dock has no close button: the title bar's, top right, is the way out.
            dock={readOnly ? { labels: labels.dock } : {
              labels: labels.dock,
              onAdd: (anchor, position) => setPicker({ anchor, position }),
              canUndo,
              canRedo,
              onUndo,
              onRedo,
              problems,
              onFocusProblem,
              dirty,
              saving,
              canSave,
              onSave,
              onDiscard,
            }}
          />
        </div>

        {banners.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex flex-col items-center gap-2 px-4">
            {banners.map((banner) => (
              <div key={banner.id} className="ms-wfe-banner pointer-events-auto w-full max-w-xl rounded-xl shadow-lg">
                <Banner
                  variant={banner.variant}
                  hint={banner.hint}
                  actions={banner.action ? [banner.action] : undefined}
                >
                  {banner.message}
                </Banner>
              </div>
            ))}
          </div>
        )}

        {panel && (
          <div
            className={`ms-wfe-panel absolute right-4 top-4 max-h-[calc(100%-10.5rem)] w-[27rem] overflow-y-auto rounded-xl shadow-2xl ${open ? '' : 'ms-wfe-panel-leaving'}`.trim()}
            onAnimationEnd={(event) => { if (event.animationName === 'ms-wfe-panel-out' && !open) setExiting(null) }}
          >
            <div key={panelKey} className="ms-wfe-swap">
              <WorkflowInspector
                target={panel}
                skills={skills}
                labels={labels.inspector}
                readOnly={readOnly}
                ground="raised"
                onChangeSkill={onChangeSkill}
                onChangeMode={onChangeMode}
                onRemove={onRemove}
                onChangeKind={onChangeKind}
                onChangeOutcome={onChangeOutcome}
                onRemoveLink={onRemoveLink}
                onClose={() => onSelect(null)}
              />
            </div>
          </div>
        )}

        <WorkflowSkillPicker
          open={picker !== null}
          onClose={() => setPicker(null)}
          anchor={picker?.anchor ?? null}
          skills={skills}
          labels={labels.picker}
          portalTo={portalTo}
          onPick={(skill) => {
            if (picker) onAdd(skill, picker.position)
          }}
        />
      </div>
    </div>
  )
}
