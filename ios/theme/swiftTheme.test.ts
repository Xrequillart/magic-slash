import { describe, expect, it } from 'vitest'
import { parseTokenValue, renderSwiftTheme } from './renderSwiftTheme'

/**
 * The iOS app's theme is a Swift file generated from `desktop/src/themes.ts`. This
 * test IS the generator and the guard at once: `npm run ios:theme` runs it with `-u`
 * to write the file, and a plain `npm test` fails when the committed file no longer
 * matches what the registry renders — a token changed on the desktop without
 * regenerating the Swift side. Vitest never writes snapshots under CI, so the guard
 * cannot quietly update itself there.
 */
describe('the iOS theme', () => {
  it('matches the desktop registry (run `npm run ios:theme` after changing themes.ts)', async () => {
    await expect(renderSwiftTheme()).toMatchFileSnapshot('../MagicSlash/Theme/ThemeTokens.generated.swift')
  })

})

describe('parseTokenValue', () => {
  it('reads bare channels as an opaque colour', () => {
    expect(parseTokenValue('11 12 14')).toEqual({ kind: 'color', red: 11, green: 12, blue: 14, opacity: 1 })
  })

  it('reads rgba() with its opacity', () => {
    expect(parseTokenValue('rgba(255, 255, 255, 0.04)')).toEqual({
      kind: 'color',
      red: 255,
      green: 255,
      blue: 255,
      opacity: 0.04,
    })
  })

  it('reads a percentage as a fraction', () => {
    expect(parseTokenValue('9%')).toEqual({ kind: 'fraction', value: 0.09 })
    expect(parseTokenValue('7%')).toEqual({ kind: 'fraction', value: 0.07 })
  })

  it('throws on any other shape rather than skipping it', () => {
    for (const value of ['#ffffff', 'rgb(1, 2, 3)', 'hsl(0 0% 0%)', '1 2', '300 0 0', 'rgba(0, 0, 0, 2)', '']) {
      expect(() => parseTokenValue(value, 'probe'), value).toThrow(/probe/)
    }
  })
})
