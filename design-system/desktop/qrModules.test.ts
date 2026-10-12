import { describe, expect, it } from 'vitest'
import { QR_QUIET_ZONE, qrPath } from './qrModules'

describe('qrPath', () => {
  it('leaves the quiet zone around the symbol', () => {
    expect(qrPath(21, () => false).extent).toBe(21 + 2 * QR_QUIET_ZONE)
  })

  it('draws nothing for an all-light grid', () => {
    expect(qrPath(3, () => false).path).toBe('')
  })

  it('draws a run of dark modules as one stroke, offset by the quiet zone', () => {
    // Row 0: dark, dark, light. Row 1: light, light, dark.
    const grid = [
      [true, true, false],
      [false, false, true],
    ]
    const { path } = qrPath(2, (row, col) => grid[row]?.[col] ?? false)
    expect(path).toBe(`M${QR_QUIET_ZONE} ${QR_QUIET_ZONE}h2v1h-2z`)
    const full = qrPath(3, (row, col) => grid[row]?.[col] ?? false).path
    expect(full).toBe(
      `M${QR_QUIET_ZONE} ${QR_QUIET_ZONE}h2v1h-2zM${QR_QUIET_ZONE + 2} ${QR_QUIET_ZONE + 1}h1v1h-1z`,
    )
  })
})
