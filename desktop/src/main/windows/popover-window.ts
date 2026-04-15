import { BrowserWindow, screen } from 'electron'
import { join } from 'path'

let popoverWindow: BrowserWindow | null = null

export function createPopoverWindow(): BrowserWindow {
  if (popoverWindow && !popoverWindow.isDestroyed()) {
    return popoverWindow
  }

  popoverWindow = new BrowserWindow({
    width: 320,
    height: 420,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    transparent: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
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
