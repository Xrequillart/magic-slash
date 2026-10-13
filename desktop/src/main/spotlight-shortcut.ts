import { globalShortcut } from 'electron'
import { readConfig } from './config/config'
import { addConfigChangeListener } from './config/remote-sync'
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

/**
 * Re-register the shortcut when Spotlight is turned on or off elsewhere (the iPhone's
 * settings screen), not only from this Mac's own settings page.
 */
export function followRemoteSpotlightChanges(): () => void {
  return addConfigChangeListener(({ prev, next }) => {
    const before = prev?.spotlight ?? DEFAULT_SPOTLIGHT
    const after = next.spotlight ?? DEFAULT_SPOTLIGHT
    if (before.enabled !== after.enabled || before.shortcut !== after.shortcut) reRegisterSpotlightShortcut()
  })
}
