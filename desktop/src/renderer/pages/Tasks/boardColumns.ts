import type {
  BoardColumnTone,
  TaskBoardCard,
  TaskBoardColumn as BoardColumnData,
  TaskBoardNotice,
  TicketCardNote,
  TicketCardTag,
} from '@ds/desktop'
import {
  BotMessageSquare,
  CircleCheck,
  CircleDashed,
  LoaderCircle,
  OctagonAlert,
  Play,
  Settings,
} from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop/types'
import type { RepositoryConfig } from '../../../types'
import { BOARD_COLUMNS, type BoardCard, type BoardColumn as BoardColumnKey } from '../../utils/taskBoard'
import type { TaskRow } from '../../utils/taskRows'
import type { TaskSelection } from '../../utils/taskSelection'
import { canStartAgent, type TaskAgentRepo } from '../../hooks/useTaskAgent'
import { useStore } from '../../store'
import type { MessageKey, Translate } from '../../i18n'
import {
  JIRA_NEUTRAL_BADGE,
  JIRA_PRIORITY_MARK,
  JIRA_STATUS_TONE,
  jiraEpicHint,
  jiraErrorCopy,
  jiraPriorityHint,
  subIssuesLabel,
  taskErrorCopy,
} from './parts'

/**
 * THE BOARD IS `TaskBoard` IN `@ds/desktop`, and this file is the translation from this
 * app's vocabulary into its props.
 *
 * The drawing moved out whole: the heading, the pinned bar of controls, the four-column
 * grid, the sticky wiring behind both bands, the cards, the sentence that stands in for an
 * empty board. None of that is about Jira or GitHub, and the public site draws the very
 * same component to show what the Tasks page looks like — one page, rendered by two builds,
 * with nothing to keep in step by hand.
 *
 * WHAT COULD NOT GO is everything below: which four columns there are and what each one
 * means, the branch on the tracker (a Jira ticket has a status, an epic and a reporter
 * where a GitHub issue has a parent, an author and a count of children), the launch, and
 * the repository whose read did not come back. That is the app's vocabulary, which is
 * exactly the half a design system may not hold.
 *
 * NO COMPONENTS LEFT IN IT. `TaskBoard.tsx` and `TaskCard.tsx` were components because
 * they drew things and because a card called two hooks per ticket; the design system takes
 * cards as DATA, so what remains is builders — pure but for the store handle on one notice
 * action — and `useT` is passed in rather than called, so every function here can be
 * reached from a test with no renderer.
 */

/**
 * The four columns, and the whole of what distinguishes one from another.
 *
 * A table rather than four blocks of markup, for the reason every other table on this page
 * exists: the columns differ in a heading, a glyph and a tone, and written out four times
 * those three would drift — a column whose count sat in a different place from its
 * neighbours reads as a bug nobody can name.
 *
 * BLOCKED is the only one that asks for attention. The other three are states work passes
 * through and colouring them would make the board a traffic light; blocked is the one that
 * has stopped and needs a person. That pair is `BoardColumnTone`, which exists because of
 * this table and holds exactly the two values it needs.
 */
const COLUMNS: Record<BoardColumnKey, { title: MessageKey; icon: IconComponent; tone: BoardColumnTone }> = {
  blocked: { title: 'tasks.board.blocked', icon: OctagonAlert, tone: 'alert' },
  backlog: { title: 'tasks.board.backlog', icon: CircleDashed, tone: 'neutral' },
  progress: { title: 'tasks.board.progress', icon: LoaderCircle, tone: 'neutral' },
  done: { title: 'tasks.board.done', icon: CircleCheck, tone: 'neutral' },
}

export interface TaskColumnsInput {
  board: Record<BoardColumnKey, BoardCard[]>
  /**
   * The configuration of every repository behind the board's rows, by config key.
   *
   * Read once by the page and passed down: `useConfig` subscribes to the whole config, and
   * a subscription per card would re-render the entire board whenever any setting anywhere
   * changed.
   */
  repoConfigs: Record<string, RepositoryConfig | undefined>
  /**
   * The columns whose read stopped at its budget, so their count is a floor and not a
   * total. See `JiraTaskRepoGroup.truncatedColumns`.
   */
  truncatedColumns: ReadonlySet<BoardColumnKey>
  /**
   * The board is open to CHOOSE a ticket for an agent that already exists, so no card
   * offers Start: it would launch a different, new agent from the very card about to be
   * attached.
   */
  picking: boolean
  /** The cards whose last launch failed, by `BoardCard.key`. See `useTaskAgents`. */
  startFailed: ReadonlySet<string>
  onStart: (id: string, repos: TaskAgentRepo[], ticketId: string, ref: string) => void
  onSelect: (selection: TaskSelection) => void
  t: Translate
}

/** One repository's tickets, dealt into the four columns the design system draws. */
export function buildTaskColumns(input: TaskColumnsInput): BoardColumnData[] {
  const { board, truncatedColumns, t } = input

  return BOARD_COLUMNS.map((column) => {
    const cards = board[column]
    const truncated = truncatedColumns.has(column)
    const { title, icon, tone } = COLUMNS[column]
    return {
      id: column,
      title: t(title),
      icon,
      tone,
      // The count, always, zero included: a column that showed nothing and said nothing
      // would be indistinguishable from one that failed to render.
      //
      // `100+` WHEN THE READ STOPPED AT THE BUDGET. Each column is read with a page budget
      // of its own, and a bare `100` over a column holding four hundred tickets is not a
      // count — it is a cap wearing a count's clothes, and it is the most
      // authoritative-looking thing on the board. The `+` is the whole correction: this
      // column has more, and Jira's cursor pagination cannot say how many more (there is no
      // `total` in the response), so a ratio is a sentence this side cannot write.
      count: truncated ? t('tasks.board.cappedCount', { count: cards.length }) : cards.length,
      ...(truncated ? { countTitle: t('tasks.board.cappedHint') } : {}),
      // The same word in all four: what is interesting about an empty Blocked column is
      // that it is empty, and a column-specific sentence would make the reader read four of
      // them to find out that nothing is there.
      empty: t('tasks.board.empty'),
      cards: cards.map((card) => buildCard(card, column, input)),
    }
  })
}

/** ONE TICKET, as the design system's board wants it. */
function buildCard(card: BoardCard, column: BoardColumnKey, input: TaskColumnsInput): TaskBoardCard {
  const { repoConfigs, picking, startFailed, onStart, onSelect, t } = input

  // EVERY repository the card stands for, paired with its configuration — usually one, and
  // two when a tracker target is shared (see `TaskRow.repos`). The launcher needs the whole
  // list rather than the first: it is what decides whether a repository can be picked for
  // the agent at all, or the choice has to be left to `/magic:start`.
  const repos = card.row.repos.map((repo) => ({ ...repo, config: repoConfigs[repo.configKey] }))

  /**
   * Whether Start is offered at all.
   *
   * THREE REASONS IT IS NOT, all of them "there is nothing to start". A ticket somebody is
   * already on gets the agent mark in the same slot instead — `/magic:start` on it would be
   * a second worktree and a second branch for one piece of work, the expensive mistake. A
   * ticket in the Done column is finished: on the Jira side its board says so, on the GitHub
   * side the issue is closed, and neither is work to pick up. And the board may be open to
   * CHOOSE a ticket for an agent that already exists.
   *
   * `canStartAgent` is the fourth and is about this MACHINE rather than about the ticket —
   * no repository behind it has a local folder to open a terminal in — so it disables the
   * button rather than withholding it: there is something to press and a reason it cannot
   * be. A failed launch disables nothing and only colours, so it can simply be tried again.
   */
  const canShowStart = !card.hasAgent && column !== 'done' && !picking
  const canStart = canStartAgent(repos)

  const { tags, notes } = buildMeta(card, t)

  return {
    id: card.key,
    tracker: card.tracker,
    ticketId: card.tracker === 'jira' ? card.issue.key : `#${card.issue.number}`,
    title: card.issue.title,
    // BESIDE THE ID, not down with the metadata. Priority is the field that decides which of
    // two tickets you pick up, and down there it was one badge among a status, an epic, a
    // reporter and every label. Jira only: a GitHub issue has no priority field, and a label
    // saying "urgent" is already drawn as a label.
    ...(card.tracker === 'jira' && card.issue.priority
      ? {
        mark: {
          ...JIRA_PRIORITY_MARK[card.issue.priority.level],
          label: jiraPriorityHint(card.issue.priority, t),
        },
      }
      : {}),
    ...(card.tracker === 'jira' && card.issue.statusName
      ? {
        // The site's own word for the column, not ours. It is redundant with the column the
        // card sits in for "To Do" and "Done", and it is not for anything in between: "In
        // Review" and "QA" both land in progress.
        status: { label: card.issue.statusName, tone: JIRA_STATUS_TONE[card.issue.statusCategory] },
      }
      : {}),
    tags,
    notes,
    // Both controls hang off a browse URL, which a Jira ticket only has once a site has been
    // resolved. A repository declaring only a project key, read with a credential whose site
    // URL is missing, has none to offer — and a dead copy button is a worse answer than no
    // button. The card itself still opens the ticket's page, which needs no site at all.
    ...(card.issue.url
      ? {
        copy: {
          value: card.issue.url,
          label: t('tasks.copyLink'),
          copiedLabel: t('tasks.copyLinkDone'),
        },
      }
      : {}),
    ...(card.hasAgent
      ? { agent: { icon: BotMessageSquare, label: t('tasks.hasAgentHint') } }
      : canShowStart
        ? {
          action: {
            icon: Play,
            title: canStart ? t('tasks.startAgent') : t('tasks.startNoPath'),
            onClick: () => onStart(
              card.key,
              repos,
              card.id,
              card.tracker === 'jira' ? card.issue.key : card.issue.url,
            ),
            disabled: !canStart,
            // Coloured rather than disabled, so a launch that failed can be tried again from
            // the same button.
            tone: startFailed.has(card.key) ? 'danger' : 'ghost',
          },
        }
        : {}),
    onOpen: () => onSelect(card.tracker === 'jira'
      ? { tracker: 'jira', configKey: card.row.configKey, key: card.issue.key }
      : { tracker: 'github', configKey: card.row.configKey, number: card.issue.number }),
  }
}

/**
 * Everything known about the ticket that is not its title, split into the two shapes
 * `TicketCard` draws: PLATES for the things that are named, and plain WORDS for the things
 * that are said.
 *
 * NO REPOSITORY CHIP. Every card on the board belongs to the repository named in the picker
 * at the top, so one repeated on all of them identifies nothing — it was the list's way of
 * telling cards from different repositories apart, and the list is gone.
 *
 * The priority is not here either: it sits beside the id in the header, where the pick-up
 * decision is actually made.
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
      // Lovelace" is a name and not a handle, and `@Ada Lovelace` reads as a mention of an
      // account that does not exist.
      notes.push({
        id: 'reporter',
        text: card.issue.reporter,
        title: t('tasks.jira.reporterHint', { name: card.issue.reporter }),
      })
    }
  } else {
    if (card.issue.parent) {
      // A chip in neutral tokens rather than the tracker's: two coloured badges on one card
      // would read as two tickets. The number is all that fits, so the parent's title goes
      // in the hover text.
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

  // LAST on the band on both halves, because they are the only part of it the reader wrote
  // themselves — everything above is the tracker's own vocabulary.
  for (const label of card.issue.labels) {
    tags.push({ id: `label:${label}`, label, title: label })
  }

  return { tags, notes }
}

/**
 * Why a read came back with nothing, as a band between the controls and the columns.
 *
 * Rendered at all — rather than letting the read simply vanish — precisely because the board
 * shows one repository at a time: an unreadable source used to leave one card among several
 * saying so, and would now leave four empty columns and no explanation.
 *
 * A `NoticeCard`, which is the shape this was hand-building: a tinted band saying what
 * happened and what to do about it, over the evidence it happened to. The EVIDENCE is which
 * repositories could not be read — on a page showing one card per repository the header
 * answered that, and here the columns are shared, so the card has to name its own subject.
 * One row each rather than a joined string, because the tracker is a tag on the row it
 * belongs to.
 *
 * NOT ALWAYS A FAILURE, which is what the two variants are for. A project with no sprint in
 * progress has not failed at anything — it is a state of the board — and neither has one
 * whose Atlassian account is simply not connected yet. Those get `info`; an orange warning
 * over "this project has no active sprint" would send somebody looking for a breakage that
 * is not there. The table is `JIRA_NEUTRAL_BADGE`, shared with the copy that words them.
 */
export function taskFailureNotices(rows: TaskRow[], t: Translate): TaskBoardNotice[] {
  const notices: TaskBoardNotice[] = []

  for (const row of rows) {
    // Picked inside the tracker branch: `row` is a union whose two members carry two
    // different error types, and only the discriminant narrows `row.error` to one of them.
    const copy = row.tracker === 'jira'
      ? row.error && jiraErrorCopy(row.error, t)
      : row.error && taskErrorCopy(row.error, t)
    if (!copy) continue

    // Only the Jira half has outcomes that are not failures; every GitHub error is one, so
    // the lookup is skipped rather than given a table of its own.
    const neutral = row.tracker === 'jira' && row.error ? !!JIRA_NEUTRAL_BADGE[row.error.error] : false

    /**
     * The way out of the one failure that HAS one. Without an Atlassian credential a Jira
     * board renders as an empty backlog, which reads as "this sprint has nothing in it";
     * with this, the card states the situation and hands over the one screen that fixes it.
     * Settings is a modal like this page, so opening it replaces the Tasks overlay rather
     * than stacking on top of it.
     */
    const connect = row.tracker === 'jira' && row.error?.error === 'not-connected'
      ? [{
        label: t('tasks.jira.connect'),
        icon: Settings,
        primary: true,
        onClick: () => useStore.getState().setAccountTab('connections'),
      }]
      : undefined

    notices.push({
      id: `${row.tracker}:${row.configKey}`,
      variant: neutral ? 'info' : 'warning',
      children: copy.title,
      hint: copy.fix,
      ...(connect ? { actions: connect } : {}),
      rows: row.repos.map((repo) => ({
        id: repo.configKey,
        name: repo.name,
        ...(row.showTracker ? { tags: [{ label: row.tracker === 'jira' ? 'Jira' : 'GitHub' }] } : {}),
      })),
    })
  }

  return notices
}
