import { useEffect, useState, useCallback } from 'react'
import type { StreamEvent } from '../types/streamEvents'

export type { StreamEvent }

export interface StreamJsonParserState {
  events: StreamEvent[]
  lastEvent: StreamEvent | null
  error: string | null
  isLoading: boolean
}

// --- SessionStorage persistence for overlay events ---
const EVENTS_STORAGE_KEY = 'magic-slash-overlay-events'

function loadEvents(terminalId: string): StreamEvent[] {
  try {
    const raw = sessionStorage.getItem(EVENTS_STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, StreamEvent[]>
    return all[terminalId] || []
  } catch {
    return []
  }
}

function saveEvents(terminalId: string, events: StreamEvent[]) {
  try {
    const raw = sessionStorage.getItem(EVENTS_STORAGE_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[terminalId] = events
    sessionStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(all))
  } catch { /* ignore storage errors */ }
}

// --- Module-level persistent storage (survives component lifecycle) ---

interface TerminalStreamData {
  events: StreamEvent[]
  lastEvent: StreamEvent | null
  isLoading: boolean
}

const terminalStreams = new Map<string, TerminalStreamData>()
const subscribers = new Map<string, Set<() => void>>()

let globalUnsubData: (() => void) | null = null
let globalUnsubDone: (() => void) | null = null
let listenerCount = 0

function getOrCreateStream(id: string): TerminalStreamData {
  let stream = terminalStreams.get(id)
  if (!stream) {
    // Restore from sessionStorage on first access
    const restored = loadEvents(id)
    const lastEvent = restored.length > 0 ? restored[restored.length - 1] : null
    stream = { events: restored, lastEvent, isLoading: false }
    terminalStreams.set(id, stream)
  }
  return stream
}

function notifySubscribers(id: string) {
  const subs = subscribers.get(id)
  if (subs) {
    subs.forEach(cb => cb())
  }
}

function setupGlobalListener() {
  listenerCount++
  if (globalUnsubData) return

  globalUnsubData = window.electronAPI.overlay.onData(({ id, data }) => {
    try {
      const parsed = JSON.parse(data) as StreamEvent
      const stream = getOrCreateStream(id)
      stream.events = [...stream.events, parsed]
      stream.lastEvent = parsed
      stream.isLoading = parsed.type !== 'result' && parsed.type !== 'interrupted'
      // Persist to sessionStorage
      saveEvents(id, stream.events)
      notifySubscribers(id)
    } catch {
      // Ignore malformed JSON lines
    }
  })

  globalUnsubDone = window.electronAPI.overlay.onDone(({ id }) => {
    const stream = terminalStreams.get(id)
    if (stream) {
      stream.isLoading = false
      notifySubscribers(id)
    }
  })
}

function teardownGlobalListener() {
  listenerCount--
  if (listenerCount === 0) {
    if (globalUnsubData) {
      globalUnsubData()
      globalUnsubData = null
    }
    if (globalUnsubDone) {
      globalUnsubDone()
      globalUnsubDone = null
    }
  }
}

export function clearTerminalStream(id: string) {
  terminalStreams.delete(id)
  subscribers.delete(id)
}

// --- Hook ---

const EMPTY_STATE: StreamJsonParserState = { events: [], lastEvent: null, error: null, isLoading: false }

/**
 * Hook that listens to overlay:data IPC events (stream-json from Claude Code)
 * and parses them into StreamEvent objects.
 * Events are captured for ALL terminals via a global listener and persisted
 * in sessionStorage so they survive page refreshes and agent switches.
 */
export function useStreamJsonParser(
  terminalId: string | null,
  enabled: boolean = true
): StreamJsonParserState & { clearEvents: () => void } {
  const [, forceRender] = useState(0)
  const triggerRender = useCallback(() => forceRender(c => c + 1), [])

  // Setup global listener (captures events for ALL terminals)
  useEffect(() => {
    if (!enabled) return
    setupGlobalListener()
    return () => teardownGlobalListener()
  }, [enabled])

  // Subscribe to the active terminal's updates for re-renders
  useEffect(() => {
    if (!terminalId || !enabled) return

    // Ensure stream exists (restores from sessionStorage if needed)
    getOrCreateStream(terminalId)

    let subs = subscribers.get(terminalId)
    if (!subs) {
      subs = new Set()
      subscribers.set(terminalId, subs)
    }
    subs.add(triggerRender)

    // Trigger initial render to show existing/restored events
    triggerRender()

    return () => {
      subs!.delete(triggerRender)
      if (subs!.size === 0) {
        subscribers.delete(terminalId)
      }
    }
  }, [terminalId, enabled, triggerRender])

  const clearEvents = useCallback(() => {
    if (terminalId) {
      const stream = terminalStreams.get(terminalId)
      if (stream) {
        stream.events = []
        stream.lastEvent = null
        stream.isLoading = false
      }
      saveEvents(terminalId, [])
      triggerRender()
    }
  }, [terminalId, triggerRender])

  if (!terminalId || !enabled) {
    return { ...EMPTY_STATE, clearEvents }
  }

  const stream = terminalStreams.get(terminalId)
  if (!stream) {
    return { ...EMPTY_STATE, clearEvents }
  }

  return {
    events: stream.events,
    lastEvent: stream.lastEvent,
    error: null,
    isLoading: stream.isLoading,
    clearEvents,
  }
}
