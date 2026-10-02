import { describe, expect, it } from 'vitest'
import { formatPaths } from './formatDroppedPaths'

describe('formatPaths', () => {
  it('quotes only the paths the TUI would split', () => {
    expect(formatPaths(['/a/b.png', '/My Files/c d.pdf'])).toBe('/a/b.png "/My Files/c d.pdf"')
    expect(formatPaths([])).toBe('')
  })
})
