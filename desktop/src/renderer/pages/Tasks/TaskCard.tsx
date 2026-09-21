import { useCallback, useMemo } from 'react'
import { TicketCard, type TicketCardNote, type TicketCardTag } from '@ds/desktop'
import { BotMessageSquare, Play } from '@ds/desktop/icons'
import type { RepositoryConfig } from '../../../types'
import type { BoardCard } from '../../utils/taskBoard'
import type { TaskSelection } from '../../utils/taskSelection'
import { useT, type Translate } from '../../i18n'
import { useTaskAgent } from '../../hooks/useTaskAgent'
import { useStore } from '../../store'
import {
  JIRA_PRIORITY_MARK,
  JIRA_STATUS_TONE,
  jiraEpicHint,
  jiraPriorityHint,
  subIssuesLabel,
} from './parts'

/**
 * ONE TICKET ON THE BOARD — which is `TicketCard` in `@ds/desktop` now, and what is
 * left here is the translation from a `BoardCard` into its props.
 *
 * The drawing moved out whole: three stacked bands, the plate that replaced the border,
 * the green tint an agented ticket wears, the keyboard half a `role="button"` has to
 * provide for itself. None of that is about Jira or GitHub, and the day the Plans page
 * wants a ticket tile it should not have to copy it out of here.
 *
 * WHAT COULD NOT GO is everything above: the two hooks (`useTaskAgent` decides whether
 * an agent can be opened at all, the store says whether the board is in picking mode),
 * the catalogue, and the branch on the tracker — a Jira ticket has a status, an epic and
 * a reporter where a GitHub issue has a parent, an author and a count of children, and
 * only the labels line up. That branch is the app's vocabulary, which is exactly the
 * half a design system may not hold.
 *
 * MEMOISATION MOVED WITH THE DRAWING. `TicketCard` is the `memo`, so this file no longer
 * wraps anything: the props built below are all primitives and arrays rebuilt per render,
 * and memoising on them would compare a fresh array every time and never hit.
 */
export function TaskCard({
  card,
  repoConfigs,
  onSelect,
}: {
  card: BoardCard
  /**
   * The configuration of every repository behind the card's row, by config key.
   *
   * Handed down rather than read here: `useConfig` subscribes to the whole config, and
   * a subscription per card would re-render the entire board whenever any setting
   * anywhere changed. The board reads it once and passes the slice.
   */
  repoConfigs: Record<string, RepositoryConfig | undefined>
  onSelect: (selection: TaskSelection) => void
}) {
  const t = useT()
  const picking = useStore((s) => s.tasksPickAgentId !== null)
  const { canStart, startFailed, startAgent } = useTaskAgent(
    // EVERY repository the card stands for, paired with its configuration — usually
    // one, and two when a tracker target is shared (see `TaskRow.repos`). The launcher
    // needs the whole list rather than the first: it is what decides whether a
    // repository can be picked for the agent at all, or the choice has to be left to
    // `/magic:start`.
    card.row.repos.map((repo) => ({ ...repo, config: repoConfigs[repo.configKey] })),
  )

  const select = useCallback(() => {
    onSelect(card.tracker === 'jira'
      ? { tracker: 'jira', configKey: card.row.configKey, key: card.issue.key }
      : { tracker: 'github', configKey: card.row.configKey, number: card.issue.number })
  }, [onSelect, card])

  const start = useCallback(() => {
    startAgent(card.id, card.tracker === 'jira' ? card.issue.key : card.issue.url)
  }, [startAgent, card])

  /**
   * Whether Start is offered at all.
   *
   * THREE REASONS IT IS NOT, all of them "there is nothing to start". A ticket somebody
   * is already on gets the agent mark in the same slot instead — `/magic:start` on it
   * would be a second worktree and a second branch for one piece of work, the expensive
   * mistake. A ticket in the Done column is finished: on the Jira side its board says
   * so, on the GitHub side the issue is closed, and neither is work to pick up. And the
   * board may be open to CHOOSE a ticket for an agent that already exists, where Start
   * would launch a different, new one from the very card about to be attached.
   *
   * `canStart` is the fourth and is about this MACHINE rather than about the ticket — no
   * repository behind it has a local folder to open a terminal in — so it disables the
   * button rather than withholding it: there is something to press and a reason it
   * cannot be. `startFailed` disables nothing and only colours, so a launch that failed
   * can simply be tried again.
   */
  const canShowStart = !card.hasAgent && card.column !== 'done' && !picking

  /** The chips and the plain words on the third band, which is where the two trackers differ. */
  const { tags, notes } = useMemo(() => buildMeta(card, t), [card, t])

  return (
    <TicketCard
      tracker={card.tracker}
      ticketId={card.tracker === 'jira' ? card.issue.key : `#${card.issue.number}`}
      title={card.issue.title}
      // BESIDE THE ID, not down with the metadata. Priority is the field that decides
      // which of two tickets you pick up, and down there it was one badge among a
      // status, an epic, a reporter and every label. Jira only: a GitHub issue has no
      // priority field, and a label saying "urgent" is already drawn as a label.
      {...(card.tracker === 'jira' && card.issue.priority
        ? {
          mark: {
            ...JIRA_PRIORITY_MARK[card.issue.priority.level],
            label: jiraPriorityHint(card.issue.priority, t),
          },
        }
        : {})}
      {...(card.tracker === 'jira' && card.issue.statusName
        ? {
          // The site's own word for the column, not ours. It is redundant with the
          // column the card sits in for "To Do" and "Done", and it is not for anything
          // in between: "In Review" and "QA" both land in progress.
          status: { label: card.issue.statusName, tone: JIRA_STATUS_TONE[card.issue.statusCategory] },
        }
        : {})}
      tags={tags}
      notes={notes}
      // Both controls hang off a browse URL, which a Jira ticket only has once a site
      // has been resolved. A repository declaring only a project key, read with a
      // credential whose site URL is missing, has none to offer — and a dead copy button
      // is a worse answer than no button. The card itself still opens the ticket's page,
      // which needs no site at all.
      {...(card.issue.url
        ? {
          copy: {
            value: card.issue.url,
            label: t('tasks.copyLink'),
            copiedLabel: t('tasks.copyLinkDone'),
          },
        }
        : {})}
      {...(card.hasAgent
        ? { agent: { icon: BotMessageSquare, label: t('tasks.hasAgentHint') } }
        : canShowStart
          ? {
            action: {
              icon: Play,
              title: canStart ? t('tasks.startAgent') : t('tasks.startNoPath'),
              onClick: start,
              disabled: !canStart,
              // Coloured rather than disabled, so a launch that failed can be tried
              // again from the same button.
              tone: startFailed ? 'danger' : 'ghost',
            },
          }
          : {})}
      onOpen={select}
    />
  )
}

/**
 * Everything known about the ticket that is not its title, split into the two shapes
 * `TicketCard` draws: PLATES for the things that are named, and plain WORDS for the
 * things that are said.
 *
 * NO REPOSITORY CHIP. Every card on the board belongs to the repository named in the
 * picker at the top, so one repeated on all of them identifies nothing — it was the
 * list's way of telling cards from different repositories apart, and the list is gone.
 *
 * The priority is not here either: it sits beside the id in the header, where the
 * pick-up decision is actually made.
 */
function buildMeta(card: BoardCard, t: Translate): { tags: TicketCardTag[]; notes: TicketCardNote[] } {
  const tags: TicketCardTag[] = []
  const notes: TicketCardNote[] = []

  if (card.tracker === 'jira') {
    if (card.issue.epic) {
      tags.push({
        id: `epic:${card.issue.epic.key}`,
        label: card.issue.epic.title,
        title: jiraEpicHint(card.issue.epic, t),
        truncate: true,
        ...(card.issue.epic.color ? { color: card.issue.epic.color } : {}),
      })
    }
    if (card.issue.reporter) {
      // The display name bare, where the GitHub half prefixes a login with `@`: "Ada
      // Lovelace" is a name and not a handle, and `@Ada Lovelace` reads as a mention of
      // an account that does not exist.
      notes.push({
        id: 'reporter',
        text: card.issue.reporter,
        title: t('tasks.jira.reporterHint', { name: card.issue.reporter }),
      })
    }
  } else {
    if (card.issue.parent) {
      // A chip in neutral tokens rather than the tracker's: two coloured badges on one
      // card would read as two tickets. The number is all that fits, so the parent's
      // title goes in the hover text.
      tags.push({
        id: `parent:${card.issue.parent.number}`,
        label: t('tasks.parent', { number: card.issue.parent.number }),
        title: t('tasks.parentHint', { number: card.issue.parent.number, title: card.issue.parent.title }),
      })
    }
    if (card.issue.author) {
      notes.push({
        id: 'author',
        text: `@${card.issue.author}`,
        title: t('tasks.authorHint', { login: card.issue.author }),
      })
    }
    if (card.issue.subIssues) {
      notes.push({ id: 'subIssues', text: subIssuesLabel(card.issue.subIssues, t) })
    }
  }

  // LAST on the band on both halves, because they are the only part of it the reader
  // wrote themselves — everything above is the tracker's own vocabulary.
  for (const label of card.issue.labels) {
    tags.push({ id: `label:${label}`, label, title: label })
  }

  return { tags, notes }
}
