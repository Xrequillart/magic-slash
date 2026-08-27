/**
 * Where a comment is attached, and which rendered row carries its marker.
 *
 * Deliberately free of DOM types, exactly like `diffMarkers` next door: the caller reads
 * `data-line` / `data-diff` / `data-anchor` / `data-elided` off the rows shiki produced
 * and hands the plain strings over, and this module decides what they mean. That split
 * is what makes any of it testable at all — the renderer suite runs on node with no
 * jsdom, so anything holding an Element could not be covered here.
 *
 * The one thing worth understanding before reading further: a diff row's number is NOT
 * a position in the document. `annotateShikiHtml` injects a row per deleted line, and
 * stamps it with the line's number in the OLD file — the line is gone from the new one,
 * so it has no number there. So `data-line="2"` on a removed row and `data-line="2"` on
 * an ordinary row are two different lines in two different files, and a comment that
 * remembered only the number would come back attached to whichever of the two rendered
 * first. That is why every range below carries a `side`.
 */

import type { ChangedLines } from '../../types'
import { reviewFileKey } from './reviewLayout'

/** Which file's numbering a line number belongs to. */
export type LineSide = 'new' | 'old'

/**
 * The four attributes a rendered row can carry, as the caller read them off the element.
 *
 * `string | null | undefined` because that is what `getAttribute` and `dataset` hand
 * back between them, and normalising at every call site would be four coercions per row
 * of every file in a review.
 */
export interface RowAttributes {
  /** `data-line` — the number the gutter shows. */
  line?: string | null
  /** `data-diff` — `'add'`, `'remove'`, or absent on an unchanged row. */
  diff?: string | null
  /** `data-anchor` — removed rows only: the new-file line the deletion sits before. */
  anchor?: string | null
  /** `data-elided` — a separator standing in for a region left out. Never a line. */
  elided?: string | null
}

/** A rendered row, once its attributes have been read as the line it is. */
export interface RowIdentity {
  side: LineSide
  /** The row's own number, in the file named by `side`. What the gutter shows. */
  line: number
  /**
   * Where this row sits in the NEW file: its own number on an ordinary row, `data-anchor`
   * on a removed one — the new-file line the deletion was injected before.
   *
   * Only ever used to put two rows from DIFFERENT sides on one axis, which is what a
   * selection dragged across a modification needs (the diff renders that as a removed
   * row immediately followed by an added one, so it is the ordinary case rather than an
   * exotic one). A wholly deleted file has no new-file position for any of its rows and
   * carries no `data-anchor` at all; there this falls back to `line`, which is harmless
   * because every row of such a file is on the same side and the projection never runs.
   */
  newLine: number
}

/** The lines a comment is attached to, in one file's numbering. */
export interface LineRange {
  side: LineSide
  startLine: number
  endLine: number
}

/**
 * A gutter pick in progress: where it began, and what it currently covers.
 *
 * The anchor is kept ALONGSIDE the range rather than derived from it, because a
 * shift-click has to extend from the row the reader first clicked — and once the range
 * has been widened, `startLine` is no longer that row whenever the reader picked
 * downwards and then shift-clicked upwards.
 */
export interface GutterPick {
  anchor: RowIdentity
  range: LineRange
}

/**
 * How much of a selection is kept as the comment's quote.
 *
 * A quote is context for the reader coming back to the comment, not a copy of the file:
 * a reader who drags across a whole generated document would otherwise put a megabyte of
 * it in the store, once per comment, for a card that shows three lines of it.
 */
export const MAX_QUOTE_CHARS = 2000

function positiveInt(value?: string | null): number | null {
  if (value == null || value === '') return null
  // `Number` rather than `parseInt`, so a stray `12px` is rejected instead of read as 12.
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * What line a rendered row is, or `null` when it is not a line of the file at all.
 *
 * `null` for the changes-only view's separators — they carry `data-elided` and no
 * `data-line`, and a comment attached to "the region that was left out" would have
 * nothing to come back to once the region is shown again. `null` too for anything
 * without a usable number, which is the one shape a future rendering could introduce
 * without this module hearing about it.
 */
export function lineIdentityFromRow(attrs: RowAttributes): RowIdentity | null {
  if (attrs.elided != null && attrs.elided !== '') return null
  const line = positiveInt(attrs.line)
  if (line === null) return null
  // The side comes off `data-diff` rather than a `data-side` of its own: `'remove'` is
  // already the only value that means "this row's number belongs to the old file", so a
  // second attribute saying the same thing is a second thing to keep in step.
  if (attrs.diff === 'remove') return { side: 'old', line, newLine: positiveInt(attrs.anchor) ?? line }
  return { side: 'new', line, newLine: line }
}

/**
 * The range two picked rows describe, whichever order they were picked in.
 *
 * Two rows on the same side keep it. Two rows on DIFFERENT sides are projected onto the
 * new file through `newLine`, because that is the only axis both of them have a position
 * on — and because the reader who dragged from a deleted line into the line that
 * replaced it is pointing at a place in the file as it stands now, which is what the
 * agent reading the comment back will be looking at.
 */
export function normalizeRange(a: RowIdentity, b: RowIdentity): LineRange {
  if (a.side === b.side) {
    return { side: a.side, startLine: Math.min(a.line, b.line), endLine: Math.max(a.line, b.line) }
  }
  return { side: 'new', startLine: Math.min(a.newLine, b.newLine), endLine: Math.max(a.newLine, b.newLine) }
}

/**
 * Pick a row from the gutter, or extend the pick already in progress — the shift-click.
 *
 * `null` starts a fresh pick, so one function covers both halves of the gesture and the
 * caller never has to decide which of two it is in. The anchor is carried through
 * untouched: extending is always measured from where the reader started, never from
 * whichever end of the range happens to be nearer.
 */
export function extendRange(pick: GutterPick | null, row: RowIdentity): GutterPick {
  if (!pick) return { anchor: row, range: normalizeRange(row, row) }
  return { anchor: pick.anchor, range: normalizeRange(pick.anchor, row) }
}

/**
 * Does `range` cover `line` in the file named by `side`?
 *
 * Two callers: the sweep in CodeView that stamps the rows a pick currently covers, and
 * `rowsForComment` below. It is still a function rather than three comparisons written out
 * there, because of the `side` test — forgetting that one is the mistake that puts a pick
 * on the wrong line rather than on no line at all, since `data-line="2"` on a removed row
 * and `data-line="2"` on an ordinary row are two different lines of two different files.
 *
 * `visibleRowForComment` below writes the same three comparisons out AGAIN, deliberately,
 * and that is not a duplication to tidy away: it has to tell "inside the range" from
 * "above it" and "below it", so a boolean answering only the first would leave it both
 * bounds to compare anyway — and it has already dropped every row of the other side at the
 * top of its loop, which this would re-test once per row of the file.
 */
export function rangeCovers(range: LineRange, side: LineSide, line: number): boolean {
  return range.side === side && line >= range.startLine && line <= range.endLine
}

/**
 * Which of the rendered rows carries a comment's marker.
 *
 * Answers an INDEX into the array it was given, nulls included, so the caller can use it
 * straight against its parallel list of elements. An index into the rows that turned out
 * to be lines would be off by every separator above it.
 *
 * The row the comment was left on, whenever it is on screen. When it is NOT — the reader
 * expanded a file, commented on a line in the middle of it, and folded it back to the
 * changed regions — the marker goes to the nearest rendered row of the same side ABOVE
 * the range, and to the nearest below when there is nothing above. Losing the marker
 * would lose the comment: the marker is the only way back into it, so a marker a line or
 * two off is strictly better than none.
 *
 * `null` only when the side itself is absent from the rendering — a comment on a deleted
 * line in a document that is currently showing none. Its marker comes back with the rows.
 */
export function visibleRowForComment(range: LineRange, rows: (RowIdentity | null)[]): number | null {
  let above: number | null = null
  let below: number | null = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.side !== range.side) continue
    if (row.line >= range.startLine && row.line <= range.endLine) return i
    // Rows are walked in document order, so the LAST one above the range wins and the
    // FIRST one below it does — which is why `below` is only ever written once.
    if (row.line < range.startLine) above = i
    else if (below === null) below = i
  }

  return above ?? below
}

/**
 * Every rendered row a comment's marker belongs on.
 *
 * `visibleRowForComment` answers the ONE row a card anchors to. This answers the rest: a
 * comment left on lines 10 to 14 is a comment on five lines, and the criterion is that
 * commented LINES carry a marker — so each of those lines that is still rendered gets one,
 * not just the first.
 *
 * Falls back to that single row when the range covers nothing rendered, which is what
 * keeps the folded-away case — see `visibleRowForComment` — answering exactly what it did
 * before: a marker a line or two off is strictly better than none.
 */
export function rowsForComment(range: LineRange, rows: (RowIdentity | null)[]): number[] {
  const covered: number[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (row && rangeCovers(range, row.side, row.line)) covered.push(i)
  }
  if (covered.length > 0) return covered
  const fallback = visibleRowForComment(range, rows)
  return fallback === null ? [] : [fallback]
}

/**
 * Just enough of a stored comment to place its marker.
 *
 * A structural type rather than an import of the store's `FileComment`: this module is
 * imported by the node test suite, and the two fields below are the only ones the
 * arithmetic reads. `FileComment` satisfies it as it stands.
 */
export interface AnchoredComment {
  id: string
  anchor: LineRange | null
}

/**
 * Which comments each rendered row carries — the whole marker layout, in one pass.
 *
 * Here rather than in the caller's DOM loop because it is arithmetic, and because a row
 * carrying SEVERAL comments is the case that decides whether the second one on a line is
 * reachable at all: the caller stamps every id it is given, and its marker walks them.
 *
 * Ids come out in the store's own order, which is the order they were written. So the
 * first click on a marker opens the oldest comment on that line — the only order that
 * does not depend on how the list happens to be sorted — and each further click moves
 * forward from it.
 *
 * A `Map` rather than an array parallel to `rows`: on all but the handful of rows anyone
 * has commented there is nothing to say, and a review holds forty documents of hundreds
 * of rows each.
 */
export function markersByRow(
  comments: AnchoredComment[],
  rows: (RowIdentity | null)[],
): Map<number, string[]> {
  const byRow = new Map<number, string[]>()
  for (const comment of comments) {
    if (!comment.anchor) continue
    for (const index of rowsForComment(comment.anchor, rows)) {
      const ids = byRow.get(index)
      if (ids) ids.push(comment.id)
      else byRow.set(index, [comment.id])
    }
  }
  return byRow
}

/** Which ends of a comment's block a row is. Both, on a block one row tall. */
export interface RowEdges {
  /** A comment BEGINS on this row: it draws the block's top line, and the block's pill. */
  top: boolean
  /** A comment ENDS on this row: it draws the block's bottom line. */
  bottom: boolean
}

/**
 * Where each comment's block starts and stops, per rendered row.
 *
 * Two things the caller draws, one piece of arithmetic, because they are the same question
 * asked once. The block is closed off top and bottom — a line above its first row and
 * below its last — so two comments on consecutive lines read as two blocks instead of one
 * unbroken wash; and the pill is drawn ONCE per comment, on the row it begins on, which is
 * exactly the row whose `top` is set. Asking twice would be two walks of one map that could
 * come to differ.
 *
 * So this answers a different question from `markersByRow`: not "which comments is this row
 * part of" but "which comments begin or end here" — the only reading under which the pills
 * over a file add up to the comments on it rather than to the lines they cover.
 *
 * Derived from the marker map rather than from the ranges a second time: whichever rows a
 * comment turned out to mark — every line of its block, or the single nearest row left once
 * the block has been folded away — the edges close off the first and last of exactly those.
 * The wash, the edges and the pill therefore cannot disagree about which lines a comment
 * covers. It also costs a pass over the COMMENTED rows rather than over every row of the
 * file again.
 *
 * The keys are sorted before they are walked, and that is load-bearing: a `Map` iterates in
 * insertion order, and `markersByRow` inserts comment by comment — so its first key is the
 * first row of whichever comment was stored earliest, not the first row of the document.
 *
 * A row carrying BOTH edges is ordinary rather than a corner case — a comment on a single
 * line, a comment inside another one's block, and the row where one block ends and the next
 * begins are all of them — which is why the answer is a pair of flags per row and not two
 * lists that would have to be read together anyway.
 */
export function edgesByRow(markers: Map<number, string[]>): Map<number, RowEdges> {
  const rows = [...markers.keys()].sort((a, b) => a - b)

  // One entry per COMMENT, keyed by id: the first row it was seen on and the last. Walked
  // in row order, so `first` is written once and `last` is overwritten until the block ends.
  const first = new Map<string, number>()
  const last = new Map<string, number>()
  for (const index of rows) {
    for (const id of markers.get(index) ?? []) {
      if (!first.has(id)) first.set(id, index)
      last.set(id, index)
    }
  }

  // Rebuilt in DOCUMENT order rather than in the order the ends were found. Nothing the
  // caller does depends on it — it stamps attributes — but a map that reads top to bottom
  // is the one anybody comparing it against the file on screen can follow.
  const tops = new Set(first.values())
  const bottoms = new Set(last.values())
  const edges = new Map<number, RowEdges>()
  for (const index of rows) {
    const top = tops.has(index)
    const bottom = bottoms.has(index)
    if (top || bottom) edges.set(index, { top, bottom })
  }
  return edges
}

/**
 * Just enough of a stored comment to say WHERE it points. `FileComment` satisfies it.
 *
 * A structural type for the same reason `AnchoredComment` above is one — this module is
 * imported by the node suite — and a separate one from it because the two ask different
 * questions: that one places a marker on a row and reads the anchor alone, this one has to
 * see the quote as well.
 */
export interface CommentAnchoring {
  anchor: LineRange | null
  quote: string
}

/** What a comment is attached to: lines of the file, a quoted passage, or the file itself. */
export type CommentAnchorKind = 'lines' | 'quote' | 'file'

/**
 * Which of the three, decided in ONE place.
 *
 * That is the whole point of it rather than an `!anchor` test at each of the four call
 * sites. `anchor: null` used to mean one thing — a comment on the file as a whole — and now
 * means two: a comment on a quoted passage of the RENDERED markdown carries no line range
 * either, because the prose has no mapping back to the file's lines and inventing one would
 * be a claim the reader never made. What separates the two is whether anything was quoted,
 * and a discriminant spelled in four places is a discriminant that comes to disagree with
 * itself — the card would say "Whole file" over a passage the list called a quotation.
 *
 * TRIMMED, so a drag that caught nothing but whitespace is not an anchor: `clampQuote`
 * stores what was selected verbatim, and a quote with no characters in it is nothing for
 * `locateQuote` to find and nothing for a reader to recognise. It is also what keeps every
 * comment written before this existed reading as `'file'`, since those store `quote: ''`.
 */
export function commentAnchorKind({ anchor, quote }: CommentAnchoring): CommentAnchorKind {
  if (anchor) return 'lines'
  return quote.trim() === '' ? 'file' : 'quote'
}

/**
 * The catalogue key and values that name what a comment is attached to — all three cases.
 *
 * A key rather than a string, because this module has no language: it is imported by the
 * node test suite, and the component that draws the label is the one holding `t`.
 *
 * A `switch` over `commentAnchorKind` rather than an `if (anchor)` of its own, so the
 * discriminant is read here exactly as it is read everywhere else and a fourth kind added to
 * the enum cannot compile until this function has decided what to call it.
 *
 * Two keys for a range rather than one with a plural rule — "Lines 12–12" for a single line
 * is the kind of thing that survives review in English and reads as a bug in French. And
 * `vars` is absent on the two anchorless cases rather than carried as zeroes: their messages
 * take no placeholder, and a `{ start: 0, end: 0 }` nobody substitutes is a value a later
 * reader would try to use.
 */
export interface CommentLabel {
  key: 'filePreview.commentLine' | 'filePreview.commentLines'
    | 'filePreview.commentQuoted' | 'filePreview.commentOnFile'
  vars?: { start: number; end: number }
}

export function commentLabel(comment: CommentAnchoring): CommentLabel {
  switch (commentAnchorKind(comment)) {
    case 'lines': {
      // Non-null by the discriminant: `'lines'` is what having an anchor MEANS.
      const range = comment.anchor as LineRange
      return {
        key: range.startLine === range.endLine
          ? 'filePreview.commentLine'
          : 'filePreview.commentLines',
        vars: { start: range.startLine, end: range.endLine },
      }
    }
    case 'quote':
      return { key: 'filePreview.commentQuoted' }
    case 'file':
      return { key: 'filePreview.commentOnFile' }
  }
}

/**
 * What `clampQuote` appends when it cuts a selection short. Private: the pair below is the
 * interface, so the glyph can change without anyone having to find its second reader.
 */
const QUOTE_ELLIPSIS = '…'

/**
 * The selected text, trimmed to something worth storing.
 *
 * An ellipsis rather than a hard cut, so the card shows that the quote is an extract
 * rather than the whole of what was selected.
 */
export function clampQuote(text: string): string {
  if (text.length <= MAX_QUOTE_CHARS) return text
  return text.slice(0, MAX_QUOTE_CHARS) + QUOTE_ELLIPSIS
}

/**
 * The inverse, and it lives HERE rather than where it is called, beside the clamp it undoes.
 *
 * `quoteAnchors` has to take the ellipsis back off before it searches for a quote: a clamped
 * quote can never match the document verbatim, so a search that did not know about it would
 * report the anchor lost for every long selection. Exporting the operation rather than the
 * character is what keeps that reader working when the marker changes — clamp on a word
 * boundary, use a different glyph — instead of failing silently one file away.
 *
 * What is left is a PREFIX of what was selected, which is what a search then finds.
 *
 * The LENGTH is what says whether the clamp ran, and a trailing ellipsis on its own is not:
 * prose ends in one often enough ("the story ends…"), and stripping an authored character
 * would relocate one character short of what the card and the agent were shown. `clampQuote`
 * only appends after cutting to exactly `MAX_QUOTE_CHARS`, so its output is always exactly
 * that plus the marker — and any shorter quote ending the same way was written that way.
 * There is no ambiguous case: a longer selection would itself have been clamped to this
 * length.
 */
export function unclampQuote(quote: string): string {
  const clamped = quote.length === MAX_QUOTE_CHARS + QUOTE_ELLIPSIS.length
  return clamped && quote.endsWith(QUOTE_ELLIPSIS) ? quote.slice(0, -QUOTE_ELLIPSIS.length) : quote
}

/**
 * Which VERSION of a file a comment was left on.
 *
 * A comment is line numbers and a quote, and both are relative to ONE state of one file.
 * The agent this app drives edits files continuously, so a file's diff moves several
 * times within a session — and comments re-rendered at the same numeric lines of a diff
 * that has since moved do not point at nothing, they point at UNRELATED code, which the
 * next story then hands to the agent as an instruction. So the version is part of the key
 * the store files them under: once a file changes, its old comments stop resolving.
 * Losing a comment whose file moved under it is the accepted cost; a comment pointing at
 * the wrong lines is not.
 *
 * Two inputs, one per SIDE a comment can be on, because neither of them covers the other.
 *
 * The CONTENT is what a `side: 'new'` comment is relative to, and the first reason for it is
 * that both paths hold it: the fingerprint is derived ONCE from the read result and handed
 * down as a string, so the version comments are read under and the version they are written
 * under are literally the same value. The row identities that would give a changed-line set
 * only exist once the HTML is in the DOM — after the read — and a fingerprint the two paths
 * could spell differently is worse than none at all: every comment would become unreachable
 * the instant it was saved. The second reason is that the content catches what line
 * positions alone cannot, a line rewritten IN PLACE: the numbers still land, and the stored
 * quote now says something the file does not.
 *
 * The CHANGED LINES are for the OLD side, which the content cannot protect. A `side: 'new'`
 * comment names line N of the working file, so while the bytes stand still it keeps pointing
 * at the same code. A `side: 'old'` comment names line N of the file at HEAD — and HEAD
 * moves on a commit, an amend, a rebase or a checkout without a byte of the working file
 * changing. "Old line 40" then means a line of a different version of the file, and if the
 * new diff happens to carry a removed row stamped `data-line="40"` the comment attaches to
 * unrelated deleted code: `rangeCovers` compares a side and a number, and there is nothing
 * else in an anchor that could stop it. `changedLines` is the one thing in the read that
 * moves when the diff moves, so folding it in is what makes the key move with HEAD.
 *
 * Hashed by VALUE, never by object identity, because a fresh `ChangedLines` arrives on every
 * read: the code appearance is part of the preview's cache key, so a theme change re-reads
 * the file over IPC and gets the same numbers in a new object. That read has to answer the
 * same string, or switching theme would take every marker in the review with it.
 *
 * ABSENT is its own answer rather than an empty diff. `changedLines` is undefined wherever
 * there is no diff to describe — an added, untracked or deleted file, a read whose `git
 * diff` threw, a preview outside a review — while a file whose diff was CLEARED (everything
 * committed, so `git diff HEAD` reports nothing) is a different state of the world that has
 * an empty diff to report. Collapsing the two would let a file's old-side comments survive
 * exactly the commit that made them stale.
 *
 * So it moves for two reasons — the bytes changing, or the diff moving under them — and
 * everything a reading session does keeps the comments: folding a card shut, scrolling forty
 * files away, switching file, closing the drawer and opening it again, and a theme change or
 * a re-read, which read the same file back at the same HEAD and so answer the same string.
 */
export function diffFingerprint(content: string, changedLines?: ChangedLines): string {
  // The diff is a SECOND segment rather than more bytes fed to the content's hash, so that
  // "absent" can be spelled as nothing at all: `fnv1a` always emits at least one base-36
  // digit, so an empty segment is a value no present diff can produce — which is what keeps
  // absent from colliding with a diff whose two lists happen to be empty.
  //
  // The two lists are joined on a newline, which no decimal number contains, so an addition
  // moving cannot be spelled the same way as a deletion moving.
  const diff = changedLines
    ? fnv1a(`${changedLines.added.join(',')}\n${changedLines.removedBefore.join(',')}`)
    : ''
  // The content's length rides along: it costs nothing, and it takes the two files that would
  // have to collide from "the same 32 bits" to "the same 32 bits at the same length".
  return `${content.length.toString(36)}-${fnv1a(content)}-${diff}`
}

/**
 * The fingerprint a LIVE document files its comments under — one string, for every version
 * of it. Placed against `diffFingerprint` above because the two only make sense read
 * together: this is the case where everything that function buys is worth nothing.
 *
 * `diffFingerprint` exists to stop a comment outliving the diff it was about, and that is
 * the right answer for a REVIEW: the read is frozen, the reader is commenting on one state
 * of one file, and a comment whose lines moved under it points at unrelated code. A spec is
 * the other kind of document. The agent rewrites it every few seconds while the reader is
 * still reading it, so a content-derived key mints a new name on every save — the layer's
 * selector stops matching the entry that was just written, the marker disappears, and
 * `addFileComment`'s sweep then deletes it outright, that sweep being written precisely to
 * drop every OTHER version of a file when one of them is commented. The purpose has no
 * meaning for a live document and it actively destroys the comment it was written to protect.
 *
 * Nothing is given up by pinning it, because nothing in a comment on a spec is stated in
 * coordinates. The anchor is a QUOTE, `locateQuote` re-searches that passage in the current
 * text on every render, and a passage the agent deleted reports a lost anchor rather than
 * re-attaching to whatever now sits where it used to be. The version string was never what
 * made a quote anchor sound — it was what made a LINE anchor sound, and a spec has none.
 *
 * The two key spaces cannot collide, by construction and not by convention: every
 * `diffFingerprint` is three `-`-joined segments, the first a base-36 length and the second
 * at least one base-36 digit out of `fnv1a`, so no read of any file in any repository can
 * ever answer `spec`. An entry carrying this sentinel is reachable only from a caller that
 * asked for it by name — which is what lets a live document share one map with every review
 * without either one being able to see the other's comments.
 */
export const SPEC_FINGERPRINT = 'spec'

/**
 * FNV-1a, 32 bits, in base 36.
 *
 * Not cryptographic and not meant to be: the question is "are these the same values", asked
 * of a string the caller already holds, and `crypto`'s digest is asynchronous — a key that
 * arrives a tick after the render that needed it is a render with no comments on it.
 */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    // `Math.imul`, because `hash * 16777619` leaves the 32-bit range and starts losing low
    // bits to the double's rounding — the very bits the next character mixes in.
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/** A file as the comment store files it: which file, and which version of it. */
export interface CommentTarget {
  repoPath: string
  path: string
  /**
   * Which version of the file these comments belong to — and there are two answers, because
   * there are two kinds of document being commented on.
   *
   * A `diffFingerprint` for a FROZEN read — a review card — where it buys the guarantee that
   * a comment stops resolving the moment the content or the diff moves under it, rather than
   * re-attaching to whatever now sits at those line numbers. Or `SPEC_FINGERPRINT` for a LIVE
   * one — the spec panel — where it buys the opposite guarantee: the key holds still while
   * the agent rewrites the file, which is what gives the quote anchor the chance to re-find
   * its passage that a key moving on every save would have denied it.
   *
   * Both are opaque here. This module only ever joins the string into a key and slices it
   * back out; which of the two it is, is the caller's decision and is documented at the two
   * places that take it — `FileContentRenderer`'s `commentable` prop, and `SPEC_FINGERPRINT`.
   */
  fingerprint: string
}

/**
 * How a file's comments are named in the store.
 *
 * `reviewFileKey` plus the fingerprint, and a function of its own rather than a third
 * argument on that one: `reviewFileKey` also names the COLLAPSED-CARD entry, where the
 * version must not appear. Folding a card is a fact about the file, and a card that
 * un-folded itself every time the agent saved would be a worse bug than the one this fixes.
 */
export function commentFileKey(target: CommentTarget): string {
  return `${reviewFileKey(target.repoPath, target.path)}\u0000${target.fingerprint}`
}

/**
 * Every version of one file, as a key prefix — what the store prunes on a write.
 *
 * Sound because NUL is the one byte a path cannot contain and neither `diffFingerprint` nor
 * `SPEC_FINGERPRINT` emits one, so this matches every entry of this file and nothing else in
 * the map.
 */
export function commentFileKeyPrefix(repoPath: string, path: string): string {
  return `${reviewFileKey(repoPath, path)}\u0000`
}
