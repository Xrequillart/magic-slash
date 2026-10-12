import { THEMES } from '../../desktop/src/themes'
import { DEFAULT_THEME, THEME_APPEARANCE, THEME_IDS, type ThemeId } from '../../desktop/src/types'

/**
 * Renders `ios/MagicSlash/Theme/ThemeTokens.generated.swift` from the desktop's theme
 * registry, so the iPhone paints with the very values the Mac does.
 *
 * Pure on purpose: it returns the file as a string and writes nothing. The test next
 * to it compares that string to the committed file with `toMatchFileSnapshot`, which
 * is both the generator (`npm run ios:theme` runs it with `-u`) and the drift guard (a
 * plain `npm test` fails when `themes.ts` moved and the Swift file did not).
 *
 * Every value shape is parsed explicitly and anything else THROWS. A token in a new
 * shape skipped in silence would leave the iOS theme a colour short with nothing red.
 */

/** A parsed token: a colour (channels 0-255, opacity 0-1) or a plain fraction. */
export type TokenValue =
  | { kind: 'color'; red: number; green: number; blue: number; opacity: number }
  | { kind: 'fraction'; value: number }

const CHANNELS = /^(\d{1,3}) (\d{1,3}) (\d{1,3})$/
const RGBA = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d*\.?\d+)\s*\)$/
const PERCENT = /^(\d*\.?\d+)%$/

function channel(raw: string, token: string): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0 || n > 255) {
    throw new Error(`Theme token "${token}": channel ${raw} is outside 0-255`)
  }
  return n
}

function unit(n: number, raw: string, token: string): number {
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new Error(`Theme token "${token}": ${raw} is outside 0-1`)
  }
  // Rounded so float noise (7 / 100 = 0.07000000000000001) never reaches the file.
  return Number(n.toFixed(6))
}

/** Parses one theme token value. Throws on any shape it does not know. */
export function parseTokenValue(value: string, token = '?'): TokenValue {
  let m = CHANNELS.exec(value)
  if (m) {
    return {
      kind: 'color',
      red: channel(m[1], token),
      green: channel(m[2], token),
      blue: channel(m[3], token),
      opacity: 1,
    }
  }
  m = RGBA.exec(value)
  if (m) {
    return {
      kind: 'color',
      red: channel(m[1], token),
      green: channel(m[2], token),
      blue: channel(m[3], token),
      opacity: unit(Number(m[4]), m[4], token),
    }
  }
  m = PERCENT.exec(value)
  if (m) {
    return { kind: 'fraction', value: unit(Number(m[1]) / 100, value, token) }
  }
  throw new Error(`Theme token "${token}": unsupported value shape ${JSON.stringify(value)}`)
}

/** `bgSecondaryRgb` → `bgSecondary`. */
export function swiftPropertyName(token: string): string {
  return token.endsWith('Rgb') ? token.slice(0, -3) : token
}

/** `high-contrast` → `highContrast`. */
export function swiftCaseName(id: string): string {
  return id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** A Swift Double literal: JS's shortest round-trip form, always with a point. */
function swiftDouble(n: number): string {
  const s = String(n)
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Cannot write ${s} as a Swift literal`)
  return s.includes('.') ? s : `${s}.0`
}

function swiftValue(parsed: TokenValue): string {
  if (parsed.kind === 'fraction') return swiftDouble(parsed.value)
  const { red, green, blue, opacity } = parsed
  return opacity === 1
    ? `rgb(${red}, ${green}, ${blue})`
    : `rgb(${red}, ${green}, ${blue}, ${swiftDouble(opacity)})`
}

/** The flat tokens, in registry order. `terminal` is xterm's palette: not a theme role. */
function flatTokens(id: ThemeId): [string, string][] {
  return Object.entries(THEMES[id].tokens).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  )
}

export function renderSwiftTheme(): string {
  const keys = flatTokens('dark').map(([key]) => key)
  // Typing each property needs one shape per token across every theme.
  const kinds = new Map<string, TokenValue['kind']>()
  const parsed = new Map<ThemeId, [string, TokenValue][]>()
  for (const id of THEME_IDS) {
    const entries = flatTokens(id)
    const ids = entries.map(([key]) => key)
    if (ids.join() !== keys.join()) {
      throw new Error(`Theme "${id}" does not list the same tokens as "dark"`)
    }
    const values = entries.map(([key, value]): [string, TokenValue] => [key, parseTokenValue(value, `${id}.${key}`)])
    for (const [key, { kind }] of values) {
      const seen = kinds.get(key)
      if (seen && seen !== kind) throw new Error(`Token "${key}" is a ${seen} in one theme, a ${kind} in another`)
      kinds.set(key, kind)
    }
    parsed.set(id, values)
  }

  const out: string[] = []
  const line = (s = '') => out.push(s)

  line('// GENERATED from desktop/src/themes.ts by `npm run ios:theme`. Do not hand-edit.')
  line('// `npm test` fails when this file no longer matches the desktop registry.')
  line()
  line('import SwiftUI')
  line()
  line('enum ThemeID: String, CaseIterable, Sendable {')
  for (const id of THEME_IDS) {
    const name = swiftCaseName(id)
    line(name === id ? `  case ${name}` : `  case ${name} = "${id}"`)
  }
  line()
  line(`  static let fallback: ThemeID = .${swiftCaseName(DEFAULT_THEME)}`)
  line()
  line('  /// The theme the desktop stored, or the fallback when it is missing or unknown.')
  line('  init(raw: String?) {')
  line('    self = raw.flatMap(ThemeID.init(rawValue:)) ?? .fallback')
  line('  }')
  line('}')
  line()
  line('struct ThemeTokens: Sendable {')
  line('  let isDark: Bool')
  for (const key of keys) {
    line(`  let ${swiftPropertyName(key)}: ${kinds.get(key) === 'color' ? 'Color' : 'Double'}`)
  }
  line()
  line('  static func tokens(for id: ThemeID) -> ThemeTokens {')
  line('    switch id {')
  for (const id of THEME_IDS) {
    line(`    case .${swiftCaseName(id)}: return ${swiftCaseName(id)}`)
  }
  line('    }')
  line('  }')
  line()
  line('  private static func rgb(_ red: Double, _ green: Double, _ blue: Double, _ opacity: Double = 1) -> Color {')
  line('    Color(.sRGB, red: red / 255, green: green / 255, blue: blue / 255, opacity: opacity)')
  line('  }')
  for (const id of THEME_IDS) {
    line()
    line(`  private static let ${swiftCaseName(id)} = ThemeTokens(`)
    line(`    isDark: ${THEME_APPEARANCE[id] === 'dark'},`)
    const values = parsed.get(id) ?? []
    values.forEach(([key, value], i) => {
      const comma = i === values.length - 1 ? '' : ','
      line(`    ${swiftPropertyName(key)}: ${swiftValue(value)}${comma}`)
    })
    line('  )')
  }
  line('}')
  return `${out.join('\n')}\n`
}
