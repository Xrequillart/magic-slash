import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow, nativeTheme } from 'electron'
import { CONFIG_DIR } from './config/config'
import { clampZoom, DEFAULT_THEME, DEFAULT_ZOOM, isValidTheme, nextZoom, THEME_APPEARANCE, type ThemeId } from '../types'

/**
 * How the app looks on this machine: the theme, and the interface scale.
 *
 * Both are mirrored to a file here, for the same reason. The cloud owns the
 * theme like every other setting, but it only arrives once the user is
 * authenticated and the config has hydrated — several seconds after the window
 * exists. Opening in the wrong theme and repainting is worse than a file, so the
 * last known choice is kept next to the session (same directory, same idea as
 * cloud-session.enc) and read before anything is shown.
 *
 * The main process has to know them anyway, not just the renderer:
 * `nativeTheme.themeSource` colours the traffic lights and picks the macOS
 * vibrancy material behind a transparent window, and the zoom factor belongs to
 * a window's webContents.
 *
 * The zoom is local ONLY, with no cloud column: it compensates for a particular
 * display, so following the account onto a laptop with a different screen would
 * be a nuisance rather than a service.
 */

const APPEARANCE_FILE = path.join(CONFIG_DIR, 'appearance.json')

interface StoredAppearance {
  theme?: unknown
  zoom?: unknown
}

let currentTheme_: ThemeId = DEFAULT_THEME
let currentZoom_: number = DEFAULT_ZOOM

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
    fs.writeFileSync(APPEARANCE_FILE, JSON.stringify({ theme: currentTheme_, zoom: currentZoom_ }, null, 2))
  } catch {
    // A cache that cannot be written costs a repaint at next launch, nothing more.
  }
}

/** Load the stored appearance and tell Electron about it. Call before any window opens. */
export function initAppearance(): void {
  const stored = read()
  currentTheme_ = isValidTheme(stored.theme) ? stored.theme : DEFAULT_THEME
  currentZoom_ = clampZoom(stored.zoom)
  nativeTheme.themeSource = THEME_APPEARANCE[currentTheme_]
}

export function currentTheme(): ThemeId {
  return currentTheme_
}

export function currentZoom(): number {
  return currentZoom_
}

/**
 * Arguments handed to every window's preload, so the renderer knows the
 * appearance synchronously — before its first paint, and without a round trip.
 */
export function appearanceArguments(): string[] {
  return [`--magic-theme=${currentTheme_}`, `--magic-zoom=${currentZoom_}`]
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
  persist()
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

/** One step in or out, for the View menu and its keyboard shortcuts. */
export function stepZoom(direction: 1 | -1): number {
  return applyZoom(nextZoom(currentZoom_, direction))
}
