import { useCallback, useEffect, useState } from 'react'

/**
 * Whether Claude Code turns `:+1` into 👍, as an agent's session sees it (or as the
 * user's own settings say, without one). See main/claude-emoji-completion.ts.
 *
 * The value lives in Claude Code's settings files, not in the app's store: it is asked
 * again when the window comes back to the front (the file may have been edited in a
 * terminal meanwhile) and whenever the switch in Settings writes it.
 */

const listeners = new Set<() => void>()

/** Tells every reader the switch in Settings has just written the setting. */
export function notifyEmojiCompletionChanged(): void {
  for (const listener of listeners) listener()
}

export function useClaudeEmojiCompletion(terminalId?: string): [boolean, (next: boolean) => Promise<void>] {
  // On until told otherwise: Claude Code's own default.
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    let live = true
    const refresh = () => {
      window.electronAPI.config.getClaudeEmojiCompletion(terminalId)
        .then((value) => { if (live) setEnabled(value) })
        .catch(() => {})
    }
    refresh()
    listeners.add(refresh)
    window.addEventListener('focus', refresh)
    return () => {
      live = false
      listeners.delete(refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [terminalId])

  const set = useCallback(async (next: boolean) => {
    await window.electronAPI.config.setClaudeEmojiCompletion(next)
    notifyEmojiCompletionChanged()
  }, [])

  return [enabled, set]
}
