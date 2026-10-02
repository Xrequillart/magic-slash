import { describe, expect, it } from 'vitest'
import { diffFrom } from './transcript'

describe('diffFrom', () => {
  it('reads an edit from its structured patch', () => {
    const diff = diffFrom({
      filePath: '/r/a.ts',
      structuredPatch: [{ oldStart: 10, oldLines: 3, newStart: 10, newLines: 3, lines: [' a', '-b', '+c', '+d', ' e'] }],
    })
    expect(diff).toEqual({ path: '/r/a.ts', added: 2, removed: 1, hunks: [{ oldStart: 10, newStart: 10, lines: [' a', '-b', '+c', '+d', ' e'] }] })
  })
  it('reads a new file as all added', () => {
    expect(diffFrom({ type: 'create', filePath: '/r/n.md', content: 'x\ny\n', structuredPatch: [] })).toMatchObject({ added: 2, removed: 0, hunks: [{ lines: ['+x', '+y'] }] })
  })
  it('is nothing for a read or a failure', () => {
    expect(diffFrom({ file: { filePath: '/r/a.ts' } })).toBeNull()
    expect(diffFrom(undefined)).toBeNull()
  })
  it('cuts a huge change but counts all of it', () => {
    const lines = Array.from({ length: 1000 }, (_, i) => `+${i}`)
    const diff = diffFrom({ type: 'create', filePath: '/r/big', content: lines.map((l) => l.slice(1)).join('\n'), structuredPatch: [] })
    expect(diff?.added).toBe(1000)
    expect(diff?.hunks[0].lines).toHaveLength(400)
    expect(diff?.truncated).toBe(true)
  })
})
