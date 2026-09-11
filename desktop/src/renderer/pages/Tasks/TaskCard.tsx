import { memo, useCallback, type KeyboardEvent } from 'react'
import { BotMessageSquare, Play } from 'lucide-react'
import type { RepositoryConfig } from '../../../types'
import type { BoardCard } from '../../utils/taskBoard'
import type { TaskSelection } from '../../utils/taskSelection'
import { useT, type Translate } from '../../i18n'
import { useTaskAgent } from '../../hooks/useTaskAgent'
import { StatusPill } from '../Dashboard/parts'
import { CopyLinkButton } from '../../components/CopyLinkButton'
import { TrackerBadge } from '../../components/icons/TrackerIcons'
import { JiraEpicBadge, JiraPriorityBadge, JiraStatusPill, subIssuesLabel } from './parts'

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
   * Whether Start is drawn at all, and then whether it is off.
   *
   * TWO REASONS IT IS NOT THERE, both of them "there is nothing to start". A ticket
   * somebody is already on gets the agent badge in the same slot instead —
   * `/magic:start` on it would be a second worktree and a second branch for one piece
   * of work, the expensive mistake, and a disabled button says that far less clearly
   * than the badge does. A ticket in the Done column is finished: on the Jira side its
   * board says so, on the GitHub side the issue is closed, and neither is work to pick
   * up.
   *
   * What is left disables on `canStart`, which is about this machine rather than about
   * the ticket — no repository behind it has a local folder to open a terminal in.
   *
   * `startFailed` says nothing here, deliberately: it never disables the button, it only
   * colours it, so a launch that failed can simply be tried again.
   */
  const canShowStart = !card.hasAgent && card.column !== 'done'

  /**
   * Whether the third band has anything to draw — see its guard below.
   *
   * Asked per tracker, because the two carry different things: a Jira ticket has a
   * status, an epic and a reporter, a GitHub issue has a parent, an author and a count
   * of children. Only the labels are common. The agent and the priority are NOT counted:
   * both moved up to the header band, and a card whose only metadata was one of them
   * would otherwise draw an empty row and the gap above it.
   */
  const hasMeta = card.issue.labels.length > 0 || (
    card.tracker === 'jira'
      ? !!card.issue.statusName || !!card.issue.epic || !!card.issue.reporter
      : !!card.issue.parent || !!card.issue.author || !!card.issue.subIssues
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={select}
      onKeyDown={onKeyDown}
      className={`group flex flex-col gap-2 p-3 rounded-lg bg-bg-secondary border
        cursor-pointer transition-colors hover:bg-surface ${
        // Taken in by the same glance that reads the column — which is the whole point
        // of moving "somebody is on this" out of the metadata line, where it was a word
        // among five others. The tint is faint on purpose: it marks the card, it does
        // not make the board a traffic light.
        card.hasAgent
          ? 'border-green/40 bg-green/5 hover:border-green/60'
          : 'border-line-field hover:border-accent/40'
      }`}
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
        {/* BESIDE THE ID, not down in the metadata line where it used to sit. Priority
            is the field that decides which of two tickets you pick up, and down there it
            was one badge among a status, an epic, a reporter and every label — read only
            by someone already reading the card. Here it is on the line the eye lands on.
            Jira only: a GitHub issue has no priority field, and a label that says
            "urgent" is already drawn as a label. */}
        {card.tracker === 'jira' && card.issue.priority && (
          <JiraPriorityBadge priority={card.issue.priority} t={t} compact />
        )}
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
          {/* The same slot, three outcomes — which is what keeps the cards of a column
              aligned whatever state they are in. An agent already on the ticket puts a
              badge where the button was; a finished ticket leaves it empty. */}
          {card.hasAgent ? (
            // NOT A DISABLED BUTTON, which is what this was: there is nothing here to
            // press, and a greyed-out Play invites the press it then refuses. A span
            // states the fact instead — an agent has this one — and states it in the
            // colour the card's border is now wearing.
            <span
              title={t('tasks.hasAgentHint')}
              aria-label={t('tasks.hasAgentHint')}
              className="flex items-center p-1.5 rounded-md bg-green/15 text-green flex-shrink-0"
            >
              <BotMessageSquare className="w-3.5 h-3.5" />
            </span>
          ) : canShowStart && (
            <button
              type="button"
              onClick={start}
              disabled={!canStart}
              title={canStart ? t('tasks.startAgent') : t('tasks.startNoPath')}
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
          )}
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
 * is the half where the two trackers genuinely differ: a Jira ticket has a status and an
 * epic, a GitHub issue has a parent and a count of children, and only the reporter and
 * the labels line up. The priority is NOT here any more — it sits beside the id in the
 * header, where the pick-up decision is actually made.
 *
 * `flex-wrap`, because in a column this WILL wrap and a row that clipped its labels
 * would be hiding the one piece of metadata people label issues for.
 */
function CardMeta({ card, t }: { card: BoardCard; t: Translate }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
      {card.tracker === 'jira' ? (
        <>
          {/* The site's own word for the column, not ours. It is redundant with the
              column the card sits in for "To Do" and "Done", and it is not for
              everything in between: "In Review" and "QA" both land in progress, and the
              pill is what tells them apart. */}
          <JiraStatusPill name={card.issue.statusName} category={card.issue.statusCategory} />
          {card.issue.epic && <JiraEpicBadge epic={card.issue.epic} t={t} />}
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
