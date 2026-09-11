import { memo, useCallback, type KeyboardEvent } from 'react'
import { Play } from 'lucide-react'
import type { RepositoryConfig } from '../../../types'
import type { BoardCard } from '../../utils/taskBoard'
import type { TaskSelection } from '../../utils/taskSelection'
import { useT, type Translate } from '../../i18n'
import { useTaskAgent } from '../../hooks/useTaskAgent'
import { StatusPill } from '../Dashboard/parts'
import { CopyLinkButton } from '../../components/CopyLinkButton'
import { TrackerBadge } from '../../components/icons/TrackerIcons'
import { AgentMarker, JiraEpicBadge, JiraPriorityBadge, JiraStatusPill, subIssuesLabel } from './parts'

/**
 * One ticket on the board.
 *
 * The row this replaces was a full-width strip with everything on two lines; a column
 * is a quarter of that width, so the card is three stacked bands instead — a top band
 * that identifies the ticket and carries its two actions, the title, then whatever
 * metadata the ticket has. Nothing wraps into the actions, which is the property a
 * strip could not keep once the width went.
 *
 * A DIV WITH A ROLE, not a `<button>`: the card contains buttons of its own, and a
 * button inside a button is invalid markup no amount of `stopPropagation` fixes. That
 * also means the keyboard half is ours to provide — a real button answers Enter and
 * Space for free, and a `role="button"` that only answers the mouse is unreachable
 * without one.
 *
 * MEMOISED, and it matters more here than it did on a row: the board rebuilds its four
 * columns whenever anything on the page changes — a keystroke in the search box, a
 * terminal tick that moves the agent index — and a repository's sprint is up to
 * seventy-five cards.
 */
export const TaskCard = memo(function TaskCard({
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

  const start = useCallback((event: { stopPropagation: () => void }) => {
    // The card opens the ticket's page, so without this one click on Start would both
    // launch the agent and navigate away from the button that launched it.
    event.stopPropagation()
    startAgent(card.id, card.tracker === 'jira' ? card.issue.key : card.issue.url)
  }, [startAgent, card])

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    select()
  }, [select])

  /**
   * Why the Start button is off, in the order the reasons matter.
   *
   * `hasAgent` leads: `/magic:start` on a ticket somebody is already on is a second
   * worktree and a second branch for one piece of work, which is the expensive mistake.
   * `canStart` is the other, and it is about this machine rather than about the ticket —
   * no repository behind it has a local folder to open a terminal in.
   *
   * `startFailed` says nothing here, deliberately: it never disables the button, it only
   * colours it, so a launch that failed can simply be tried again.
   */
  /**
   * Whether the third band has anything to draw — see its guard below.
   *
   * Asked per tracker, because the two carry different things: a Jira ticket has a
   * status, an epic, a priority and a reporter, a GitHub issue has a parent, an author
   * and a count of children. Only the labels and the agent marker are common.
   */
  const hasMeta = card.hasAgent || card.issue.labels.length > 0 || (
    card.tracker === 'jira'
      ? !!card.issue.statusName || !!card.issue.epic || !!card.issue.priority || !!card.issue.reporter
      : !!card.issue.parent || !!card.issue.author || !!card.issue.subIssues
  )

  const startTitle = card.hasAgent
    ? t('tasks.hasAgentHint')
    : canStart
      ? t('tasks.startAgent')
      : t('tasks.startNoPath')

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={select}
      onKeyDown={onKeyDown}
      className="group flex flex-col gap-2 p-3 rounded-lg bg-bg-secondary border border-line-field
        cursor-pointer transition-colors hover:border-accent/40 hover:bg-surface"
    >
      {/* WHAT this is, and the two things you can do with it without opening it. The
          band is one line and never wraps: the label truncates before the buttons give up
          any width, because a half-visible id is still an id and a half-visible button
          is not a button. */}
      <div className="flex items-center gap-2 min-w-0">
        {/* The mark and the id as ONE label, on the tracker's own ground — Atlassian's
            blue for Jira, our own grey for GitHub. Always, on every card: the board mixes
            a repository's GitHub issues and its Jira tickets in the same four columns, so
            the mark is what says which of the two a card came from. See `TrackerBadge`. */}
        <TrackerBadge
          tracker={card.tracker}
          ticketId={card.tracker === 'jira' ? card.issue.key : `#${card.issue.number}`}
        />
        <span className="ml-auto flex items-center gap-1 flex-shrink-0">
          {/* Both buttons hang off a browse URL, which a Jira ticket only has once a
              site has been resolved. A repository that declares only a project key, read
              with a credential whose site URL is missing, has none to offer — and a dead
              copy button is a worse answer than no button. The card itself still opens
              the ticket's page, which needs no site at all. */}
          {card.issue.url && (
            <CopyLinkButton
              url={card.issue.url}
              copyLabel={t('tasks.copyLink')}
              copiedLabel={t('tasks.copyLinkDone')}
              className="flex items-center p-1.5 rounded-md text-text-secondary
                hover:bg-surface-strong hover:text-ink transition-colors flex-shrink-0"
              iconClassName="w-3.5 h-3.5"
            />
          )}
          <button
            type="button"
            onClick={start}
            disabled={!canStart || card.hasAgent}
            title={startTitle}
            aria-label={t('tasks.startAgent')}
            className={`flex items-center p-1.5 rounded-md transition-colors flex-shrink-0
              disabled:opacity-40 disabled:cursor-not-allowed ${
              startFailed
                ? 'text-orange hover:bg-orange/10'
                : 'text-accent hover:bg-accent/10 disabled:hover:bg-transparent'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
          </button>
        </span>
      </div>

      {/* Two lines at most, then an ellipsis. A column is too narrow to promise a whole
          title, and a card that grows to four lines of it pushes the rest of its column
          off the screen; the page the card opens shows the title in full. */}
      <span className="text-sm text-ink line-clamp-2 leading-snug">{card.issue.title}</span>

      {/* Only when there is something on it. The repository dot used to guarantee this
          line had content; without it a GitHub issue with no author, no parent, no
          children and no labels would draw an empty row and the gap above it. */}
      {hasMeta && <CardMeta card={card} t={t} />}
    </div>
  )
})

/**
 * Everything known about the ticket that is not its title — its status, who filed it,
 * its labels.
 *
 * NO REPOSITORY DOT. Every card on the board belongs to the repository named in the
 * picker at the top, so a dot repeated on all of them identifies nothing — it was the
 * list's way of telling cards from different repositories apart, and the list is gone.
 *
 * Its own component so the card above reads as the three bands it is, and because this
 * is the half where the two trackers genuinely differ: a Jira ticket has a status, a
 * priority and an epic, a GitHub issue has a parent and a count of children, and only
 * the reporter and the labels line up.
 *
 * `flex-wrap`, because in a column this WILL wrap and a row that clipped its labels
 * would be hiding the one piece of metadata people label issues for.
 */
function CardMeta({ card, t }: { card: BoardCard; t: Translate }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
      {/* Somebody is already on this one — the one piece of metadata that changes what
          you would DO with the card, which is why it leads the rest. */}
      {card.hasAgent && <AgentMarker t={t} />}

      {card.tracker === 'jira' ? (
        <>
          {/* The site's own word for the column, not ours. It is redundant with the
              column the card sits in for "To Do" and "Done", and it is not for
              everything in between: "In Review" and "QA" both land in progress, and the
              pill is what tells them apart. */}
          <JiraStatusPill name={card.issue.statusName} category={card.issue.statusCategory} />
          {card.issue.epic && <JiraEpicBadge epic={card.issue.epic} t={t} />}
          {card.issue.priority && <JiraPriorityBadge priority={card.issue.priority} t={t} />}
          {card.issue.reporter && (
            // The display name bare, where the GitHub half prefixes a login with `@`:
            // "Ada Lovelace" is a name and not a handle, and `@Ada Lovelace` reads as a
            // mention of an account that does not exist.
            <span
              title={t('tasks.jira.reporterHint', { name: card.issue.reporter })}
              className="text-xs text-text-secondary truncate max-w-[10rem]"
            >
              {card.issue.reporter}
            </span>
          )}
          {card.issue.labels.map((label) => <StatusPill key={label} status={label} />)}
        </>
      ) : (
        <>
          {card.issue.parent && (
            // The `TicketBadge` shape in neutral tokens rather than the accent ones: two
            // accent badges on one card would read as two tickets. The number is all
            // that fits, so the parent's title goes in the hover text.
            <span
              title={t('tasks.parentHint', { number: card.issue.parent.number, title: card.issue.parent.title })}
              className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded flex-shrink-0"
            >
              {t('tasks.parent', { number: card.issue.parent.number })}
            </span>
          )}
          {card.issue.author && (
            <span
              title={t('tasks.authorHint', { login: card.issue.author })}
              className="text-xs text-text-secondary truncate max-w-[10rem]"
            >
              @{card.issue.author}
            </span>
          )}
          {card.issue.subIssues && (
            <span className="text-xs text-text-secondary">{subIssuesLabel(card.issue.subIssues, t)}</span>
          )}
          {card.issue.labels.map((label) => <StatusPill key={label} status={label} />)}
        </>
      )}
    </div>
  )
}
