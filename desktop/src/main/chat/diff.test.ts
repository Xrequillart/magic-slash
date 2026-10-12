import { describe, expect, it } from 'vitest'
import { ChatTranscript, diffFrom } from './transcript'

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

describe('ChatTranscript.attachDiffs', () => {
  const diff = { path: '/r/a.ts', added: 1, removed: 0, hunks: [{ oldStart: 0, newStart: 1, lines: ['+x'] }] }
  const call = JSON.stringify({ type: 'assistant', uuid: 'u1', message: { content: [{ type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'python3 x.py' } }] } })
  const result = JSON.stringify({ type: 'user', uuid: 'u2', message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] } })

  it('lands on a call already read, and survives its result', () => {
    const t = new ChatTranscript()
    t.push(call)
    expect(t.attachDiffs('toolu_1', [diff])).toBe(true)
    t.push(result)
    expect(t.entries[0]).toMatchObject({ kind: 'tool', status: 'done', diffs: [diff] })
  })
  it('waits for a call not read yet', () => {
    const t = new ChatTranscript()
    expect(t.attachDiffs('toolu_1', [diff])).toBe(false)
    t.push(call)
    expect(t.entries[0]).toMatchObject({ kind: 'tool', diffs: [diff] })
  })
})
