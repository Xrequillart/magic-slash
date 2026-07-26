import { useCallback, useSyncExternalStore } from 'react'
import { clampZoom, DEFAULT_ZOOM, nextZoom } from '../../types'

/**
 * The interface scale, as the main process holds it.
 *
 * The renderer never scales itself — the zoom lives on the window's webContents.
 * This only reads the current value and asks for a new one, and it listens to
 * the main process because the View menu and its ⌘+ / ⌘− change the zoom from
 * outside React entirely.
 */

let current = clampZoom(window.electronAPI?.zoom?.initial() ?? DEFAULT_ZOOM)
const listeners = new Set<() => void>()

window.electronAPI?.zoom?.onChanged((zoom) => {
  const applied = clampZoom(zoom)
  if (applied === current) return
  current = applied
  for (const listener of listeners) listener()
})

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useZoom() {
  const zoom = useSyncExternalStore(subscribe, () => current)

  // The main process answers with the value it actually applied (clamped), and
  // broadcasts it, so no local state is set here — the event is the update.
  const set = useCallback((value: number) => {
    void window.electronAPI?.zoom?.set(clampZoom(value))
  }, [])

  const step = useCallback((direction: 1 | -1) => {
    void window.electronAPI?.zoom?.set(nextZoom(current, direction))
  }, [])

  return { zoom, set, step }
}
