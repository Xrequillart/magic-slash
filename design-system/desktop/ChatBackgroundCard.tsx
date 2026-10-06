import { RAISED_PLATE } from './plate'

/**
 * THE AGENTS AT WORK IN THE BACKGROUND, over the chat's composer: the subagents the
 * session launched with `run_in_background`, which go on out of the conversation and
 * that nothing else on screen shows until they hand back.
 *
 * Opened from the composer's wave button, in the place and with the motion of the queue
 * card (see `ChatQueueCard`), and like it it draws and nothing else: the composer owns
 * when it shows. A name per agent and no more: what each one is doing is in the terminal.
 */

export interface ChatBackgroundAgentData {
  id: string
  description: string
}

export interface ChatBackgroundCardProps {
  agents: ChatBackgroundAgentData[]
  labels: {
    /** The heading, before the count. */
    title: string
    /** Under it: what becomes of them. */
    hint: string
  }
}

export function ChatBackgroundCard({ agents, labels }: ChatBackgroundCardProps) {
  return (
    <div className={`rounded-xl border border-line ${RAISED_PLATE} p-1`}>
      <div className="px-2.5 pb-1.5 pt-1.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
          {labels.title}
          <span className="rounded-full bg-accent/10 px-1.5 text-[11px] tabular-nums text-accent">{agents.length}</span>
        </p>
        <p className="text-xs text-text-secondary/70">{labels.hint}</p>
      </div>
      <ul className="max-h-72 overflow-y-auto">
        {agents.map((agent) => (
          <li key={agent.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent animate-pulse motion-reduce:animate-none" />
            <span className="min-w-0 flex-1 truncate text-xs text-ink" title={agent.description}>
              {agent.description}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
