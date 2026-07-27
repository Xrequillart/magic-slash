import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import {
  clampZoom,
  DEFAULT_THEME,
  DEFAULT_ZOOM,
  isValidTheme,
  MAX_ZOOM,
  MIN_ZOOM,
  nextZoom,
  THEME_APPEARANCE,
  type ThemeId,
} from '../../types'
import { THEMES, THEME_IDS } from '../../themes'
import { cssVarName, resolveTheme } from './applyTheme'

const RENDERER_DIR = join(__dirname, '..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return full.endsWith('.tsx') ? [full] : []
  })
}

describe('theme registry', () => {
  it('gives every theme a complete palette', () => {
    // A theme missing one token is invisible until the screen that uses it is
    // opened, so the shape is checked here rather than discovered in the app.
    const reference = THEMES[DEFAULT_THEME].tokens

    for (const id of THEME_IDS) {
      const { tokens, labelKey, descriptionKey } = THEMES[id]
      expect(labelKey, `${id}.labelKey`).toBeTruthy()
      expect(descriptionKey, `${id}.descriptionKey`).toBeTruthy()

      expect(THEME_APPEARANCE[id], `${id} classified light or dark`).toMatch(/^(light|dark)$/)

      for (const key of Object.keys(reference) as (keyof typeof reference)[]) {
        const value = tokens[key]
        if (key === 'terminal') {
          for (const slot of Object.keys(reference.terminal) as (keyof typeof reference.terminal)[]) {
            expect(tokens.terminal[slot], `${id}.terminal.${slot}`).toBeTruthy()
          }
        } else {
          expect(value, `${id}.${key}`).toBeTruthy()
        }
      }
    }
  })

  it('states bare channels for the tokens Tailwind applies opacity to', () => {
    // `rgb(var(--c-x) / <alpha-value>)` only composes with "R G B" — a token
    // written as a full colour would silently break `text-ink/80` and friends.
    for (const id of THEME_IDS) {
      const tokens = THEMES[id].tokens
      for (const [key, value] of Object.entries(tokens)) {
        if (!key.endsWith('Rgb')) continue
        expect(value, `${id}.${key}`).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/)
      }
    }
  })

  it('keeps index.css :root in step with the default theme', () => {
    // Those variables exist so a document paints correctly before any script
    // runs. They are a copy, and a copy drifts unless something checks it.
    const css = readFileSync(join(RENDERER_DIR, 'index.css'), 'utf-8')
    const root = css.match(/:root\s*\{([^}]*)\}/)
    expect(root, ':root block in index.css').toBeTruthy()

    const declared = new Map<string, string>()
    for (const line of root![1].split('\n')) {
      const match = line.match(/^\s*(--c-[\w-]+)\s*:\s*(.+);\s*$/)
      if (match) declared.set(match[1], match[2].trim())
    }

    for (const [token, value] of Object.entries(THEMES[DEFAULT_THEME].tokens)) {
      if (typeof value !== 'string') continue
      expect(declared.get(cssVarName(token)), `${cssVarName(token)} in index.css`).toBe(value)
    }
  })
})

describe('theme preference', () => {
  it('accepts the themes it knows and nothing else', () => {
    expect(isValidTheme('dark')).toBe(true)
    expect(isValidTheme('light')).toBe(true)
    expect(isValidTheme('solarized')).toBe(false)
    expect(isValidTheme(undefined)).toBe(false)
  })

  it('falls back on a theme it has never heard of', () => {
    // A newer build may have stored one; this one must still paint something.
    expect(resolveTheme('solarized')).toBe(DEFAULT_THEME)
    expect(resolveTheme(null)).toBe(DEFAULT_THEME)
    expect(resolveTheme('light')).toBe<ThemeId>('light')
  })
})

describe('interface scale', () => {
  it('keeps any value inside the supported range', () => {
    // The zoom also arrives from the OS and the menu, which can land anywhere.
    expect(clampZoom(3)).toBe(MAX_ZOOM)
    expect(clampZoom(0.1)).toBe(MIN_ZOOM)
    expect(clampZoom(1.1)).toBe(1.1)
    expect(clampZoom('big')).toBe(DEFAULT_ZOOM)
    expect(clampZoom(NaN)).toBe(DEFAULT_ZOOM)
    expect(clampZoom(undefined)).toBe(DEFAULT_ZOOM)
  })

  it('steps to the next level and stops at the ends', () => {
    expect(nextZoom(1, 1)).toBe(1.1)
    expect(nextZoom(1, -1)).toBe(0.9)
    expect(nextZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM)
    expect(nextZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM)
  })

  it('steps from a value that is not itself a level', () => {
    // ⌘+ and the OS produce factors of their own; stepping must still land on
    // the level above, not on the nearest one below.
    expect(nextZoom(1.05, 1)).toBe(1.1)
    expect(nextZoom(1.05, -1)).toBe(1)
    // Float noise must not make a level step to itself.
    expect(nextZoom(1.1000000000000001, 1)).toBe(1.25)
  })
})

describe('no hardcoded appearance', () => {
  it('leaves no class that assumes a dark window', () => {
    // `text-white` / `bg-white/…` / `border-white/…` are how the app looked
    // before it had themes: light ink over a dark surface, invisible on a bright
    // one. They are replaced by roles (`text-ink`, `bg-surface`, `border-line`),
    // and this keeps them from creeping back one component at a time.
    //
    // `bg-black/…` is deliberately allowed: a modal scrim dims the app in every
    // theme, so it stays black.
    const banned = /\b(?:text|bg|border|ring|divide|caret|placeholder|fill|stroke)-white\b/

    const offenders = walk(RENDERER_DIR)
      .filter((file) => banned.test(readFileSync(file, 'utf-8')))
      .map((file) => file.slice(RENDERER_DIR.length + 1))

    expect(offenders).toEqual([])
  })
})
