// What the Claude plan rate limits (Session 5h / Weekly 7d) are WORTH, in this app's
// language and on this app's clock. The bar that draws them is `RateLimitBar` in the
// design system — three surfaces drew one, which is a design system component that
// happened to be filed under the first screen that needed it.

import { LIMIT_THRESHOLDS } from '@ds/desktop'
import type { Translate } from '../../i18n'

/**
 * Where a plan's rate limit turns — re-exported from the design system, which is where
 * it travels with the gauge it belongs to.
 *
 * Still named here because this module is what the sidebar reads: a card drawing its own
 * narrow gauge takes the same thresholds as the wide one, or the two disagree about what
 * "nearly out" means on one screen and not the other.
 */
export { LIMIT_THRESHOLDS }

// Compact "time until reset" from a unix-epoch-seconds timestamp: 45m, 2h14, 3d,
// soon. Takes a translator rather than reading one itself so it stays callable
// from a non-component context (and from a node-environment test).
export function formatReset(resetsAtSec: number, nowMs: number, t: Translate): string {
  const diffSec = Math.floor((resetsAtSec * 1000 - nowMs) / 1000)
  if (diffSec <= 0) return t('usage.reset.soon')
  const days = Math.floor(diffSec / 86_400)
  if (days >= 1) return t('usage.reset.days', { count: days })
  const hours = Math.floor(diffSec / 3_600)
  const minutes = Math.floor((diffSec % 3_600) / 60)
  if (hours >= 1) return t('usage.reset.hours', { hours, minutes: String(minutes).padStart(2, '0') })
  return t('usage.reset.minutes', { count: Math.max(1, minutes) })
}
