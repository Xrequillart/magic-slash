import { useEffect, useRef } from 'react'
import { SquareTerminal } from './icons'
import { RAISED_PLATE } from './plate'
import type { ChatCommand } from './chatCommandMatch'

export type { ChatCommand } from './chatCommandMatch'

/**
 * THE `/` MENU of the chat's composer: the commands Claude Code would offer at the same
 * keystroke, filtered by what follows the slash.
 *
 * It draws and nothing else: the composer owns the keys (↑ ↓ to move, Tab or Enter to
 * take, Escape to close) and hands this the list and the highlighted row, so focus never
 * leaves the text box.
 *
 * `interactive` marks a command whose answer is a dialog of the TUI (`/mcp`, `/model`):
 * it runs all the same, and the mark says the terminal is where it will open.
 */


export interface ChatCommandMenuProps {
  commands: ChatCommand[]
  highlighted: number
  onPick: (command: ChatCommand) => void
  onHover: (index: number) => void
  /** Says that a command opens in the terminal. Translated. */
  interactiveHint: string
}

export function ChatCommandMenu({ commands, highlighted, onPick, onHover, interactiveHint }: ChatCommandMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // The highlighted row stays in sight as the arrows walk past the edge.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  if (commands.length === 0) return null
  return (
    <div
      ref={listRef}
      role="listbox"
      className={`max-h-72 overflow-y-auto rounded-xl border border-line ${RAISED_PLATE} p-1`}
    >
      {commands.map((command, index) => {
        const on = index === highlighted
        return (
          <div
            key={`${command.source}:${command.name}`}
            data-index={index}
            role="option"
            aria-selected={on}
            // Mouse down, not click: a click would blur the text box first.
            onMouseDown={(e) => {
              e.preventDefault()
              onPick(command)
            }}
            onMouseEnter={() => onHover(index)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 ${on ? 'bg-accent/10' : ''}`}
          >
            <span className={`flex-shrink-0 font-mono text-xs font-medium ${on ? 'text-accent' : 'text-ink'}`}>/{command.name}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-text-secondary/70">{command.description}</span>
            {command.interactive && (
              <span title={interactiveHint} className="flex-shrink-0">
                <SquareTerminal className="w-3.5 h-3.5 text-icon-muted" />
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
