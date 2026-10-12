/**
 * The size and shape of every interactive control in the app.
 *
 * There is ONE size — small. The app had grown three of them (`px-3 py-1.5
 * text-xs`, `px-4 py-2 text-sm`, `px-3 py-2.5`) with no rule saying which
 * belonged where, so two buttons sitting in the same card could disagree. The
 * values below are the ones the organization settings page already used, which
 * is the surface the rest is now aligned on.
 *
 * These are size and chrome only. Colour that carries meaning (a destructive
 * action, a selected state) is composed at the call site, and so is layout
 * (`w-full`, `ml-auto`, `flex-1`) — a constant that decided width could not be
 * reused by the next caller.
 *
 * Compose, never re-declare: `${BTN_PRIMARY} w-full` is right, respelling the
 * padding is what this module exists to stop. A later token wins in Tailwind
 * only by source order in the generated stylesheet, not by position in the
 * string — so overriding a padding here by appending another one is not
 * reliable. If a control genuinely needs a different size, add a tier here.
 */

/** Shared by every button: the small gabarit, minus any colour. */
const BTN_BASE = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all'

/** Neutral, bordered. The default — most buttons in Settings are this. */
export const BTN = `${BTN_BASE} text-text-secondary border border-line hover:bg-surface-strong hover:text-ink`

/** The one affirmative action of a view. At most one per card. */
export const BTN_PRIMARY = `${BTN_BASE} text-on-brand bg-accent hover:bg-accent-hover`

/**
 * THE STACKED TIER IS GONE, and nothing replaced it.
 *
 * `BTN_PRIMARY_STACKED` and `BTN_NEUTRAL_STACKED` stood here for one caller: the ticket
 * page's Start and Discuss, each a label with a quieter sentence under it explaining what
 * pressing it would do. The tier existed BECAUSE of that sentence — `Button`'s label is a
 * `string` precisely so it cannot grow a second line, so a button that had one could not
 * be the design system's.
 *
 * The sentence went. "Start an agent" beside a Play mark is not a proposition anybody
 * needs glossed, and a card whose two controls are each three lines tall reads as a form.
 * With it went the only reason to have a second geometry — the two buttons are `Button`
 * at `md` now, `accent` over `ink`, which is the same ranking those two strings were.
 *
 * Worth recording, because it was the argument FOR the tier and it turned out to be an
 * argument against the sentence: a class string cannot offer a tone, so the second line
 * had to spell its own colour at the call site (`text-on-brand/70` under the accent one,
 * `text-bg/70` under the ink one). A control that needs its caller to pair two strings
 * correctly is a control that is carrying something it should not.
 */

/** Destructive. Bordered rather than filled: it should read as available, not as the obvious next step. */
export const BTN_DANGER = `${BTN_BASE} text-red border border-red/20 hover:bg-red/10`

/** Borderless, for a button that sits inside something already bordered (a menu row, a toolbar). */
export const BTN_GHOST = `${BTN_BASE} text-text-secondary hover:bg-surface-strong hover:text-ink`

/**
 * Inline with text — a chip's action, a control inside a table row. Fixed height
 * so a row of them lines up whatever each one contains.
 */
export const BTN_COMPACT = 'inline-flex items-center gap-1.5 h-7 px-2 text-[11px] font-medium rounded-lg transition-all text-text-secondary bg-surface border border-line hover:bg-surface-strong hover:text-ink'

/** Square, icon only. Same height as BTN_COMPACT so the two align in a row. */
export const BTN_ICON = 'flex items-center justify-center h-7 w-7 shrink-0 rounded-lg transition-all text-icon bg-surface border border-line hover:bg-surface-strong hover:text-ink'

/**
 * `INPUT` IS GONE — it is `Input` in `@ds/desktop` now, and every one of its
 * twenty-four fields with it.
 *
 * It was the largest piece left in this module, and the same argument `Button` made
 * applies to it word for word: a class string cannot offer a SIZE, a TONE or a SHAPE, so
 * every call site composed it by hand with whatever that field needed — `resize-none`,
 * `font-mono`, `disabled:opacity-50`, a `pl-9` for a glyph, a `pr-14` for a spinner —
 * and fields that meant the same thing did not always agree. The component carries all
 * of it, the textarea included.
 *
 * `SELECT` STAYS, for now. It is a NATIVE `<select>` and a different control: its popup
 * is the platform's, which is why it needs `appearance-none` and a chevron drawn over
 * it. `SelectIcon` in the design system is the app's own menu and not a replacement for
 * the two places that still want the native one.
 */

/**
 * Native `<select>`. `appearance-none` because macOS otherwise draws its own
 * popup and ignores the theme; the caller draws the chevron over the `pr-9`.
 */
export const SELECT = 'px-3 py-1.5 pr-9 bg-surface border border-line-field rounded-lg text-xs cursor-pointer appearance-none focus:outline-none focus:border-accent transition-colors'

/**
 * The width a settings row's control stands at — `w-52`, the class every one of those
 * selects carries.
 *
 * A NUMBER, because `Select` is handed one: its panel is portalled and positioned by
 * hand, so a width in a class is a width the panel cannot read. It is here rather than
 * in the design system for the reason the rest of this file is: how wide the right-hand
 * column of a settings row runs is this app's layout, not a design language.
 */
export const SELECT_WIDTH = 208
