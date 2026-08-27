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
 * The affirmative action of a view that has to explain itself: the label on one
 * line, a quieter sentence under it, an icon beside both.
 *
 * A second tier rather than `BTN_PRIMARY` with a bigger padding appended, for the
 * reason the header gives: two paddings from the same Tailwind group do not
 * override each other by class order. Taller than the one gabarit on purpose —
 * this is the single action of a page, not one control in a row of them — and its
 * text is left-aligned, because two stacked lines centred read as a heading. The
 * type scale lives on the two inner lines, so the caller sets it there.
 */
export const BTN_PRIMARY_STACKED = 'flex items-start gap-2.5 px-3.5 py-2.5 text-left rounded-lg transition-all text-on-brand bg-accent hover:bg-accent-hover'

/**
 * The stacked tier's second action: filled, and the highest contrast the theme has.
 *
 * `bg-ink`, not `bg-white`. Four of the eight themes are light, and a white button on a
 * light surface is an outline of nothing — whereas ink is by definition whatever reads
 * against the background, so this is white on the dark themes and near-black on the light
 * ones. The pairing with `text-bg` inverts with it, so the label follows for free.
 *
 * A tier here rather than `BTN_PRIMARY_STACKED` with colours appended, which is this
 * module's own rule: two Tailwind utilities from the same group do not override each other
 * by class order, so `${BTN_PRIMARY_STACKED} bg-ink` would keep whichever the generated
 * stylesheet happened to emit last.
 *
 * It reads as a real button rather than a quiet one on purpose: it sits directly under the
 * primary as an alternative to it, not as a lesser version of it.
 */
export const BTN_NEUTRAL_STACKED = 'flex items-start gap-2.5 px-3.5 py-2.5 text-left rounded-lg transition-all text-bg bg-ink hover:bg-ink/90'

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
 * Text field. Same 30px box as the buttons above, deliberately: a field and the
 * button next to it sit on the same row all over Settings, and the `py-2 text-sm`
 * this used to be stood 8px taller than everything around it — which is what made
 * the settings pages read as a size bigger than the organization page.
 */
export const INPUT = 'px-3 py-1.5 bg-surface border border-line-field rounded-lg text-xs text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30'

/**
 * Native `<select>`. `appearance-none` because macOS otherwise draws its own
 * popup and ignores the theme; the caller draws the chevron over the `pr-9`.
 */
export const SELECT = 'px-3 py-1.5 pr-9 bg-surface border border-line-field rounded-lg text-xs cursor-pointer appearance-none focus:outline-none focus:border-accent transition-colors'
