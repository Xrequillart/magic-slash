import { RAISED_PLATE } from './plate'

/**
 * THE PROMPTS WAITING THEIR TURN, over the chat's composer: what was typed while the
 * agent worked, which Claude Code holds and lets in, oldest first, as the turn allows.
 *
 * Opened from the composer's queue button, in the place and with the motion of the `/`
 * menu (see `ChatCommandMenu`), and like it it draws and nothing else: the composer owns
 * when it shows. Read-only: the queue is Claude Code's, and taking a prompt back out of
 * it is done in the terminal, where it lives.
 */

export interface ChatQueuedPromptData {
  id: string
  text: string
}

export interface ChatQueueCardProps {
  prompts: ChatQueuedPromptData[]
  labels: {
    /** The heading, before the count. */
    title: string
    /** Under it: when they will be sent. */
    hint: string
  }
}

export function ChatQueueCard({ prompts, labels }: ChatQueueCardProps) {
  return (
    <div className={`rounded-xl border border-line ${RAISED_PLATE} p-1`}>
      <div className="px-2.5 pb-1.5 pt-1.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
          {labels.title}
          <span className="rounded-full bg-accent/10 px-1.5 text-[11px] tabular-nums text-accent">{prompts.length}</span>
        </p>
        <p className="text-xs text-text-secondary/70">{labels.hint}</p>
      </div>
      <ol className="max-h-72 overflow-y-auto">
        {prompts.map((prompt, index) => (
          <li key={prompt.id} className="flex items-start gap-2.5 rounded-lg px-2.5 py-1.5">
            <span className="mt-px flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-ink/5 text-[10px] font-medium tabular-nums text-text-secondary">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs text-ink line-clamp-4" title={prompt.text}>
              {prompt.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
