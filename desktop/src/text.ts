/**
 * Text normalisation shared across the process boundary.
 *
 * `fold` lived in `renderer/utils/taskRows.ts` until the Tasks board started asking
 * the SAME question in the main process — "is this status name one of the words that
 * mean blocked" — to build a JQL clause out of it. A rule the two sides answer
 * differently is a ticket the server files under Blocked and the renderer draws in
 * Backlog, so the rule moved here, where both can import it.
 *
 * Pure, and deliberately dependency-free: `main/`, `preload/` and `renderer/` all
 * reach it, so anything `electron`-shaped in here would drag the main process into
 * the renderer bundle.
 */

/**
 * A string in the one form the search compares on: case-folded and stripped of
 * accents.
 *
 * The accents are the half worth explaining. Ticket titles here are written in
 * French as often as in English, and a search box that will not find `création`
 * when you type `creation` is a search box people stop using — the more so on a
 * keyboard where the accented character is the harder one to reach. NFD splits an
 * accented letter into its base and a combining mark, and the range below is
 * exactly those marks, so `é` folds onto `e` and nothing else is touched.
 *
 * `toLowerCase` and not `toLocaleLowerCase`: the query and the title are folded by
 * the SAME function and only ever compared with each other, so a locale-specific
 * casing rule could only make the two disagree in a language nobody is searching in.
 */
export function fold(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}
