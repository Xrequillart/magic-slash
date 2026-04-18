import { globalShortcut } from 'electron'
import { readConfig } from './config/config'
import { DEFAULT_SPOTLIGHT, isValidSpotlightShortcut } from './config/defaults'
import { showQuickLaunch, hideQuickLaunch, isQuickLaunchVisible } from './windows/quick-launch-window'

let currentSpotlightShortcut: string | null = null

export function reRegisterSpotlightShortcut(): { registered: boolean; disabled: boolean } {
  if (currentSpotlightShortcut) {
    globalShortcut.unregister(currentSpotlightShortcut)
    currentSpotlightShortcut = null
  }

  const config = readConfig()
  const spotlight = config.spotlight ?? DEFAULT_SPOTLIGHT

  if (!spotlight.enabled) {
    return { registered: false, disabled: true }
  }

  const shortcut = isValidSpotlightShortcut(spotlight.shortcut)
    ? spotlight.shortcut
    : DEFAULT_SPOTLIGHT.shortcut

  const registered = globalShortcut.register(shortcut, () => {
    if (isQuickLaunchVisible()) {
      hideQuickLaunch()
    } else {
      showQuickLaunch()
    }
  })

  if (registered) {
    currentSpotlightShortcut = shortcut
  }

  console.log(`[QuickLaunch] Global shortcut '${shortcut}' registered: ${registered}`)
  return { registered, disabled: false }
}
