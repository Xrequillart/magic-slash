import type { BannerAction, BannerVariant } from './Banner'
import type { IconComponent } from './types'

/**
 * SOMETHING IS WRONG WITH WHAT THIS CARD IS ABOUT — one strip, on a card rather than on
 * a page.
 *
 * ONE TYPE FOR THE THREE CARDS THAT CARRY ONE. `AccountCard` had it first as
 * `AccountCardAlert`, and by the time `SettingsCard` and `HealthCard` each wanted the
 * same strip the shape was about to exist three times: three near-identical interfaces
 * that nothing would have kept in step, and the first one to grow an `actions` would
 * have made the other two the odd ones out.
 *
 * WHAT IS SHARED IS THE DATA AND NOT THE DRAWING. Each card decides where its strip sits
 * and which `Banner` layout it wears — the account's is `inset` and full-bleed to the
 * card's edges, the others are ordinary strips under the rows — because that is a fact
 * about the card, not about the alert. What every one of them agrees on is what an alert
 * IS: one sentence, optionally a quieter line under it, a severity, and what can be done
 * about it.
 *
 * NOT A BANNER'S PROPS. A card's alert has no `layout`, no `bordered` and no
 * `className`, deliberately: those are the three ways a call site could make one card's
 * strip look unlike another's.
 */
export interface CardAlert {
  /** The sentence. Translated, and one fact — see `Banner`. */
  message: string
  /** The quieter line under it: what to do, or why it cannot be done. Translated. */
  hint?: string
  /**
   * `danger` unless stated, because a strip inside a card is nearly always something
   * that stopped working or a write that did not land. Something that can wait is a
   * `warning`.
   */
  variant?: BannerVariant
  /** Overrides the variant's mark, for a strip about a specific thing. */
  icon?: IconComponent
  /**
   * The fix, as data. At most one in practice: a strip saying one thing has one answer,
   * and the second button on it is usually one the card already carries elsewhere.
   */
  actions?: BannerAction[]
}
