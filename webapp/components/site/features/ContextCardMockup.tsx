'use client'

import { useEffect, useState } from 'react'
import { ContextAgentCard } from '@ds/desktop'
import { useT } from '@/lib/i18n/useLanguage'
import { isStill } from '@/lib/stillness'
import { AppGround } from '../AppGround'

/**
 * The visual under the `agentContext` row: the agent sidebar's context card, with its
 * gauge filling to 54%.
 *
 * IT IS THE COMPONENT, not a drawing of one. `ContextAgentCard` comes from
 * `design-system/desktop/`, the same file the Electron renderer compiles, on a patch
 * of the app's own theme (`AppGround`). Change the card and this illustration changes
 * with it.
 *
 * WHAT THAT REPLACED is worth remembering. This file used to hold a reproduction
 * copied "class for class" from `UsageCard.tsx`, under a forty-line note listing every
 * class it had matched — the header's tracking, the model pill's `bg-purple/15`, the
 * gauge's thresholds, `formatTokens` reimplemented beside them. Every line of that was
 * true when it was written and most of it was wrong by the time it was deleted: the
 * card had since grown chips, lost its SESSION header and changed its model pill. A
 * picture of a component is a claim that needs maintaining. A component is not.
 *
 * THE ANIMATION IS A COUNTER, and it has to be: the percentage, the token count and
 * the cost all read off ONE number, and a number cannot be animated from a stylesheet.
 * A clock ramps it from 0 to 54 over two and a half seconds, holds for three, and
 * starts again. Under `prefers-reduced-motion` the clock never starts and the card
 * rests at 54%.
 *
 * It drives the card through its `contextPercent` prop rather than writing a width
 * onto a bar, which is the price of using the real component and a fair one — the
 * state changes only when the ROUNDED value does, so the ramp costs about fifty
 * renders rather than sixty a second.
 *
 * `transition={false}` is not a detail. `ProgressBar` eases its fill by default,
 * because a gauge in the app moves when a reading arrives every few seconds; here the
 * value moves every frame, each one restarts the ease, and the bar crawls behind the
 * number — measured at 88% of its final width while the label read 26%.
 *
 * `aria-hidden`: it is a drawing, and a button that cannot be pressed should be
 * announced to nobody.
 */

const TARGET = 54
const RAMP_MS = 2500
const HOLD_MS = 3000
const WINDOW = 1_000_000

/** `formatTokens` from the app, with the unit strings from this site's two catalogues. */
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

  useEffect(() => {
    if (isStill()) return

    const start = performance.now()
    let frame = 0
    let shown = -1
    const tick = () => {
      const elapsed = (performance.now() - start) % (RAMP_MS + HOLD_MS)
      const u = Math.min(1, elapsed / RAMP_MS)
      // Ease-out, so the gauge slows as it lands rather than stopping dead.
      const value = TARGET * (1 - (1 - u) * (1 - u))
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

  const used = Math.round((WINDOW * pct) / 100)
  const seconds = Math.round(pct * 27)

  return (
    <div
      aria-hidden
      className="flex justify-center overflow-hidden rounded-2xl bg-tone-sky px-6 py-14 sm:py-20"
    >
      {/* The sidebar's own ground, `p-4` around the card as the app's column has. */}
      <AppGround className="w-full max-w-[500px] rounded-2xl p-4 shadow-lift">
        <ContextAgentCard
          contextPercent={pct}
          contextDetail={`${formatTokens(used, locale, fr)} / ${formatTokens(WINDOW, locale, fr)} tokens`}
          model="Fable 5.1"
          cost={`$${(pct * 0.058).toFixed(2)}`}
          duration={
            fr
              ? `${Math.floor(seconds / 60)} min ${seconds % 60} s`
              : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
          }
          transition={false}
          onMinimizedChange={() => undefined}
          labels={{
            context: t('site.infoSidebar.context'),
            minimize: t('site.infoSidebar.fold'),
            expand: t('site.infoSidebar.unfold'),
          }}
        />
      </AppGround>
    </div>
  )
}
