import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  CircleCheck,
  CircleDot,
  Equal,
  Minus,
  Settings,
} from '@ds/desktop/icons'
import { Button, Label, Status, Text, type IconComponent, type StatusTone } from '@ds/desktop'
import type {
  JiraEpic,
  JiraPriority,
  JiraPriorityLevel,
  JiraStatusCategory,
  JiraTaskError,
  JiraTaskStatusError,
  PRWatchError,
  TaskIssue,
  TaskIssueDetail,
} from '../../../types'
import { useStore } from '../../store'
import { useT, type MessageKey, type Translate } from '../../i18n'

/**
 * The vocabulary the Tasks page says one ticket in — the badges a card and the detail
 * page both draw, and the sentences a failed read is worded with.
 *
 * A module of PARTS and not a component: the board draws these on a card, the detail
 * page draws the same ones at the top of a ticket, and a status pill that drifted
 * between the two would read as two different facts about one ticket. Nothing here owns
 * any layout of its own — every caller supplies the box.
 *
 * What is NOT here is a ticket's own labels, which both pages also draw: they are a
 * `Label` from `@ds/desktop`, straight at the call site. These are the ones only Tasks
 * says.
 */

/**
 * Dedicated `tasks.error.*` copy, NOT the pull-request card's.
 *
 * `agentInfo.pr.error.notFound` reads "Pull request not found", which is simply
 * wrong on a repository group — the same five failures need their own sentences here.
 *
 * Private to this module: `TaskErrorLines` below is what the rest of the page uses.
 * Sharing the map alone would have guaranteed the two surfaces say the same words
 * while leaving them free to say them differently.
 */
const ERROR_KEYS: Record<PRWatchError, { title: MessageKey; fix: MessageKey }> = {
  'no-token':     { title: 'tasks.error.noToken',     fix: 'tasks.error.noTokenFix' },
  'not-found':    { title: 'tasks.error.notFound',    fix: 'tasks.error.notFoundFix' },
  forbidden:      { title: 'tasks.error.forbidden',   fix: 'tasks.error.forbiddenFix' },
  'rate-limited': { title: 'tasks.error.rateLimited', fix: 'tasks.error.rateLimitedFix' },
  network:        { title: 'tasks.error.network',     fix: 'tasks.error.networkFix' },
}

/**
 * The same, for the Jira half — a SECOND table rather than a widening of the one
 * above.
 *
 * `ERROR_KEYS` is a `Record<PRWatchError, …>`, and `TaskErrorLines` is consumed by
 * `TaskDetailPage.tsx` on the GitHub-only path: widening either would force the
 * issue page to compile against members it can never be handed. Nearly every
 * sentence differs too — "run `gh auth login`" is not advice about an Atlassian
 * account — so there is nothing to reuse but the typography, and that is what
 * `ErrorLines` below holds.
 *
 * The two exceptions are the FIXES that name no tracker at all: waiting out a quota
 * and checking a network connection are the same advice whoever refused the read, so
 * those two point at the GitHub table's keys rather than at a second copy of the same
 * English. The titles stay distinct — the reader still has to be told which of the
 * two sources is rate-limited.
 */
const JIRA_ERROR_KEYS: Record<JiraTaskError, { title: MessageKey; fix: MessageKey }> = {
  'not-connected':    { title: 'tasks.jira.error.notConnected',   fix: 'tasks.jira.error.notConnectedFix' },
  'no-active-sprint': { title: 'tasks.jira.error.noSprint',       fix: 'tasks.jira.error.noSprintFix' },
  unauthorized:       { title: 'tasks.jira.error.unauthorized',   fix: 'tasks.jira.error.unauthorizedFix' },
  forbidden:          { title: 'tasks.jira.error.forbidden',      fix: 'tasks.jira.error.forbiddenFix' },
  'not-found':        { title: 'tasks.jira.error.notFound',       fix: 'tasks.jira.error.notFoundFix' },
  'rate-limited':     { title: 'tasks.jira.error.rateLimited',    fix: 'tasks.error.rateLimitedFix' },
  offline:            { title: 'tasks.jira.error.offline',        fix: 'tasks.error.networkFix' },
  'server-error':     { title: 'tasks.jira.error.serverError',    fix: 'tasks.jira.error.serverErrorFix' },
  'invalid-query':    { title: 'tasks.jira.error.invalidQuery',   fix: 'tasks.jira.error.invalidQueryFix' },
}

/**
 * The rows of `JIRA_ERROR_KEYS` that mean something ELSE on one ticket's page than
 * they do on a repository card.
 *
 * Only one so far, and it is a genuine mis-statement rather than a nicety: on the
 * card a 404 is the PROJECT, and "check the project key" is the fix. On the detail
 * panel the project key is demonstrably right — the list read just used it to fetch
 * the row that was clicked — and the 404 is the ticket, deleted or moved. Sending
 * the reader to a settings field that is already correct is worse than saying
 * nothing.
 *
 * A partial override rather than a second full table: every other failure —
 * unauthorized, forbidden, offline, a rejected query — is the same fact and the
 * same fix wherever it is met, and a copy of the other eight rows would be eight
 * chances for the two surfaces to drift.
 */
const JIRA_DETAIL_ERROR_KEYS: Partial<Record<JiraTaskError, { title: MessageKey; fix: MessageKey }>> = {
  'not-found': { title: 'tasks.jira.detail.notFound', fix: 'tasks.jira.detail.notFoundFix' },
}

/**
 * The two Jira outcomes that are not failures, and the word each gets instead.
 *
 * "Could not be read" is wrong for both. A project with no sprint in progress has not
 * failed at anything — it is a state of the board — and neither has one whose
 * Atlassian account is simply not connected yet. A table rather than a chain of
 * comparisons so that the rule ("these are states, not failures") is stated once, and
 * a third one is an entry rather than another branch.
 */
export const JIRA_NEUTRAL_BADGE: Partial<Record<JiraTaskError, MessageKey>> = {
  'no-active-sprint': 'tasks.jira.noSprintBadge',
  'not-connected': 'tasks.jira.notConnectedBadge',
}

/**
 * WHAT WENT WRONG AND WHAT TO DO ABOUT IT, as two translated strings.
 *
 * Split out from the components below because the board's failed rows are a
 * `NoticeCard` now, and a card takes its sentence and its second line as DATA — where
 * the ticket page still wants the pair as a node it can drop into its body. One
 * resolution, two shapes, and the tables stay private either way.
 */
export function taskErrorCopy(error: { error: PRWatchError }, t: Translate): { title: string; fix: string } {
  const keys = ERROR_KEYS[error.error]
  return { title: t(keys.title), fix: t(keys.fix) }
}

export function jiraErrorCopy(
  error: JiraTaskStatusError,
  t: Translate,
  surface: 'card' | 'detail' = 'card',
): { title: string; fix: string } {
  const keys = (surface === 'detail' ? JIRA_DETAIL_ERROR_KEYS[error.error] : undefined)
    ?? JIRA_ERROR_KEYS[error.error]
  return { title: t(keys.title), fix: t(keys.fix) }
}

/** What went wrong, then what to do about it. The shape both tables render into. */
function ErrorLines({ title, fix }: { title: MessageKey; fix: MessageKey }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <Text size="sm">{t(title)}</Text>
      <Text tone="secondary" className="opacity-70">{t(fix)}</Text>
    </div>
  )
}

/**
 * A failed GitHub read, said the one way this page says it.
 *
 * Exported because the issue page reads through the same GraphQL error ladder, so
 * a private repository that fails on the list must not fail differently — nor look
 * different — when one of its issues is opened. The caller supplies the surrounding
 * box; this owns the words and their typography.
 */
export function TaskErrorLines({ error }: { error: { error: PRWatchError } }) {
  return <ErrorLines {...ERROR_KEYS[error.error]} />
}

/**
 * A Jira group that could not be listed — and, when the reason is a missing
 * Atlassian account, the way out of it.
 *
 * The button is the point of the whole `not-connected` branch. Without an Atlassian
 * credential a Jira card would otherwise render as an empty backlog, which reads as
 * "this sprint has nothing in it"; with it, the card states the situation and hands
 * over the one screen that fixes it. Settings is a modal like this page, so opening
 * it replaces the Tasks overlay rather than stacking on top of it.
 *
 * `Button` rather than the accent-tinted pill this spelled by hand: it is the one
 * affirmative thing on a panel that is otherwise a statement, so it takes the filled
 * accent rung rather than an outline of it. The outline is gone with every other
 * border on this page.
 */
export function JiraErrorLines({
  error,
  surface = 'card',
}: {
  error: JiraTaskStatusError
  /**
   * Which page is asking, because one failure does not mean the same thing on both.
   * Named rather than handed in as a table of sentences: "the detail page words 404
   * differently" is a fact about the copy, so it belongs beside the copy — a caller
   * cannot get it subtly wrong, only pick the wrong one of two names.
   */
  surface?: 'card' | 'detail'
}) {
  const t = useT()
  const keys = (surface === 'detail' ? JIRA_DETAIL_ERROR_KEYS[error.error] : undefined)
    ?? JIRA_ERROR_KEYS[error.error]
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <ErrorLines {...keys} />
      {error.error === 'not-connected' && (
        <Button
          size="xs"
          tone="accent"
          icon={Settings}
          onClick={() => useStore.getState().setAccountTab('connections')}
          className="self-start"
        >
          {t('tasks.jira.connect')}
        </Button>
      )}
    </div>
  )
}

/**
 * "N open", picked on the same rule wherever it is shown — the cards here and the
 * page total above them. Exported so the two cannot drift apart the day a locale
 * needs a form English does not have.
 *
 * `totalOpen` is what the repository HAS; `count` is what this page could read,
 * capped at the query's `OPEN_PAGE_SIZE`. When they differ the label says so —
 * "showing 100 of 412" — because rendering the cap as the total is simply a wrong
 * number.
 */
export function openCountLabel(count: number, t: Translate, totalOpen?: number): string {
  if (typeof totalOpen === 'number' && totalOpen > count) {
    return t('tasks.openCount.truncated', { count, total: totalOpen })
  }
  return t(count === 1 ? 'tasks.openCount.one' : 'tasks.openCount.other', { count })
}

/**
 * The same counter for a sprint, which can say "there is more" but never "of how
 * many".
 *
 * `/rest/api/3/search/jql` is paginated by cursor and returns no `total`, so the
 * "showing 100 of 412" form `openCountLabel` uses has no second number to put in it.
 * The honest reading of a next-page token is that the board is showing the first N,
 * and that is what this says.
 *
 * It is now the PAGE-LEVEL form of an admission the columns also make one by one: each
 * column marks its own count with a `+` when its own budget was the limit (see
 * `TaskBoard`). Kept, rather than left to the columns, because the header is where the
 * reader looks for "how much of this repository am I seeing" — and a header printing a
 * bare total over a board with a capped column would contradict the column.
 *
 * Only the truncated form is this function's own: an untruncated sprint is counted
 * by `openCountLabel`, so the plural pick lives in one place and a locale needing a
 * form English has not got is still a one-line change.
 */
export function sprintCountLabel(count: number, t: Translate, truncated?: boolean): string {
  return truncated ? t('tasks.sprintCount.truncated', { count }) : openCountLabel(count, t)
}

/**
 * "N sub-issues · M done", picked the way `openCountLabel` picks its form: one
 * catalogue key per plural, never a suffix appended in code.
 *
 * Only ever reached for an issue that HAS sub-issues — the mapper omits the field
 * entirely otherwise — so `total` is 1 or more and `.one` never renders a zero.
 */
export function subIssuesLabel(subIssues: NonNullable<TaskIssue['subIssues']>, t: Translate): string {
  return t(subIssues.total === 1 ? 'tasks.subIssues.one' : 'tasks.subIssues.other', {
    count: subIssues.total,
    completed: subIssues.completed,
  })
}

/**
 * EVERY PILL BELOW IS `Status` NOW, and what is left in this file is the one half a
 * design system may not hold: WHICH state wears which hue, and which glyph.
 *
 * That split is the component's own — "this folder owns how a state LOOKS, the app owns
 * which states there are" — and it is what these tables are. A GitHub issue's two
 * states, a Jira status category's three, a priority's six: all of them are a tracker's
 * vocabulary, and a table of them in `design-system/` would be Magic Slash stored in the
 * shared folder.
 *
 * What went with the hand-built pills is the geometry. The plate, the radius, the height
 * and the type rung were spelled out four times here — `text-xs px-2 py-0.5 rounded-full`
 * and three near-misses of it — beside `Label`s drawn on the same line at a height none
 * of them agreed with.
 */

/**
 * GitHub's two states, in our pill vocabulary.
 *
 * THE MARK IS HALF THE MESSAGE — a filled dot for something still open, a tick for
 * something closed — so the chip survives being read at a glance and does not rely on
 * green-versus-purple alone. `Status.icon` is the prop that exists for it.
 */
const STATE_MARK: Record<TaskIssueDetail['state'], { icon: IconComponent; tone: StatusTone; label: MessageKey }> = {
  OPEN: { icon: CircleDot, tone: 'green', label: 'tasks.detail.stateOpen' },
  CLOSED: { icon: CircleCheck, tone: 'purple', label: 'tasks.detail.stateClosed' },
}

/**
 * The state chip.
 *
 * `JiraStatusPill`'s counterpart, and it lives beside it for that reason: the two are
 * the app's one answer to "what state is this ticket in", and both are drawn on two
 * pages — the ticket's own, and a plan's ticket tree.
 *
 * Takes the STATE and not the issue, for the reason `JiraStatusPill` takes two values:
 * both callers re-read it live rather than trusting what their list captured, and a chip
 * typed on the row could only be handed the stale one back.
 */
export function StateChip({ state, t }: { state: TaskIssueDetail['state']; t: Translate }) {
  const { icon, tone, label } = STATE_MARK[state]
  return <Status label={t(label)} tone={tone} icon={icon} />
}

/**
 * A Jira status category's hue.
 *
 * Coloured by CATEGORY and labelled by NAME, which is the split `JiraStatusCategory`
 * exists for: the category is fixed by Jira and can be branched on, the name is what the
 * reader knows their board by and is the only thing worth showing.
 *
 * Exported because the board's cards no longer draw the pill themselves — `TicketCard`
 * takes a status as DATA, so the hue has to be pickable without rendering anything.
 *
 * Deliberately NOT `Label`, which is what a ticket's own labels are drawn with on the
 * same line: a label NAMES a thing and never changes while you look at it, where this
 * reports a state the board moves between columns on. `Status`'s own docblock draws the
 * line, and the two components exist on either side of it.
 */
export const JIRA_STATUS_TONE: Record<JiraStatusCategory, StatusTone> = {
  new: 'neutral',
  indeterminate: 'accent',
  // Never reached today — the main process drops finished tickets — but a card that
  // silently mis-coloured one would be worse than a table with three rows in it.
  done: 'green',
}

export function JiraStatusPill({ name, category }: { name: string; category: JiraStatusCategory }) {
  // The two VALUES rather than the ticket they came from, because the detail panel
  // feeds it the status of its own read: that page re-asks Jira for the status
  // precisely so a ticket transitioned since the list was drawn stops showing the
  // stale word, and a pill typed on `JiraTaskIssue` could only be handed the stale
  // one back.
  if (!name) return null
  return <Status label={name} tone={JIRA_STATUS_TONE[category]} />
}

/**
 * A Jira priority as an arrow and a hue.
 *
 * `JIRA_STATUS_TONE`'s twin, one field along and with the same split behind it: the
 * LEVEL picks the arrow and the colour because Jira fixes it, the NAME is printed
 * because it is the word the reader's own board uses. What differs is that this one
 * leads with a glyph — a priority is read at a glance down a column of rows, and an
 * arrow's direction survives being skimmed in a way a word never does.
 *
 * The arrow is Jira's own vocabulary, not an invention: its issue views have drawn
 * priority as a double chevron up, a chevron up, a bar, a chevron down and a double
 * chevron down for as long as there have been priorities. Drawn locally rather than
 * taken from the `iconUrl` Jira sends with every priority, which the renderer's CSP
 * (`img-src 'self' data:`) would block.
 *
 * `unknown` is the honest tier — the site's own word, in the neutral colours, behind
 * a flat bar that claims nothing about where on the scale it sits. See
 * `JiraPriorityLevel`.
 */
export const JIRA_PRIORITY_MARK: Record<JiraPriorityLevel, { icon: IconComponent; tone: StatusTone }> = {
  highest: { icon: ChevronsUp, tone: 'red' },
  high: { icon: ChevronUp, tone: 'orange' },
  medium: { icon: Equal, tone: 'yellow' },
  low: { icon: ChevronDown, tone: 'blue' },
  lowest: { icon: ChevronsDown, tone: 'neutral' },
  unknown: { icon: Minus, tone: 'neutral' },
}

/**
 * The hover text names the FIELD, because the badge itself only shows its value:
 * "Urgent" beside a status pill and two labels is a word with no column header, and a
 * site whose priorities are called "P1"…"P4" gives the reader nothing to recognise it
 * by at all. Compact, it is the only place the value is written at all.
 */
export function jiraPriorityHint(priority: JiraPriority, t: Translate): string {
  return t('tasks.jira.priorityHint', { name: priority.name })
}

export function JiraPriorityBadge({ priority, t }: { priority: JiraPriority; t: Translate }) {
  const { icon, tone } = JIRA_PRIORITY_MARK[priority.level]
  // `label` is the site's word and `title` names the field it is a value of — two
  // different strings, which is why `Status.label` is not asked to carry both.
  return (
    <span title={jiraPriorityHint(priority, t)} className="inline-flex">
      <Status label={priority.name} tone={tone} icon={icon} />
    </span>
  )
}

/**
 * The epic a ticket hangs off, as a chip in the epic's own colour.
 *
 * `Label` AND NOT `Status`, and the reason is the line those two components are drawn
 * on either side of: an epic NAMES a thing and the name does not change while you look
 * at it, where a status reports a state the board moves a ticket between columns on.
 *
 * IT WAS A NEUTRAL PILL WITH A COLOURED DOT and is now a plate in the epic's own hue,
 * which is `Label.color`'s whole purpose — the same treatment a repository gets in the
 * rail and in the filter bar, so "an epic" and "a repository" read as the same kind of
 * thing wherever they appear. An epic with no colour recorded simply takes the neutral
 * plate, where the dot version had to draw nothing at all rather than a grey stand-in.
 *
 * NOT A LINK, though the epic has a URL. Every row on this page opens its ticket, and
 * an anchor inside it would give one strip of the row a different destination from the
 * rest of it — the epic is reachable from the ticket page it leads to.
 */
export function jiraEpicHint(epic: JiraEpic, t: Translate): string {
  // Carries the KEY as well as the title, which is the half a truncated title loses
  // first — and, like the priority's, it names the FIELD: a bare title between two
  // coloured pills is a phrase with no column header.
  return t('tasks.jira.epicHint', { key: epic.key, title: epic.title })
}

export function JiraEpicBadge({ epic, t }: { epic: JiraEpic; t: Translate }) {
  return (
    <Label
      color={epic.color}
      title={jiraEpicHint(epic, t)}
      truncate
      className="max-w-[14rem]"
    >
      {epic.title}
    </Label>
  )
}
