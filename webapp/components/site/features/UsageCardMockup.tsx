'use client'

import { useEffect, useRef, useState } from 'react'
import { Minus, User } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The visual inside the `Your Claude Code limits` card: the left sidebar's usage card,
 * redrawn, with its two gauges filling.
 *
 * DRAWN FROM `desktop/src/renderer/components/SidebarUsageCard.tsx`, the expanded branch,
 * class for class:
 *
 *   1. THE CARD, `mx-2 mb-2 px-2 py-1.5 rounded-lg` on the subtle surface with a subtle
 *      border — the footer of the 230px sidebar, so 214px wide.
 *   2. THE HEADER, `mb-2`: a `w-3` user glyph and the account's name at `text-[11px]` in
 *      icon ink, the minimise button on the right.
 *   3. TWO `UsageBar`s in a `space-y-2` column: the label at `text-[10px]` in secondary
 *      ink at 60%, the reset countdown at 35% and the percentage at `font-semibold` in the
 *      gauge's colour on the right, then a `h-1.5` track on the raised surface.
 *
 * THE COLOURS ARE `gaugeColors` IN `LimitGauge.tsx`, thresholds included: green below 65%,
 * yellow from 65, red from 85. The session gauge lands at 72%, on the far side of the
 * first threshold, so the card is seen changing colour; the week lands at 38%, green.
 *
 * THE RESET COUNTDOWNS ARE `formatReset`'s own shapes — "2h14" and "3d" in English,
 * "2 h 14" and "3 j" in French — through the site's catalogue, since they do not move.
 * Without the app's "resets in" in front of them: at this width the phrase pushed the
 * label onto a second line, and the number alone says the same thing.
 *
 * MAGNIFIED, not redrawn larger: the card is drawn at its own 214px, every size the app's,
 * and a `scale` brings it to a readable size on the page — the proportions survive
 * exactly, and what changes is only how close the reader is standing. A transform does
 * not change the box it came from, so the wrapper carries the height the scaled card
 * actually takes.
 *
 * THE ANIMATION IS THE CONTEXT CARD'S: one clock, the bars' widths written straight onto
 * the elements every frame, the percentages as React state that changes only when a
 * rounded value does. Ramps over two and a half seconds, holds for three, starts again;
 * under `prefers-reduced-motion` the clock never starts and the card rests full.
 *
 * `aria-hidden`: it is a drawing, and a minimise button that minimises nothing should be
 * announced to nobody.
 */

const SESSION = 72
const WEEKLY = 38
const RAMP_MS = 2500
const HOLD_MS = 3000

/** `gaugeColors`, verbatim. */
function gaugeColors(pct: number) {
  if (pct >= 85) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 65) return { bar: 'bg-yellow', text: 'text-yellow' }
  return { bar: 'bg-green', text: 'text-green' }
}

function UsageBar({
  label,
  reset,
  pct,
  barRef,
}: {
  label: string
  reset: string
  pct: number
  barRef: React.Ref<HTMLDivElement>
}) {
  const colors = gaugeColors(pct)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="shrink-0 whitespace-nowrap text-appink/60">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          {/* `truncate` is the one liberty: at 214px the French countdown does not fit
              beside its label on one line, and a wrapped row would break the 6px rhythm
              the two gauges share. The app has the same width and the same words. */}
          <span className="truncate text-appink/35">{reset}</span>
          <span className={`font-semibold tabular-nums ${colors.text}`}>{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          ref={barRef}
          className={`h-full rounded-full ${colors.bar} transition-colors duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function UsageCardMockup() {
  const { t } = useT()
  const [session, setSession] = useState(SESSION)
  const [weekly, setWeekly] = useState(WEEKLY)
  const sessionBar = useRef<HTMLDivElement>(null)
  const weeklyBar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const start = performance.now()
    let frame = 0
    let shownS = -1
    let shownW = -1
    const tick = () => {
      const elapsed = (performance.now() - start) % (RAMP_MS + HOLD_MS)
      const u = Math.min(1, elapsed / RAMP_MS)
      const eased = 1 - (1 - u) * (1 - u)
      const s = SESSION * eased
      const w = WEEKLY * eased
      if (sessionBar.current) sessionBar.current.style.width = `${s}%`
      if (weeklyBar.current) weeklyBar.current.style.width = `${w}%`
      const rs = Math.round(s)
      const rw = Math.round(w)
      if (rs !== shownS) {
        shownS = rs
        setSession(rs)
      }
      if (rw !== shownW) {
        shownW = rw
        setWeekly(rw)
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    // CROPPED AT THE BOTTOM AND THE RIGHT, as the commits card's panel is: the drawing
    // sits in the card's right-hand column at the card's own `min-h-80`, and the panel is
    // placed 160px down and 24px in, magnified ×1.6 from its top-left corner — so its
    // bottom edge passes the card's and its right edge passes the column's by about
    // its own padding, and the card's `overflow-hidden` cuts both. The percentages
    // stay in: a gauge whose number is cut is a gauge that says nothing. A transform leaves the layout box at its
    // unscaled size, which is why this can be positioned rather than sized.
    <div aria-hidden className="relative h-80">
      <div className="absolute left-6 top-40">
        <div className="w-[230px] origin-top-left scale-[1.6] rounded-xl bg-ink px-2 py-2 shadow-lift-mint">
          <div className="rounded-lg border border-white/5 bg-white/[0.04] px-2 py-1.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-appink-icon">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">camille</span>
              </span>
              <span className="shrink-0 rounded p-0.5 text-appink-icon">
                <Minus className="h-3 w-3" />
              </span>
            </div>
            <div className="space-y-2">
              <UsageBar
                label={t('site.usageCard.session')}
                reset={t('site.usageCard.resetSession')}
                pct={session}
                barRef={sessionBar}
              />
              <UsageBar
                label={t('site.usageCard.weekly')}
                reset={t('site.usageCard.resetWeekly')}
                pct={weekly}
                barRef={weeklyBar}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
