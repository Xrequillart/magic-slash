import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CODE_SYNTAX_FAMILIES, CODE_SYNTAX_FAMILY_IDS, codeSyntaxTheme, isValidCodeFontSize,
  isValidCodeSyntax, THEME_APPEARANCE, THEME_CODE_SYNTAX, THEME_IDS,
} from './types'

describe('codeSyntaxTheme', () => {
  it('keeps GitHub on the two neutral themes when nothing was chosen', () => {
    expect(codeSyntaxTheme('dark', undefined)).toBe('github-dark')
    expect(codeSyntaxTheme('light', 'auto')).toBe('github-light')
  })

  it('takes the variant of the interface theme appearance, never the other one', () => {
    for (const theme of THEME_IDS) {
      for (const family of CODE_SYNTAX_FAMILY_IDS) {
        expect(codeSyntaxTheme(theme, family)).toBe(CODE_SYNTAX_FAMILIES[family][THEME_APPEARANCE[theme]])
      }
    }
  })

  it('reads an unknown family as auto, and an unknown theme as the default one', () => {
    expect(codeSyntaxTheme('sepia', 'dracula')).toBe(CODE_SYNTAX_FAMILIES[THEME_CODE_SYNTAX.sepia].light)
    expect(codeSyntaxTheme('neon', 'catppuccin')).toBe('catppuccin-mocha')
  })

  it('refuses inherited keys as families', () => {
    expect(isValidCodeSyntax('toString')).toBe(false)
    expect(isValidCodeSyntax('rose-pine')).toBe(true)
  })

  it('bounds the font size to the listed steps', () => {
    expect(isValidCodeFontSize(12)).toBe(true)
    expect(isValidCodeFontSize(12.5)).toBe(false)
    expect(isValidCodeFontSize('12')).toBe(false)
  })
})

describe('user_settings.code_syntax CHECK', () => {
  // The column refuses any value its CHECK does not list, so a family added here without
  // a migration would fail every settings write on the account that picked it.
  it('lists exactly auto and the families', () => {
    const sql = readFileSync(
      resolve(__dirname, '../../supabase/migrations/20260928110000_user_settings_code_syntax.sql'),
      'utf8',
    )
    const list = sql.match(/code_syntax in \(([^)]*)\)/)?.[1] ?? ''
    const ids = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(ids.sort()).toEqual(['auto', ...CODE_SYNTAX_FAMILY_IDS].sort())
  })
})
