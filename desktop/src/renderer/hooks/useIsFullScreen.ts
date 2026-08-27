import { useEffect, useState } from 'react'

/**
 * Whether the window is in native macOS fullscreen. The traffic lights are gone
 * there, so anything laid out around them has to know — the main process is the
 * only side that can tell us, hence the IPC rather than a media query.
 */
export function useIsFullScreen(): boolean {
  const [isFullScreen, setIsFullScreen] = useState(false)

  useEffect(() => {
    let cancelled = false
    // A remount mid-fullscreen misses the transition event, so the state is also
    // read once on mount rather than assumed windowed.
    window.electronAPI.window.isFullScreen().then((value) => {
      if (!cancelled) setIsFullScreen(value)
    })
    const unsubscribe = window.electronAPI.window.onFullScreenChanged(setIsFullScreen)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return isFullScreen
}
