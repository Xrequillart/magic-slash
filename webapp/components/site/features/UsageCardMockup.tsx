'use client'

import { useEffect, useState } from 'react'
import { UsageClaudeCodeCard } from '@ds/desktop'
import { useT } from '@/lib/i18n/useLanguage'
import { isStill } from '@/lib/stillness'
import { AppGround } from '../AppGround'

/**
 * The visual inside the `Your Claude Code limits` card: the left sidebar's usage card,
 * with its two gauges filling.
 *
 * IT IS THE COMPONENT, not a drawing of one. `UsageClaudeCodeCard` comes from
 * `design-system/desktop/`, the same file the Electron renderer compiles, on a patch of
 * the app's own theme (`AppGround`). Change the card and this illustration changes with
 * it.
 *
 * WHAT THAT REPLACED, and why it mattered here in particular. This file held a
 * reproduction copied "class for class" from `SidebarUsageCard.tsx`, under a forty-line
 * note listing every class it had matched — the card's own `rounded-lg` and subtle
 * border, `gaugeColors` reimplemented beside it, the header's `w-3` user glyph and the
 * account's name in plain `text-[11px]`. All of that was true when it was written. By
 * the time it was deleted the app had replaced that header with the CLAUDE CODE CHIP —
 * the coral plate and the mark that say whose limits these are — and the site was still
 * showing a generic person icon. A picture of a component is a claim that needs
 * maintaining; a component is not. `ContextCardMockup` next door has the same history
 * and the same first paragraph.
 *
 * THE ANIMATION IS A COUNTER, because the percentages are React state: one clock ramps
 * both gauges from 0 to their targets over two and a half seconds, holds for three, and
 * starts again. The state changes only when a ROUNDED value does, so the ramp costs
 * about fifty renders rather than sixty a second. Under `prefers-reduced-motion` the
 * clock never starts and the card rests full.
 *
 * `transition={false}` is not a detail. The bars ease by default, because a gauge in the
 * app moves when a reading arrives every few seconds; here the value moves every frame,
 * each one restarts the ease, and the bar crawls behind the number — measured on the
 * context illustration at 88% of its final width while the label read 26%.
 *
 * THE SESSION GAUGE LANDS PAST THE FIRST THRESHOLD, at 72% against 65, so the card is
 * seen changing colour on the way; the week lands at 38% and stays green. The thresholds
 * are the app's own two, which the card takes from its caller for the reason
 * `ProgressBar` gives.
 *
 * MAGNIFIED, not redrawn larger: the card is drawn at its own width, every size the
 * app's, and a `scale` brings it to a readable size on the page — the proportions
 * survive exactly, and what changes is only how close the reader is standing. A
 * transform leaves the layout box at its unscaled size, which is why the wrapper is
 * positioned rather than sized.
 *
 * `aria-hidden`: it is a drawing, and a minimise button that minimises nothing should be
 * announced to nobody.
 */

const SESSION = 72
const WEEKLY = 38
const RAMP_MS = 2500
const HOLD_MS = 3000

/** `LIMIT_THRESHOLDS` in the app — green below 65, orange from 65, red from 85. */
const THRESHOLDS = { warning: 65, danger: 85 }

export function UsageCardMockup() {
  const { t } = useT()
  const [pct, setPct] = useState(1)

  useEffect(() => {
    if (isStill()) return

    const start = performance.now()
    let frame = 0
    let shown = -1
    const tick = () => {
      const elapsed = (performance.now() - start) % (RAMP_MS + HOLD_MS)
      const u = Math.min(1, elapsed / RAMP_MS)
      // Ease-out, so the gauges slow as they land rather than stopping dead.
      const eased = 1 - (1 - u) * (1 - u)
      // ONE clock for both bars: they are two readings of one account and arriving at
      // different moments would make them look like two independent things.
      const rounded = Math.round(eased * 100)
      if (rounded !== shown) {
        shown = rounded
        setPct(rounded)
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    // CROPPED AT THE BOTTOM AND THE RIGHT, as the commits card's panel is: the drawing
    // sits in the card's right-hand column at the card's own `min-h-80`, and the panel is
    // placed 140px down and 24px in, magnified from its top-left corner — so its bottom
    // edge passes the card's and its right edge passes the column's by about its own
    // padding, and the card's `overflow-hidden` cuts both. The percentages stay in: a
    // gauge whose number is cut is a gauge that says nothing.
    //
    // 140 AND NOT A TAILWIND RUNG: the card wanted 20px off `top-40`, and the scale has
    // no stop between 36 (144) and 40 (160). An arbitrary value is the honest way to say
    // 20 — `top-36` would have moved it 16.
    <div aria-hidden className="relative h-80">
      <div className="absolute left-6 top-[140px]">
        {/* The sidebar's own column, with the card's `mx-2` of air either side. */}
        <AppGround className="w-[230px] origin-top-left scale-[1.6] rounded-xl px-2 py-2 shadow-lift-mint">
          <UsageClaudeCodeCard
            account="camille"
            limits={[
              {
                id: 'session',
                label: t('site.usageCard.session'),
                // The card never collapses here, so the short form is never drawn —
                // the full one is the honest thing to hand it rather than inventing a
                // second string this site has no use for.
                shortLabel: t('site.usageCard.session'),
                percent: (SESSION * pct) / 100,
                reset: t('site.usageCard.resetSession'),
              },
              {
                id: 'weekly',
                label: t('site.usageCard.weekly'),
                shortLabel: t('site.usageCard.weekly'),
                percent: (WEEKLY * pct) / 100,
                reset: t('site.usageCard.resetWeekly'),
              },
            ]}
            thresholds={THRESHOLDS}
            transition={false}
            onToggle={() => undefined}
            expandLabel={t('site.infoSidebar.unfold')}
            collapseLabel={t('site.infoSidebar.fold')}
            emptyLabel=""
            emptyHint=""
          />
        </AppGround>
      </div>
    </div>
  )
}
