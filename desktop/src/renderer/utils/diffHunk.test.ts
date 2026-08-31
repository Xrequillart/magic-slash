import { describe, it, expect } from 'vitest'
import {
  commentedRange, isCommentedLine, parseDiffHunk,
  type CommentAnchor, type HunkLine,
} from './diffHunk'

/**
 * A hunk written the way it reads in a `.diff`, so the fixtures below stay legible.
 *
 * Every test line is written with its prefix as the first character, which means the
 * indentation of the template literal cannot be stripped — hence the join rather than a
 * multi-line string, which would either carry the file's own indentation into the diff
 * or force every fixture flush against the left margin.
 */
function hunk(...lines: string[]): string {
  return lines.join('\n')
}

/** The parse, flattened to `kind old/new text` — the whole of what a row asserts. */
function rows(parsed: HunkLine[]): string[] {
  return parsed.map(l => `${l.kind} ${l.oldLine ?? '-'}/${l.newLine ?? '-'} ${l.text}`)
}

/** Which lines a comment lights up, by their content. */
function highlighted(parsed: HunkLine[], anchor: CommentAnchor): string[] {
  const range = commentedRange(anchor)
  return parsed.filter(l => isCommentedLine(l, range)).map(l => l.text)
}

/**
 * An anchor the way it really reaches the panel: the thread object itself, merged `line`
 * and all.
 *
 * `PRThread` passes `anchor={thread}`, so what `commentedRange` is handed always carries
 * more than `CommentAnchor` declares — `line` backfilled from `originalLine` by
 * `groupPullRequestThreads`, `startLine` beside it, and the nulls GitHub answered with
 * once the diff moved out from under the thread. None of that can be written into a
 * `CommentAnchor` literal, which is exactly the point of the type; going through here is
 * how these cases exercise the shape the app emits and prove the extra fields change
 * nothing about the range.
 */
function asEmitted(thread: {
  line?: number | null
  startLine?: number | null
  originalLine?: number
  originalStartLine?: number
  diffSide?: string
}): CommentAnchor {
  return thread
}

describe('parseDiffHunk', () => {
  it('numbers a hunk from its header, one counter per side', () => {
    const parsed = parseDiffHunk(hunk(
      '@@ -10,4 +10,5 @@ function watch() {',
      ' const a = 1',
      '-const b = 2',
      '+const b = 3',
      '+const c = 4',
      ' return a',
    ))

    expect(rows(parsed)).toEqual([
      'context 10/10 const a = 1',
      'remove 11/- const b = 2',
      'add -/11 const b = 3',
      'add -/12 const c = 4',
      // The old side skipped 12 and the new side reached 13: a deletion advances one
      // counter and an addition the other, which is the whole point of keeping two.
      'context 12/13 return a',
    ])
  })

  it('accepts a header with no counts, which is how a one-line hunk is written', () => {
    const parsed = parseDiffHunk(hunk('@@ -12 +12 @@', '-was', '+is'))

    expect(rows(parsed)).toEqual(['remove 12/- was', 'add -/12 is'])
  })

  it('restarts the numbering at every header it meets', () => {
    // GitHub sends one header per `diffHunk`. This is the case that would otherwise
    // fail silently, with the second half numbered as a continuation of the first.
    const parsed = parseDiffHunk(hunk(
      '@@ -1,2 +1,2 @@',
      ' one',
      '+two',
      '@@ -80,2 +81,2 @@',
      ' eighty',
      '+eighty-one',
    ))

    expect(rows(parsed)).toEqual([
      'context 1/1 one',
      'add -/2 two',
      'context 80/81 eighty',
      'add -/82 eighty-one',
    ])
  })

  it('numbers a pure addition on the new side only', () => {
    const parsed = parseDiffHunk(hunk('@@ -0,0 +1,3 @@', '+a', '+b', '+c'))

    expect(rows(parsed)).toEqual(['add -/1 a', 'add -/2 b', 'add -/3 c'])
    expect(parsed.every(l => l.oldLine === null)).toBe(true)
  })

  it('numbers a pure deletion on the old side only', () => {
    const parsed = parseDiffHunk(hunk('@@ -5,3 +4,0 @@', '-a', '-b', '-c'))

    expect(rows(parsed)).toEqual(['remove 5/- a', 'remove 6/- b', 'remove 7/- c'])
    expect(parsed.every(l => l.newLine === null)).toBe(true)
  })

  it('keeps indentation and empty lines, both of which are content', () => {
    const parsed = parseDiffHunk(hunk('@@ -1,3 +1,3 @@', ' if (x) {', '+', '+    return 1'))

    expect(rows(parsed)).toEqual(['context 1/1 if (x) {', 'add -/2 ', 'add -/3     return 1'])
  })

  it('drops the no-newline marker without spending a line number on it', () => {
    // git writes it as an annotation of the line above, not as a line of the file. Were
    // it numbered, `return b` below would come back as 3 rather than 2.
    const parsed = parseDiffHunk(hunk(
      '@@ -1,2 +1,2 @@',
      '-return a',
      '\\ No newline at end of file',
      '+return b',
      '\\ No newline at end of file',
    ))

    expect(rows(parsed)).toEqual(['remove 1/- return a', 'add -/1 return b'])
  })

  it('answers the empty array for anything it cannot number', () => {
    // The contract behind "a thread with no usable hunk renders no code block at all":
    // one length test at the call site covers every one of these.
    expect(parseDiffHunk('')).toEqual([])
    expect(parseDiffHunk('   \n  \n')).toEqual([])
    // A malformed header — no `-`/`+` starts to number from.
    expect(parseDiffHunk(hunk('@@ garbled @@', ' const a = 1'))).toEqual([])
    // Body with no header at all: the lines are real, but nothing says where they sit.
    expect(parseDiffHunk(hunk(' const a = 1', '+const b = 2'))).toEqual([])
  })

  it('ignores whatever precedes the first header rather than guessing at it', () => {
    const parsed = parseDiffHunk(hunk('+orphan', '@@ -3,1 +3,1 @@', '+real'))

    expect(rows(parsed)).toEqual(['add -/3 real'])
  })
})

describe('commentedRange', () => {
  it('reads the capture-time foot, on the right side by default', () => {
    expect(commentedRange({ originalLine: 42 })).toEqual({ side: 'new', start: 42, end: 42 })
    expect(commentedRange({ originalLine: 42, diffSide: 'RIGHT' })).toEqual({ side: 'new', start: 42, end: 42 })
  })

  it('spans `originalStartLine` to `originalLine` on a multi-line comment', () => {
    expect(commentedRange({ originalStartLine: 40, originalLine: 43 }))
      .toEqual({ side: 'new', start: 40, end: 43 })
  })

  it('reads the same pair on the left side, where only the column changes', () => {
    // `diffSide` is one axis and current-vs-original is the other: LEFT moves the range
    // to the old column, it does not move it into a different numbering.
    expect(commentedRange({ originalStartLine: 10, originalLine: 12, diffSide: 'LEFT' }))
      .toEqual({ side: 'old', start: 10, end: 12 })
  })

  it('ignores the merged `line` the card reads', () => {
    // On a thread the diff has NOT moved under, `line` is a position in the file as it
    // stands now, and the hunk is a frozen excerpt of how it stood at comment time. 42
    // and 40 index into the wrong document and must not reach the range.
    expect(commentedRange(asEmitted({
      line: 42, startLine: 40, originalLine: 12, originalStartLine: 10,
    }))).toEqual({ side: 'new', start: 10, end: 12 })
  })

  it('keeps the whole range of an outdated thread, foot and head', () => {
    // The shape the app really emits for one: GitHub nulled `line` and `startLine` when
    // the diff moved, and `groupPullRequestThreads` backfilled `line` with `originalLine`
    // so the heading keeps a number. Read through that backfill the range would collapse
    // to 117-117; read through the pair the hunk is numbered in it is still 110 to 117.
    expect(commentedRange(asEmitted({
      line: 117, startLine: null, originalLine: 117, originalStartLine: 110,
    }))).toEqual({ side: 'new', start: 110, end: 117 })
  })

  it('answers null when GitHub named no line at all', () => {
    // A thread anchored to a FILE rather than to a line — the only case left with no
    // capture-time foot. Nothing is highlighted and the panel draws the hunk plain. An
    // outdated thread is NOT this case: it keeps the original pair above.
    expect(commentedRange(asEmitted({ line: null, startLine: null }))).toBeNull()
    expect(commentedRange({})).toBeNull()
  })

  it('sorts an inverted range rather than highlighting nothing', () => {
    expect(commentedRange({ originalStartLine: 43, originalLine: 40 }))
      .toEqual({ side: 'new', start: 40, end: 43 })
  })
})

describe('isCommentedLine', () => {
  const parsed = parseDiffHunk(hunk(
    '@@ -10,4 +10,5 @@',
    ' const a = 1',
    '-const b = 2',
    '+const b = 3',
    '+const c = 4',
    ' return a',
  ))

  it('lights up the single line a comment was left on', () => {
    expect(highlighted(parsed, { originalLine: 12 })).toEqual(['const c = 4'])
  })

  it('lights up the whole range of a multi-line comment', () => {
    expect(highlighted(parsed, { originalStartLine: 11, originalLine: 13 })).toEqual([
      'const b = 3', 'const c = 4', 'return a',
    ])
  })

  it('lights up the whole range of an OUTDATED multi-line comment', () => {
    // The regression the pair guards against, end to end: taken through the merged
    // `line`, this range collapsed onto its foot and lit one row where three were
    // written about.
    expect(highlighted(parsed, asEmitted({
      line: 13, startLine: null, originalLine: 13, originalStartLine: 11,
    }))).toEqual(['const b = 3', 'const c = 4', 'return a'])
  })

  it('never matches a row that has no number on the side being read', () => {
    // 11 exists on both sides here and means two different rows. The left-side comment
    // must find the deleted one and nothing else.
    expect(highlighted(parsed, { originalLine: 11, diffSide: 'LEFT' })).toEqual(['const b = 2'])
    expect(highlighted(parsed, { originalLine: 11 })).toEqual(['const b = 3'])
  })

  it('spans a left-side range over the old numbering only', () => {
    // 10 to 12 in the pre-change file: the two context rows and the line that was
    // deleted between them. The added rows have no old number and stay dark, which is
    // what keeps a comment on deleted code off the code that replaced it.
    expect(highlighted(parsed, { originalStartLine: 10, originalLine: 12, diffSide: 'LEFT' })).toEqual([
      'const a = 1', 'const b = 2', 'return a',
    ])
  })

  it('highlights nothing when there is no range', () => {
    expect(highlighted(parsed, asEmitted({ line: 11 }))).toEqual([])
  })
})
