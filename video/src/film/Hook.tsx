import { interpolate, spring } from 'remotion'
import { FPS, at, progress } from './timeline'

const INK = '#0A0A0B'
const MUTED = '#6B7280'
const ACCENT = '#007AFC'

/** Everything an idea costs before it is a merged PR, scattered around the screen. */
const CHORES = [
  { text: 'Write the spec', x: -560, y: -250, r: -4 },
  { text: 'Split it into tickets', x: 470, y: -280, r: 3 },
  { text: 'Create the branch', x: -700, y: -40, r: 2 },
  { text: 'Write the code', x: 640, y: -60, r: -3 },
  { text: 'Run the tests', x: -480, y: 170, r: 4 },
  { text: 'Commit', x: 300, y: 150, r: -2 },
  { text: 'Push', x: -160, y: 290, r: 3 },
  { text: 'Open the PR', x: 560, y: 270, r: 2 },
  { text: 'Move the Jira ticket', x: -720, y: 330, r: -3 },
  { text: 'Tell the team on Slack', x: 120, y: -330, r: -2 },
  { text: 'Wait for CI', x: 760, y: 120, r: 4 },
  { text: 'Merge', x: -260, y: -340, r: 2 },
  { text: 'Close the ticket', x: -60, y: 420, r: -4 },
]

const CHORES_FROM = at('hook', 46)
const COLLAPSE = at('hook', 150)

/**
 * THE HOOK: an idea, then the pile of chores between it and a merged PR, which collapses
 * into one line. The app then takes the screen (Film.tsx brings the window in).
 */
export function Hook({ frame }: { frame: number }) {
  if (frame >= at('hook', 240)) return null

  // "You have an idea." rises, then makes room for the pile.
  const idea = spring({ frame: frame - at('hook', 4), fps: FPS, config: { damping: 18, stiffness: 120 } })
  const ideaUp = progress(frame, at('hook', 38), at('hook', 56))
  const ideaOut = progress(frame, COLLAPSE, COLLAPSE + 16)

  const collapse = progress(frame, COLLAPSE, COLLAPSE + 22)
  const answer = spring({ frame: frame - (COLLAPSE + 18), fps: FPS, config: { damping: 16, stiffness: 110 } })
  const answerOut = progress(frame, at('hook', 200), at('hook', 222))

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: 'Cera Pro', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateY(${(1 - idea) * 40 - ideaUp * 0}px) scale(${1 - ideaUp * 0.35})`,
          opacity: idea * (1 - ideaOut),
          fontSize: 120,
          fontWeight: 700,
          letterSpacing: -3,
          color: INK,
          whiteSpace: 'nowrap',
        }}
      >
        You have an <span style={{ color: ACCENT }}>idea</span>.
      </div>

      {CHORES.map((chore, i) => {
        const start = CHORES_FROM + i * 7
        const pop = spring({ frame: frame - start, fps: FPS, config: { damping: 13, stiffness: 160 } })
        if (frame < start) return null
        const drift = Math.sin((frame + i * 13) / 22) * 6
        // On the collapse every chore is pulled into the centre and gone.
        const x = interpolate(collapse, [0, 1], [chore.x, 0])
        const y = interpolate(collapse, [0, 1], [chore.y + drift, 0])
        return (
          <div
            key={chore.text}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${chore.r * (1 - collapse)}deg) scale(${pop * (1 - collapse * 0.8)})`,
              opacity: Math.min(1, pop) * (1 - collapse),
              padding: '16px 26px',
              borderRadius: 999,
              background: '#FFFFFF',
              boxShadow: '0 14px 40px -12px rgba(10, 10, 11, 0.25), 0 0 0 1px rgba(10, 10, 11, 0.07)',
              fontSize: 30,
              fontWeight: 700,
              color: INK,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 6, background: i % 3 === 0 ? ACCENT : i % 3 === 1 ? '#F97316' : '#22C55E' }} />
            {chore.text}
          </div>
        )
      })}

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translateY(${(1 - answer) * 50 - answerOut * 60}px)`,
          opacity: Math.min(1, answer) * (1 - answerOut),
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: MUTED }}>Thirteen chores between it and a merged PR.</div>
        <div style={{ marginTop: 12, fontSize: 110, fontWeight: 700, letterSpacing: -3, color: INK }}>
          Magic Slash does <span style={{ color: ACCENT }}>all of them</span>.
        </div>
      </div>
    </div>
  )
}
