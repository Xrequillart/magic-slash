/**
 * HOW WIDE A PAGE OVERLAY IS, and why the narrow one is that exact number.
 *
 * A MODULE OF ITS OWN, IMPORTING NOTHING, on `componentSizes.ts`'s and `avatarSizes.ts`'s
 * model: the test suite runs on the root `node_modules`, where React does not exist, so
 * anything reachable from a `.tsx` cannot be asserted. The arithmetic below is the one
 * thing in this folder most worth asserting — see `modalSizes.test.ts` — so it lives
 * where a test can reach it.
 *
 * ── TWO SIZES, BECAUSE THERE ARE TWO KINDS OF PAGE ────────────────────────────────
 *
 * `page` is the window Plans, Tasks, Skills and Repositories open into: a page with its
 * own layout — lists, panes, a detail beside a rail — which wants all the room it can
 * have.
 *
 * `column` is Account and Settings, which are neither. They are a single column of forms
 * read top to bottom, and they were already drawn that way inside the wide window: a
 * 48rem measure centred in 72rem, with 12rem of empty panel either side. A window that
 * wide around a column that narrow is not generous, it is a window that does not know
 * what is in it — and on the short tabs (Language is two cards) it read as a page that
 * had failed to load.
 *
 * ── THE NARROW WIDTH IS NOT CHOSEN, IT IS THE SUM ─────────────────────────────────
 *
 * The panel is the measure plus the air either side of it, exactly — so the column of
 * cards ends where the panel's padding ends and the panel ends immediately after. There
 * is no third number to pick and nothing to re-tune when the measure moves: change
 * `MODAL_COLUMN_MEASURE` and the window follows it.
 *
 * THE HEADER FITS AT THIS WIDTH, measured rather than assumed: the five-tab strip of the
 * widest of the four sets (Account and Settings, English and French) is 567px centred,
 * which leaves about 100px of track for the title on the left and 73px clear of the two
 * buttons on the right. A title longer than its track is ELLIPSED rather than run under
 * the pills — see `ModalHeader`'s three tracks, which this width is what forced.
 *
 * Both numbers are in PX and not in `rem`, deliberately. They are added together, and a
 * sum of two strings in different units is a `calc()` that no test can check and no
 * reader can hold in their head. 768 is Tailwind's `max-w-3xl` and 24 is its `px-6`,
 * which is what these two were before they had names.
 */

/** The column a page of forms is read in — Tailwind's `max-w-3xl`, in px. */
export const MODAL_COLUMN_MEASURE = 768

/** The air either side of that column, inside the panel — Tailwind's `px-6`, in px. */
export const MODAL_COLUMN_GUTTER = 24

/** The air above and below it — Tailwind's `py-5`, in px. No arithmetic depends on it. */
export const MODAL_COLUMN_PADDING_Y = 20

/**
 * THE COLUMN'S PADDING, FOR THE ELEMENT THAT TRAVELS — not for the scroller around it.
 *
 * A scrolling box clips at its padding box, so a page inset from the pane's edge has
 * nowhere to go: slide it 24px and its leading 24px of pixels are cut off for the length
 * of the animation, and every card in it arrives with a side missing. Put the same
 * padding on the MOVING layer instead and the 24px that leaves the box is the layer's
 * own empty inset — the content arrives and departs whole.
 *
 * This is `pages/Config/index.tsx`'s arrangement, which the repositories window and the
 * plans page already sweep by, stated here because the narrow overlay is the one place
 * where the padding is also LOAD-BEARING: the panel's width is computed from it.
 *
 * Handed over as a style object and not as `px-6 py-5`, so the number the panel was
 * measured from is the number the caller applies. A class would be a second spelling.
 */
export const MODAL_COLUMN_PADDING = {
  paddingLeft: MODAL_COLUMN_GUTTER,
  paddingRight: MODAL_COLUMN_GUTTER,
  paddingTop: MODAL_COLUMN_PADDING_Y,
  paddingBottom: MODAL_COLUMN_PADDING_Y,
} as const

export type PageModalSize = 'page' | 'column'

export const PAGE_MODAL_SIZES: readonly PageModalSize[] = ['page', 'column']

/**
 * The panel's width at rest, per size. Full screen ignores both — it is the window.
 *
 * `page` IS 72rem AND HAS NO ARITHMETIC BEHIND IT: it is as wide as the app's window
 * usefully gets before a list's rows become a walk for the eye. The narrow one is the
 * sum above, which is why only it is spelled as one.
 */
export const PAGE_MODAL_WIDTH: Record<PageModalSize, string> = {
  page: '72rem',
  column: `${MODAL_COLUMN_MEASURE + 2 * MODAL_COLUMN_GUTTER}px`,
}
