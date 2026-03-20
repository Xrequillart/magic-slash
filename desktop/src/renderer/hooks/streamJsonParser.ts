import type { StreamEvent } from '../types/streamEvents'

// Pure parser function — no React dependency, testable standalone
export function parseStreamLines(
  buffer: string,
  incoming: string
): { events: StreamEvent[]; remaining: string } {
  const combined = buffer + incoming
  const lines = combined.split('\n')
  // Last element is either empty (if incoming ended with \n) or a partial line
  const remaining = lines.pop() ?? ''
  const events: StreamEvent[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') {
        events.push(parsed as StreamEvent)
      }
    } catch {
      // Non-JSON line (ANSI sequences, shell output) — skip silently
    }
  }

  return { events, remaining }
}
