import { describe, expect, it } from 'vitest'
import { THEMES } from '../../desktop/src/themes'
import { THEME_APPEARANCE, THEME_IDS } from '../../desktop/src/types'
import { cssVarName } from '../../desktop/src/renderer/theme/applyTheme'
import { DESKTOP_THEMES, DESKTOP_THEME_IDS } from './desktopTheme'

/**
 * `lib/desktopTheme.ts` is a hand-carried copy of the desktop's theme registry,
 * for the one page that renders desktop components on this site. This is what
 * keeps it from being a lie.
 *
 * It reaches ACROSS the two builds, which nothing shipped may do — vitest runs on
 * the root install and resolves both trees, a Next bundle cannot. That asymmetry
 * is the whole reason the copy exists, and the whole reason this guard can exist
 * too: the drift is caught here, at the one place with a view of both sides.
 *
 * `applyTheme` is imported rather than re-implemented for the same reason. The
 * variable NAMES are derived from the token names by that function, so deriving
 * them a second time here would let both copies agree on the same mistake.
 */
describe('the desktop theme copy', () => {
  it('carries every theme the app ships', () => {
    expect(DESKTOP_THEME_IDS).toEqual([...THEME_IDS])
  })

  it('matches the registry, channel for channel', () => {
    for (const id of THEME_IDS) {
      const expected: Record<string, string> = {}
      for (const [token, value] of Object.entries(THEMES[id].tokens)) {
        // `terminal` is a nested object read straight by xterm — it is not a CSS
        // variable and has no business in a preview ground.
        if (typeof value !== 'string') continue
        expected[cssVarName(token)] = value
      }
      expect(DESKTOP_THEMES[id].vars, `${id} has drifted from desktop/src/themes.ts`).toEqual(expected)
    }
  })

  it('agrees with the registry on which themes are dark', () => {
    for (const id of THEME_IDS) {
      expect(DESKTOP_THEMES[id].appearance, id).toBe(THEME_APPEARANCE[id])
    }
  })
})
