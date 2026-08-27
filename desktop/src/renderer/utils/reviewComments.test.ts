import { describe, it, expect } from 'vitest'
import {
  collectReviewComments, formatReviewComments,
  type ReviewCommentGroup, type StoredComment,
} from './reviewComments'
import { commentFileKey, SPEC_FINGERPRINT } from './commentAnchors'
import { reviewFileKey } from './reviewLayout'
import { splitSpecPath } from '../components/agent-info-sidebar/utils'
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

/** The live map's own key, built the same way the panel builds it. */
function liveKey(path: string): string {
  return reviewFileKey(REPO, path)
}

describe('collectReviewComments — live fingerprints', () => {
  const twoVersions = {
    [key('src/a.ts', 'old')]: [comment('c-stale')],
    [key('src/a.ts', 'live')]: [comment('c-live')],
  }
  const files = [{ path: 'src/a.ts' }]

  it('keeps only the live version when the path reports one', () => {
    const groups = collectReviewComments(twoVersions, files, REPO, { [liveKey('src/a.ts')]: 'live' })
    expect(groups).toHaveLength(1)
    expect(groups[0].comments.map(c => c.id)).toEqual(['c-live'])
    expect(groups[0].comments[0].fingerprint).toBe('live')
  })

  it('keeps every version when the path reports nothing — absent means unknown', () => {
    // The card has not read yet, or is collapsed. Filtering here would empty the list of
    // everything the reader has not scrolled past, which is worse than the bug it fixes.
    const groups = collectReviewComments(twoVersions, files, REPO, {})
    expect(groups[0].comments.map(c => c.id).sort()).toEqual(['c-live', 'c-stale'])
  })

  it('defaults to no filtering when the argument is omitted', () => {
    expect(collectReviewComments(twoVersions, files, REPO)[0].comments).toHaveLength(2)
  })

  it('filters per path, so one file reporting does not filter another', () => {
    const groups = collectReviewComments(
      {
        ...twoVersions,
        [key('src/b.ts', 'b-old')]: [comment('c-b-old')],
        [key('src/b.ts', 'b-new')]: [comment('c-b-new')],
      },
      [{ path: 'src/a.ts' }, { path: 'src/b.ts' }],
      REPO,
      { [liveKey('src/a.ts')]: 'live' },
    )
    expect(groups[0].comments.map(c => c.id)).toEqual(['c-live'])
    expect(groups[1].comments.map(c => c.id).sort()).toEqual(['c-b-new', 'c-b-old'])
  })

  it('omits a file whose only comments are all superseded', () => {
    // No empty group, and no heading over nothing: the file drops out entirely.
    const groups = collectReviewComments(
      { [key('src/a.ts', 'old')]: [comment('c-stale')] },
      files,
      REPO,
      { [liveKey('src/a.ts')]: 'live' },
    )
    expect(groups).toEqual([])
  })

  it('is keyed by repository, so another repo cannot filter this one', () => {
    // Why the map needs no reset between reviews, and why it must not have one: a same-named
    // file in another repository has a different key, so its fingerprint cannot reach here.
    const groups = collectReviewComments(twoVersions, files, REPO, {
      [reviewFileKey('/repos/other', 'src/a.ts')]: 'live',
    })
    expect(groups[0].comments.map(c => c.id).sort()).toEqual(['c-live', 'c-stale'])
  })

  it('ignores a reported fingerprint for a path the review does not hold', () => {
    const groups = collectReviewComments(twoVersions, files, REPO, {
      [liveKey('src/a.ts')]: 'live',
      [liveKey('src/gone.ts')]: 'whatever',
    })
    expect(groups.map(g => g.path)).toEqual(['src/a.ts'])
  })

  it('drops the superseded comment from the compiled text too', () => {
    // The reason this filter exists: a comment on a moved diff describes unrelated code, and
    // this text is an instruction to the agent.
    const groups = collectReviewComments(twoVersions, files, REPO, { [liveKey('src/a.ts')]: 'live' })
    const text = formatReviewComments(groups)
    expect(text).toContain('body of c-live')
    expect(text).not.toContain('body of c-stale')
  })
})

describe('collectReviewComments — the live spec’s own comments', () => {
  /**
   * A comment left on the spec in the agent sidebar, keyed the way that panel keys it:
   * `splitSpecPath`'s answer — the spec file's parent DIRECTORY — as the repository path, the
   * bare file name as the path, and `SPEC_FINGERPRINT` as the version.
   *
   * Calls the real `splitSpecPath` rather than re-deriving its split by hand: that function is
   * pure string logic with nothing that would make it unsafe in this node-environment suite,
   * and the shape of the split IS what the invariant rests on — a second, narrower copy of it
   * here could quietly drift from what the spec panel actually keys with.
   */
  function specKey(specPath: string): string {
    const split = splitSpecPath(specPath)
    if (!split) throw new Error(`not an absolute spec path: ${specPath}`)
    return commentFileKey({ repoPath: split.repoPath, path: split.filePath, fingerprint: SPEC_FINGERPRINT })
  }

  it('never surfaces in a review, not even for the very file the review holds', () => {
    // The spec lives inside the repository and the review has it as a changed file, which is
    // the worst case and the only one worth asserting. The two keys put their NUL in different
    // places, so the prefix does not match and the entry is never looked at.
    const groups = collectReviewComments(
      { [specKey(`${REPO}/docs/spec.md`)]: [comment('c-spec')] },
      [{ path: 'docs/spec.md' }],
      REPO,
    )

    expect(groups).toEqual([])
  })

  it('is not stopped by the fingerprint filter, which is why the prefix has to be the rampart', () => {
    // The filter that does NOT hold it back, written down so nobody mistakes it for the one
    // that does: with no live fingerprint reported — an unread or collapsed card — every
    // fingerprint under the prefix passes, `SPEC_FINGERPRINT` included. The review's own
    // comment comes through and the spec's does not, and the difference is the prefix alone.
    const groups = collectReviewComments(
      {
        [specKey(`${REPO}/docs/spec.md`)]: [comment('c-spec')],
        [key('docs/spec.md', 'f1')]: [comment('c-review')],
      },
      [{ path: 'docs/spec.md' }],
      REPO,
      {},
    )

    expect(groups[0].comments.map(c => c.id)).toEqual(['c-review'])
  })

  it('cannot read a review’s comments back either, the seam cutting both ways', () => {
    // Symmetric, and it has to be: the spec panel reads the store through `commentFileKey`
    // directly, so if the two spellings agreed it would be showing a review's notes on the
    // document it is drawing.
    expect(specKey(`${REPO}/docs/spec.md`)).not.toBe(key('docs/spec.md', SPEC_FINGERPRINT))
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

  it('names a quoted passage as the anchor, and not as the absence of one', () => {
    // A comment left on the RENDERED markdown has no line number to emit — the prose has no
    // mapping back to the file's lines — so the quote below IS what the comment points at.
    // The agent has to be told that, or it reads the `>` lines as context beside an anchor
    // that was never written.
    const text = formatReviewComments(collected('docs/spec.md', [
      comment('c1', { anchor: null, quote: 'the agent may refuse', body: 'Say why it would.' }),
    ]))

    expect(text).toBe([
      'docs/spec.md',
      '  (quoted passage)',
      '    > the agent may refuse',
      '    Say why it would.',
    ].join('\n'))
  })

  it('still says `(whole file)` for an anchorless comment that quoted nothing', () => {
    // The two now share `anchor: null`, and only the quote tells them apart. A whitespace
    // quote is no quote: it is nothing a reader could recognise and nothing to relocate.
    const text = formatReviewComments(collected('src/a.ts', [
      comment('c1', { anchor: null, quote: '  \n ', body: 'Needs a test.' }),
    ]))

    expect(text).toContain('  (whole file)')
    expect(text).not.toContain('quoted passage')
  })

  it('lists a quoted comment beside a line-anchored one, under the same path', () => {
    // AC4 from the other side: the two kinds are one list, so the file heading is written
    // once and each comment says for itself what it is attached to.
    const text = formatReviewComments(collected('docs/spec.md', [
      comment('c1', { anchor: newRange(4, 4), quote: '# Spec', body: 'Title it.' }),
      comment('c2', { anchor: null, quote: 'must be idempotent', body: 'Prove it.' }),
    ]))

    expect(text).toBe([
      'docs/spec.md',
      '  L4',
      '    > # Spec',
      '    Title it.',
      '  (quoted passage)',
      '    > must be idempotent',
      '    Prove it.',
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
