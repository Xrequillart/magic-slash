import { describe, it, expect } from 'vitest'
import { diffSpecLines, unifiedSpecDiff } from './specDiff'

/** Apply a script to get back both sides — the property any correct diff has. */
function sides(ops: ReturnType<typeof diffSpecLines>) {
  return {
    old: ops.filter((op) => op.kind !== 'add').map((op) => op.text).join('\n'),
    new: ops.filter((op) => op.kind !== 'remove').map((op) => op.text).join('\n'),
  }
}

describe('diffSpecLines', () => {
  it('reports identical texts as all equal', () => {
    const ops = diffSpecLines('a\nb\nc', 'a\nb\nc')
    expect(ops.every((op) => op.kind === 'equal')).toBe(true)
    expect(ops).toHaveLength(3)
  })

  it('finds a changed line in the middle, and only that line', () => {
    const ops = diffSpecLines('# Spec\n\nold line\n\nend', '# Spec\n\nnew line\n\nend')
    expect(ops.filter((op) => op.kind !== 'equal')).toEqual([
      { kind: 'remove', text: 'old line' },
      { kind: 'add', text: 'new line' },
    ])
  })

  it('finds the minimal script between the trimmed ends', () => {
    // The classic Myers example: ABCABBA → CBABAC has an edit distance of 5.
    const a = 'A\nB\nC\nA\nB\nB\nA'
    const b = 'C\nB\nA\nB\nA\nC'
    const ops = diffSpecLines(a, b)
    expect(ops.filter((op) => op.kind !== 'equal')).toHaveLength(5)
    expect(sides(ops)).toEqual({ old: a, new: b })
  })

  it('handles an empty side', () => {
    expect(sides(diffSpecLines('', 'a\nb'))).toEqual({ old: '', new: 'a\nb' })
    expect(sides(diffSpecLines('a\nb', ''))).toEqual({ old: 'a\nb', new: '' })
  })

  it('falls back to remove-then-add past the cap, and stays a correct diff', () => {
    const a = Array.from({ length: 50 }, (_, i) => `old ${i}`).join('\n')
    const b = Array.from({ length: 50 }, (_, i) => `new ${i}`).join('\n')
    const ops = diffSpecLines(a, b, 10)
    expect(ops.slice(0, 50).every((op) => op.kind === 'remove')).toBe(true)
    expect(ops.slice(50).every((op) => op.kind === 'add')).toBe(true)
    expect(sides(ops)).toEqual({ old: a, new: b })
  })
})

describe('unifiedSpecDiff', () => {
  it('shows a first revision as additions only, with no phantom blank line removed', () => {
    const { diff, additions, deletions } = unifiedSpecDiff('', 'a\nb')
    expect(additions).toBe(2)
    expect(deletions).toBe(0)
    expect(diff.split('\n').slice(2)).toEqual(['@@ -0,0 +1,2 @@', '+a', '+b'])
  })

  it('counts the lines added and removed', () => {
    const { additions, deletions } = unifiedSpecDiff('a\nb\nc', 'a\nB\nc\nd')
    expect(additions).toBe(2)
    expect(deletions).toBe(1)
  })

  it('writes one hunk over the whole text, in the shape parseDiff reads', () => {
    const { diff } = unifiedSpecDiff('a\nb\nc', 'a\nB\nc\nd')
    expect(diff.split('\n')).toEqual([
      '--- a/spec.md',
      '+++ b/spec.md',
      '@@ -1,3 +1,4 @@',
      ' a',
      '-b',
      '+B',
      ' c',
      '+d',
    ])
  })
})
