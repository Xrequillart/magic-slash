import { useEffect, useRef } from 'react'
import { RAISED_PLATE } from './plate'
import type { EmojiMatch } from './chatEmoji'

/**
 * THE `:` LIST of the chat's composer: the emoji Claude Code's prompt would offer for the
 * shortcode being typed (see chatEmoji.ts), in the `/` menu's card (`ChatCommandMenu`).
 *
 * It draws and nothing else: the composer owns the keys (↑ ↓ to move, Tab or Enter to
 * take, Escape to close) and hands this the list and the highlighted row, so focus never
 * leaves the text box.
 */

export interface ChatEmojiMenuProps {
  emojis: EmojiMatch[]
  highlighted: number
  onPick: (match: EmojiMatch) => void
  onHover: (index: number) => void
}

export function ChatEmojiMenu({ emojis, highlighted, onPick, onHover }: ChatEmojiMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // The highlighted row stays in sight as the arrows walk past the edge.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlighted}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  if (emojis.length === 0) return null
  return (
    <div
      ref={listRef}
      role="listbox"
      className={`max-h-72 overflow-y-auto rounded-xl border border-line ${RAISED_PLATE} p-1`}
    >
      {emojis.map((match, index) => {
        const on = index === highlighted
        return (
          <div
            key={match.name}
            data-index={index}
            role="option"
            aria-selected={on}
            // Mouse down, not click: a click would blur the text box first.
            onMouseDown={(e) => {
              e.preventDefault()
              onPick(match)
            }}
            onMouseEnter={() => onHover(index)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 ${on ? 'bg-accent/10' : ''}`}
          >
            <span className="flex-shrink-0 text-base leading-none">{match.emoji}</span>
            <span className={`min-w-0 flex-1 truncate font-mono text-xs font-medium ${on ? 'text-accent' : 'text-ink'}`}>:{match.name}:</span>
          </div>
        )
      })}
    </div>
  )
}
