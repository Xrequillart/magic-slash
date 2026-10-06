import { ChatMarkdown, type ChatHighlighter } from './ChatMarkdown'

/**
 * A DOCUMENT A SKILL FRAMED IN ITS MESSAGE, in the chat: the implementation plan
 * `/magic:start` writes is a title between two `━━━` rules, then its body. In a terminal
 * the rules are the frame; in the thread they were two lines of dashes around a heading
 * shouting in capitals, and the plan read as more of Claude's text. Drawn as the card it
 * is, with its title as its head and its body as the markdown it is.
 *
 * The rules are found by `splitInsights` (chatInsights.ts), as the insights are.
 *
 * THE TITLE IS TIDIED, NOT TRANSLATED: the emoji leading it becomes the card's mark, a
 * name in capitals is set in sentence case, and what follows its last ` - ` (the ticket)
 * becomes a chip.
 */

export interface ChatBannerCardProps {
  /** The line between the two rules, as written. */
  title: string
  /** What follows, down to the closing rule, as markdown. */
  text: string
  highlight?: ChatHighlighter
}

const LEADING_EMOJI = /^(\p{Extended_Pictographic}️?)\s*/u

/** The title in its three pieces: the mark, the name, and the subject after a dash. */
export function bannerTitle(raw: string): { mark?: string; name: string; subject?: string } {
  const emoji = raw.match(LEADING_EMOJI)
  let rest = emoji ? raw.slice(emoji[0].length) : raw
  let subject: string | undefined
  const dash = rest.lastIndexOf(' - ')
  if (dash > 0) {
    subject = rest.slice(dash + 3).trim() || undefined
    rest = rest.slice(0, dash)
  }
  let name = rest.trim()
  if (name && name === name.toUpperCase() && name !== name.toLowerCase()) {
    name = name.charAt(0) + name.slice(1).toLowerCase()
  }
  return { mark: emoji?.[1], name, subject }
}

export function ChatBannerCard({ title, text, highlight }: ChatBannerCardProps) {
  const { mark, name, subject } = bannerTitle(title)
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2.5 border-b border-line-subtle bg-ink/[0.03] px-3.5 py-2.5">
        {mark && (
          <span aria-hidden className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm leading-none">
            {mark}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink" title={title}>{name}</p>
        {subject && (
          <span className="flex-shrink-0 rounded-md bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-accent">
            {subject}
          </span>
        )}
      </div>
      {text && (
        <div className="min-w-0 break-words px-3.5 py-3">
          <ChatMarkdown text={text} highlight={highlight} />
        </div>
      )}
    </div>
  )
}
