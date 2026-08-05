import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { appearanceArguments } from '../appearance'

let popoverWindow: BrowserWindow | null = null

/** Kept in main rather than read from the window: the renderer lays out to it too. */
const POPOVER_WIDTH = 320

/**
 * Bounds on what the renderer may ask for. The floor keeps a measurement taken
 * mid-paint (a container that is briefly 0px tall) from collapsing the panel; the
 * ceiling keeps a long agent list from running off the bottom of the screen —
 * past it the list scrolls inside the panel instead.
 */
const MIN_HEIGHT = 120
const MAX_HEIGHT = 600

export function createPopoverWindow(): BrowserWindow {
  if (popoverWindow && !popoverWindow.isDestroyed()) {
    return popoverWindow
  }

  popoverWindow = new BrowserWindow({
    width: POPOVER_WIDTH,
    // A placeholder: the renderer measures its own content and calls
    // resizePopover as soon as it has painted, so the panel is never letterboxed
    // by a fixed height. Small enough that the first frame is not a grey slab.
    height: 160,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    // Floats over whatever the user is in, like the menu it replaced.
    alwaysOnTop: true,
    // An NSPanel (NSWindowStyleMaskNonactivatingPanel), not a plain window: it
    // takes key focus — which the blur handler below needs — WITHOUT making the
    // app frontmost. A regular window would activate Magic Slash on every click
    // of the menu bar icon, which macOS answers by jumping to the Space holding
    // the main window and hanging the app menu next to the Apple logo.
    ...(process.platform === 'darwin' ? { type: 'panel' as const } : {}),
    transparent: true,
    hasShadow: true,
    roundedCorners: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Same theme as the main window, from its first frame (see main/theme.ts).
      additionalArguments: appearanceArguments(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    popoverWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}popover.html`)
  } else {
    popoverWindow.loadFile(join(__dirname, '../renderer/popover.html'))
  }

  // The menu bar is shared by every Space and every fullscreen app, so the panel
  // it opens has to be too. skipTransformProcessType keeps Electron from flipping
  // the process to accessory and back on the way — that flip is itself an
  // activation change, and it makes the Dock icon and menu bar blink.
  popoverWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
    skipTransformProcessType: true,
  })

  popoverWindow.on('blur', () => {
    popoverWindow?.hide()
  })

  popoverWindow.on('closed', () => {
    popoverWindow = null
  })

  return popoverWindow
}

export function showPopoverNearTray(trayBounds: Electron.Rectangle): void {
  const win = createPopoverWindow()
  const windowBounds = win.getBounds()
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y })

  // Position: centered horizontally on tray icon, below the menu bar
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
  const y = trayBounds.y + trayBounds.height + 4

  // Clamp x within display bounds
  const maxX = display.workArea.x + display.workArea.width - windowBounds.width
  const minX = display.workArea.x
  x = Math.max(minX, Math.min(maxX, x))

  win.setPosition(x, y, false)
  win.show()
  win.focus()
}

/**
 * Match the window to the height the renderer measured. The panel is anchored
 * under the menu bar, so only the height moves — x and y stay where
 * showPopoverNearTray put them.
 */
export function resizePopover(height: number): void {
  if (!popoverWindow || popoverWindow.isDestroyed()) return
  const clamped = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(height)))
  const bounds = popoverWindow.getBounds()
  if (bounds.height === clamped) return
  popoverWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: clamped })
}

export function hidePopover(): void {
  if (popoverWindow && !popoverWindow.isDestroyed()) {
    popoverWindow.hide()
  }
}

export function togglePopover(trayBounds: Electron.Rectangle): void {
  if (popoverWindow && !popoverWindow.isDestroyed() && popoverWindow.isVisible()) {
    popoverWindow.hide()
  } else {
    showPopoverNearTray(trayBounds)
  }
}

export function destroyPopover(): void {
  if (popoverWindow && !popoverWindow.isDestroyed()) {
    popoverWindow.destroy()
    popoverWindow = null
  }
}
