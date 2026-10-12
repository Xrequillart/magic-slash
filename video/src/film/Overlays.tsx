import { spring } from 'remotion'
import { CHAPTERS, FPS, STEPS, TITLE_CARD, chapterAt, progress } from './timeline'

const INK = '#0A0A0B'
const MUTED = '#6B7280'
const ACCENT = '#007AFC'

/**
 * A CHAPTER'S TITLE CARD: a white veil over the window and one big line saying what
 * comes next, held for TITLE_CARD frames while the camera moves underneath.
 */
export function TitleCard({ frame }: { frame: number }) {
  const current = chapterAt(frame)
  if (!current.title) return null
  const local = frame - current.from
  if (local >= TITLE_CARD) return null

  const veil = progress(local, 0, 16) * (1 - progress(local, TITLE_CARD - 12, TITLE_CARD))
  const word = spring({ frame: local - 6, fps: FPS, config: { damping: 16, stiffness: 140 } })
  const out = progress(local, TITLE_CARD - 12, TITLE_CARD)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `rgba(255, 255, 255, ${0.94 * veil})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Cera Pro',
        zIndex: 20,
      }}
    >
      <div style={{ opacity: Math.min(1, word) * (1 - out), transform: `translateY(${(1 - word) * 40 - out * 30}px)`, textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 4, color: ACCENT }}>{current.number}</div>
        <div style={{ fontSize: 140, fontWeight: 700, letterSpacing: -4, color: INK, lineHeight: 1.05 }}>{current.title}</div>
        <div style={{ marginTop: 18, fontSize: 34, color: MUTED }}>{current.line}</div>
      </div>
    </div>
  )
}

/** The current chapter, small, top left, for as long as it runs. */
export function ChapterLabel({ frame }: { frame: number }) {
  return (
    <>
      {CHAPTERS.filter((c) => c.label).map((c) => {
        const o = progress(frame, c.from + TITLE_CARD - 8, c.from + TITLE_CARD + 6) * (1 - progress(frame, c.to - 8, c.to))
        if (o <= 0) return null
        return (
          <div
            key={c.id}
            style={{
              position: 'absolute',
              left: 56,
              top: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 22px 12px 18px',
              borderRadius: 999,
              background: '#FFFFFF',
              boxShadow: '0 10px 40px -12px rgba(10, 10, 11, 0.22), 0 0 0 1px rgba(10, 10, 11, 0.05)',
              fontFamily: 'Cera Pro',
              opacity: o,
              transform: `translateY(${(1 - o) * -12}px)`,
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color: ACCENT }}>{c.number}</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: INK }}>{c.label}</span>
            <span
              style={{
                fontFamily: 'SF Mono, Monaco, monospace',
                fontSize: 19,
                fontWeight: 600,
                color: ACCENT,
                background: 'rgba(0, 122, 252, 0.10)',
                borderRadius: 10,
                padding: '3px 10px',
              }}
            >
              {c.command}
            </span>
          </div>
        )
      })}
    </>
  )
}

/** The seven steps, top right, the current one lit and the ones behind it ticked. */
export function StepRow({ frame }: { frame: number }) {
  const first = STEPS[0]
  const last = STEPS[STEPS.length - 1]
  const o = progress(frame, first.from + TITLE_CARD - 8, first.from + TITLE_CARD + 6) * (1 - progress(frame, last.to - 8, last.to))
  if (o <= 0) return null
  const current = STEPS.findIndex((s) => frame >= s.from && frame < s.to)

  return (
    <div
      style={{
        position: 'absolute',
        right: 56,
        top: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 8,
        borderRadius: 999,
        background: '#FFFFFF',
        boxShadow: '0 10px 40px -12px rgba(10, 10, 11, 0.22), 0 0 0 1px rgba(10, 10, 11, 0.05)',
        fontFamily: 'Cera Pro',
        opacity: o,
        zIndex: 10,
      }}
    >
      {STEPS.map((step, i) => {
        const active = i === current
        const done = current > i
        return (
          <div
            key={step.id}
            style={{
              height: 36,
              minWidth: 36,
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: active ? '0 16px' : 0,
              whiteSpace: 'nowrap',
              background: active ? INK : done ? 'rgba(10, 10, 11, 0.08)' : 'transparent',
              boxShadow: active || done ? 'none' : 'inset 0 0 0 1.5px rgba(10, 10, 11, 0.12)',
              color: active ? '#fff' : done ? INK : MUTED,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {active ? step.label : done ? '✓' : step.number}
          </div>
        )
      })}
    </div>
  )
}

/** A macOS pointer, in the window's own coordinates, with a ripple when it clicks. */
export function Cursor({ x, y, click }: { x: number; y: number; click: number }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, zIndex: 70, pointerEvents: 'none' }}>
      {click > 0 && click < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: -22 * (0.5 + click),
            top: -22 * (0.5 + click),
            width: 44 * (0.5 + click),
            height: 44 * (0.5 + click),
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.8)',
            opacity: 1 - click,
          }}
        />
      ) : null}
      <svg width="26" height="32" viewBox="0 0 26 32" style={{ transform: `scale(${click > 0 && click < 0.4 ? 0.88 : 1})`, transformOrigin: '0 0', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))' }}>
        <path d="M2 2 L2 25 L8 19.5 L12.2 29 L16.4 27.2 L12.3 18 L20.5 18 Z" fill="#fff" stroke="#000" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
