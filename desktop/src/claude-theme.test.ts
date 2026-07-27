import { describe, it, expect } from 'vitest'
import { CLAUDE_THEME_REF, CLAUDE_THEME_SLUG, claudeThemeFile } from './claude-theme'
import { THEME_APPEARANCE, THEME_IDS } from './types'

/**
 * Claude Code's own colour validator, transcribed from the CLI. Anything it
 * rejects is dropped from the theme without a word, so a malformed value would
 * not fail loudly — it would just leave that entry painting the base's colour
 * and look like a mapping bug. Asserting against the real regex is the only way
 * to catch it here rather than on screen.
 */
function isValidClaudeColour(value: string): boolean {
  if (/^rgb\(\s?\d{1,3},\s?\d{1,3},\s?\d{1,3}\s?\)$/.test(value)) return true
  if (/^#[0-9a-fA-F]{6}$/.test(value) || /^#[0-9a-fA-F]{3}$/.test(value)) return true
  if (/^ansi256\(\d{1,3}\)$/.test(value)) return true
  return value.startsWith('ansi:')
}

function channels(hex: string): [number, number, number] {
  const n = hex.replace('#', '')
  return [0, 1, 2].map((i) => parseInt(n.slice(i * 2, i * 2 + 2), 16)) as [number, number, number]
}

/** Rough perceived lightness, enough to say "closer to the background". */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

describe('claudeThemeFile', () => {
  it('emits only colours Claude Code will accept, for every theme', () => {
    for (const id of THEME_IDS) {
      for (const [key, value] of Object.entries(claudeThemeFile(id).overrides)) {
        expect(isValidClaudeColour(value), `${id}.${key} = ${value}`).toBe(true)
      }
    }
  })

  it('patches the built-in matching the app appearance', () => {
    for (const id of THEME_IDS) {
      expect(claudeThemeFile(id).base).toBe(THEME_APPEARANCE[id])
    }
  })

  it('keeps the daltonized variant when the user already reads in one', () => {
    expect(claudeThemeFile('dark', '-daltonized').base).toBe('dark-daltonized')
    expect(claudeThemeFile('light', '-daltonized').base).toBe('light-daltonized')
  })

  /**
   * The whole point of the feature: whatever the app is painting, the terminal's
   * text has to sit at the other end of the scale from its background. This is
   * the white-on-white regression, expressed as a test.
   */
  it('separates text from the background in every theme', () => {
    for (const id of THEME_IDS) {
      const { overrides } = claudeThemeFile(id)
      const gap = Math.abs(luminance(overrides.text) - luminance(overrides.inverseText))
      expect(gap, `${id} text vs background`).toBeGreaterThan(120)
    }
  })

  it('orders the muted greys from quietest to loudest', () => {
    for (const id of THEME_IDS) {
      const { overrides } = claudeThemeFile(id)
      const towardsBackground = (key: string) =>
        Math.abs(luminance(overrides[key]) - luminance(overrides.inverseText))

      // `subtle` is the least prominent, `inactive` reads as real text, and the
      // shimmer is brighter still. Distance from the background, not raw
      // lightness: the order has to hold on the light themes too, where quieter
      // means lighter rather than darker.
      expect(towardsBackground('subtle'), id).toBeLessThan(towardsBackground('inactive'))
      expect(towardsBackground('inactive'), id).toBeLessThan(towardsBackground('inactiveShimmer'))
    }
  })

  it('leaves the semantic and brand colours to the base', () => {
    // Green means "added" and red means "removed"; Anthropic tuned those against
    // their own backgrounds. Mapping them onto the app's generic greenRgb and
    // redRgb was considered and rejected — see the note in claude-theme.ts.
    const reserved = [
      'claude', 'permission', 'planMode', 'suggestion',
      'success', 'error', 'warning',
      'diffAdded', 'diffRemoved', 'diffAddedWord', 'diffRemovedWord',
      'diffAddedDimmed', 'diffRemovedDimmed',
      // The pane is transparent over the window: an opaque background here
      // would punch a rectangle through the app's vibrancy.
      'background',
    ]
    for (const id of THEME_IDS) {
      const keys = Object.keys(claudeThemeFile(id).overrides)
      expect(keys.filter((k) => reserved.includes(k)), id).toEqual([])
    }
  })

  it('flattens translucent surfaces rather than passing the alpha through', () => {
    // dark's `surface` is rgba(255,255,255,0.06) over a bgRgb of '10 10 11'.
    // red and green: 255 × 0.06 + 10 × 0.94 = 24.7 → 25 → 0x19
    // blue:          255 × 0.06 + 11 × 0.94 = 25.6 → 26 → 0x1a
    expect(claudeThemeFile('dark').overrides.userMessageBackground).toBe('#19191a')
  })

  it('names a slug the settings reference agrees with', () => {
    expect(CLAUDE_THEME_REF).toBe(`custom:${CLAUDE_THEME_SLUG}`)
  })
})
