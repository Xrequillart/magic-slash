'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock, Cpu, DollarSign, Gauge, Minus, RefreshCw } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The visual under the `agentContext` row: the info sidebar's Session card, redrawn, with
 * its context gauge filling to 54%.
 *
 * DRAWN FROM `desktop/src/renderer/components/agent-info-sidebar/UsageCard.tsx`, the
 * expanded branch, class for class:
 *
 *   1. THE HEADER, `flex items-center justify-between`: the SESSION label at `text-xs
 *      uppercase tracking-wider` in secondary ink at half strength, beside the refresh
 *      glyph and "just now" at `text-[11px]` in icon ink; on the right the model pill —
 *      `px-1.5 py-0.5 rounded-md bg-purple/15 text-purple text-[11px] font-medium` with a
 *      `w-3` chip — and the minimise button stretched to the pill's height.
 *   2. THE CONTEXT GAUGE, `space-y-1.5`: a `w-3.5` gauge glyph and "Context" at `text-xs`
 *      in secondary ink, the percentage at `font-medium` in the gauge's own colour, a
 *      `h-1.5` track on the sunken surface with a bar that takes the same colour, and
 *      "used / total tokens" at `text-[11px]` under it.
 *   3. THE COST AND DURATION ROW, `text-xs`: a dollar glyph with the amount at
 *      `font-medium` in full ink, a clock with the elapsed time in secondary ink.
 *
 * THE COLOURS ARE `contextColors` IN `utils.ts`, thresholds included: green below 40%,
 * orange from 40, red from 70. `orange` is declared in the Tailwind config for this card
 * alone — the palette had none, and the Agents drawing substitutes `yellow`, but here the
 * turn to orange at 40% IS the picture, so the value has to be the app's.
 *
 * THE NUMBERS ARE `formatTokens` AND `formatUsd`, reproduced: a million-token window on
 * `Fable 5.1` — 1.00M — and the used share at one decimal in thousands, with the
 * French spacing before the unit that the app's catalogue carries.
 *
 * THE ANIMATION IS A COUNTER, not a CSS width: the percentage, the tokens and the cost
 * all read off one number, and a number cannot be animated from a stylesheet. So a
 * small clock ramps it from 0 to 54 over two and a half seconds, holds for three, and
 * starts again — see the note on the clock below for how the bar and the number share
 * it without fighting. The app's own `transition-all duration-500` on the bar is the one
 * class NOT reproduced: it smooths a value that arrives every few seconds, and here the
 * value arrives every frame. Under `prefers-reduced-motion` the clock never starts and
 * the card rests at 54%.
 *
 * IN DARK, as every app reproduction here: `bg-ink` for the window, `bg-white/[0.06]`
 * for the app's `surface`, `bg-black/30` for `surface-sunken`, `appink` for its
 * secondary and icon inks. The card is drawn at the width it has in the sidebar — 468px,
 * the 500px default less its `p-4` — on a dark panel, because a translucent card only
 * looks like itself on the ground it was designed for.
 *
 * `aria-hidden`: it is a drawing, and a button that cannot be pressed should be
 * announced to nobody.
 */

const TARGET = 54
const RAMP_MS = 2500
const HOLD_MS = 3000
const WINDOW = 1_000_000

/** `contextColors`, verbatim. */
function contextColors(pct: number) {
  if (pct >= 70) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 40) return { bar: 'bg-orange', text: 'text-orange' }
  return { bar: 'bg-green', text: 'text-green' }
}

/** `formatTokens`, with the unit strings from the app's two catalogues. */
function formatTokens(n: number, locale: string, fr: boolean) {
  const scaled = (value: number, digits: number, unit: string) =>
    `${value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}${unit}`
  if (n >= 1_000_000) return scaled(n / 1_000_000, 2, fr ? ' M' : 'M')
  if (n >= 1_000) return scaled(n / 1_000, 1, fr ? ' k' : 'k')
  return n.toLocaleString(locale)
}

export function ContextCardMockup() {
  const { t, lang, locale } = useT()
  const fr = lang === 'fr'
  const [pct, setPct] = useState(TARGET)
  const barRef = useRef<HTMLDivElement>(null)

  // ONE CLOCK, TWO OUTPUTS. The bar's width is written straight onto the element every
  // frame, as a fraction, so it glides; the number the card prints is React state and
  // changes only when the rounded value does — about fifty renders per loop, not sixty a
  // second. The bar carries no CSS transition of its own: a transition on a value that is
  // already being driven every frame only lags behind it and snaps back at the loop's end.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (barRef.current) barRef.current.style.width = `${TARGET}%`
      return
    }
    const start = performance.now()
    let frame = 0
    let shown = -1
    const tick = () => {
      const elapsed = (performance.now() - start) % (RAMP_MS + HOLD_MS)
      const u = Math.min(1, elapsed / RAMP_MS)
      // Ease-out, so the gauge slows as it lands rather than stopping dead.
      const value = TARGET * (1 - (1 - u) * (1 - u))
      if (barRef.current) barRef.current.style.width = `${value}%`
      const rounded = Math.round(value)
      if (rounded !== shown) {
        shown = rounded
        setPct(rounded)
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const colors = contextColors(pct)
  const used = Math.round((WINDOW * pct) / 100)
  const cost = (pct * 0.058).toFixed(2)
  const seconds = Math.round(pct * 27)
  const duration = fr
    ? `${Math.floor(seconds / 60)} min ${seconds % 60} s`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`

  return (
    <div
      aria-hidden
      className="flex justify-center overflow-hidden rounded-2xl bg-tone-indigo px-6 py-14 sm:py-20"
    >
      {/* The sidebar's ground, `p-4` around the card as the app's column has. */}
      <div className="w-full max-w-[500px] rounded-2xl bg-ink p-4 shadow-lift">
        <div className="space-y-3 rounded-xl bg-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-appink/50">
                {t('site.infoSidebar.session')}
              </span>
              <span className="flex items-center gap-1 text-[11px] normal-case tracking-normal text-appink-icon">
                <RefreshCw className="h-3 w-3" />
                {t('site.infoSidebar.justNow')}
              </span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-md bg-purple/15 px-1.5 py-0.5 text-[11px] font-medium text-purple">
                <Cpu className="h-3 w-3" />
                Fable 5.1
              </span>
              <span className="flex shrink-0 items-center justify-center self-stretch rounded-md px-1 text-appink-icon">
                <Minus className="h-3 w-3" />
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-appink">
                <Gauge className="h-3.5 w-3.5" />
                {t('site.infoSidebar.context')}
              </span>
              <span className={`font-medium ${colors.text}`}>{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/30">
              <div
                ref={barRef}
                className={`h-full rounded-full ${colors.bar} transition-colors duration-300`}
                style={{ width: `${TARGET}%` }}
              />
            </div>
            <div className="text-[11px] tabular-nums text-appink/70">
              {formatTokens(used, locale, fr)} / {formatTokens(WINDOW, locale, fr)} tokens
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-appink">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums text-white">${cost}</span>
            </span>
            <span className="flex items-center gap-1.5 text-appink">
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums">{duration}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
