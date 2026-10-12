import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { syncClaudeTheme } from './claude-theme'
import { THEMES } from '../themes'
import { CONFIG_DIR } from './config/config'
import { currentLanguage, setLanguage } from './i18n'
import { clampZoom, DEFAULT_LANGUAGE, DEFAULT_THEME, DEFAULT_ZOOM, isValidLanguage, isValidTheme, nextZoom, THEME_APPEARANCE, type LanguageId, type ThemeId } from '../types'

/**
 * How the app looks on this machine: the theme, the interface scale, and the
 * interface language.
 *
 * All three are mirrored to a file here, for the same reason. The cloud owns the
 * theme and the language like every other setting, but they only arrive once the
 * user is authenticated and the config has hydrated — several seconds after the
 * window exists. Opening in the wrong theme (or in English) and repainting is
 * worse than a file, so the last known choice is kept next to the session (same
 * directory, same idea as cloud-session.enc) and read before anything is shown.
 *
 * The main process has to know them anyway, not just the renderer:
 * `nativeTheme.themeSource` colours the traffic lights, the main window's ground is
 * painted natively in the theme (see `themeBackground`), the zoom factor belongs to a
 * window's webContents, and the menus, the tray and the notifications are
 * composed here with no renderer involved.
 *
 * The zoom is local ONLY, with no cloud column: it compensates for a particular
 * display, so following the account onto a laptop with a different screen would
 * be a nuisance rather than a service.
 */

const APPEARANCE_FILE = path.join(CONFIG_DIR, 'appearance.json')

interface StoredAppearance {
  theme?: unknown
  zoom?: unknown
  language?: unknown
}

let currentTheme_: ThemeId = DEFAULT_THEME
let currentZoom_: number = DEFAULT_ZOOM

/**
 * Who to tell when the language changes. A local Set rather than a direct call
 * into the menu and tray modules: those import this one (for
 * `currentTheme`), and reaching back would close the circle.
 */
const languageListeners = new Set<() => void>()

/**
 * The window the zoom applies to. The tray popover and quick launch are sized in
 * pixels for their content and would only break, so they keep zoom 1.
 */
let zoomWindow: BrowserWindow | null = null

function read(): StoredAppearance {
  try {
    return JSON.parse(fs.readFileSync(APPEARANCE_FILE, 'utf-8')) as StoredAppearance
  } catch {
    // Missing, unreadable, or written by a version that knows other themes.
    return {}
  }
}

function persist(): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.writeFileSync(
      APPEARANCE_FILE,
      JSON.stringify({ theme: currentTheme_, zoom: currentZoom_, language: currentLanguage() }, null, 2),
    )
  } catch {
    // A cache that cannot be written costs a repaint at next launch, nothing more.
  }
}

/** Load the stored appearance and tell Electron about it. Call before any window opens. */
export function initAppearance(): void {
  const stored = read()
  currentTheme_ = isValidTheme(stored.theme) ? stored.theme : DEFAULT_THEME
  currentZoom_ = clampZoom(stored.zoom)
  // Re-validated, not trusted: the file may have been written by a build that
  // knows a language this one does not.
  setLanguage(isValidLanguage(stored.language) ? stored.language : DEFAULT_LANGUAGE)
  nativeTheme.themeSource = THEME_APPEARANCE[currentTheme_]
  // From the local mirror, before the cloud has said anything: a terminal
  // launched in the first seconds should already find its theme on disk. If the
  // cloud then disagrees, hydration calls applyTheme() and this is rewritten.
  syncClaudeTheme(currentTheme_)
  // Here rather than with the other handlers: it must answer before any window's
  // preload runs, and a sync request nobody answers blocks that renderer.
  ipcMain.removeAllListeners('appearance:current')
  ipcMain.on('appearance:current', (event) => {
    event.returnValue = currentAppearance()
  })
}

export function currentTheme(): ThemeId {
  return currentTheme_
}

export function currentZoom(): number {
  return currentZoom_
}

/** What the renderer needs to paint its first frame, as the preload asks for it. */
export interface CurrentAppearance {
  theme: ThemeId
  zoom: number
  language: LanguageId
}

/**
 * Read SYNCHRONOUSLY by every window's preload (`appearance:current`), so the
 * renderer knows the appearance before its first paint.
 *
 * Asked for rather than handed over as launch arguments, which it once was: a
 * window's `additionalArguments` are frozen when it is created, so a reload (⌘R, or
 * the dev server's) repainted the theme the app was LAUNCHED in. The main process
 * still held the newer one, so picking it again changed nothing here, broadcast
 * nothing, and the click looked dead until a second, different theme was chosen.
 */
function currentAppearance(): CurrentAppearance {
  return { theme: currentTheme_, zoom: currentZoom_, language: currentLanguage() }
}

/**
 * The theme's ground as the hex BrowserWindow wants: `bgRgb`, the same channels the
 * page paints `body` with, so the native ground and the page are one colour.
 */
export function themeBackground(theme: ThemeId): string {
  const [r, g, b] = THEMES[theme].tokens.bgRgb.split(' ').map(Number)
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

let themedWindow: BrowserWindow | null = null

/** Register the window whose native ground follows the theme. */
export function setThemedWindow(win: BrowserWindow): void {
  themedWindow = win
  win.on('closed', () => { if (themedWindow === win) themedWindow = null })
}

/** Register the window the interface scale applies to. */
export function setZoomWindow(win: BrowserWindow): void {
  zoomWindow = win
  win.webContents.setZoomFactor(currentZoom_)
  // Electron resets the zoom factor on navigation, which a dev-server reload is.
  win.webContents.on('did-finish-load', () => {
    if (!win.isDestroyed()) win.webContents.setZoomFactor(currentZoom_)
  })
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
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
  if (themedWindow && !themedWindow.isDestroyed()) themedWindow.setBackgroundColor(themeBackground(theme))
  persist()
  // Claude Code in the terminal panes follows along. Unconditionally, not only
  // when `changed`: this also runs when the setting itself is toggled, where the
  // theme is the same and the file has to be written or removed all the same.
  syncClaudeTheme(theme)
  if (changed) broadcast('theme:changed', theme)
  return theme
}

/** Set the interface scale (clamped to the supported range). */
export function applyZoom(value: unknown): number {
  const zoom = clampZoom(value)
  const changed = zoom !== currentZoom_
  currentZoom_ = zoom
  if (zoomWindow && !zoomWindow.isDestroyed()) {
    zoomWindow.webContents.setZoomFactor(zoom)
  }
  persist()
  // Broadcast even to the window that just changed: the Settings page reads the
  // value from here, and the menu and its ⌘+ / ⌘− change it from outside React.
  if (changed) broadcast('zoom:changed', zoom)
  return zoom
}

/**
 * Subscribe to language changes, for the native chrome the main process owns
 * (the application menu and the tray menu, both built from strings). Returns an
 * unsubscribe, matching `onUpdateStatusChange` in main/updater.ts.
 */
export function onLanguageChanged(callback: () => void): () => void {
  languageListeners.add(callback)
  return () => languageListeners.delete(callback)
}

/**
 * Apply a language everywhere: local cache, the native chrome via the listeners,
 * and every open window (the tray popover and quick launch are long-lived and
 * would otherwise keep the language they were created with).
 */
export function applyLanguage(preference: unknown): LanguageId {
  const language = isValidLanguage(preference) ? preference : DEFAULT_LANGUAGE
  const changed = language !== currentLanguage()
  setLanguage(language)
  persist()
  if (changed) {
    for (const listener of languageListeners) listener()
    broadcast('language:changed', language)
  }
  return language
}

/** One step in or out, for the View menu and its keyboard shortcuts. */
export function stepZoom(direction: 1 | -1): number {
  return applyZoom(nextZoom(currentZoom_, direction))
}
