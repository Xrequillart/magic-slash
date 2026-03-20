import { useEffect, useRef, useCallback, useState } from 'react'
import type { StreamEvent } from '../types/streamEvents'
import { parseStreamLines } from './streamJsonParser'

export type { StreamEvent }
export { parseStreamLines }

export interface StreamJsonParserState {
  events: StreamEvent[]
  lastEvent: StreamEvent | null
  error: string | null
}

export function useStreamJsonParser(
  terminalId: string | null,
  enabled: boolean = true
): StreamJsonParserState {
  const bufferRef = useRef('')
  const [state, setState] = useState<StreamJsonParserState>({
    events: [],
    lastEvent: null,
    error: null,
  })

  const handleData = useCallback((data: string) => {
    const { events, remaining } = parseStreamLines(bufferRef.current, data)
    bufferRef.current = remaining

    if (events.length > 0) {
      setState(prev => ({
        events: [...prev.events, ...events],
        lastEvent: events[events.length - 1],
        error: null,
      }))
    }
  }, [])

  useEffect(() => {
    if (!terminalId || !enabled) return

    // Reset state when terminal changes
    bufferRef.current = ''
    setState({ events: [], lastEvent: null, error: null })

    const unsubscribe = window.electronAPI.terminal.onData(({ id, data }) => {
      if (id === terminalId) {
        handleData(data)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [terminalId, enabled, handleData])

  return state
}
