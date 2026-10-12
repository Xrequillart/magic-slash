import { useLayoutEffect, useRef, useState } from 'react'
import {
  WorkflowCanvas,
  WorkflowSkillPicker,
  workflowPositions,
  type WorkflowCanvasLink,
  type WorkflowCanvasNode,
  type WorkflowSkillOption,
} from '@ds/desktop'
import '../app/flatRects'
import { useBoxes, type Box } from './Annotations'
import { Cursor } from './Overlays'
import { FPS, at, progress } from './timeline'

const noop = () => undefined

const node = (id: string, label: string, outcomes: string[]): WorkflowCanvasNode => ({
  id,
  label,
  skill: `magic-${id}`,
  outcomes,
  locked: true,
})

const START = node('start', 'Start', ['implemented'])
const COMMIT = node('commit', 'Commit', ['committed'])
const PR = node('pr', 'PR', ['pr_created', 'review_comments', 'ci_green'])
const DONE = node('done', 'Done', ['done'])
const SECURITY: WorkflowCanvasNode = {
  id: 'custom:security',
  label: 'Security check',
  skill: 'security-check',
  outcomes: [],
  mode: 'blocking',
  color: '#F97316',
}
const SLACK: WorkflowCanvasNode = {
  id: 'action:slack',
  label: 'Slack action',
  skill: '',
  outcomes: [],
  action: { type: 'slack', channel: '#dev', prompt: 'PR {pr_title} is ready for review: {pr_url}' },
}
/** An invisible stand-in where Done ends up, so the first fit-to-view leaves room for it. */
const GHOST: WorkflowCanvasNode = { ...DONE, id: 'ghost:done' }

const w = (local: number) => at('workflow', local)

/** The beats of the chapter, in story frames. */
const B = {
  autoLinks: [w(122), w(138)],
  addSkill: { press: w(186), skills: w(214), pick: w(244) },
  drag: { from: w(246), to: w(300) },
  link: { from: w(300), to: w(322) },
  addAction: { press: w(354), pick: w(380) },
  drop: { from: w(382), to: w(420) },
  actionLink: w(424),
}

const FINAL_NODES = [START, COMMIT, SECURITY, PR, SLACK, DONE]
const FINAL_LINKS: WorkflowCanvasLink[] = [
  { from: 'start', to: 'commit', kind: 'auto' },
  { from: 'commit', to: 'custom:security', kind: 'auto' },
  { from: 'custom:security', to: 'pr', kind: 'auto' },
  { from: 'pr', to: 'action:slack', kind: 'auto', outcome: 'pr_created' },
  { from: 'pr', to: 'done', kind: 'suggest', outcome: 'ci_green' },
]
const FIRST = workflowPositions(
  [START, COMMIT, PR, DONE],
  [
    { from: 'start', to: 'commit', kind: 'suggest' },
    { from: 'commit', to: 'pr', kind: 'suggest' },
    { from: 'pr', to: 'done', kind: 'suggest', outcome: 'ci_green' },
  ],
  ['start'],
).positions
const LAST = workflowPositions(FINAL_NODES, FINAL_LINKS, ['start']).positions

const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

/** Where every card is at `frame`: the chain makes room as the new steps arrive. */
function positionsAt(frame: number) {
  const room = progress(frame, B.drag.from + 8, B.drag.to)
  const roomForAction = progress(frame, B.drop.from, B.drop.to)
  const drag = progress(frame, B.drag.from, B.drag.to)
  const drop = progress(frame, B.drop.from, B.drop.to)
  // The new cards come up from the dock, below the chain, and settle in their slot.
  const below = (p: { x: number; y: number }) => ({ x: p.x - 260, y: p.y + 300 })
  return {
    start: FIRST.start,
    commit: FIRST.commit,
    pr: lerp(FIRST.pr, LAST.pr, room),
    done: lerp(lerp(FIRST.done, { x: LAST.done.x, y: FIRST.done.y }, room), LAST.done, roomForAction),
    'custom:security': lerp(below(LAST['custom:security']), LAST['custom:security'], drag),
    'action:slack': lerp(below(LAST['action:slack']), LAST['action:slack'], drop),
    'ghost:done': LAST.done,
  }
}

function linksAt(frame: number): WorkflowCanvasLink[] {
  const auto = (when: number): WorkflowCanvasLink['kind'] => (frame >= when ? 'auto' : 'suggest')
  const linked = frame >= B.link.to
  return [
    { from: 'start', to: 'commit', kind: auto(B.autoLinks[0]) },
    ...(linked
      ? [
          { from: 'commit', to: 'custom:security', kind: 'auto' as const },
          { from: 'custom:security', to: 'pr', kind: 'auto' as const },
        ]
      : [{ from: 'commit', to: 'pr', kind: auto(B.autoLinks[1]) }]),
    ...(frame >= B.actionLink ? [{ from: 'pr', to: 'action:slack', kind: 'auto' as const, outcome: 'pr_created' }] : []),
    { from: 'pr', to: 'done', kind: 'suggest' as const, outcome: 'ci_green' },
  ]
}

const LABELS = {
  canvas: 'Workflow of magic-pay',
  minimap: 'Minimap',
  auto: 'Automatic chaining',
  suggest: 'Suggested',
  anyExit: 'When done',
  disable: 'Turn off this step',
  enable: 'Turn on this step',
  alwaysOn: 'Start cannot be turned off: every other step runs from it',
  off: 'Turned off',
  blocking: 'Stops on failure',
  advisory: 'Goes on on failure',
}

const DOCK_LABELS = {
  dock: 'Workflow tools',
  add: 'Add a step',
  undo: 'Undo (⌘Z)',
  redo: 'Redo (⇧⌘Z)',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fit: 'Recenter on the workflow',
  problems: 'Problems',
  discard: 'Discard changes',
  save: 'Save',
  close: 'Close the editor (Esc)',
}

const SKILLS: WorkflowSkillOption[] = [
  { name: 'changelog', source: 'custom' },
  { name: 'lint', source: 'custom' },
  { name: 'security-check', source: 'repo' },
  { name: 'design-check', source: 'repo' },
  { name: 'docs:sync', source: 'plugin' },
]

const PICKER_LABELS = {
  title: 'Add to the workflow',
  empty: 'No skill to add. Create one in the Skills page first.',
  inWorkflow: 'In the workflow',
  sources: { custom: 'Your skills', repo: 'This repository', plugin: 'Plugins' },
  skills: 'Skills',
  skillsDescription: 'A step that runs a skill: a built-in one, yours, the repository’s or a plugin’s.',
  back: 'Back',
  action: 'Slack action',
  actionDescription: 'Post a message on Slack once a step is done, such as the PR’s link once it is created.',
}

const T = {
  add: '[aria-label="Add a step"]',
  skillsRow: '[role="menu"] >> text:A step that runs a skill',
  securityRow: '[role="menu"] >> text:security-check',
  actionRow: '[role="menu"] >> text:Post a message on Slack',
  security: '.react-flow__node[data-id="custom:security"]',
  slack: '.react-flow__node[data-id="action:slack"]',
  commit: '.react-flow__node[data-id="commit"]',
}

const centre = (b: Box | null | undefined, dx = 0.5, dy = 0.5) => (b ? { x: b.x + b.w * dx, y: b.y + b.h * dy } : null)

/**
 * THE REPOSITORY'S WORKFLOW, EDITED IN FRONT OF YOU: the default chain, its links made
 * automatic, then a skill of the team's own picked from the dock's menu and dragged into
 * place, and a Slack action hung off the PR. The editor, the dock, the picker and the
 * cards are the design system's; the film moves the pointer and the cards.
 */
export function WorkflowScene({ frame }: { frame: number }) {
  const root = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [layer, setLayer] = useState<HTMLElement | null>(null)

  // The dots running along the automatic links are SVG `animateMotion`, which keeps the
  // browser's time. Pinned here to the film's, so every frame shows them where they are.
  useLayoutEffect(() => {
    root.current?.querySelectorAll('svg').forEach((svg) => {
      svg.pauseAnimations()
      svg.setCurrentTime((frame - at('workflow')) / FPS)
    })
    const add = root.current?.querySelector<HTMLElement>(T.add) ?? null
    if (add !== anchor) setAnchor(add)
  })

  const pickingSkill = frame >= B.addSkill.press && frame < B.addSkill.pick
  const pickingAction = frame >= B.addAction.press && frame < B.addAction.pick
  const wantSkills = frame >= B.addSkill.skills && frame < B.addSkill.pick

  const boxes = useBoxes(root, frame, Object.values(T), () => {
    // The picker opens on its first level; the second is one click on "Skills" away,
    // which is a click the film makes for real, once, whenever the frame needs it.
    if (!wantSkills || !root.current) return false
    const row = root.current.querySelector<HTMLElement>('[role="menu"] [role="menuitem"]:last-child')
    if (!row || !row.textContent?.includes('Skills') || !row.textContent.includes('A step that runs')) return false
    row.click()
    return true
  })

  // ── The pointer: from one target to the next, with a press on each ─────────────
  const path: { f: number; at: { x: number; y: number } | null; click?: boolean }[] = [
    { f: w(150), at: { x: 640, y: 560 } },
    { f: w(182), at: centre(boxes[T.add]), click: true },
    { f: w(206), at: centre(boxes[T.skillsRow], 0.3) },
    { f: w(212), at: centre(boxes[T.skillsRow], 0.3), click: true },
    { f: w(238), at: centre(boxes[T.securityRow], 0.3), click: true },
    // Holding the new card by its title while it travels to its slot.
    { f: B.drag.from + 4, at: centre(boxes[T.security], 0.3, 0.25) },
    { f: B.drag.to, at: centre(boxes[T.security], 0.3, 0.25) },
    // From the commit's port to the new card's: the link, drawn.
    { f: B.link.from + 6, at: centre(boxes[T.commit], 1, 0.75) },
    { f: B.link.to - 2, at: centre(boxes[T.security], 0, 0.25), click: true },
    { f: w(350), at: centre(boxes[T.add]), click: true },
    { f: w(374), at: centre(boxes[T.actionRow], 0.3), click: true },
    { f: B.drop.from + 4, at: centre(boxes[T.slack], 0.3, 0.3) },
    { f: B.drop.to, at: centre(boxes[T.slack], 0.3, 0.3) },
    { f: w(450), at: { x: 900, y: 620 } },
  ]
  const known = path.filter((p) => p.at)
  let cursor: { x: number; y: number } | null = null
  let click = 0
  for (let i = 0; i < known.length; i++) {
    const a = known[i]
    const b = known[i + 1]
    if (frame < a.f) {
      if (i === 0) break
      continue
    }
    if (!b || frame < b.f) {
      cursor = b ? lerp(a.at!, b.at!, progress(frame, a.f, b.f)) : a.at
      if (a.click) click = progress(frame, a.f, a.f + 12)
      break
    }
  }
  // While a card is carried, the pointer is where the card is: no easing lag.
  if (frame >= B.drag.from + 4 && frame < B.drag.to) cursor = centre(boxes[T.security], 0.3, 0.25)
  if (frame >= B.drop.from + 4 && frame < B.drop.to) cursor = centre(boxes[T.slack], 0.3, 0.3)

  // The picker measures room against the whole screen, not the app's window, so it
  // would open downward off the window: it is pinned above the + it came from instead.
  const add = boxes[T.add]
  const height = root.current?.offsetHeight ?? 0
  const pin = add && height
    ? `.film-wf [role="menu"] { position: absolute !important; top: auto !important; bottom: ${height - add.y + 10}px !important; left: ${add.x - 4}px !important; }`
    : ''
  const show = (id: string, from: number) => `.film-wf .react-flow__node[data-id="${id}"] { opacity: ${progress(frame, from, from + 8)}; }`

  return (
    <div ref={root} className="film-flat film-wf relative h-full w-full bg-bg">
      <style>
        {[
          show('custom:security', B.addSkill.pick),
          show('action:slack', B.addAction.pick),
          '.film-wf .react-flow__node[data-id="ghost:done"] { opacity: 0; }',
          pin,
        ].join('\n')}
      </style>
      <WorkflowCanvas
        nodes={[START, COMMIT, SECURITY, PR, SLACK, DONE, GHOST]}
        links={linksAt(frame)}
        entry={['start']}
        labels={LABELS}
        editable
        positions={positionsAt(frame)}
        onMove={noop}
        onConnect={noop}
        onToggle={noop}
        onSelect={noop}
        dock={{ labels: DOCK_LABELS, onAdd: noop, canSave: true, dirty: frame >= B.addSkill.pick, onSave: noop, onDiscard: noop, onClose: noop }}
        legend="top-left"
        minimap={false}
        className="h-full"
      />
      {/* The picker's panel is fixed-positioned: this layer is its containing block. */}
      <div ref={setLayer} className="pointer-events-none absolute inset-0" style={{ transform: 'translateZ(0)', zIndex: 40 }}>
        {anchor && layer ? (
          <WorkflowSkillPicker
            open={pickingSkill || pickingAction}
            onClose={noop}
            anchor={anchor}
            skills={SKILLS}
            onPick={noop}
            onPickAction={noop}
            labels={PICKER_LABELS}
            portalTo={layer}
          />
        ) : null}
      </div>
      {cursor ? <Cursor x={cursor.x} y={cursor.y} click={click} /> : null}
    </div>
  )
}
