import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ArrowLeft, CircleCheck, CircleDot, ExternalLink, MessageSquare, Play } from 'lucide-react'
import type { PRStatusError, RepositoryConfig, TaskIssue, TaskIssueDetail } from '../../../types'
import { isPRStatusError } from '../../../types'
import { useLocale, useT, type Translate } from '../../i18n'
import { BTN, BTN_ICON, BTN_PRIMARY_STACKED } from '../../theme/controls'
import { WaveLoader } from '../../components/WaveLoader'
import MarkdownView from '../../components/file-preview/MarkdownView'
import { StatusPill } from '../Dashboard/parts'
import type { NewTerminalDetail } from '../Terminals'
import { CopyLinkButton, TaskErrorLines } from './TasksRepoSection'

/**
 * One issue, given the whole page — the Tasks page's second view, not a panel
 * beside its first.
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
 * The issue's body, or the reason it is not there yet.
 *
 * The failure is rendered by the SAME component the repository card uses: this
 * read goes through the same GraphQL ladder, so a token that cannot see a
 * private repo has to fail identically — and read identically — in both places.
 *
 * `document` rather than `panel` markdown: this is the variant for markdown with
 * a page to itself, and a full-width issue body is exactly that.
 */
function IssueBody({
  detail,
  error,
  loading,
  t,
}: {
  detail: TaskIssueDetail | null
  error: PRStatusError | null
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

  if (error) {
    return (
      <div className="px-5 py-4">
        <TaskErrorLines error={error} />
      </div>
    )
  }

  if (!detail?.body) {
    return (
      <div className="px-5 py-4 text-sm text-text-secondary/40">{t('tasks.detail.emptyBody')}</div>
    )
  }

  return (
    <div className="px-5 py-4">
      <MarkdownView content={detail.body} variant="document" />
    </div>
  )
}

interface TaskDetailPageProps {
  /** The issue on screen. Mounted only for a selected issue, so never null. */
  issue: TaskIssue
  /** The config key of the repository the issue came from — what the detail read is keyed by. */
  configKey: string
  /** That repository's name, for the trail back to the list it came from. */
  repoName: string
  /** That repository's configuration, when it still has one. Absent means nothing can be launched. */
  repo?: RepositoryConfig
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

export function TaskDetailPage({ issue, configKey, repoName, repo, paneRef, onBack }: TaskDetailPageProps) {
  const t = useT()
  const locale = useLocale()

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
    const title = titleRef.current
    const pane = paneRef.current
    if (!title || !pane) return
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { root: pane, rootMargin: `-${TOP_BAR_H}px 0px 0px 0px` },
    )
    observer.observe(title)
    return () => observer.disconnect()
  }, [paneRef])

  const [detail, setDetail] = useState<TaskIssueDetail | null>(null)
  const [detailError, setDetailError] = useState<PRStatusError | null>(null)
  const [loading, setLoading] = useState(false)
  const [startFailed, setStartFailed] = useState(false)

  /**
   * The rest of the issue, read on mount.
   *
   * The page exists only while an issue is selected, so "on selection" and "on
   * mount" are now the same moment — which is what the panel's guard against
   * fetching while closed used to be for. `cancelled` is still needed, and is
   * the same guard `useTasks` explains at length: the IPC call has no
   * cancellation, so a response for an issue that is no longer on screen is
   * ignored rather than aborted.
   */
  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setDetailError(null)
    setStartFailed(false)
    setLoading(true)

    window.electronAPI.tasks
      .getIssueDetail(configKey, issue.number)
      .then((result) => {
        if (cancelled) return
        if (isPRStatusError(result)) setDetailError(result)
        else setDetail(result)
      })
      .catch(() => {
        // The IPC call itself failed, which the handler's own try/catch cannot
        // cover. Reported as the same named failure so the page has one error path.
        if (!cancelled) setDetailError({ error: 'network', message: 'IPC call failed' })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [configKey, issue.number])

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
   * state the page can explain and act on.
   */
  const canStart = !!repo && !repo.needsLocalPath && !!repo.path

  const startAgent = useCallback(async () => {
    if (!repo?.path) return
    setStartFailed(false)
    try {
      // Only `cwd` is kept: pickUpTask's own initialPrompt is `/magic:continue`,
      // which is the wrong verb for an issue nobody has started yet. The matching
      // itself is left exactly as it is — this passes it the local path it already
      // knows, so it resolves to that same repository.
      const { cwd } = await window.electronAPI.org.pickUpTask(String(issue.number), [repo.path])
      const launch: NewTerminalDetail = { cwd, initialPrompt: `/magic:start ${issue.url}` }
      // The agents page owns every guard on creating one (max agents, unreachable
      // repositories, which pane it lands in), so this asks for an agent the same
      // way the sidebar's "+" does rather than launching one itself.
      window.dispatchEvent(new CustomEvent<NewTerminalDetail>('new-terminal', { detail: launch }))
    } catch {
      // Never `err.message`: pickUpTask throws an English sentence with no
      // catalogue entry, and this page is translated.
      setStartFailed(true)
    }
  }, [issue.number, issue.url, repo?.path])

  const openedOn = formatIssueDate(issue.createdAt, locale)

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
            {detail && <StateChip state={detail.state} t={t} />}
            <span className="text-xs text-ink truncate min-w-0" title={issue.title}>
              {issue.title}
            </span>
            <span className="text-xs text-text-secondary/40 flex-shrink-0">#{issue.number}</span>
          </>
        ) : (
          <span className="text-xs text-text-secondary/50 truncate">{repoName}</span>
        )}
        {/* `ml-auto` moved onto the pair's leading element: it is what pushes both
            buttons to the right edge, and left on the second one it would have put
            the whole gap between them instead. */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {/* `BTN_ICON` rather than hand-rolled classes: it is the module's
              icon-only tier and stands the same 30px as the `BTN` beside it. */}
          <CopyLinkButton
            url={issue.url}
            copyLabel={t('tasks.copyLink')}
            copiedLabel={t('tasks.copyLinkDone')}
            className={BTN_ICON}
          />
          <button
            onClick={() => window.electronAPI.shell.openExternal(issue.url)}
            className={`${BTN} flex-shrink-0`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('tasks.openIssue')}</span>
          </button>
        </div>
      </div>

      {/* Title and byline, GitHub's order: what it is, then its number, then the
          state and who opened it. */}
      <div ref={titleRef} className="flex flex-col gap-3 pb-5 border-b border-line">
        <h1 className="text-2xl font-semibold text-ink leading-snug">
          {issue.title}{' '}
          <span className="font-normal text-text-secondary/40">#{issue.number}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Nothing until the state is actually known: a chip reading "Open"
              before the read lands would be a guess, and the one case it gets
              wrong is the issue that was just closed. */}
          {detail && <StateChip state={detail.state} t={t} />}
          <span className="text-xs text-text-secondary">
            {issue.author
              ? t('tasks.detail.openedBy', { login: issue.author, date: openedOn })
              : t('tasks.detail.openedOn', { date: openedOn })}
          </span>
          {detail && detail.commentCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <MessageSquare className="w-3.5 h-3.5" />
              {t(detail.commentCount === 1 ? 'tasks.detail.commentCount.one' : 'tasks.detail.commentCount.other', {
                count: detail.commentCount,
              })}
            </span>
          )}
        </div>
      </div>

      {/* The two columns of a GitHub issue. `items-start` so the metadata card
          keeps its own height instead of stretching to a long body. */}
      <div className="flex items-start gap-6 min-w-0">
        <div className="flex-1 min-w-0">
          {/* The comment box: an author strip, then the body under a hairline. */}
          <div className="rounded-xl bg-surface border border-line-field overflow-hidden">
            <div className="flex items-center gap-1.5 px-5 py-2.5 bg-surface-subtle border-b border-line-subtle">
              {issue.author ? (
                <>
                  <span className="text-xs font-medium text-ink">@{issue.author}</span>
                  <span className="text-xs text-text-secondary">{t('tasks.detail.commented')}</span>
                </>
              ) : (
                <span className="text-xs font-medium text-ink">{t('tasks.detail.description')}</span>
              )}
              {openedOn && (
                <span className="ml-auto text-xs text-text-secondary/50">{openedOn}</span>
              )}
            </div>
            <IssueBody detail={detail} error={detailError} loading={loading} t={t} />
          </div>
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
              under it is what you read about the issue, this is what you do
              about it. */}
          <div className="rounded-xl bg-surface-subtle border border-line-field p-4 flex flex-col gap-2">
            {/* The label alone said what the button was, never what it did. The
                second line does, in the button rather than under it: the sentence
                is part of the offer, and a hint floating below a filled button
                reads as a warning. */}
            <button
              onClick={startAgent}
              disabled={!canStart}
              className={`${BTN_PRIMARY_STACKED} w-full disabled:opacity-40`}
            >
              <Play className="w-3.5 h-3.5 mt-px flex-shrink-0 fill-current" />
              <span className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium leading-snug">{t('tasks.startAgent')}</span>
                <span className="text-[11px] leading-snug text-on-brand/70">
                  {t('tasks.startAgentHint')}
                </span>
              </span>
            </button>
            {!canStart && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-ink">{t('tasks.noLocalRepo')}</span>
                <span className="text-xs text-text-secondary/70">{t('tasks.noLocalRepoHint')}</span>
              </div>
            )}
            {startFailed && <span className="text-xs text-orange">{t('tasks.startFailed')}</span>}
          </div>

          <div className="rounded-xl bg-surface-subtle border border-line-field overflow-hidden">
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
              {issue.labels.length === 0
                ? <NoneYet t={t} />
                : issue.labels.map((label) => <StatusPill key={label} status={label} />)}
            </SideBlock>
            {/* Both blocks below exist only when GitHub reported the hierarchy —
                an empty "Sub-issues" on the vast majority of issues would be a
                row of nothing on every page. */}
            {issue.subIssues && (
              <SideBlock title={t('tasks.detail.subIssues')}>
                <div className="w-full flex flex-col gap-1.5">
                  <span className="text-xs text-text-secondary">
                    {t('tasks.detail.subIssuesDone', {
                      completed: issue.subIssues.completed,
                      count: issue.subIssues.total,
                    })}
                  </span>
                  {/* The progress GitHub draws there. Rounded to the pixel by the
                      browser, so the bar can read as full one issue early — the
                      count above it is the number of record. */}
                  <div className="h-1.5 w-full rounded-full bg-surface-strong overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green transition-[width]"
                      style={{ width: `${(issue.subIssues.completed / issue.subIssues.total) * 100}%` }}
                    />
                  </div>
                </div>
              </SideBlock>
            )}
            {issue.parent && (
              <SideBlock title={t('tasks.detail.parent')}>
                <ParentLink parent={issue.parent} />
              </SideBlock>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
