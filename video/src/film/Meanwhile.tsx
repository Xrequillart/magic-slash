import { Github, Jira, Slack } from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop/types'
import { at, progress } from './timeline'

/**
 * MEANWHILE, OUTSIDE THE APP: what happened in Jira, on GitHub and in Slack, as it
 * happens: what the agent did, and what the team answered. Light cards on the white
 * ground beside the window, newest at the bottom.
 */
interface Event {
  at: number
  icon: IconComponent
  where: string
  text: string
  /** A comment, quoted under the line. */
  quote?: string
  /** The dot: green for done, red for something to act on, blue for a message. */
  tone?: 'green' | 'red' | 'blue'
  /** The side of the screen the window leaves free at that moment. */
  side: 'left' | 'right'
}

const EVENTS: Event[] = [
  { at: at('tickets', 70), icon: Jira, where: 'Jira', text: 'Epic PAY-310 created', side: 'left' },
  { at: at('tickets', 134), icon: Jira, where: 'Jira', text: '4 stories added to PAY-310', side: 'left' },
  { at: at('start', 180), icon: Jira, where: 'Jira', text: 'PAY-312 moved to In progress', side: 'right' },
  { at: at('start', 210), icon: Github, where: 'GitHub', text: 'Branch feature/PAY-312-invoice-pdf', side: 'right' },
  { at: at('ship', 130), icon: Github, where: 'GitHub', text: '2 commits pushed', side: 'left' },
  { at: at('ship', 150), icon: Github, where: 'GitHub', text: 'PR #128 opened', side: 'left' },
  { at: at('ship', 166), icon: Jira, where: 'Jira', text: 'PAY-312 moved to In review', side: 'left' },
  { at: at('ship', 192), icon: Slack, where: 'Slack · #dev', text: 'PR #128 is ready for review', tone: 'blue', side: 'left' },
  { at: at('resolve', 58), icon: Github, where: 'GitHub · PR #128', text: '@marie requested changes', tone: 'red', side: 'right' },
  { at: at('resolve', 78), icon: Github, where: '@marie on invoices.ts:44', text: 'Review comment', quote: 'Return a 404, not a 500, when the invoice isn’t theirs.', tone: 'blue', side: 'right' },
  { at: at('resolve', 98), icon: Github, where: '@marie on pdf.ts:7', text: 'Review comment', quote: 'Should we cache the rendered PDF?', tone: 'blue', side: 'right' },
  { at: at('resolve', 310), icon: Github, where: 'GitHub · PR #128', text: 'Fix pushed: 404 for other users', side: 'right' },
  { at: at('resolve', 332), icon: Github, where: 'GitHub · PR #128', text: '2 threads answered, review requested', side: 'right' },
  { at: at('close', 34), icon: Github, where: 'GitHub · PR #128', text: '@marie approved', side: 'right' },
  { at: at('close', 80), icon: Github, where: 'GitHub', text: 'PR #128 merged into main', side: 'right' },
  { at: at('close', 156), icon: Jira, where: 'Jira', text: 'PAY-312 moved to Done', side: 'left' },
]

/** How long a card stays, and how many can be up at once. */
const STAY = 160
const MAX = 3
const DOT = { green: '#22C55E', red: '#EF4444', blue: '#007AFC' }

export function Meanwhile({ frame }: { frame: number }) {
  return (
    <>
      <Stack frame={frame} side="left" />
      <Stack frame={frame} side="right" />
    </>
  )
}

function Stack({ frame, side }: { frame: number; side: Event['side'] }) {
  const live = EVENTS.filter((e) => e.side === side && frame >= e.at && frame < e.at + STAY).slice(-MAX)
  if (live.length === 0) return null
  const header = Math.max(...live.map((e) => progress(frame, e.at, e.at + 10) * (1 - progress(frame, e.at + STAY - 12, e.at + STAY))))

  return (
    <div
      style={{
        position: 'absolute',
        [side]: 56,
        bottom: 64,
        width: 460,
        display: 'flex',
        flexDirection: 'column',
        alignItems: side === 'left' ? 'flex-start' : 'flex-end',
        gap: 12,
        fontFamily: 'Cera Pro',
        zIndex: 5,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#6B7280', opacity: header, padding: '0 4px' }}>
        Meanwhile
      </div>
      {live.map((e) => {
        const enter = progress(frame, e.at, e.at + 12)
        const leave = progress(frame, e.at + STAY - 12, e.at + STAY)
        const Icon = e.icon
        return (
          <div
            key={e.at}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              padding: '14px 20px',
              maxWidth: 460,
              borderRadius: 18,
              background: '#FFFFFF',
              boxShadow: '0 14px 40px -14px rgba(10, 10, 11, 0.28), 0 0 0 1px rgba(10, 10, 11, 0.06)',
              opacity: enter * (1 - leave),
              transform: `translateX(${(1 - enter) * (side === 'left' ? -40 : 40)}px) scale(${0.96 + 0.04 * enter})`,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#0A0A0B',
              }}
            >
              <Icon style={{ width: 22, height: 22 }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>{e.where}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color: '#0A0A0B', whiteSpace: 'nowrap' }}>{e.text}</div>
              {e.quote ? (
                <div
                  style={{
                    marginTop: 6,
                    paddingLeft: 12,
                    borderLeft: '3px solid rgba(0, 122, 252, 0.35)',
                    fontSize: 17,
                    lineHeight: 1.35,
                    color: '#374151',
                  }}
                >
                  {e.quote}
                </div>
              ) : null}
            </div>
            <div style={{ marginLeft: 12, marginTop: 6, width: 10, height: 10, borderRadius: 5, background: DOT[e.tone ?? 'green'], flexShrink: 0 }} />
          </div>
        )
      })}
    </div>
  )
}
