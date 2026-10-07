import { useRef } from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { ChatView, TITLE_BAR_HEIGHT, type SidebarAgentRow } from '@ds/desktop'
import { AppWindow, WINDOW, type MenuPage } from './app/AppWindow'
import { CHAT_LABELS } from './app/labels'
import { Bubbles, Spotlight, useNotes } from './film/Annotations'
import { Board } from './film/Board'
import { FiledTickets } from './film/Callouts'
import { Camera } from './film/Camera'
import { Hook } from './film/Hook'
import { Meanwhile } from './film/Meanwhile'
import { Outro } from './film/Outro'
import { ChapterLabel, Cursor, StepRow, TitleCard } from './film/Overlays'
import { CoderPanel, PANEL_WIDTH, PlannerPanel } from './film/panels'
import { coderChat, DRAFT, IDEA, plannerChat } from './film/script'
import { Soundtrack } from './film/Soundtrack'
import { FPS, STEPS_PER_FRAME, at, chapterAt, progress } from './film/timeline'
import { WorkflowScene } from './film/WorkflowScene'

const noop = () => undefined

/** Where the Start button of PAY-312's card sits, in the coordinates of the row under
 *  the title bar (read off a `--props='{"flat":true}'` still). */
const START_BUTTON = { x: 548, y: 302 - TITLE_BAR_HEIGHT }

export function Film({ music = true }: { music?: boolean }) {
  // The story's clock, in 30ths of a second, fractional between two of them.
  const frame = useCurrentFrame() / STEPS_PER_FRAME
  const root = useRef<HTMLDivElement>(null)
  const notes = useNotes(root, frame)
  const chapter = chapterAt(frame).id

  // ── Who is in the agents column ────────────────────────────────────────────────
  const coderStarted = frame >= at('start', 132)
  const inWorkflow = chapter === 'workflow'
  const planner = plannerChat(frame)
  const coder = coderChat(frame)
  const agents: SidebarAgentRow[] = [
    ...(coderStarted
      ? [{
          id: 'coder',
          name: 'Export endpoint',
          ticketId: 'PAY-312',
          state: frame >= at('close', 178) ? 'completed' : coder.working ? 'working' : 'idle',
          active: !inWorkflow,
        } satisfies SidebarAgentRow]
      : []),
    {
      id: 'planner',
      name: 'Invoice PDF export',
      state: coderStarted || frame >= at('tickets', 140) ? 'completed' : frame < DRAFT.sent ? 'idle' : planner.working ? 'working' : 'waiting',
      active: !coderStarted,
    },
  ]

  // ── The main pane: a session, or the repository's workflow ─────────────────────
  const draft = frame >= DRAFT.from && frame < DRAFT.sent ? `/magic:plan ${IDEA}`.slice(0, Math.floor((frame - DRAFT.from) * 1.4)) : ''
  const main = inWorkflow ? (
    <WorkflowScene frame={frame} />
  ) : coderStarted ? (
    <ChatView
      key={`coder-${coder.entries[0]?.id ?? 'none'}`}
      entries={coder.entries}
      working={coder.working}
      onSend={noop}
      onShowTerminal={noop}
      labels={CHAT_LABELS}
      toolDetail="all"
      autoFocus={false}
    />
  ) : (
    <ChatView
      // Remounted on each keystroke so the composer shows the draft being typed.
      key={`planner-${draft}-${planner.entries[0]?.id ?? 'none'}`}
      entries={planner.entries}
      working={planner.working}
      initialDraft={draft}
      onSend={noop}
      onShowTerminal={noop}
      labels={CHAT_LABELS}
      toolDetail="all"
      autoFocus={false}
    />
  )

  // ── The info panel slides in once there is something to show ───────────────────
  const panelIn = inWorkflow
    ? 0
    : coderStarted
      ? progress(frame, at('start', 186), at('start', 228))
      : progress(frame, at('plan', 180), at('plan', 210))
  const panel =
    panelIn > 0 ? (
      <div style={{ width: PANEL_WIDTH * panelIn, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: PANEL_WIDTH, height: '100%', opacity: panelIn }}>
          {coderStarted ? <CoderPanel frame={frame} /> : <PlannerPanel frame={frame} />}
        </div>
      </div>
    ) : undefined

  // ── The Tasks board: once the tickets are filed, and once more at the very end ─
  const firstBoard = progress(frame, at('tickets', 170), at('tickets', 196)) * (1 - progress(frame, at('start', 132), at('start', 153)))
  const lastBoard = progress(frame, at('close', 216), at('close', 240))
  const boardIn = Math.max(firstBoard, lastBoard)
  const landed = Math.min(4, Math.max(0, Math.floor((frame - at('tickets', 196)) / 7) + 1))
  const overlay =
    boardIn > 0 ? (
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          bottom: 8,
          left: 236,
          zIndex: 30,
          opacity: boardIn,
          transform: `translateY(${(1 - boardIn) * 40}px) scale(${0.97 + 0.03 * boardIn})`,
        }}
      >
        <Board shown={lastBoard > 0 ? 4 : landed} pay312={lastBoard > 0 ? 'done' : 'backlog'} />
      </div>
    ) : undefined

  // ── The pointer that picks PAY-312 off the board ───────────────────────────────
  const move = progress(frame, at('start', 48), at('start', 114))
  const cursor =
    frame >= at('start', 40) && frame < at('start', 144) ? (
      <Cursor
        x={1100 + (START_BUTTON.x - 1100) * move}
        y={760 + (START_BUTTON.y - 760) * move}
        click={progress(frame, at('start', 120), at('start', 141))}
      />
    ) : null

  const page: MenuPage = inWorkflow ? 'repositories' : boardIn > 0.5 ? 'tasks' : null
  const title = inWorkflow ? 'magic-pay · Workflow' : coderStarted ? 'Export endpoint' : 'Invoice PDF export'
  // The window waits behind the hook, and leaves for the logo.
  const windowOpacity = progress(frame, at('plan', 54), at('plan', 70)) * (1 - progress(frame, at('outro', 30), at('outro', 50)))

  return (
    <AbsoluteFill
      // The film's clock in seconds, which every CSS animation in the app reads (style.css).
      style={{ background: '#FFFFFF', overflow: 'hidden', ['--film-t' as string]: frame / FPS }}
    >
      {/* A soft floor shadow, so the window reads as an object above the page. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '88%',
          width: 1300,
          height: 120,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(closest-side, rgba(10,10,11,0.16), rgba(10,10,11,0))',
          opacity: windowOpacity,
        }}
      />
      <Camera frame={frame}>
        <div
          style={{
            position: 'absolute',
            left: -WINDOW.width / 2,
            top: -WINDOW.height / 2,
            opacity: windowOpacity,
            borderRadius: 12,
            boxShadow: '0 60px 120px -30px rgba(10,20,40,0.45), 0 30px 60px -30px rgba(10,20,40,0.35)',
          }}
        >
          <AppWindow
            rootRef={root}
            title={title}
            page={page}
            agents={agents}
            main={main}
            panel={panel}
            overlay={
              <>
                {overlay}
                {cursor}
              </>
            }
            layer={<Spotlight frame={frame} notes={notes} />}
          />
        </div>
        <div style={{ opacity: windowOpacity, transformStyle: 'preserve-3d' }}>
          <FiledTickets frame={frame} />
          <Bubbles frame={frame} notes={notes} />
        </div>
      </Camera>
      <Meanwhile frame={frame} />
      <ChapterLabel frame={frame} />
      <StepRow frame={frame} />
      <TitleCard frame={frame} />
      <Hook frame={frame} />
      <Outro frame={frame} />
      {music ? <Soundtrack /> : null}
    </AbsoluteFill>
  )
}
