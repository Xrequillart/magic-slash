import type { CSSProperties } from 'react'
import { THEMES } from '../../../desktop/src/themes'

/** `bgSecondaryRgb` → `--c-bg-secondary`: the app's own derivation (renderer/theme/applyTheme.ts). */
const cssVarName = (token: string) =>
  `--c-${token.replace(/Rgb$/, '').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`

/** The midnight theme's tokens as CSS variables, read from the desktop's registry itself. */
export const MIDNIGHT_VARS = Object.fromEntries(
  Object.entries(THEMES.midnight.tokens)
    .filter(([, value]) => typeof value === 'string')
    .map(([token, value]) => [cssVarName(token), value as string]),
) as CSSProperties
