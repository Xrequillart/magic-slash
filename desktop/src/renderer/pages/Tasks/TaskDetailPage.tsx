import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ArrowLeft, CircleCheck, CircleDot, ExternalLink, MessageSquare, MessagesSquare, Play } from 'lucide-react'
import type {
  InitialPromptMode,
  JiraTaskComment,
  JiraTaskIssue,
  JiraTaskIssueDetail,
  JiraTaskStatusError,
  PRStatusError,
  RepositoryConfig,
  TaskIssue,
  TaskIssueDetail,
} from '../../../types'
import { isJiraStatusError, isPRStatusError } from '../../../types'
import { useLocale, useT, type Translate } from '../../i18n'
import { BTN, BTN_ICON, BTN_NEUTRAL_STACKED, BTN_PRIMARY_STACKED } from '../../theme/controls'
import { WaveLoader } from '../../components/WaveLoader'
import MarkdownView from '../../components/file-preview/MarkdownView'
import { StatusPill, TicketBadge } from '../Dashboard/parts'
import type { NewTerminalDetail } from '../Terminals'
import { JiraErrorLines, JiraStatusPill, TaskErrorLines } from './TasksRepoSection'
import { CopyLinkButton } from '../../components/CopyLinkButton'
import { TrackerMark } from '../../components/icons/TrackerIcons'

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
const TOP_BAR_H = 56

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
 * The state chip: GitHub's, in our pill vocabulary.
 *
 * The icon is half the message — a filled dot for something still open, a tick
 * for something closed — so the chip survives being read at a glance, and does
 * not rely on green-versus-purple alone.
 */
function StateChip({ state, t }: { state: TaskIssueDetail['state']; t: Translate }) {
  const open = state === 'OPEN'
  const Icon = open ? CircleDot : CircleCheck

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
        open ? 'bg-green/15 text-green' : 'bg-purple/15 text-purple'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {t(open ? 'tasks.detail.stateOpen' : 'tasks.detail.stateClosed')}
    </span>
  )
}

/**
 * One block of the right-hand column: a small grey heading and whatever it
 * labels. The hairline between blocks is the divider GitHub uses there, and the
 * last one drops it so the card does not end on a line.
 */
function SideBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-line-subtle last:border-b-0 flex flex-col gap-2">
      <span className="text-xs font-medium text-text-secondary">{title}</span>
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">{children}</div>
    </div>
  )
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
      <span className="text-xs text-text-secondary min-w-0 break-words">
        #{parent.number} — {parent.title}
      </span>
    )
  }

  return (
    <button
      onClick={() => window.electronAPI.shell.openExternal(url)}
      title={parent.title}
      className="group text-left text-xs text-text-secondary hover:text-ink transition-colors min-w-0 break-words bg-transparent border-none p-0 cursor-pointer"
    >
      <span className="text-accent/80 group-hover:text-accent">#{parent.number}</span>{' '}
      <span className="group-hover:underline">{parent.title}</span>
    </button>
  )
}

/** "there are none", said rather than left blank — an empty block reads as "not loaded yet". */
function NoneYet({ t }: { t: Translate }) {
  return <span className="text-xs text-text-secondary/40">{t('tasks.detail.none')}</span>
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
      <div className="px-5 py-4 flex items-center gap-2 text-text-secondary text-sm">
        <WaveLoader className="text-accent" />
        <span>{t('tasks.detail.loading')}</span>
      </div>
    )
  }

  if (errorLines) {
    return <div className="px-5 py-4">{errorLines}</div>
  }

  if (!content) {
    return (
      <div className="px-5 py-4 text-sm text-text-secondary/40">{t('tasks.detail.emptyBody')}</div>
    )
  }

  return (
    <div className="px-5 py-4">
      <MarkdownView content={content} variant="document" />
    </div>
  )
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
  return <span className="text-xs text-text-secondary min-w-0 break-words">{name}</span>
}

/**
 * One comment, in the description box's own shape: an author strip, then the body
 * under a hairline.
 *
 * The SAME box, deliberately. A ticket page is a description followed by a
 * conversation, and giving the replies a different card would say they are a
 * different kind of thing. What separates them is the strip: the description's says
 * "Description", a comment's says who wrote it and when.
 *
 * `variant="document"` for the body, matching the description above it — a comment
 * on a Jira ticket routinely carries a code block or a list, and the panel variant
 * would set those in the narrow measure meant for a sidebar.
 */
function CommentCard({ comment, locale, t }: { comment: JiraTaskComment; locale: string; t: Translate }) {
  const postedOn = formatCommentDate(comment.createdAt, locale)
  const editedOn = comment.updatedAt ? formatCommentDate(comment.updatedAt, locale) : ''

  return (
    <div className="rounded-xl bg-surface border border-line-field overflow-hidden">
      <div className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-subtle border-b border-line-subtle">
        {/* Jira reports an author for every comment a person wrote; the ones it does
            not are an app or an automation posting through the API, and "commented"
            with nobody in front of it is not a sentence. */}
        {comment.author ? (
          <>
            <span className="text-xs font-medium text-ink">{comment.author}</span>
            <span className="text-xs text-text-secondary">{t('tasks.detail.commented')}</span>
          </>
        ) : (
          <span className="text-xs font-medium text-ink">{t('tasks.jira.detail.comment')}</span>
        )}
        {/* Only when it says something the posting date does not — see
            `JiraTaskComment.updatedAt`. In the hover text rather than on the strip,
            which has one line and a name already on it. */}
        {editedOn && (
          <span
            title={t('tasks.jira.detail.editedOn', { date: editedOn })}
            className="text-xs text-text-secondary/50"
          >
            {t('tasks.jira.detail.edited')}
          </span>
        )}
        {postedOn && <span className="ml-auto text-xs text-text-secondary/50">{postedOn}</span>}
      </div>
      {/* A comment with no body at all is still a turn in the conversation — an
          attachment, or a transition Jira recorded as one — so it keeps its card and
          says so, rather than rendering as an empty box. */}
      {comment.body ? (
        <div className="px-5 py-4">
          <MarkdownView content={comment.body} variant="document" />
        </div>
      ) : (
        <div className="px-5 py-4 text-sm text-text-secondary/40">{t('tasks.jira.detail.emptyComment')}</div>
      )}
    </div>
  )
}

/**
 * The ticket's conversation, under its description.
 *
 * Rendered only when there IS one: a "Comments" heading over nothing would read as a
 * thread that failed to load, where the truth is a ticket nobody has replied to. The
 * GitHub half has no counterpart to this — its panel carries a count and sends the
 * reader to github.com — because the two reads differ in what they cost. Jira
 * returns the bodies in the response the panel already makes (see `DETAIL_FIELDS`),
 * so not rendering them would be discarding content already paid for.
 */
function JiraComments({
  comments,
  total,
  locale,
  t,
}: {
  comments: JiraTaskComment[]
  /** How many the ticket HAS, when Jira said so and it is more than arrived. */
  total?: number
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
      <div className="flex items-center gap-2 px-1">
        <MessageSquare className="w-3.5 h-3.5 text-text-secondary" />
        <span className="text-xs font-medium text-text-secondary">
          {t(count === 1 ? 'tasks.detail.commentCount.one' : 'tasks.detail.commentCount.other', { count })}
        </span>
        {/* Jira pages the field on its own terms, so the panel says when it is
            showing a page. Silence here would let a reader who reached the bottom of
            a truncated thread believe they had read all of it. The total is already
            in the heading, so this half only has to say how much of it is on screen. */}
        {total !== undefined && (
          <span className="text-xs text-text-secondary/50">
            {t('tasks.jira.detail.commentsTruncated', { count: comments.length })}
          </span>
        )}
      </div>
      {comments.map((comment) => (
        <CommentCard key={comment.id} comment={comment} locale={locale} t={t} />
      ))}
    </>
  )
}

/** What the page needs whichever tracker the ticket came from. */
interface TaskDetailPageBaseProps {
  /** The config key of the repository the ticket came from — what the detail read is keyed by. */
  configKey: string
  /** That repository's name, for the trail back to the list it came from. */
  repoName: string
  /** That repository's configuration, when it still has one. Absent means nothing can be launched. */
  repo?: RepositoryConfig
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
  const { configKey, repoName, repo, hasAgent, paneRef, onBack } = props
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
  const [startFailed, setStartFailed] = useState(false)

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
    setStartFailed(false)
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
   * Whether an agent can be started here AT ALL, answered locally.
   *
   * The same question `AgentInfoSidebar` asks of a repository before offering it:
   * a team repo nobody has bound to a folder on this machine has no directory to
   * open a terminal in. Asked here rather than by letting `pickUpTask` throw,
   * because that error is an untranslated English sentence and this one is a
   * state the page can explain and act on — which is the whole of what makes a
   * repository with no local path say so instead of failing silently.
   */
  const canStart = !!repo && !repo.needsLocalPath && !!repo.path

  /**
   * Open an agent in this ticket's repository with a first prompt already typed.
   *
   * ONE launcher for both buttons and both trackers, because everything except that
   * prompt is identical — resolving the local path, the failure the page has to
   * explain, and the fact that the agents page rather than this one owns every guard
   * on creating an agent.
   *
   * The prompt MUST be a single line, in either mode. Run, it travels to the PTY as
   * `claude "<prompt>"` with `JSON.stringify` doing the quoting, so a newline is escaped
   * into a literal backslash-n that the shell hands to Claude Code verbatim. Drafted, it
   * is typed into the input box, where a Return IS the send — a two-line draft would post
   * its first line and leave the second behind.
   */
  const openAgent = useCallback(async (initialPrompt: string, promptMode: InitialPromptMode = 'run') => {
    if (!repo?.path) return
    setStartFailed(false)
    try {
      // Only `cwd` is kept: pickUpTask's own initialPrompt is `/magic:continue`, which is
      // the wrong verb for either of these. The matching itself is left exactly as it is —
      // this passes it the local path it already knows, so it resolves to that same
      // repository, and `expandPath` on the way out is why this is worth calling at all.
      //
      // `ticketId`, not the issue number: `pickUpTask` has always been ticket-id
      // agnostic, and a Jira ticket reaching it as `"undefined"` would match nothing.
      const { cwd } = await window.electronAPI.org.pickUpTask(ticketId, [repo.path])
      // The agents page owns every guard on creating one (max agents, unreachable
      // repositories, which pane it lands in), so this asks for an agent the same
      // way the sidebar's "+" does rather than launching one itself.
      const launch: NewTerminalDetail = { cwd, initialPrompt, promptMode }
      window.dispatchEvent(new CustomEvent<NewTerminalDetail>('new-terminal', { detail: launch }))
    } catch {
      // Never `err.message`: pickUpTask throws an English sentence with no
      // catalogue entry, and this page is translated.
      setStartFailed(true)
    }
  }, [ticketId, repo?.path])

  /**
   * The page's one affirmative action, per tracker.
   *
   * A Jira ticket is started on its KEY — `/magic:start PER-1234` — and not on its
   * browse URL. The key is what the skill resolves a ticket by, what it writes into
   * `agents.ticket_id`, and what the branch and the commit trailers are named after;
   * a URL would have to be parsed back into it first. A GitHub issue has no such
   * portable identity across repositories, so it goes on being started on its URL.
   */
  const startAgent = useCallback(
    () => openAgent(`/magic:start ${tracker === 'jira' ? issueKey : url}`),
    [openAgent, tracker, issueKey, url],
  )

  /**
   * The other thing a reader might want from a ticket: to think about it rather than do it.
   *
   * A plain-prose prompt rather than a skill, because there is no `/magic:` verb for this and
   * inventing one would be a second surface to keep in step with eight others. It is a prompt
   * addressed to Claude and not text the reader sees, which is why it is a literal here rather
   * than a catalogue key — the agent's language is the repository's, not the app's.
   *
   * A GitHub issue is named by its URL, which is what `gh` reads it through; a Jira ticket is
   * named by its KEY, which is what the Atlassian MCP server resolves. Both are prerequisites
   * the app already checks for.
   *
   * The "do not implement" clause is load-bearing. Without it an agent handed a ticket in a
   * repository does the obvious thing and starts implementing it, which is precisely what the
   * button above is for and precisely what this one is not.
   *
   * DRAFTED, not run, and that is the difference between the two buttons: starting work needs
   * no elaboration, whereas a discussion is worth little without the sentence the person wanted
   * to say — which side of it they want to talk about, what they are unsure of, who asked. So
   * this fills the input box and stops, and the trailing space is where they carry on typing.
   */
  const discussAgent = useCallback(() => openAgent(
    (tracker === 'jira'
      ? `Let's discuss Jira ticket ${issueKey} — read it first, then help me explain, summarise, `
      : `Let's discuss GitHub issue ${url} — read it first, then help me explain, summarise, `)
    + 'refine or rewrite it. Do not implement it and do not create a branch. ',
    'draft',
  ), [openAgent, tracker, issueKey, url])

  const openedOn = formatIssueDate(createdAt, locale)

  /**
   * The mark's accessible name and hover text. Untranslated — "GitHub" and "Jira"
   * are product names, and a catalogue entry per language would only be somewhere
   * for them to be spelled wrong.
   */
  const trackerName = tracker === 'jira' ? 'Jira' : 'GitHub'

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

  return (
    <div className="flex flex-col gap-5">
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
      <div
        className={`sticky top-0 z-20 -mx-6 px-6 flex items-center gap-3 min-w-0 bg-bg-secondary transition-colors ${
          condensed ? 'border-b border-line' : 'border-b border-transparent'
        }`}
        style={{ height: TOP_BAR_H }}
      >
        <button
          onClick={onBack}
          title={t('tasks.detail.back')}
          className="flex items-center gap-1.5 p-1.5 -ml-1.5 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium">{t('tasks.detail.back')}</span>
        </button>
        {condensed ? (
          // Left-aligned next to the link it follows, and in the row's own type
          // size: this is the title standing in for itself, not a second heading.
          <>
            {/* Ahead of the status, not after it: the mark answers "which tracker is
                this" and the pill answers "where is it up to", and the first question
                is the one a reader who has scrolled away from the title is asking. */}
            <TrackerMark tracker={tracker} title={trackerName} />
            {statusChip}
            <span className="text-xs text-ink truncate min-w-0" title={title}>
              {title}
            </span>
            <span className="text-xs text-text-secondary/40 flex-shrink-0">
              {tracker === 'jira' ? issueKey : `#${issueNumber}`}
            </span>
          </>
        ) : (
          <span className="text-xs text-text-secondary/50 truncate">{repoName}</span>
        )}
        {/* `ml-auto` moved onto the pair's leading element: it is what pushes both
            buttons to the right edge, and left on the second one it would have put
            the whole gap between them instead.

            Both are guarded on the URL rather than only the Jira one, because it is
            the same guard: a ticket with no site resolved has nothing to copy and
            nothing to open. A GitHub issue always has one. */}
        {url && (
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            {/* `BTN_ICON` rather than hand-rolled classes: it is the module's
                icon-only tier and stands the same 30px as the `BTN` beside it. */}
            <CopyLinkButton
              url={url}
              copyLabel={t('tasks.copyLink')}
              copiedLabel={t('tasks.copyLinkDone')}
              className={BTN_ICON}
            />
            <button
              onClick={() => window.electronAPI.shell.openExternal(url)}
              className={`${BTN} flex-shrink-0`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t(tracker === 'jira' ? 'tasks.jira.openIssue' : 'tasks.openIssue')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Title and byline, GitHub's order: what it is, then its number, then the
          state and who opened it. A Jira ticket wears its key as the badge the row
          gave it, on the byline line rather than inside the heading — `PROJ-1234`
          is a word, where `#234` is a suffix. */}
      <div ref={titleRef} className="flex flex-col gap-3 pb-5 border-b border-line">
        {/* The mark sits on the title's first line and OUTSIDE the heading text, as a
            flex sibling: inlined into the `h1` it would ride the text baseline and
            sink below it on a title that wraps to two lines. `mt-1` is the optical
            centring for the first line's cap height, which `items-center` on a
            two-line heading would get wrong by half a line. */}
        <div className="flex items-start gap-2.5 min-w-0">
          <TrackerMark tracker={tracker} title={trackerName} className="w-5 h-5 mt-1" />
          <h1 className="text-2xl font-semibold text-ink leading-snug min-w-0">
            {title}
            {tracker === 'github' && (
              <span className="font-normal text-text-secondary/40"> #{issueNumber}</span>
            )}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {tracker === 'jira' && <TicketBadge ticketId={issueKey} />}
          {/* Nothing until the state is actually known: a chip reading "Open"
              before the read lands would be a guess, and the one case it gets
              wrong is the issue that was just closed. The Jira pill has the row's
              value to stand on in the meantime, which is why it is not held back. */}
          {statusChip}
          <span className="text-xs text-text-secondary">
            {tracker === 'github' && props.issue.author
              ? t('tasks.detail.openedBy', { login: props.issue.author, date: openedOn })
              : t('tasks.detail.openedOn', { date: openedOn })}
          </span>
          {/* One counter for both halves, off the number each read actually knows:
              GitHub reports a count and nothing else, Jira sends the comments
              themselves and `commentTotal` when it sent only a page of them. */}
          {commentCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <MessageSquare className="w-3.5 h-3.5" />
              {t(commentCount === 1 ? 'tasks.detail.commentCount.one' : 'tasks.detail.commentCount.other', {
                count: commentCount,
              })}
            </span>
          )}
        </div>
      </div>

      {/* The two columns of a GitHub issue. `items-start` so the metadata card
          keeps its own height instead of stretching to a long body. */}
      <div className="flex items-start gap-6 min-w-0">
        {/* A column now rather than a single box: the description is the first thing
            in a conversation, not a thing beside one, so the thread stacks under it on
            the same gap the page uses everywhere else. */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* The comment box: an author strip, then the body under a hairline. */}
          <div className="rounded-xl bg-surface border border-line-field overflow-hidden">
            <div className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-subtle border-b border-line-subtle">
              {tracker === 'github' && props.issue.author ? (
                <>
                  <span className="text-xs font-medium text-ink">@{props.issue.author}</span>
                  <span className="text-xs text-text-secondary">{t('tasks.detail.commented')}</span>
                </>
              ) : (
                <span className="text-xs font-medium text-ink">{t('tasks.detail.description')}</span>
              )}
              {openedOn && (
                <span className="ml-auto text-xs text-text-secondary/50">{openedOn}</span>
              )}
            </div>
            <DetailBody
              content={tracker === 'jira' ? jiraDetail?.description ?? '' : detail?.body ?? ''}
              errorLines={errorLines}
              loading={loading}
              t={t}
            />
          </div>

          {/* Only the Jira half has a thread to render — see `JiraComments`. Nothing
              is drawn while the read is out or after it failed: the component returns
              null on an empty list, and `jiraDetail` is null in both cases. */}
          {tracker === 'jira' && jiraDetail && (
            <JiraComments
              comments={jiraDetail.comments}
              total={jiraDetail.commentTotal}
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
          {/* The page's one affirmative action, and it is first: the metadata
              under it is what you read about the ticket, this is what you do
              about it. */}
          <div className="rounded-xl bg-surface-subtle border border-line-field p-4 flex flex-col gap-2">
            {/* ABOVE the buttons, not under them: it is the reason both are off, and a
                reason printed below the thing it explains is read second — by which point
                the faded pair has already been taken for a broken card. Bigger than the
                hints inside the buttons and in `text-ink` for the same reason: at this
                moment it is the card's message, and the actions are the footnote.

                The dot is the list row's own marker for a ticket somebody is on, so the
                two surfaces say the same thing in the same vocabulary. */}
            {hasAgent && (
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0 bg-accent" />
                <span className="text-sm font-medium leading-snug text-ink">
                  {t('tasks.hasAgentHint')}
                </span>
              </div>
            )}
            {/* The label alone said what the button was, never what it did. The
                second line does, in the button rather than under it: the sentence
                is part of the offer, and a hint floating below a filled button
                reads as a warning. */}
            <button
              onClick={startAgent}
              // Both buttons go off once somebody is already on this ticket: a second
              // `/magic:start` on the same ticket is a second worktree and a second branch
              // for one piece of work, and a third agent reading the same ticket over the
              // shoulder of the one working it is noise on the same ticket.
              disabled={!canStart || hasAgent}
              // `pointer-events-none` while disabled, not a `disabled:` colour per state:
              // hover lives in the shared `BTN_*_STACKED` tiers, and appending an override
              // for it here would depend on Tailwind's emit order (see theme/controls.ts).
              // Killing the pointer takes the hover, the cursor and the tooltip with it,
              // which is what a control that cannot be used should offer.
              className={`${BTN_PRIMARY_STACKED} w-full disabled:opacity-40 disabled:pointer-events-none`}
            >
              <Play className="w-3.5 h-3.5 mt-px flex-shrink-0 fill-current" />
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium leading-snug">{t('tasks.startAgent')}</span>
                <span className="text-[11px] leading-snug text-on-brand/70">
                  {t('tasks.startAgentHint')}
                </span>
              </span>
            </button>
            {/* Under the primary rather than beside it: they are alternatives on the same
                ticket, and side by side at this column's width both labels would wrap. */}
            <button
              onClick={discussAgent}
              disabled={!canStart || hasAgent}
              className={`${BTN_NEUTRAL_STACKED} w-full disabled:opacity-40 disabled:pointer-events-none`}
            >
              <MessagesSquare className="w-3.5 h-3.5 mt-px flex-shrink-0" />
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium leading-snug">{t('tasks.discussAgent')}</span>
                <span className="text-[11px] leading-snug text-bg/70">
                  {t('tasks.discussAgentHint')}
                </span>
              </span>
            </button>
            {/* Said in place instead of failing on the click, and BEFORE any call is
                made: a repository nobody has bound to a folder on this machine has no
                directory to open a terminal in, and the fix is a setting. */}
            {!canStart && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-ink">{t('tasks.noLocalRepo')}</span>
                <span className="text-xs text-text-secondary/70">{t('tasks.noLocalRepoHint')}</span>
              </div>
            )}
            {startFailed && <span className="text-xs text-orange">{t('tasks.startFailed')}</span>}
          </div>

          <div className="rounded-xl bg-surface-subtle border border-line-field overflow-hidden">
            {tracker === 'jira' ? (
              <>
                {/* The people and the labels only exist once the detail read lands,
                    so they say "none" rather than nothing while it is out. */}
                <SideBlock title={t('tasks.detail.assignees')}>
                  {jiraDetail?.assignee ? <PersonLine name={jiraDetail.assignee} /> : <NoneYet t={t} />}
                </SideBlock>
                <SideBlock title={t('tasks.jira.detail.reporter')}>
                  {jiraDetail?.reporter ? <PersonLine name={jiraDetail.reporter} /> : <NoneYet t={t} />}
                </SideBlock>
                <SideBlock title={t('tasks.detail.labels')}>
                  {jiraDetail && jiraDetail.labels.length > 0
                    ? jiraDetail.labels.map((label) => <StatusPill key={label} status={label} />)
                    : <NoneYet t={t} />}
                </SideBlock>
              </>
            ) : (
              <>
                {/* Assignees only exist once the detail read lands, so they say
                    "none" rather than nothing while it is out. Labels came with the
                    row and are shown straight away. */}
                <SideBlock title={t('tasks.detail.assignees')}>
                  {detail && detail.assignees.length > 0
                    ? detail.assignees.map((login) => (
                      <span key={login} className="text-xs text-text-secondary">@{login}</span>
                    ))
                    : <NoneYet t={t} />}
                </SideBlock>
                <SideBlock title={t('tasks.detail.labels')}>
                  {props.issue.labels.length === 0
                    ? <NoneYet t={t} />
                    : props.issue.labels.map((label) => <StatusPill key={label} status={label} />)}
                </SideBlock>
                {/* Both blocks below exist only when GitHub reported the hierarchy —
                    an empty "Sub-issues" on the vast majority of issues would be a
                    row of nothing on every page. */}
                {props.issue.subIssues && (
                  <SideBlock title={t('tasks.detail.subIssues')}>
                    <div className="w-full flex flex-col gap-1.5">
                      <span className="text-xs text-text-secondary">
                        {t('tasks.detail.subIssuesDone', {
                          completed: props.issue.subIssues.completed,
                          count: props.issue.subIssues.total,
                        })}
                      </span>
                      {/* The progress GitHub draws there. Rounded to the pixel by the
                          browser, so the bar can read as full one issue early — the
                          count above it is the number of record. */}
                      <div className="h-1.5 w-full rounded-full bg-surface-strong overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green transition-[width]"
                          style={{ width: `${(props.issue.subIssues.completed / props.issue.subIssues.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </SideBlock>
                )}
                {props.issue.parent && (
                  <SideBlock title={t('tasks.detail.parent')}>
                    <ParentLink parent={props.issue.parent} />
                  </SideBlock>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
