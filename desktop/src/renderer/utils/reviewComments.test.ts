import { describe, it, expect } from 'vitest'
import {
  collectReviewComments, formatReviewComments,
  type ReviewCommentGroup, type StoredComment,
} from './reviewComments'
import { commentFileKey } from './commentAnchors'
import type { LineRange } from './commentAnchors'

const REPO = '/repos/magic-slash'

/** The store's own key, built the store's own way — never spelled out here. */
function key(path: string, fingerprint: string): string {
  return commentFileKey({ repoPath: REPO, path, fingerprint })
}

function comment(id: string, overrides: Partial<StoredComment> = {}): StoredComment {
  return {
    id,
    anchor: { side: 'new', startLine: 12, endLine: 12 },
    quote: 'const a = 1',
    body: `body of ${id}`,
    ...overrides,
  }
}

function newRange(startLine: number, endLine: number): LineRange {
  return { side: 'new', startLine, endLine }
}

function group(path: string, comments: ReviewCommentGroup['comments']): ReviewCommentGroup {
  return { path, comments }
}

describe('collectReviewComments', () => {
  it('groups by file, in the review list order rather than the store order', () => {
    const groups = collectReviewComments(
      {
        [key('src/b.ts', 'f2')]: [comment('c-b')],
        [key('src/a.ts', 'f1')]: [comment('c-a')],
      },
      [{ path: 'src/a.ts' }, { path: 'src/b.ts' }],
      REPO,
    )

    expect(groups.map(g => g.path)).toEqual(['src/a.ts', 'src/b.ts'])
    expect(groups.map(g => g.comments.map(c => c.id))).toEqual([['c-a'], ['c-b']])
  })

  it('keeps the store order of a file own comments', () => {
    const groups = collectReviewComments(
      { [key('src/a.ts', 'f1')]: [comment('first'), comment('second'), comment('third')] },
      [{ path: 'src/a.ts' }],
      REPO,
    )

    expect(groups[0].comments.map(c => c.id)).toEqual(['first', 'second', 'third'])
  })

  it('omits files with nothing on them', () => {
    const groups = collectReviewComments(
      { [key('src/b.ts', 'f1')]: [comment('c-b')] },
      [{ path: 'src/a.ts' }, { path: 'src/b.ts' }, { path: 'src/c.ts' }],
      REPO,
    )

    expect(groups.map(g => g.path)).toEqual(['src/b.ts'])
  })

  it('answers nothing at all for a review with no comments', () => {
    expect(collectReviewComments({}, [{ path: 'src/a.ts' }], REPO)).toEqual([])
  })

  it('reads the fingerprint back off the key, for every version of one file', () => {
    // Two versions of the same path in the map at once. The store's own sweep makes this
    // short-lived — writing a comment drops the other versions of that file — but it is
    // reachable, and both belong to the SAME group so the list shows one heading.
    const groups = collectReviewComments(
      {
        [key('src/a.ts', 'old-version')]: [comment('stale')],
        [key('src/a.ts', 'live-version')]: [comment('fresh')],
      },
      [{ path: 'src/a.ts' }],
      REPO,
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].comments.map(c => [c.id, c.fingerprint])).toEqual([
      ['stale', 'old-version'],
      ['fresh', 'live-version'],
    ])
  })

  it('ignores comments on a path the review does not hold', () => {
    const groups = collectReviewComments(
      { [key('src/gone.ts', 'f1')]: [comment('orphan')] },
      [{ path: 'src/a.ts' }],
      REPO,
    )

    expect(groups).toEqual([])
  })

  it('does not confuse one path with another that starts the same way', () => {
    // `src/a.ts` and `src/a.ts.bak`: the prefix ends on the NUL byte the key format
    // separates its segments with, so the longer path cannot match the shorter one.
    const groups = collectReviewComments(
      {
        [key('src/a.ts', 'f1')]: [comment('on-a')],
        [key('src/a.ts.bak', 'f1')]: [comment('on-bak')],
      },
      [{ path: 'src/a.ts' }, { path: 'src/a.ts.bak' }],
      REPO,
    )

    expect(groups.map(g => g.comments.map(c => c.id))).toEqual([['on-a'], ['on-bak']])
  })

  it('keeps one repository comments out of another', () => {
    const groups = collectReviewComments(
      { [commentFileKey({ repoPath: '/repos/other', path: 'src/a.ts', fingerprint: 'f1' })]: [comment('elsewhere')] },
      [{ path: 'src/a.ts' }],
      REPO,
    )

    expect(groups).toEqual([])
  })
})

describe('formatReviewComments', () => {
  function collected(path: string, comments: StoredComment[]): ReviewCommentGroup[] {
    return collectReviewComments({ [key(path, 'f1')]: comments }, [{ path }], REPO)
  }

  it('writes the path, the range, the quote and the body', () => {
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: newRange(12, 12), quote: 'const a = 1', body: 'Rename this.' }),
    ]))

    expect(text).toBe([
      'src/a.ts',
      '  L12',
      '    > const a = 1',
      '    Rename this.',
    ].join('\n'))
  })

  it('names a multi-line range with both of its ends', () => {
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: newRange(12, 18), quote: '', body: 'Extract a function.' }),
    ]))

    expect(text).toContain('  L12-18')
  })

  it('marks a range on the side the file no longer has', () => {
    // `old:` is load-bearing: line 40 of the old file and line 40 of the new one are two
    // different lines, and a range written without its side could be resolved to either.
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: { side: 'old', startLine: 40, endLine: 44 }, quote: '', body: 'Why was this dropped?' }),
    ]))

    expect(text).toContain('  old:L40-44')
  })

  it('says so when a comment names no lines at all', () => {
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: null, quote: '', body: 'This whole file needs a test.' }),
    ]))

    expect(text).toBe([
      'src/a.ts',
      '  (whole file)',
      '    This whole file needs a test.',
    ].join('\n'))
  })

  it('emits the quote ALONGSIDE the range, not instead of it', () => {
    // The invariant `diffFingerprint` argues for: a comment re-rendered at the same
    // numbers of a diff that has moved points at unrelated code, so the agent gets the
    // lines AND the text they said, and can tell whether the two still agree.
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: newRange(7, 7), quote: 'return null', body: 'Throw instead.' }),
    ]))

    expect(text).toContain('  L7')
    expect(text).toContain('    > return null')
  })

  it('prefixes every line of a multi-line quote', () => {
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: newRange(3, 4), quote: 'if (a) {\n  return b\n}', body: 'Invert this.' }),
    ]))

    expect(text).toBe([
      'src/a.ts',
      '  L3-4',
      '    > if (a) {',
      '    >   return b',
      '    > }',
      '    Invert this.',
    ].join('\n'))
  })

  it('writes nothing for an empty quote, rather than a bare marker', () => {
    // A gutter pick stores no selected text, and a lone `>` would claim the lines were blank.
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: newRange(9, 9), quote: '   \n  ', body: 'Fix.' }),
    ]))

    expect(text).not.toContain('>')
  })

  it('keeps a multi-line body readable, blank lines included', () => {
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: newRange(1, 1), quote: '', body: 'First.\n\nSecond.' }),
    ]))

    expect(text).toBe([
      'src/a.ts',
      '  L1',
      '    First.',
      '',
      '    Second.',
    ].join('\n'))
  })

  it('separates files with a blank line and ends without a newline', () => {
    // The trailing newline is the byte that would SUBMIT the bracketed paste this text
    // is sent into, so its absence is a requirement rather than tidiness.
    const text = formatReviewComments([
      group('src/a.ts', [{ id: 'c1', fingerprint: 'f1', anchor: newRange(1, 1), quote: '', body: 'One.' }]),
      group('src/b.ts', [{ id: 'c2', fingerprint: 'f1', anchor: newRange(2, 2), quote: '', body: 'Two.' }]),
    ])

    expect(text).toBe([
      'src/a.ts',
      '  L1',
      '    One.',
      '',
      'src/b.ts',
      '  L2',
      '    Two.',
    ].join('\n'))
    expect(text.endsWith('\n')).toBe(false)
    expect(text.endsWith('\r')).toBe(false)
  })

  it('writes every comment of a file under one heading', () => {
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: newRange(1, 1), quote: '', body: 'One.' }),
      comment('c2', { anchor: newRange(9, 9), quote: '', body: 'Two.' }),
    ]))

    expect(text.match(/src\/a\.ts/g)).toHaveLength(1)
    expect(text).toBe([
      'src/a.ts',
      '  L1',
      '    One.',
      '  L9',
      '    Two.',
    ].join('\n'))
  })

  it('answers the empty string for a review with nothing on it', () => {
    expect(formatReviewComments([])).toBe('')
  })
})
