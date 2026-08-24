/**
 * Turning a whole highlighted file into the changed regions of it, the way a
 * unified `git diff` reads: each change with a few lines of unchanged code around
 * it, and a marker wherever the rest was left out.
 *
 * Deliberately free of `electron`, of `fs` and of shiki itself: everything here is
 * a string in and a string out, so the decisions — which lines survive, how many
 * were skipped — are covered by a plain node test rather than by rendering an app.
 * `config-handlers.ts` is the only caller; it owns the highlighting and the diff,
 * this module owns nothing but the arithmetic.
 *
 * Two numbering spaces meet in here, and keeping them apart is the whole
 * difficulty. Every row shiki emits is a line of the file AS IT STANDS NOW, and
 * that is what the ranges below are expressed in. A deletion has no line in that
 * file at all — it is re-injected as an extra visual row, numbered in the OLD file
 * so the gutter tells the reader which line went away. `data-line` therefore holds
 * whatever number the gutter should show, and `data-anchor` holds the new-file line
 * an injected row sits before. Visibility is decided on the anchor; only the label
 * comes from `data-line`.
 */

/**
 * The literal shiki opens every row with. See `splitShikiLines` for why it is safe.
 *
 * Exported so `config-handlers.ts` builds its injected rows out of the same string it
 * is parsed back with. Writer and reader of this markup live in two modules; one
 * constant is what keeps them from drifting into a document that still highlights
 * while the gutter goes blank.
 */
export const ROW_MARKER = '<span class="line"'

/** A run of file lines to keep, both ends inclusive, in new-file numbers. */
export interface Range {
  start: number
  end: number
}

/** A shiki document taken apart: the `<pre><code>` opening, the rows, the closing tail. */
export interface ShikiDocument {
  prefix: string
  lines: string[]
  suffix: string
}

/**
 * Split shiki's output into its rows.
 *
 * String splitting rather than a parser, and it is sound rather than lucky: shiki
 * escapes `<` in the highlighted source to `&#x3C;`, so the literal above cannot
 * occur anywhere inside a row's content. The only places it appears are the row
 * openings themselves.
 *
 * Each returned line keeps the newline shiki puts between rows, so joining the
 * pieces back together with no separator reproduces the input byte for byte.
 * `suffix` is the `</code></pre>` tail, peeled off the last row so a row can be
 * dropped without taking the document's closing tags with it.
 */
export function splitShikiLines(html: string): ShikiDocument {
  const parts = html.split(ROW_MARKER)
  const prefix = parts[0] ?? ''
  const lines = parts.slice(1).map(part => ROW_MARKER + part)
  if (lines.length === 0) return { prefix, lines, suffix: '' }

  const last = lines[lines.length - 1]
  const closing = last.lastIndexOf('</code>')
  // No `</code>` at all is not shiki's output — hand the rows back untouched rather
  // than guess where the document ends.
  if (closing === -1) return { prefix, lines, suffix: '' }
  lines[lines.length - 1] = last.slice(0, closing)
  return { prefix, lines, suffix: last.slice(closing) }
}

/**
 * Stamp each row with the file line it is, 1-based.
 *
 * Applied to EVERY preview, annotated or not, because the gutter reads the
 * attribute: a document that skipped this step would render its line numbers as
 * blanks. It is also what survives an elision — a CSS counter counts the rows that
 * were kept, which is precisely the wrong number once a region has been left out.
 */
export function numberShikiLines(html: string): string {
  let line = 0
  return html.replace(/<span class="line"/g, () => `${ROW_MARKER} data-line="${++line}"`)
}

/**
 * How many rows a shiki document holds — which, before anything has been injected
 * into it, is how many lines the file has.
 *
 * A scan rather than `splitShikiLines(html).lines.length`: that answers the same
 * question by allocating one substring per line of the file, and then throws all of
 * them away. The count is wanted on the main thread, on every preview opened.
 */
export function countShikiRows(html: string): number {
  let count = 0
  for (let i = html.indexOf(ROW_MARKER); i !== -1; i = html.indexOf(ROW_MARKER, i + ROW_MARKER.length)) count++
  return count
}

/**
 * The regions worth showing, given where the file changed.
 *
 * Each changed line is widened by `context` on both sides, the results are merged
 * wherever they touch — including where they merely abut, since a gap of zero lines
 * is not something to announce as elided — and clamped to the file.
 *
 * `null` means "there is nothing to collapse": either the file has no changes at
 * all, or the regions already cover it end to end. Answering with a range list
 * there would hand the caller a second copy of the whole document to ship over IPC,
 * and would put an expand button on a card with nothing to expand.
 */
export function computeVisibleRanges(
  changedLines: number[],
  totalLines: number,
  context: number,
): Range[] | null {
  if (changedLines.length === 0 || totalLines <= 0) return null

  const ranges: Range[] = []
  for (const line of [...changedLines].sort((a, b) => a - b)) {
    const start = Math.max(1, line - context)
    const end = Math.min(totalLines, line + context)
    // A position past the end of the file whose context cannot reach back into it.
    // Nothing to show for it; the row itself is placed by `renderRows`.
    if (end < start) continue
    const last = ranges[ranges.length - 1]
    if (last && start <= last.end + 1) last.end = Math.max(last.end, end)
    else ranges.push({ start, end })
  }

  if (ranges.length === 0) return null
  if (ranges.length === 1 && ranges[0].start === 1 && ranges[0].end === totalLines) return null
  return ranges
}

/**
 * The line a row is positioned at: its anchor when it has one, its own number otherwise.
 *
 * Both attributes are read out of the opening tag alone. `data-anchor` is absent from
 * almost every row, and an unanchored search for it across the whole row would run to
 * the end of shiki's inline markup before failing — once per line of the file.
 */
function anchorOf(row: string): number {
  const attrs = row.slice(0, row.indexOf('>'))
  const anchor = attrs.match(/ data-anchor="(\d+)"/)
  if (anchor) return parseInt(anchor[1], 10)
  const line = attrs.match(/ data-line="(\d+)"/)
  return line ? parseInt(line[1], 10) : 0
}

/** The separator standing in for what was left out. Emptied of text; CodeView labels it. */
function elidedRow(skipped: number): string {
  return `${ROW_MARKER} data-elided="${skipped}"></span>\n`
}

/**
 * Reassemble the document from `ranges` alone, marking every cut.
 *
 * Takes the `ShikiDocument` its sibling produces rather than the three pieces spread
 * out: taking an aggregate apart at the call site only to hand it straight back is
 * three chances to pass the wrong one.
 *
 * `totalLines` is the FILE's own length — the row count of the UNANNOTATED document,
 * which is why it stays a separate argument rather than being read off `doc` — and it
 * does two jobs. It says how many lines the tail elision hides, and it clamps the
 * anchors: a deletion at the very end of a file is anchored at `totalLines + 1`, a
 * position no range can contain, and dropping it would lose the one thing that says
 * the end of the file was cut away.
 */
export function renderRows(
  doc: ShikiDocument,
  ranges: Range[],
  totalLines: number,
): string {
  const { prefix, lines: rows, suffix } = doc
  // Bucketed in one ordered pass rather than filtered once per range: anchors only
  // ever increase down the document, so a single cursor over the ranges is enough,
  // and the rows come out in the order they were written in.
  const buckets: string[][] = ranges.map(() => [])
  let index = 0
  for (const row of rows) {
    const anchor = Math.min(anchorOf(row), totalLines)
    while (index < ranges.length && anchor > ranges[index].end) index++
    if (index >= ranges.length) break
    if (anchor >= ranges[index].start) buckets[index].push(row)
  }

  const out: string[] = []
  let covered = 0
  ranges.forEach((range, i) => {
    const skipped = range.start - covered - 1
    if (skipped > 0) out.push(elidedRow(skipped))
    // Joined rather than spread: one range can hold most of a large file, and
    // `push(...rows)` passes every row as an argument — which blows the call's
    // argument limit long before the file stops being one anyone would open.
    out.push(buckets[i].join(''))
    covered = range.end
  })
  if (totalLines - covered > 0) out.push(elidedRow(totalLines - covered))

  return prefix + out.join('') + suffix
}
