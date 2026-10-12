import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ArrowLeft, BotMessageSquare, ExternalLink, MessageSquare, MessagesSquare, NotebookPen, Play, Unlink } from '@ds/desktop/icons'
import type {
  PlanTicketOrigin,
  TicketComment,
  JiraTaskIssue,
  JiraTaskIssueDetail,
  JiraTaskStatusError,
  PRStatusError,
  TaskIssue,
  TaskIssueDetail,
} from '../../../types'
import { isJiraStatusError, isPRStatusError } from '../../../types'
import { useLocale, useT, type Translate } from '../../i18n'
import {
  Banner,
  Button,
  Card,
  CommentCard,
  CopyButton,
  Label,
  Icon,
  Loader,
  MetaBlock,
  ProgressBar,
  SectionHeader,
  StickyBar,
  Text,
  TEXT_FACE,
  TrackerBadge,
} from '@ds/desktop'
import MarkdownView from '../../components/file-preview/MarkdownView'
import { JiraEpicBadge, JiraErrorLines, JiraPriorityBadge, JiraStatusPill, StateChip, TaskErrorLines } from './parts'
import { useTaskAgent, type TaskAgentRepo } from '../../hooks/useTaskAgent'
import { findAgentTerminalId, terminalAgentSignature } from '../../utils/taskAgents'
import { useStore } from '../../store'
import { discussAgentTitle, discussPrompt } from '../../utils/discussPrompt'
import { planLabel } from '../../utils/planRows'

/**
 * One ticket, given the whole page — the Tasks page's second view, not a panel
 * beside its first.
 *
 * TWO TICKETS, in fact: a GitHub issue and a Jira sprint ticket, discriminated by
 * `tracker`. They are one page and not two because everything that makes this a
 * PAGE is common to both — the pinned bar that takes over from the title, the
 * sticky action column, the sweep it arrives on, the Escape that goes back — while
 * what differs is the identity (a number against a key), the read behind it, and
 * the four blocks of metadata down the right. Two components would have been two
 * copies of the chrome, drifting.
 *
 * This started as a 500px right-hand column and the width was the problem: an
 * issue body is prose with headings, code blocks and tables in it, and 500px
 * turned every one of those into a column two words wide. So the list steps
 * aside instead: the switch is the `SweepPane` sub-page idiom the settings
 * repository detail already uses, and this is the page that arrives.
 *
 * Laid out the way GitHub lays an issue out, because that is the shape everyone
 * reading one already knows: title with its number, a state chip and a byline
 * under it, the body in a bordered comment box, and the metadata in a narrow
 * right column. Every colour, radius and pill is ours — the borrowing is the
 * ANATOMY, not the skin.
 *
 * No scroll container of its own: the Tasks page's pane is the one scrolling
 * element, which is what lets the sweep animate a page taller than the frame.
 */

/**
 * The height of the bar pinned at the top of the page, in pixels.
 *
 * A height and no vertical padding at all, so the row inside it is centred by
 * `items-center` and the space above and below it is equal BY CONSTRUCTION. The
 * bar carried a `pt-6` before, to cover the inset the page used to start with,
 * and the two rules fought: the padding pushed the row down, `items-center` then
 * centred it in what was left, and the result was 34px of air above a 10px gap
 * below. The band is the page's top inset now, rather than something sitting on
 * top of one.
 *
 * The one number three things have to agree on: the bar's own box, the offset the
 * metadata column sticks at (or it pins halfway under the band), and the observer
 * margin that decides when the title counts as hidden BEHIND the bar rather than
 * merely level with the top of the pane.
 */
/**
 * The pinned bar's height, and therefore the page's top inset.
 *
 * 48 rather than 56: the bar holds one 30px button, so it carried 13px of dead space
 * above and below it, and that slack sat directly between the back link and the heading
 * — where it read as the page starting late rather than as a band with room in it. 9px
 * a side still clears the button.
 *
 * Everything derived from it follows: the scroll observer's `rootMargin`, which decides
 * when the bar takes the title over, and the popover that hangs below it.
 */
const TOP_BAR_H = 48

/**
 * "24 Aug 2026" — a written month, not `08/24/2026`.
 *
 * Day-and-month digits alone are ambiguous across the two locales this app ships
 * in, and unlike the settings pages' compact dates this one sits in a sentence
 * with room for the word. Empty for a date that will not parse, so the byline
 * around it drops the date rather than printing "Invalid Date".
 */
function formatIssueDate(iso: string, locale: string): string {
  const at = new Date(iso).getTime()
  if (Number.isNaN(at)) return ''
  return new Date(at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * "24 Aug 2026, 14:32" — `formatIssueDate` plus the clock, for a comment.
 *
 * The time is not decoration here. A ticket is opened once, so the day is enough to
 * place it; a conversation happens within days and often within one, and a thread
 * whose every entry reads "24 Aug 2026" cannot be followed at all. `timeStyle`
 * rather than a hand-built `HH:mm`, so a locale that writes 2:32 PM gets to.
 */
function formatCommentDate(iso: string, locale: string): string {
  const at = new Date(iso).getTime()
  if (Number.isNaN(at)) return ''
  return new Date(at).toLocaleString(locale, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/**
 * The parent issue, as a link when there is one to make.
 *
 * `url` rides along in the list query rather than being spelled out from this
 * issue's own address: GitHub's sub-issues can be tracked across repositories, so
 * swapping the number in `.../issues/233` would silently point at the wrong repo's
 * #232. A parent GitHub reported without a url is still named, just not clickable —
 * which is why the field is optional rather than the parent being dropped.
 */
function ParentLink({ parent }: { parent: NonNullable<TaskIssue['parent']> }) {
  const { url } = parent

  if (!url) {
    return (
      <Text tone="secondary" className="min-w-0 break-words">
        {`#${parent.number} — ${parent.title}`}
      </Text>
    )
  }

  return (
    <button
      onClick={() => window.electronAPI.shell.openExternal(url)}
      title={parent.title}
      className="group text-left min-w-0 break-words bg-transparent border-none p-0 cursor-pointer"
    >
      <Text tone="inherit" className="text-accent/80 group-hover:text-accent">{`#${parent.number}`}</Text>{' '}
      <Text tone="secondary" className="group-hover:underline">{parent.title}</Text>
    </button>
  )
}

/** "there are none", said rather than left blank — an empty block reads as "not loaded yet". */
function NoneYet({ t }: { t: Translate }) {
  return <Text tone="secondary" className="opacity-40">{t('tasks.detail.none')}</Text>
}

/**
 * The ticket's body, or the reason it is not there yet.
 *
 * The failure arrives ALREADY WORDED, as a node, rather than as an error this
 * component looks up. The two trackers fail into two different named unions with
 * two different tables behind them — a Jira error code is not a member of
 * `ERROR_KEYS` and would render two blank lines through it — so the caller, which
 * is the side that knows which read it made, picks the table. What stays here is
 * the box, the loader and the empty state, which are the same either way.
 *
 * `document` rather than `panel` markdown: this is the variant for markdown with
 * a page to itself, and a full-width ticket body is exactly that.
 */
function DetailBody({
  content,
  errorLines,
  loading,
  t,
}: {
  /** The markdown to render. `''` for a ticket with no description, and while the read is out. */
  content: string
  /** The read's failure, worded by whichever tracker's table owns it. Null when there is none. */
  errorLines: ReactNode
  loading: boolean
  t: Translate
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader tone="accent" />
        <Text size="sm" tone="secondary">{t('tasks.detail.loading')}</Text>
      </div>
    )
  }

  if (errorLines) return <>{errorLines}</>

  if (!content) {
    return <Text size="sm" tone="secondary" className="opacity-40">{t('tasks.detail.emptyBody')}</Text>
  }

  return <MarkdownView content={content} variant="document" />
}

/**
 * A person on a Jira ticket, as a NAME and never as a face.
 *
 * The renderer's CSP is `img-src 'self' data:`, so an `avatarUrls` entry from
 * Atlassian could only be fetched and blocked — a broken image where a person
 * should be. The display name is what Jira's privacy settings never withhold, so
 * it is what this prints.
 */
function PersonLine({ name }: { name: string }) {
  return <Text tone="secondary" className="min-w-0 break-words">{name}</Text>
}

/**
 * Which tracker a ticket came from, as the several pieces of this page that branch on
 * it take it.
 *
 * The same two values `TaskDetailPageProps` is discriminated on, named once so the
 * components below the discriminated union can be given it as a plain prop. They are
 * past the point where narrowing is available — a `CommentCard` holds a comment, not
 * an issue — and still need to know, because a login wears an `@` and a display name
 * does not.
 */
type TaskTracker = 'github' | 'jira'

/**
 * One comment — `CommentCard` from `@ds/desktop`, with this page's words in it.
 *
 * The card is the description's own, deliberately, and that decision now lives in the
 * component: a ticket page is a description followed by a conversation, and giving the
 * replies a different card would say they are a different kind of thing.
 *
 * What is left here is the half a design system may not hold: which tracker decorates a
 * name with an `@`, and every string.
 */
function TicketComment({
  comment,
  tracker,
  locale,
  t,
}: {
  comment: TicketComment
  tracker: TaskTracker
  locale: string
  t: Translate
}) {
  const postedOn = formatCommentDate(comment.createdAt, locale)
  const editedOn = comment.updatedAt ? formatCommentDate(comment.updatedAt, locale) : ''

  return (
    <CommentCard
      // Both trackers report an author for every comment a person wrote; the ones they do
      // not are an app posting through Jira's API or a GitHub account since deleted, and
      // "commented" with nobody in front of it is not a sentence — so the card falls back
      // to naming the field instead.
      //
      // The `@` on the GitHub half only, matching the issue's own byline above the thread:
      // a login is a handle and wears one everywhere in that product, while "Ada Lovelace"
      // is a name and `@Ada Lovelace` reads as a mention of an account that does not exist.
      // The decoration is the caller's for exactly that reason; see `CommentCard.author`.
      {...(comment.author
        ? {
          author: tracker === 'github' ? `@${comment.author}` : comment.author,
          verb: t('tasks.detail.commented'),
        }
        : { title: t('tasks.detail.comment') })}
      {...(postedOn ? { date: postedOn } : {})}
      // Only when it says something the posting date does not — see `TicketComment.updatedAt`.
      {...(editedOn
        ? { edited: { label: t('tasks.detail.edited'), title: t('tasks.detail.editedOn', { date: editedOn }) } }
        : {})}
      empty={t('tasks.detail.emptyComment')}
    >
      {/* `variant="document"`, matching the description above it — a comment on a Jira
          ticket routinely carries a code block or a list, and the panel variant would set
          those in the narrow measure meant for a sidebar. */}
      {comment.body ? <MarkdownView content={comment.body} variant="document" /> : undefined}
    </CommentCard>
  )
}

/**
 * The ticket's conversation, under its description — on EITHER half of the page.
 *
 * Rendered only when there IS one: a "Comments" heading over nothing would read as a
 * thread that failed to load, where the truth is a ticket nobody has replied to.
 *
 * The GitHub half used to have no counterpart to this: its panel carried a count and
 * sent the reader to github.com. That was a real trade once — the count was one field
 * and the bodies were not — but it was never a large one, and it left one screen
 * showing a conversation on one tracker and a number on the other. Both reads now
 * bring the bodies back in the response the panel already makes (`DETAIL_FIELDS` on
 * Jira, `ISSUE_DETAIL_QUERY` on GitHub), so not rendering them would be discarding
 * content already paid for.
 *
 * WHICH END OF A LONG THREAD ARRIVED differs by tracker and this says so rather than
 * papering over it: Jira pages its comment field from the start, GitHub is asked for
 * the last fifty. A reader who reaches the bottom of a truncated thread must not
 * believe they have read all of it — and must not think they have read the END of it
 * when what they have is the beginning.
 */
function TicketComments({
  comments,
  total,
  tracker,
  locale,
  t,
}: {
  comments: TicketComment[]
  /** How many the ticket HAS, when the tracker said so and it is more than arrived. */
  total?: number
  tracker: TaskTracker
  locale: string
  t: Translate
}) {
  if (comments.length === 0) return null

  // The heading counts what the ticket HAS, never what fitted in the page — so the
  // two halves of this line cannot contradict each other. It said `comments.length`
  // first, which read as "2 comments · showing the first 2 of 47".
  const count = total ?? comments.length

  return (
    <>
      {/* `SectionHeader`, the app's one heading — the same object the board's own title
          row is. `count` carries the SECOND number here rather than the first, which is
          what that prop taking a string is for: the title says how big the conversation
          is, and the count says how much of it is on screen and from which end. */}
      <SectionHeader
        icon={MessageSquare}
        title={t(count === 1 ? 'tasks.detail.commentCount.one' : 'tasks.detail.commentCount.other', { count })}
        {...(total !== undefined
          ? {
            count: t(
              tracker === 'github' ? 'tasks.detail.commentsShowingLast' : 'tasks.detail.commentsShowingFirst',
              { count: comments.length },
            ),
          }
          : {})}
        spacing="none"
        className="px-1"
      />
      {comments.map((comment) => (
        <TicketComment key={comment.id} comment={comment} tracker={tracker} locale={locale} t={t} />
      ))}
    </>
  )
}

/**
 * One of the repositories the ticket's card stands for, with its configuration.
 *
 * The launcher's own shape — this page and the board's cards hand it the same list, so
 * there is one definition of "a repository an agent might open in".
 */
export type TaskDetailRepo = TaskAgentRepo

/** What the page needs whichever tracker the ticket came from. */
interface TaskDetailPageBaseProps {
  /**
   * EVERY repository the ticket's card stands for, in config order, never empty.
   *
   * One is the ordinary case. Two or more is a shared tracker target — one Jira
   * project planned for two services — and then the ticket genuinely belongs to
   * none of them in particular, which is what the launch below has to respect
   * rather than guess at. See `TaskRow.repos`.
   *
   * The FIRST is the card's identity, and the key the detail read is made on: the
   * repositories of a card share their coordinates, so any of them would fetch the
   * same ticket, and using the first keeps that read stable across reloads.
   */
  repos: TaskDetailRepo[]
  /**
   * Whether an agent is already on this ticket — the same answer the list's dot gives.
   *
   * Computed by the Tasks page rather than here: `buildAgentedIssues` unions the org
   * roster with the local terminals in one pass for the whole page, and asking the
   * question again per detail page would be a second, differently-shaped answer to it.
   * It is also the side that knows to fold a Jira key through `normalizeTicketId`.
   */
  hasAgent: boolean
  /**
   * The scrolling pane this page sits in — the Tasks page owns it, because the
   * list scrolls in it too.
   *
   * Needed as the IntersectionObserver's ROOT, not for convenience: the pane's top
   * edge is where the bar sits, and the viewport's is 48px plus a modal inset away
   * from it. An observer watching the viewport could not express "hidden behind the
   * bar", which is the only moment the bar has anything to say.
   */
  paneRef: RefObject<HTMLElement>
  /** Back to the list. Also what Escape does. */
  onBack: () => void
}

/**
 * The ticket on screen, and which tracker it belongs to — CORRELATED, as a union
 * rather than as two independent props.
 *
 * Mounted only for a selected ticket, so `issue` is never null. Pairing it with the
 * tracker in one member is what stops a Jira ticket being handed to the GitHub
 * branch: the two shapes share three field names (`title`, `url`, `createdAt`) and
 * differ in the only one that matters, so a mismatched pair would compile and then
 * read `undefined` as an issue number.
 */
type TaskDetailPageProps = TaskDetailPageBaseProps & (
  | { tracker: 'github'; issue: TaskIssue }
  | { tracker: 'jira'; issue: JiraTaskIssue }
)

export function TaskDetailPage(props: TaskDetailPageProps) {
  const { repos, hasAgent, paneRef, onBack } = props

  /**
   * The repository the detail read is keyed by, and the repositories the agent could
   * be started in.
   *
   * `primary` is the first and nothing more — see `repos`. `startable` is every one
   * of them the app could actually open a terminal in: the same question
   * `AgentInfoSidebar` asks of a repository before offering it, since a team repo
   * nobody has bound to a folder on this machine has no directory to launch in.
   */
  const primary = repos[0]
  const configKey = primary.configKey
  // The trail back to the list names the card, so it names what the card names: both
  // repositories when they share this ticket, in the order the header lists them.
  const repoName = repos.map((entry) => entry.name).join(' · ')
  // The launcher, shared with the board's cards — see `useTaskAgent`, which is where
  // every rule about WHERE an agent opens now lives.
  const { canStart, startFailed, clearStartFailed, openAgent, startAgent: launchAgent } = useTaskAgent(repos)
  const t = useT()
  const locale = useLocale()

  // The ticket's identity, narrowed once. Everything downstream — the read, the
  // agent launch, the prompt, the effect's dependencies — wants a primitive rather
  // than the union, and narrowing it here means the correlation is checked in one
  // place instead of at every use.
  const tracker = props.tracker
  const issueNumber = props.tracker === 'github' ? props.issue.number : 0
  const issueKey = props.tracker === 'jira' ? props.issue.key : ''
  /**
   * The identity `/magic:start` writes into `agents.ticket_id`, and the one this
   * page hands to `pickUpTask`.
   *
   * `String(issue.number)` was the only form before, and on a Jira ticket it
   * stringifies to `"undefined"` — which is what made every one of the three uses
   * below a bug the moment a Jira row became clickable.
   */
  const ticketId = tracker === 'jira' ? issueKey : String(issueNumber)

  /**
   * The `/magic:plan` session that FILED this ticket, or null — which is what most
   * tickets answer, since most were filed by hand. It draws one block in the column on
   * the right and nothing else.
   *
   * A READ PER OPENED TICKET, and cheap enough to be one: two indexed lookups in the
   * cloud, no tracker involved, and it goes out alongside the tracker detail read rather
   * than after it. Nothing on the page waits for it — the block appears when it lands.
   *
   * THE KEY IS SENT IN BOTH SPELLINGS on the GitHub side. `plan_tickets` holds what the
   * skill filed, which is `#412` (skills/magic-plan §7.2), while the table's own comment
   * gives `456` — so rows written by either are in the wild and a single spelling would
   * silently miss half of them. Jira has only ever had one spelling, upper-cased because
   * Jira resolves `per-1` and `PER-1` to the same ticket.
   *
   * THE REPOSITORIES ARE THE CLOUD UUIDS, not the config keys, and a repository this
   * machine has bound to no cloud row contributes none — which is what makes the block
   * absent rather than wrong for a repo the reader has only locally.
   */
  const [plan, setPlan] = useState<PlanTicketOrigin | null>(null)
  const openPlansModal = useStore((s) => s.openPlansModal)

  /**
   * THE CLOUD IDS AS A STRING, and the effect below keys on this rather than on `repos`.
   *
   * `repos` is built with a `.map()` in the parent's render, so it is a NEW ARRAY on
   * every render of the Tasks page — and that page re-renders on every pty tick, like
   * `terminalsKey` below says. Depending on the array meant re-running the read several
   * times a second, each run clearing the block to null first: the link visibly blinked
   * on a ticket that has a plan. The ids are what the read actually varies with, so they
   * are what the dependency has to be.
   */
  const repoIdsKey = useMemo(
    () => repos
      .map((repo) => repo.config?.id)
      .filter((id): id is string => typeof id === 'string' && id !== '')
      .join(','),
    [repos],
  )

  useEffect(() => {
    setPlan(null)
    if (repoIdsKey === '') return
    const repoIds = repoIdsKey.split(',')
    const keys = tracker === 'jira' ? [issueKey.toUpperCase()] : [`#${issueNumber}`, String(issueNumber)]

    let cancelled = false
    window.electronAPI.plans.forTicket(repoIds, keys)
      .then((found) => {
        if (!cancelled) setPlan(found)
      })
      .catch(() => {
        // Left null, which is also "no plan filed this": there is no sentence the page
        // could add here that a reader would act on. See `plans:forTicket`.
      })
    return () => { cancelled = true }
  }, [repoIdsKey, tracker, issueKey, issueNumber])

  /**
   * The three fields both shapes carry, so the chrome can read them without branching.
   *
   * `url` comes off the issue for BOTH halves, including Jira — the main process
   * already built it as `browseUrl(repo.siteUrl || credentialSiteUrl, key)`, which
   * keeps the credential-site fallback for a repository that declares only a project
   * key and normalises the trailing `/browse` that would otherwise produce
   * `…/browse/browse/PROJ-1`. Rebuilding it here from `resolveJiraSite(repo)` would
   * lose the fallback and duplicate the normalisation.
   *
   * It is `''` when no site could be resolved at all, which is why both controls in
   * the bar are guarded: a dead "Open" button is a worse answer than no button.
   */
  const { title, url, createdAt } = props.issue

  /**
   * Whether the title has gone behind the top bar, which is when that bar starts
   * carrying the title itself.
   *
   * An observer rather than a scroll handler: this is one boolean that flips twice
   * per read of an issue, and a `scroll` listener would recompute a rectangle on
   * every frame of every scroll to answer it. The negative top margin shrinks the
   * pane's rectangle by the bar's own height, so "not intersecting" means hidden
   * BEHIND the bar rather than merely level with the top of the pane.
   */
  const titleRef = useRef<HTMLDivElement>(null)
  const [condensed, setCondensed] = useState(false)
  useEffect(() => {
    const titleEl = titleRef.current
    const pane = paneRef.current
    if (!titleEl || !pane) return
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { root: pane, rootMargin: `-${TOP_BAR_H}px 0px 0px 0px` },
    )
    observer.observe(titleEl)
    return () => observer.disconnect()
  }, [paneRef])

  /**
   * TWO detail states and TWO error states, one pair per tracker.
   *
   * The errors could not be folded even if the details could: `PRStatusError` and
   * `JiraTaskStatusError` are disjoint unions with two different tables behind them,
   * and a Jira code sent through `ERROR_KEYS` misses every row of it — which renders
   * as two empty lines where the reason should be. Keeping them apart is what makes
   * a failed Jira read say something.
   *
   * Only one pair is ever populated, because only one read is ever made.
   */
  const [detail, setDetail] = useState<TaskIssueDetail | null>(null)
  const [detailError, setDetailError] = useState<PRStatusError | null>(null)
  const [jiraDetail, setJiraDetail] = useState<JiraTaskIssueDetail | null>(null)
  const [jiraError, setJiraError] = useState<JiraTaskStatusError | null>(null)
  const [loading, setLoading] = useState(false)

  /**
   * The rest of the ticket, read on mount.
   *
   * The page exists only while a ticket is selected, so "on selection" and "on
   * mount" are now the same moment — which is what the panel's guard against
   * fetching while closed used to be for. `cancelled` is still needed, and is
   * the same guard `useTasks` explains at length: the IPC call has no
   * cancellation, so a response for a ticket that is no longer on screen is
   * ignored rather than aborted.
   *
   * Keyed on the tracker and on PRIMITIVES, not on the issue object: the object is
   * re-derived from a fresh snapshot on every reload, so an object dependency would
   * re-read the ticket every time the list behind the page was refreshed.
   */
  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setDetailError(null)
    setJiraDetail(null)
    setJiraError(null)
    clearStartFailed()
    setLoading(true)

    const read = tracker === 'jira'
      ? window.electronAPI.tasks.getJiraIssueDetail(configKey, issueKey).then((result) => {
        if (cancelled) return
        if (isJiraStatusError(result)) setJiraError(result)
        else setJiraDetail(result)
      })
      : window.electronAPI.tasks.getIssueDetail(configKey, issueNumber).then((result) => {
        if (cancelled) return
        if (isPRStatusError(result)) setDetailError(result)
        else setDetail(result)
      })

    read
      .catch(() => {
        // The IPC call itself failed, which the handler's own try/catch cannot
        // cover. Reported as the named failure of whichever half asked, so each
        // tracker keeps one error path rather than borrowing the other's.
        if (cancelled) return
        if (tracker === 'jira') setJiraError({ error: 'offline', message: 'IPC call failed' })
        else setDetailError({ error: 'network', message: 'IPC call failed' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [configKey, tracker, issueKey, issueNumber])

  /**
   * Escape goes back to the LIST, not out of the whole page.
   *
   * PageModal listens for Escape on `window` too and closes the modal, so this
   * has to run first AND stop the other listener — which is what capture phase
   * plus `stopImmediatePropagation` does. Plain `stopPropagation` would not help:
   * both listeners are on the same target, and only the "immediate" form stops
   * the others there. Mounted with this page, so Escape goes on closing the
   * modal from the list itself.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopImmediatePropagation()
      onBack()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onBack])

  /**
   * The page's one affirmative action. `useTaskAgent` owns the launch itself and the
   * rule about which identity each tracker is started on; this only names the ticket.
   */
  const startAgent = useCallback(
    () => launchAgent(ticketId, tracker === 'jira' ? issueKey : url),
    [launchAgent, ticketId, tracker, issueKey, url],
  )

  /**
   * The other thing a reader might want from a ticket: to think about it rather than do it.
   *
   * A plain-prose prompt rather than a skill, because there is no `/magic:` verb for this and
   * inventing one would be a second surface to keep in step with eight others.
   *
   * A GitHub issue is named by its URL, which is what `gh` reads it through; a Jira ticket is
   * named by its KEY, which is what the Atlassian MCP server resolves. Both are prerequisites
   * the app already checks for.
   *
   * DRAFTED, not run, and that is the difference between the two buttons: starting work needs
   * no elaboration, whereas a discussion is worth little without the sentence the person wanted
   * to say — which side of it they want to talk about, what they are unsure of, who asked. So
   * this fills the input box and stops, and the trailing space is where they carry on typing.
   * Everything the draft used to spell out about not implementing it lived in the way of that
   * sentence; see `discussPrompt`, which also picks the repository's discussion language.
   *
   * It is the only launch that names its agent, and it has to: `/magic:start` titles its own
   * agent off the ticket it reads, whereas nothing in a discussion ever would — so without
   * this it would sit in the sidebar as "Claude 3", attached to no ticket. The ticket goes on
   * `ticketId` for the same reason it does there: it is what the Tasks page, the info sidebar
   * and the org roster all read to know what an agent is about. NO status goes with it — the
   * agent has done nothing yet, and a discussion is not a workflow step.
   */
  const discussAgent = useCallback(() => openAgent(
    ticketId,
    discussPrompt(tracker === 'jira' ? issueKey : url, primary.config?.languages),
    'draft',
    { title: discussAgentTitle(ticketId), ticketId },
  ), [openAgent, tracker, issueKey, url, ticketId, primary.config])

  /**
   * The terminal the agent on this ticket is running in, when it is running HERE.
   *
   * Subscribed to a SIGNATURE and read non-reactively, the idiom `pages/Tasks/index.tsx`
   * states in full: the store rewrites `terminals` on every pty tick, and the two fields
   * this lookup reads change only when an agent picks up or drops a ticket.
   *
   * `hasAgent` and this are deliberately two different questions. That one is true for a
   * teammate's agent as well, because it comes from the org roster — and a teammate's
   * agent has no terminal this window could show. So the banner below states the fact on
   * `hasAgent` and offers its button only on this.
   */
  const terminalsKey = useStore((s) => terminalAgentSignature(s.terminals))
  const agentTerminalId = useMemo(
    () => findAgentTerminalId(useStore.getState().terminals, ticketId, repos),
    [ticketId, repos, terminalsKey],
  )

  /**
   * Go and look at the agent that is already on this ticket.
   *
   * The tray's own "focus agent" move (`App.tsx`), for the same reason: the Tasks page is
   * a modal over the terminals, so selecting one behind it and leaving the modal up would
   * look like nothing happened. Closing first is what makes the agent appear.
   */
  const viewAgent = useCallback(() => {
    if (!agentTerminalId) return
    const { setActiveTerminal, closeModal } = useStore.getState()
    closeModal()
    setActiveTerminal(agentTerminalId)
  }, [agentTerminalId])

  /**
   * Take the agent off this ticket — the undo for attaching one, wherever the
   * attachment came from: `/magic:start`, or the badge in the agent's own sidebar.
   *
   * IT DOES NOT TOUCH THE AGENT. The terminal keeps running, keeps its title, its
   * worktree and its history; only the ticket id goes. That is the whole distinction
   * from closing an agent, and it is why the button is worded as a link being cut
   * rather than as a deletion, and why it needs no confirmation: the ticket is one
   * click away from being attached again, from this very page.
   *
   * Gated on `agentTerminalId` like the button beside it, and for the same reason: a
   * teammate's agent is a row in the org roster with no terminal here, and nothing this
   * window can write to.
   */
  const detachAgent = useCallback(() => {
    if (!agentTerminalId) return
    useStore.getState().detachTicketFromAgent(agentTerminalId)
  }, [agentTerminalId])

  /**
   * WHAT THE AGENT BANNER OFFERS, DECLARED ONCE — and the banner is drawn twice: full
   * width at the top of the page, and stacked in the sidebar once that copy has scrolled
   * away. It was two fragments of hand-built buttons, identical but for their order,
   * because the order that reads as a ranking is left-to-right in a row and top-down in
   * a column. `Banner` knows that now, so what is declared here is the RANK and the two
   * verbs; where each one lands is its layout's business.
   *
   * `undefined` AND NOT AN EMPTY ARRAY when there is no local terminal — the banner takes
   * either, and this is the one that reads as "there is nothing to offer" rather than as
   * a list that happens to be short. A teammate's agent is a row in the org roster with
   * no terminal in this window, and nothing here can act on it.
   */
  const agentBannerActions = useMemo(
    () =>
      agentTerminalId
        ? [
            { label: t('tasks.viewAgent'), icon: BotMessageSquare, onClick: viewAgent, primary: true },
            { label: t('tasks.detachAgent'), icon: Unlink, onClick: detachAgent, title: t('tasks.detachAgentHint') },
          ]
        : undefined,
    [agentTerminalId, viewAgent, detachAgent, t],
  )

  const openedOn = formatIssueDate(createdAt, locale)

  /**
   * How many comments the byline announces, from whichever read knows.
   *
   * `commentTotal` first on the Jira side: it is the number the TICKET has, where
   * `comments.length` is the number that fitted in the page Jira sent. The byline
   * says how big the conversation is; the line above the thread says how much of it
   * is on screen.
   *
   * 0 while either read is out, which is what keeps the counter from appearing and
   * then correcting itself.
   */
  const commentCount = tracker === 'jira'
    ? jiraDetail?.commentTotal ?? jiraDetail?.comments.length ?? 0
    : detail?.commentCount ?? 0

  /**
   * The thread to render, and how many the ticket has when that is MORE than arrived.
   *
   * The two trackers report the same fact through opposite conventions, and this is
   * where they are reconciled into the one pair `TicketComments` takes. Jira sends a
   * `commentTotal` only when it paged (see `JiraTaskIssueDetail.commentTotal`), so it
   * passes straight through; GitHub always sends a `totalCount`, so the comparison
   * that Jira makes on its own side is made here instead. Either way `total` is
   * `undefined` exactly when the whole conversation is on screen, which is what keeps
   * "showing the last 50" off a thread of three.
   */
  const thread = tracker === 'jira'
    ? jiraDetail && { comments: jiraDetail.comments, total: jiraDetail.commentTotal }
    : detail && {
      comments: detail.comments,
      total: detail.commentCount > detail.comments.length ? detail.commentCount : undefined,
    }

  /**
   * The status as of THIS read, falling back to the row's until it lands.
   *
   * The detail read asks for the status again precisely so a ticket transitioned
   * since the list was drawn stops showing the stale word — but showing nothing at
   * all while the read is out would make the pill blink on every open, so the row's
   * value stands in until it is replaced.
   */
  const jiraStatus = tracker === 'jira'
    ? jiraDetail ?? { statusName: props.issue.statusName, statusCategory: props.issue.statusCategory }
    : null

  /**
   * The priority as of THIS read, on the same terms — with one difference that has
   * to be written as a branch rather than a `??`.
   *
   * A landed detail read with NO priority is an answer: the ticket was
   * de-prioritised, or its project never had the field. Falling through to the row's
   * value there would leave the badge showing a priority Jira has just said the
   * ticket does not have, which is the one case this whole re-read exists to catch.
   */
  const jiraPriority = tracker !== 'jira'
    ? undefined
    : jiraDetail ? jiraDetail.priority : props.issue.priority

  /**
   * The read's failure, already worded by whichever tracker's table owns it.
   *
   * Picked HERE rather than inside `DetailBody`, because this is the side that knows
   * which of the two reads it made: a Jira code sent through the GitHub table misses
   * every row of it and renders as two blank lines.
   */
  const errorLines = tracker === 'jira'
    ? jiraError && <JiraErrorLines error={jiraError} surface="detail" />
    : detailError && <TaskErrorLines error={detailError} />

  /**
   * The status chip, in the one form both places that show it want.
   *
   * The pinned bar and the byline draw the same chip, so the "which tracker, and has
   * its read landed?" question is answered once instead of twice in the JSX.
   */
  const statusChip = jiraStatus
    ? <JiraStatusPill name={jiraStatus.statusName} category={jiraStatus.statusCategory} />
    : detail && <StateChip state={detail.state} t={t} />

  /**
   * Whether the ticket is FINISHED, which is what withholds the Start button below.
   *
   * The board's `done` column, asked on this page's own reads: the Jira status category
   * fixed by Jira, the GitHub issue's state. Both fall back to the row's value until the
   * detail read lands, for `jiraStatus`' reason — a button that appeared for a moment and
   * then withdrew itself would be worse than one held back a beat.
   *
   * The GitHub fallback is `closedAt` because that is the only thing the LIST read knows
   * about a closed issue; the detail read answers properly with `state`.
   */
  const isDone = tracker === 'jira'
    ? jiraStatus?.statusCategory === 'done'
    : detail
      ? detail.state === 'CLOSED'
      : props.tracker === 'github' && !!props.issue.closedAt

  return (
    /* NO GAP. The column used to space its four blocks by `gap-5`, on top of whatever
       each of them already carried — the bar's own slack, the title's `pb-5` and its
       rule, the cards' padding and grounds. Two spacing systems for one stack, and the
       one that showed was always the sum.

       Each block now owns the space around it, which is the only way the page can be
       tuned block by block: the title keeps its `pb-5`, and every card below has a
       GROUND of its own to be separated by — which is the whole of it now that the rule
       under the heading and the outline round each card have both gone. */
    <div className="flex flex-col">
      {/* The trail out, and the bar that takes over from the title.

          ONE bar doing both jobs rather than a second one that appears on scroll:
          a bar that materialises has to push the page down by its own height or
          float over it, and both read as a jolt. This one is always here, always
          pinned, and swaps what sits between the back link and the button — the
          repository while the title is on screen, the state and the title itself
          once it is not.

          Full-bleed via the negative margins, so what scrolls past goes under an
          opaque band edge to edge rather than under a 24px-inset card, and tall
          enough to BE the page's top inset rather than to sit on one. `bg-bg-
          secondary` is PageModal's own panel colour: anything else would read as
          a floating toolbar. */}
      <StickyBar height={TOP_BAR_H} stuck={condensed} className="-mx-6 px-6">
        {/* `Button tone="ghost"` — no plate at rest, which is what a trail out of a page
            should be: it is not an action the reader came here for. `-ml-2` pulls the
            label's optical left edge back onto the page's own inset, which the button's
            own horizontal padding would otherwise push in by twelve pixels. */}
        <Button
          tone="ghost"
          icon={ArrowLeft}
          onClick={onBack}
          title={t('tasks.detail.back')}
          className="-ml-2"
        >
          {t('tasks.detail.back')}
        </Button>
        {condensed ? (
          // Left-aligned next to the link it follows, and in the row's own type
          // size: this is the title standing in for itself, not a second heading.
          <>
            {/* Ahead of the status, not after it: the label answers "which ticket is
                this, and in which tracker" and the pill answers "where is it up to",
                and the first question is the one a reader who has scrolled away from
                the title is asking.

                THE ID RIDES IN THE LABEL, where it used to trail the title in grey at
                the far right of the bar. One label, as on the board's cards: the mark
                and the key are one fact, and on a bar that truncates its title they were
                the two pieces most likely to end up either side of an ellipsis. */}
            <TrackerBadge
              tracker={tracker}
              ticketId={tracker === 'jira' ? issueKey : `#${issueNumber}`}
            />
            {statusChip}
            <Text className="truncate min-w-0" title={title}>
              {title}
            </Text>
          </>
        ) : (
          <Text tone="secondary" className="truncate opacity-50">{repoName}</Text>
        )}
        {/* `ml-auto` moved onto the pair's leading element: it is what pushes both
            buttons to the right edge, and left on the second one it would have put
            the whole gap between them instead.

            Both are guarded on the URL rather than only the Jira one, because it is
            the same guard: a ticket with no site resolved has nothing to copy and
            nothing to open. A GitHub issue always has one. */}
        {url && (
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {/* `CopyButton` at `md` — 28px, the same height `BTN` stands beside it.
                The confirmation, the two seconds it holds and the tone it turns are the
                design system's now; this only names the link and the words. */}
            <CopyButton
              value={url}
              label={t('tasks.copyLink')}
              copiedLabel={t('tasks.copyLinkDone')}
              size="md"
            />
            <Button
              tone="neutral"
              icon={ExternalLink}
              onClick={() => window.electronAPI.shell.openExternal(url)}
            >
              {t(tracker === 'jira' ? 'tasks.jira.openIssue' : 'tasks.openIssue')}
            </Button>
          </div>
        )}
      </StickyBar>

      {/* Title and byline, GitHub's order: what it is, then its id, then the state
          and who opened it. BOTH trackers wear the id in the heading now — a Jira
          key used to be a badge on the byline instead, which is the same fact in a
          different place on a page a reader moves between. */}
      {/* NO RULE UNDER THE HEAD. It carried `border-b border-line` — a line straight
          across the page between the title block and the body — which was the last thing
          on this page drawing a boundary that the layout already states: the heading is
          `text-2xl` beside a badge, the body is two columns of cards, and nothing about
          the two was in danger of being read as one block. `pb-5` stays and is now the
          whole separation, which is also the only one the column's own spacing leaves it
          — see the wrapper above. */}
      <div ref={titleRef} className="flex flex-col gap-3 pb-5">
        {/* The label sits beside the heading and OUTSIDE its text, as a flex sibling:
            inlined into the `h1` it would ride the text baseline and sink below it on
            a title that wraps to two lines. `items-center` centres the two on their
            HEIGHTS — the mark used to hang from the first line's cap height, which left
            it visibly high on the one-line titles that are most of them.

            ONE LABEL CARRYING BOTH, where this was a tracker tile beside the heading and
            the id in grey INSIDE it. The two said one thing — "this is PER-1234, in
            Jira" — from either side of the title, and the id at the end of a long
            heading was the half that wrapped onto a line of its own. It is the board
            card's label at the heading's own weight; see `TrackerBadge`. */}
        <div className="flex items-center gap-3 min-w-0">
          <TrackerBadge
            tracker={tracker}
            ticketId={tracker === 'jira' ? issueKey : `#${issueNumber}`}
            size="md"
          />
          {/* The one raw heading on the page, and it stays one: `Text` tops out at
              `2xl` but renders a `<span>`, and a ticket's title is the document's `h1`.
              The FACE is the design system's — `TEXT_FACE` names Cera Pro directly,
              because `font-sans` resolves to a different family in the webapp and a
              heading leaning on it would be set in two faces across the two builds. */}
          <h1 className={`${TEXT_FACE} text-2xl font-bold text-ink leading-snug min-w-0`}>{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Nothing until the state is actually known: a chip reading "Open"
              before the read lands would be a guess, and the one case it gets
              wrong is the issue that was just closed. The Jira pill has the row's
              value to stand on in the meantime, which is why it is not held back. */}
          {statusChip}
          {/* Beside the status and after it, which is the order the list row reads
              in — the ticket's two moving facts, in the same sequence on both
              surfaces. Nothing at all when the ticket has no priority: see
              `JiraTaskIssue.priority`. */}
          {/* Between the status and the priority, in the row's own order — the ticket
              page and the row it was opened from read down the same sequence.

              Off the ROW and not re-read, unlike the status and the priority beside
              it. Those two are what a human moves between the list read and the click;
              an epic link is a structural fact that is changed by re-planning, not in
              the course of a day, so a field on the detail read for it would be paid
              for on every open to catch a change nobody makes. */}
          {tracker === 'jira' && props.issue.epic && <JiraEpicBadge epic={props.issue.epic} t={t} />}
          {jiraPriority && <JiraPriorityBadge priority={jiraPriority} t={t} />}
          <Text tone="secondary">
            {tracker === 'github' && props.issue.author
              ? t('tasks.detail.openedBy', { login: props.issue.author, date: openedOn })
              : t('tasks.detail.openedOn', { date: openedOn })}
          </Text>
          {/* One counter for both halves, off the number each read actually knows:
              GitHub reports a count and nothing else, Jira sends the comments
              themselves and `commentTotal` when it sent only a page of them. */}
          {commentCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Icon glyph={MessageSquare} size="sm" tone="inherit" className="text-text-secondary" />
              <Text tone="secondary">
                {t(commentCount === 1 ? 'tasks.detail.commentCount.one' : 'tasks.detail.commentCount.other', {
                  count: commentCount,
                })}
              </Text>
            </span>
          )}
        </div>
      </div>

      {/* SOMEBODY IS ALREADY ON THIS ONE — full width, above both columns.

          It was a line of small print at the top of the action card, which is where a
          reason for a disabled button belongs and not where a fact about the ticket does:
          by the time it was read, the faded pair below it had already been taken for a
          broken card. Here it is the first thing under the title, in the green the board's
          own cards now wear for it, and it carries the one thing there is to do about it.

          The BUTTON needs the agent to be on this machine, which is a narrower question
          than the banner's — see `agentTerminalId`. A teammate's agent is a fact worth
          stating and nothing this window can open, so the banner stands on its own. */}
      {/* `mb-5`, the title's own `pb-5`: the column above spaces nothing for its
          blocks, so a block that states a fact about the ticket and then lets the
          body start has to carry the separation itself — without it the banner and
          the first card share an edge and read as one panel. Margins are the one
          thing `Banner` leaves to its caller; see its `className`. */}
      {hasAgent && (
        <Banner
          variant="success"
          icon={BotMessageSquare}
          className="mb-5"
          /* ONE LIST FOR BOTH LAYOUTS. This pair used to be written out twice — a
             fragment here and the same fragment in the sidebar with its two buttons
             swapped — because the order that reads as a ranking is left-to-right in a
             row and top-down in a column. The rank is declared now and `Banner` puts
             each one where its own layout wants it, so there is one place to edit.

             Going to look at the agent is what somebody reading this banner nearly
             always wants; cutting the link is the occasional correction. */
          actions={agentBannerActions}
        >
          {t('tasks.hasAgentHint')}
        </Banner>
      )}

      {/* The two columns of a GitHub issue. `items-start` so the metadata card
          keeps its own height instead of stretching to a long body. */}
      <div className="flex items-start gap-6 min-w-0">
        {/* A column now rather than a single box: the description is the first thing
            in a conversation, not a thing beside one, so the thread stacks under it on
            the same gap the page uses everywhere else. */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* THE DESCRIPTION IS THE FIRST TURN of the conversation, so it is the same
              card as the replies under it — `CommentCard`, which is built on that. What
              differs is the strip: this one names the field where a reply names a person,
              and on the GitHub half it does both, because an issue's body IS its author's
              first comment. */}
          <CommentCard
            {...(tracker === 'github' && props.issue.author
              ? { author: `@${props.issue.author}`, verb: t('tasks.detail.commented') }
              : { title: t('tasks.detail.description') })}
            {...(openedOn ? { date: openedOn } : {})}
          >
            <DetailBody
              content={tracker === 'jira' ? jiraDetail?.description ?? '' : detail?.body ?? ''}
              errorLines={errorLines}
              loading={loading}
              t={t}
            />
          </CommentCard>

          {/* Both halves now, off whichever read landed — see `TicketComments`.
              Nothing is drawn while a read is out or after it failed: `thread` is
              null in both cases, and the component itself returns null on a ticket
              nobody has replied to. */}
          {thread && (
            <TicketComments
              comments={thread.comments}
              total={thread.total}
              tracker={tracker}
              locale={locale}
              t={t}
            />
          )}
        </div>

        {/* Sticky, so the action and the metadata stay put while a long issue
            body scrolls past them — and offset by the top bar's height plus a
            gap, or it would pin halfway underneath it. Measured from the pane's
            padding box, which is why the page's own 24px inset lives on the sweep
            layer rather than on the scrolling pane. */}
        <div
          className="w-64 flex-shrink-0 sticky z-10 flex flex-col gap-3"
          style={{ top: TOP_BAR_H + 16 }}
        >
          {/* THE BANNER AGAIN, once its full-width copy has scrolled off the top.

              Not a second statement of the same fact but the same one kept on screen:
              "somebody is already on this ticket" is what withholds the Start button in
              this very column, and a reader who has scrolled into a long thread has lost
              the only thing explaining why there is nothing to press. `condensed` is the
              handoff — it is true exactly when the title, and with it the banner under
              it, has gone behind the pinned bar.

              Narrower than its full-width copy and stacked because of it: this column is
              256px, where the sentence and the button sit side by side above. */}
          {hasAgent && condensed && (
            <Banner
              variant="success"
              icon={BotMessageSquare}
              layout="stacked"
              /* THE SAME LIST as the full-width copy above, and that is the point: the
                 `stacked` layout puts the primary at the top where the row puts it at
                 the right, so one declaration draws both. */
              actions={agentBannerActions}
            >
              {t('tasks.hasAgentHint')}
            </Banner>
          )}

          {/* The page's one affirmative action, and it is first: the metadata
              under it is what you read about the ticket, this is what you do
              about it.

              GONE ENTIRELY once an agent is on the ticket, where it used to hold a
              sentence and two faded buttons. Neither launch is available then — a second
              `/magic:start` on the same ticket is a second worktree and a second branch
              for one piece of work, and a third agent reading it over the shoulder of the
              one working it is noise on the same ticket — and a card with nothing live in
              it is a card that reads as broken. The green banner above says what the state
              is and offers the move that belongs to it. */}
          {!hasAgent && (
            <Card className="flex flex-col gap-2">
              {/* TWO `Button`s AND NOTHING ELSE. Each carried a second line explaining
                  itself — "opens a terminal in this repository and runs /magic:start" —
                  and the sentence was the reason this could not be the design system's
                  own button at all. It went, and the buttons came back to the shared
                  ladder: "Start an agent" beside a Play mark is not a proposition anybody
                  needs glossed, and a card whose two controls are each three lines tall is
                  a card that reads as a form.

                  NOT OFFERED ON A FINISHED TICKET. A ticket whose board says Done, or
                  whose issue is closed, is not work to pick up — starting an agent on one
                  is the same mistake as starting a second on a ticket somebody has, and
                  the board's own cards withhold the button for it too. Discuss stays: a
                  finished ticket is very much a thing to ask about. */}
              {/* `ink` ON THE PRIMARY, which is the louder of the two plates and not the
                  quieter one: it is the highest contrast the theme has — near-black on the
                  four light themes, white on the four dark ones — where the accent is one
                  hue among the ten the palette owns. The ranking is unchanged; only which
                  colour carries it is. */}
              {!isDone && (
                <Button
                  size="md"
                  tone="ink"
                  icon={Play}
                  onClick={startAgent}
                  disabled={!canStart}
                  className="w-full"
                >
                  {t('tasks.startAgent')}
                </Button>
              )}
              {/* Under the primary rather than beside it: they are alternatives on the
                  same ticket, and side by side at this column's width both labels would
                  wrap. The accent reads as the second offer here rather than the first —
                  a tint of the app's own hue under a plate of its own ink. */}
              <Button
                size="md"
                tone="accent"
                icon={MessagesSquare}
                onClick={discussAgent}
                disabled={!canStart}
                className="w-full"
              >
                {t('tasks.discussAgent')}
              </Button>
              {/* Said in place instead of failing on the click, and BEFORE any call is
                  made: a repository nobody has bound to a folder on this machine has no
                  directory to open a terminal in, and the fix is a setting. */}
              {!canStart && (
                <div className="flex flex-col gap-0.5">
                  <Text>{t('tasks.noLocalRepo')}</Text>
                  <Text tone="secondary" className="opacity-70">{t('tasks.noLocalRepoHint')}</Text>
                </div>
              )}
              {startFailed && <Text className="text-orange">{t('tasks.startFailed')}</Text>}
            </Card>
          )}

          {/* THE FIELDS ARE `MetaBlock`s IN ONE `Card` now, where they were bordered
              boxes sharing hairlines. The separation is the `gap`: a column of five
              fields is one card rather than five boxes with edges between them, and the
              quiet of each label is what says a new field has started. */}
          <Card className="flex flex-col gap-4">
            {tracker === 'jira' ? (
              <>
                {/* The people and the labels only exist once the detail read lands,
                    so they say "none" rather than nothing while it is out. */}
                <MetaBlock title={t('tasks.detail.assignees')}>
                  {jiraDetail?.assignee ? <PersonLine name={jiraDetail.assignee} /> : <NoneYet t={t} />}
                </MetaBlock>
                <MetaBlock title={t('tasks.jira.detail.reporter')}>
                  {jiraDetail?.reporter ? <PersonLine name={jiraDetail.reporter} /> : <NoneYet t={t} />}
                </MetaBlock>
                <MetaBlock title={t('tasks.detail.labels')}>
                  {jiraDetail && jiraDetail.labels.length > 0
                    ? jiraDetail.labels.map((label) => <Label key={label} title={label}>{label}</Label>)
                    : <NoneYet t={t} />}
                </MetaBlock>
                {/* THE BYLINE'S OWN TWO FIELDS, kept on screen once the byline itself has
                    gone behind the pinned bar — `condensed`, the same handoff the banner
                    above uses. They are the ticket's two planning facts, and "which epic
                    is this, and how urgent" is a question asked while reading the thread
                    rather than at the top of it.

                    LAST in the card, after the people and the labels: they are a repeat
                    of something the page already said, and putting them above the fields
                    that are only stated here would reorder the card as you scroll.

                    Each is withheld when the ticket has none, rather than saying "none"
                    the way the blocks above do. Those three are always-present fields
                    that happen to be empty; a ticket with no epic has no such row to
                    leave blank, and the byline draws nothing for it either. */}
                {condensed && props.issue.epic && (
                  <MetaBlock title={t('tasks.jira.detail.epic')}>
                    <JiraEpicBadge epic={props.issue.epic} t={t} />
                  </MetaBlock>
                )}
                {condensed && jiraPriority && (
                  <MetaBlock title={t('tasks.jira.detail.priority')}>
                    <JiraPriorityBadge priority={jiraPriority} t={t} />
                  </MetaBlock>
                )}
              </>
            ) : (
              <>
                {/* Assignees only exist once the detail read lands, so they say
                    "none" rather than nothing while it is out. Labels came with the
                    row and are shown straight away. */}
                <MetaBlock title={t('tasks.detail.assignees')}>
                  {detail && detail.assignees.length > 0
                    ? detail.assignees.map((login) => (
                      <Text key={login} tone="secondary">{`@${login}`}</Text>
                    ))
                    : <NoneYet t={t} />}
                </MetaBlock>
                <MetaBlock title={t('tasks.detail.labels')}>
                  {props.issue.labels.length === 0
                    ? <NoneYet t={t} />
                    : props.issue.labels.map((label) => <Label key={label} title={label}>{label}</Label>)}
                </MetaBlock>
                {/* Both blocks below exist only when GitHub reported the hierarchy —
                    an empty "Sub-issues" on the vast majority of issues would be a
                    row of nothing on every page. */}
                {props.issue.subIssues && (
                  <MetaBlock title={t('tasks.detail.subIssues')}>
                    <div className="w-full flex flex-col gap-1.5">
                      <Text tone="secondary">
                        {t('tasks.detail.subIssuesDone', {
                          completed: props.issue.subIssues.completed,
                          count: props.issue.subIssues.total,
                        })}
                      </Text>
                      {/* The progress GitHub draws there. Rounded to the pixel by the
                          browser, so the bar can read as full one issue early — the
                          count above it is the number of record. */}
                      <ProgressBar
                        value={(props.issue.subIssues.completed / props.issue.subIssues.total) * 100}
                        track="strong"
                      />
                    </div>
                  </MetaBlock>
                )}
                {props.issue.parent && (
                  <MetaBlock title={t('tasks.detail.parent')}>
                    <ParentLink parent={props.issue.parent} />
                  </MetaBlock>
                )}
              </>
            )}
            {/* OUTSIDE the tracker branch, and last in the card.
                
                Outside, because "which plan is this from" is the one fact here that does
                not belong to a tracker at all — it comes out of our own cloud, and a
                Jira ticket and a GitHub issue answer it the same way. Duplicating the
                block into both arms would have been two places for one answer to drift.

                Last, because it is the only block that leaves the page: everything above
                describes the ticket, this goes somewhere else. And WITHHELD when there is
                no plan rather than saying "none" the way the assignees and labels blocks
                do — those are fields every ticket has and this one happens to be empty;
                most tickets were filed by hand and have no plan to have a row about. */}
            {plan && (
              <MetaBlock title={t('tasks.detail.plannedIn')}>
                <button
                  type="button"
                  onClick={() => openPlansModal(plan.id)}
                  title={t('tasks.detail.openPlan')}
                  className="group w-full text-left flex items-start gap-2 min-w-0 bg-transparent border-none p-0 cursor-pointer"
                >
                  <Icon glyph={NotebookPen} size="sm" tone="muted" className="mt-px flex-shrink-0" />
                  {/* `planLabel` and not `plan.title`: a plan is named by its title, then
                      its slug, then its spec key, and a session whose title has not been
                      written yet must not read as a blank link here when the Plans list
                      three clicks away is calling it something. */}
                  <Text
                    tone="secondary"
                    className="min-w-0 break-words transition-colors group-hover:text-ink group-hover:underline"
                  >
                    {planLabel(plan)}
                  </Text>
                </button>
              </MetaBlock>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
