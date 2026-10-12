import { Sparkles } from './icons'
import { ChatMarkdown, type ChatHighlighter } from './ChatMarkdown'

/**
 * AN INSIGHT CLAUDE SET APART, in the chat: what Claude Code's explanatory output style
 * frames between a `★ Insight ───` rule and a closing `───` rule, drawn as the aside it
 * is meant to be rather than as two lines of inline code around a list.
 *
 * The rules are found by `splitInsights` (chatInsights.ts), which the thread runs on
 * every message of Claude's; what is between them is markdown like the rest, and drawn
 * by the same hand.
 *
 * "Insight" is Claude Code's own word for it, printed by the CLI in every language, so it
 * is not translated here either.
 */

export interface ChatInsightCardProps {
  /** What was between the two rules, as markdown. */
  text: string
  highlight?: ChatHighlighter
}

export function ChatInsightCard({ text, highlight }: ChatInsightCardProps) {
  return (
    <div className="rounded-xl border border-accent/25 bg-accent/5 px-3.5 py-2.5">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-accent">
        <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
        Insight
      </p>
      <div className="min-w-0 break-words">
        <ChatMarkdown text={text} highlight={highlight} />
      </div>
    </div>
  )
}
