import type { ReactNode } from 'react'
import { TicketCard } from '@ds/desktop'
import { ArrowUp, Minus } from '@ds/desktop/icons'
import { MIDNIGHT_VARS } from '../app/theme'
import { at, progress } from './timeline'

const noop = () => undefined

/**
 * A CARD LIFTED OFF THE WINDOW. It lives in the camera's 3D space beside the window
 * rather than inside it (the window clips, which flattens), at `z` px toward the viewer,
 * so it keeps its depth whatever angle the camera takes.
 */
function Lifted({ x, y, z, rx = 0, ry = 0, rz = 0, opacity, width, children }: {
  x: number
  y: number
  z: number
  rx?: number
  ry?: number
  rz?: number
  opacity: number
  width: number
  children: ReactNode
}) {
  if (opacity <= 0) return null
  return (
    <div
      className="app-root text-ink"
      style={{
        ...MIDNIGHT_VARS,
        position: 'absolute',
        left: x - width / 2,
        top: y,
        width,
        opacity,
        transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
        borderRadius: 14,
        background: 'rgb(var(--c-bg-secondary))',
        boxShadow: '0 40px 80px -20px rgba(5,12,30,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </div>
  )
}

const EPIC = { id: 'epic', label: 'PAY-310 Invoice PDF export', color: '#A855F7' }

const FILED = [
  { at: at('tickets', 86), key: 'PAY-311', title: 'PDF template per locale', high: true },
  { at: at('tickets', 102), key: 'PAY-312', title: 'Export endpoint', high: true },
  { at: at('tickets', 118), key: 'PAY-313', title: 'Download button', high: false },
  { at: at('tickets', 134), key: 'PAY-314', title: 'Audit log entry', high: false },
]

/** The stories the planner files, each one popping out of the window as Jira answers. */
export function FiledTickets({ frame }: { frame: number }) {
  const leave = progress(frame, at('tickets', 156), at('tickets', 176))
  return (
    <>
      {FILED.map((t, i) => {
        const pop = progress(frame, t.at, t.at + 14)
        return (
          <Lifted
            key={t.key}
            x={360 + i * 26}
            y={-250 + i * 118 - leave * 60}
            z={160 + pop * 180 - leave * 340}
            rz={-3 + i * 1.5}
            ry={-8}
            opacity={pop * (1 - leave)}
            width={360}
          >
            <TicketCard
              tracker="jira"
              ticketId={t.key}
              title={t.title}
              mark={t.high ? { icon: ArrowUp, tone: 'orange', label: 'High' } : { icon: Minus, tone: 'yellow', label: 'Medium' }}
              status={{ label: 'To Do', tone: 'neutral' }}
              tags={[EPIC]}
              onOpen={noop}
            />
          </Lifted>
        )
      })}
    </>
  )
}
