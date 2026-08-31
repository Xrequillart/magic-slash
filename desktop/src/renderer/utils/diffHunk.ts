/**
 * Turning GitHub's `diffHunk` into rows a panel can draw.
 *
 * A `diffHunk` is UNIFIED DIFF TEXT — an `@@ -a,b +c,d @@` header followed by lines
 * prefixed with `+`, `-` or a space. That is a different substance from everything else
 * this app renders code with: `main/ipc/hunkView.ts` operates on shiki HTML and walks
 * `<span class="line" data-line="N">`, so it cannot read a hunk and there is nothing to
 * reuse from it. Hence a second, much smaller parser, here in the renderer rather than
 * in main: the text arrives on the comment already, the parse is a string split, and
 * keeping it in the renderer means changing how a hunk is drawn never touches an IPC
 * boundary.
 *
 * Pure and DOM-free on purpose — no React, no store, plain values in and out — because
 * that is the only kind of thing this codebase's test setup can exercise (plain Node, no
 * jsdom). Everything with an opinion about correctness lives here so that
 * `DiffHunkView.tsx` is left with nothing but the markup.
 */

/** One row of a parsed hunk: what happened to it, where it sits, and what it says. */
export interface HunkLine {
  kind: 'add' | 'remove' | 'context'
  /**
   * Its number in the file BEFORE the change, or null on an added line, which had none.
   * The pair below is what lets a comment anchored to either side of the diff find its
   * own row without the caller having to know which numbering it is holding.
   */
  oldLine: number | null
  /** Its number in the file AFTER the change, or null on a removed line. */
  newLine: number | null
  /** The content, with the diff prefix stripped. Never trimmed — indentation is code. */
  text: string
}

/**
 * The capture-time numbers and the side, as `PRReviewThread` carries them.
 *
 * A plain bag rather than the thread itself: the range arithmetic is the part worth
 * testing, and taking a `PRReviewThread` would drag the whole PR-comments type into a
 * test that has an opinion about two integers. Every field is optional because every one
 * of them is absent on some real thread — `originalStartLine` on a single-line comment,
 * `diffSide` on anything GitHub answered before it had the field, and `originalLine`
 * itself on a thread GitHub anchored to a file rather than to a line.
 *
 * `line` and `startLine` are deliberately NOT declared here, even though the caller hands
 * the whole thread over and both are on it. `groupPullRequestThreads` backfills `line`
 * with `originalLine`, so what arrives is a MERGED value that can no longer say which
 * numbering it counts in — and a hunk is highlighted in exactly one numbering. Leaving
 * the pair off the type is what makes "the panel must not read the fallback" a fact about
 * the code rather than a sentence in a docblock above it.
 */
export interface CommentAnchor {
  originalLine?: number
  originalStartLine?: number
  diffSide?: string
}

/** A resolved range, in ONE of the two numberings — `side` says which. */
export interface CommentedRange {
  side: 'old' | 'new'
  start: number
  end: number
}

/**
 * The header, and the only line of a hunk that has to parse for the rest to mean
 * anything.
 *
 * `,b` and `,d` are OPTIONAL in the format: a hunk covering exactly one line is written
 * `@@ -12 +12 @@`, with the count left out. Only the two starts are read here, so the
 * counts are matched and discarded rather than captured — but they have to be matched,
 * or `-12,3` would leave `,3` unconsumed and fail the anchor at the end.
 *
 * Anchored at the start of the line and tolerant of anything after the closing `@@`,
 * which is where git writes the enclosing function's signature.
 */
const HUNK_HEADER = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/

/**
 * Read a `diffHunk` into rows, deriving both line numberings from its header.
 *
 * Answers `[]` for everything it cannot make sense of — an empty string, whitespace, a
 * hunk with no header, a header that does not parse — and that empty array is a
 * CONTRACT, not a degenerate case: it is what tells the panel to render no code block at
 * all rather than an empty frame with a border and a gap in it. So there is deliberately
 * no throwing path and no partial result: a caller only ever has to test for length.
 *
 * Several `@@` headers in one string is handled even though GitHub sends one, because
 * the cost is a variable reset and the alternative is a silently mis-numbered second
 * half if that ever stops being true.
 *
 * `\ No newline at end of file` is git's annotation of the line ABOVE it, not a line of
 * the file — numbering it would push every following row one out of step, and drawing it
 * would put a sentence in English in the middle of the code. It is dropped.
 */
export function parseDiffHunk(hunk: string): HunkLine[] {
  if (!hunk || !hunk.trim()) return []

  const lines: HunkLine[] = []
  let oldNo = 0
  let newNo = 0
  let numbering = false

  for (const raw of hunk.split('\n')) {
    const header = HUNK_HEADER.exec(raw)
    if (header) {
      oldNo = parseInt(header[1], 10)
      newNo = parseInt(header[2], 10)
      numbering = true
      continue
    }
    // Anything before the first header has no numbering to be placed in. Dropped rather
    // than guessed at: a hunk that starts mid-body is malformed, and inventing a line 1
    // for it would put confident numbers on rows nobody can check.
    if (!numbering) continue
    // git's "the line above had no trailing newline". See the docblock.
    if (raw.startsWith('\\')) continue

    // Both `undefined` on a truly empty line — the last element of a hunk ending in a
    // newline, and how some producers write an unchanged blank line. It falls through to
    // the context branch below and is NUMBERED there rather than dropped, because
    // dropping it would shift every row after it. No guard needed for it here: `''` has
    // no first character to read and `''.slice(1)` is already `''`.
    const marker = raw[0]
    const text = raw.slice(1)

    if (marker === '+') {
      lines.push({ kind: 'add', oldLine: null, newLine: newNo++, text })
    } else if (marker === '-') {
      lines.push({ kind: 'remove', oldLine: oldNo++, newLine: null, text })
    } else {
      // A space, an empty line, or anything else. Unified diff defines no fourth prefix,
      // so an unrecognised one is treated as context with its first character KEPT:
      // showing the row is worth more than being right about a prefix that should not
      // exist, and a dropped row would misalign the numbering of everything below it.
      // The empty line needs no case of its own — `raw` and `text` are both `''` there.
      lines.push({
        kind: 'context',
        oldLine: oldNo++,
        newLine: newNo++,
        text: marker === ' ' ? text : raw,
      })
    }
  }

  return lines
}

/**
 * Which lines the comment was actually left on, in the numbering the HUNK is written in.
 *
 * A `diffHunk` is a frozen excerpt: GitHub captured it when the comment was written and
 * never rewrites it afterwards. So the numbers that index into it are the capture-time
 * pair, `originalStartLine` / `originalLine`, and never `startLine` / `line`, which keep
 * following the file as it stands now and walk away from the excerpt the moment anything
 * lands above it. Those are two different axes, and the bug in reading them as one is
 * invisible until they disagree: LEFT/RIGHT says which COLUMN of the diff was commented
 * on, current-vs-original says which NUMBERING the position is counted in. They coincide
 * right up until the diff moves — which is the one case these fields were added for.
 *
 * GitHub reports a range as its FOOT in `originalLine` and its head in
 * `originalStartLine`, and leaves the head null on the ordinary single-line comment — so
 * `originalStartLine ?? originalLine` through `originalLine` is the range in both cases
 * and on BOTH sides, and a multi-line comment lights up as the block it was written about
 * rather than as its last line. `diffSide` then chooses only the column to match that
 * range against: `LEFT` is the file before the change and is read off `oldLine`; absent
 * means `RIGHT` — GitHub's own default, and what every comment left on added or unchanged
 * code comes back as.
 *
 * `null` only when there is no capture-time foot at all, which in practice is a thread
 * GitHub anchored to a FILE rather than to a line. Nothing is highlighted then, which is
 * the honest drawing: the panel still shows the hunk and says what state the thread is
 * in, and pointing at a line nobody named would be a worse answer than pointing at none.
 * An outdated thread is NOT that case — it keeps its original pair, which is exactly the
 * numbering its frozen hunk is written in, so it highlights like any other.
 *
 * `min`/`max` rather than trusting the order, because the two ends cost nothing to sort
 * and an inverted range would silently highlight nothing at all.
 */
export function commentedRange(anchor: CommentAnchor): CommentedRange | null {
  const end = anchor.originalLine
  if (typeof end !== 'number') return null
  const head = anchor.originalStartLine ?? end
  return {
    side: anchor.diffSide === 'LEFT' ? 'old' : 'new',
    start: Math.min(head, end),
    end: Math.max(head, end),
  }
}

/**
 * Whether this row is one of the ones commented on.
 *
 * Reads the column the range names and no other: a `LEFT` range is compared against
 * `oldLine`, so an added row — which has none — can never match it, and a `RIGHT` range
 * never matches a removed one. That is what keeps a comment on a deleted line from
 * lighting up the unrelated code that replaced it.
 *
 * A null range answers false for every row, so the caller draws the hunk with nothing
 * highlighted rather than having to branch on it.
 */
export function isCommentedLine(line: HunkLine, range: CommentedRange | null): boolean {
  if (!range) return false
  const number = range.side === 'old' ? line.oldLine : line.newLine
  return number !== null && number >= range.start && number <= range.end
}
