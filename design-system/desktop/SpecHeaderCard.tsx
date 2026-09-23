import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Label } from './Label'
import { CalendarDays, CircleCheck, CircleDashed, CircleDot, CircleSlash, FolderGit2 } from './icons'
import type { IconComponent } from './types'

/**
 * WHERE A SPEC LIVES AND WHERE IT STANDS: the four facts a `/magic:plan` spec opens with —
 * its repository, its tracker, the day it was written and its status — as one card of
 * four cells rather than four bullets under the title.
 *
 * ALL OF IT IS DATA, strings and tones, and nothing is a slot: unlike `DecisionList` and
 * `SizingCard`, whose values are the spec's own markdown, these are identifiers the skill
 * writes by rule. The status is a word from a closed set, drawn as a coloured `Label`; the
 * tracker a `Label` in its product's tone.
 *
 * NOT A LINE TO COMMENT ON. These are the spec's coordinates, not a claim anybody argues
 * with; a thread about the tracker is a thread about the wrong thing. So the card draws no
 * mark, its words cannot be selected, and it carries `data-comment-exempt`, which a comment
 * layer reads as "leave this out": no selection in it opens a composer, and its text is
 * never part of a quote.
 */

export type SpecStatusTone = 'drafting' | 'awaiting' | 'created' | 'abandoned' | 'unknown'

export interface SpecHeaderCardProps {
  repository?: { name: string; path?: string }
  tracker?: { name: string; tone: 'github' | 'jira' | 'neutral' }
  /** Already formatted for the reader's language. */
  created?: string
  /** `label` already translated; `tone` says which of the skill's statuses it is. */
  status?: { label: string; tone: SpecStatusTone }
  /** Already translated: the caption over each cell. */
  labels: { repository: string; tracker: string; created: string; status: string }
  className?: string
}

/** Each status's colour and mark. A palette colour as a value, which `Label`'s `color` takes. */
const STATUS: Record<SpecStatusTone, { color?: string; icon: IconComponent }> = {
  drafting: { color: 'rgb(var(--c-yellow))', icon: CircleDashed },
  awaiting: { color: 'rgb(var(--c-blue))', icon: CircleDot },
  created: { color: 'rgb(var(--c-green))', icon: CircleCheck },
  abandoned: { color: 'rgb(var(--c-red))', icon: CircleSlash },
  unknown: { icon: CircleDot },
}

function Cell({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary/70">{caption}</span>
      <div className="flex min-w-0 items-center gap-2">{children}</div>
    </div>
  )
}

export function SpecHeaderCard({ repository, tracker, created, status, labels, className = '' }: SpecHeaderCardProps) {
  const tone = status ? STATUS[status.tone] : null
  return (
    <div
      data-comment-exempt=""
      className={`my-4 grid select-none grid-cols-2 overflow-hidden rounded-lg border border-line bg-ink/[0.03]
        [&>*]:border-line-subtle [&>*:nth-child(odd)]:border-r [&>*:nth-child(n+3)]:border-t ${className}`.trim()}
    >
      {repository && (
        <Cell caption={labels.repository}>
          <Label icon={FolderGit2}>{repository.name}</Label>
          {repository.path && (
            <span className="min-w-0 truncate font-mono text-xs text-text-secondary/70" title={repository.path}>
              {repository.path}
            </span>
          )}
        </Cell>
      )}
      {tracker && (
        <Cell caption={labels.tracker}>
          <Label tone={tracker.tone}>{tracker.name}</Label>
        </Cell>
      )}
      {created && (
        <Cell caption={labels.created}>
          <Icon glyph={CalendarDays} tone="muted" />
          <span className="text-sm font-medium text-ink">{created}</span>
        </Cell>
      )}
      {status && tone && (
        <Cell caption={labels.status}>
          <Label icon={tone.icon} color={tone.color}>{status.label}</Label>
        </Cell>
      )}
    </div>
  )
}
