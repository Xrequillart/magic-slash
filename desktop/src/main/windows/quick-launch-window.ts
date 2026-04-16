import { BrowserWindow, screen } from 'electron'
import { join } from 'path'

let quickLaunchWindow: BrowserWindow | null = null

export function createQuickLaunchWindow(): BrowserWindow {
  if (quickLaunchWindow && !quickLaunchWindow.isDestroyed()) {
    return quickLaunchWindow
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

  quickLaunchWindow = new BrowserWindow({
    width: 680,
    height: 56,
    x: Math.round(screenWidth / 2 - 340),
    y: Math.round(screenHeight * 0.25),
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    hasShadow: true,
    roundedCorners: true,
    visibleOnAllWorkspaces: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  const url = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}quick-launch.html`
    : undefined

  if (url) {
    console.log(`[QuickLaunch] Loading URL: ${url}`)
    quickLaunchWindow.loadURL(url)
  } else {
    const filePath = join(__dirname, '../renderer/quick-launch.html')
    console.log(`[QuickLaunch] Loading file: ${filePath}`)
    quickLaunchWindow.loadFile(filePath)
  }

  quickLaunchWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[QuickLaunch] Failed to load: ${errorCode} ${errorDescription}`)
  })

  quickLaunchWindow.on('blur', () => {
    quickLaunchWindow?.hide()
  })

  quickLaunchWindow.on('closed', () => {
    quickLaunchWindow = null
  })

  return quickLaunchWindow
}

export function showQuickLaunch(): void {
  const win = createQuickLaunchWindow()

  // Re-center on current screen
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const { x: dX, y: dY, width: dW, height: dH } = display.workArea
  const bounds = win.getBounds()
  const x = Math.round(dX + dW / 2 - bounds.width / 2)
  const y = Math.round(dY + dH * 0.25)
  win.setPosition(x, y, false)

  win.show()
  win.focus()
}

export function resizeQuickLaunch(height: number): void {
  if (quickLaunchWindow && !quickLaunchWindow.isDestroyed()) {
    const bounds = quickLaunchWindow.getBounds()
    quickLaunchWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height })
  }
}

export function isQuickLaunchVisible(): boolean {
  return quickLaunchWindow !== null && !quickLaunchWindow.isDestroyed() && quickLaunchWindow.isVisible()
}

export function hideQuickLaunch(): void {
  if (quickLaunchWindow && !quickLaunchWindow.isDestroyed()) {
    quickLaunchWindow.hide()
  }
}

export function destroyQuickLaunch(): void {
  if (quickLaunchWindow && !quickLaunchWindow.isDestroyed()) {
    quickLaunchWindow.destroy()
    quickLaunchWindow = null
  }
}
