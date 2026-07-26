import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow, nativeTheme } from 'electron'
import { CONFIG_DIR } from './config/config'
import { DEFAULT_THEME, isValidTheme, THEME_APPEARANCE, type ThemeId } from '../types'

/**
 * How the app looks on this machine.
 *
 * The cloud owns the theme like every other setting, but it only arrives once
 * the user is authenticated and the config has hydrated — several seconds after
 * the window exists. Opening in the wrong theme and repainting is worse than a
 * file, so the last known choice is kept next to the session (same directory,
 * same idea as cloud-session.enc) and read before anything is shown.
 *
 * The main process has to know it anyway, not just the renderer:
 * `nativeTheme.themeSource` colours the traffic lights and picks the macOS
 * vibrancy material behind a transparent window. Left alone, a light theme would
 * sit in a dark frame.
 */

const APPEARANCE_FILE = path.join(CONFIG_DIR, 'appearance.json')

let currentTheme_: ThemeId = DEFAULT_THEME

function read(): { theme?: unknown } {
  try {
    return JSON.parse(fs.readFileSync(APPEARANCE_FILE, 'utf-8')) as { theme?: unknown }
  } catch {
    // Missing, unreadable, or written by a version that knows other themes.
    return {}
  }
}

function persist(): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.writeFileSync(APPEARANCE_FILE, JSON.stringify({ theme: currentTheme_ }, null, 2))
  } catch {
    // A cache that cannot be written costs a repaint at next launch, nothing more.
  }
}

/** Load the stored appearance and tell Electron about it. Call before any window opens. */
export function initAppearance(): void {
  const stored = read()
  currentTheme_ = isValidTheme(stored.theme) ? stored.theme : DEFAULT_THEME
  nativeTheme.themeSource = THEME_APPEARANCE[currentTheme_]
}

export function currentTheme(): ThemeId {
  return currentTheme_
}

/**
 * Arguments handed to every window's preload, so the renderer knows the
 * appearance synchronously — before its first paint, and without a round trip.
 */
export function appearanceArguments(): string[] {
  return [`--magic-theme=${currentTheme_}`]
}

/**
 * Apply a theme everywhere: native chrome, local cache, and every open window
 * (the tray popover and quick launch are long-lived and would otherwise keep
 * the appearance they were created with).
 */
export function applyTheme(preference: unknown): ThemeId {
  const theme = isValidTheme(preference) ? preference : DEFAULT_THEME
  const changed = theme !== currentTheme_
  currentTheme_ = theme
  nativeTheme.themeSource = THEME_APPEARANCE[theme]
  persist()
  if (changed) {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('theme:changed', theme)
    }
  }
  return theme
}
