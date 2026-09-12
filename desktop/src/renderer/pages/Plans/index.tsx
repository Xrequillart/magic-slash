import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CloudOff, NotebookPen, RotateCcw, Users } from '@ds/desktop/icons'
import type { PlanOverview } from '../../../types'
import { useConfig } from '../../hooks/useConfig'
import { useT, type MessageKey } from '../../i18n'
import { BTN_PRIMARY } from '../../theme/controls'
import { createLatestWriter } from '../../utils/latestWrite'
import { useStore } from '../../store'
import type { PlanCard } from '../../utils/planRows'
import { buildPlanCards, filterPlanCards, planRepoOptions } from '../../utils/planRows'
import { SweepPane } from '../../components/SweepPane'
import { ALL_REPOS, PlanFilters } from './PlanFilters'
import { PlanDetailPage } from './PlanDetailPage'
import { PlanRow } from './PlanRow'

/**
 * Every `/magic:plan` session you can see: your own, plus your teammates' on the
 * repositories your organizations share.
 *
 * ONE LIST rather than a personal tab and a team tab — the same decision the webapp's
 * `/plans` made, for the same reason: a plan is read for what it says, not for who wrote
 * it, and the two halves of a shared repository's history belong in the same chronology.
 * The author is a column here, not a tab.
 *
 * NOTHING ON THIS PAGE WRITES to `plan_sessions`. The sessions are uploaded by the main
 * process as the skill runs (`main/store/plan-sync.ts`); this is the first thing in the
 * desktop app that reads them back. The one write it does make is to the reader's own
 * account — which repository they left the filter on.
 *
 * TWO VIEWS IN ONE SCROLLING PANE, the `SweepPane` idiom `pages/Tasks/index.tsx` uses:
 * the list, and the plan a row opens. A sub-page rather than a panel beside the list,
 * because a spec is a long markdown document with headings, tables and code in it, and
 * none of those survive being folded into a column beside something else.
 */

/**
 * The two views, ranked. `SweepPane` reads the sign of the gap to pick which way the
 * pages travel: opening a plan sweeps in from the right, going back sweeps out to it.
 */
function pagePosition(pageKey: string): number {
  return pageKey === 'list' ? 0 : 1
}

/**
 * Every switch here is a sub-page being opened or closed, never a move along a rail — so
 * all of them travel sideways. Declared at MODULE SCOPE because `SweepPane` reads it
 * during render, and a fresh closure per render would be a new prop identity every time.
 */
function alwaysSideways(): boolean {
  return true
}

/** An overview that says nothing, for the one case the bridge itself fails. */
const NOTHING_READ: PlanOverview = {
  sessions: [], ticketSessionIds: [], repos: [], emailByOwner: {}, avatarByOwner: {},
  hasOrg: false, truncated: false, failed: true,
}

/**
 * What is said when the list is empty, and which of the four emptinesses it is.
 *
 * They are genuinely different situations and only one of them is about this page:
 *
 *  * NO ORGANIZATION. Nothing has been read because there is nothing to read from — the
 *    app is signed out, or cloud is off. Pointing at `/magic:plan` here would be advice
 *    that cannot work.
 *  * THE READER'S OWN SYNC IS OFF. `Config.planSyncEnabled` is an explicit-false opt-out
 *    (ON by default), so `=== false` is the test and not falsiness: an undefined config,
 *    or one that has simply never been touched, is a reader whose sync is on. This is the
 *    one cause of an empty list the page CAN name, so it says so rather than letting the
 *    generic copy point vaguely at a teammate.
 *  * NO PLAN AT ALL. The read succeeded and came back empty while the reader's own upload
 *    is on. Two things still cause that and the copy names both, because THE PAGE CANNOT
 *    TELL THEM APART: nobody has planned anything yet, or somebody has and their upload is
 *    switched off. `user_settings` is own-rows-only by RLS, so a colleague's
 *    `plan_sync_enabled` is unreadable from here — a message claiming to know which
 *    teammate opted out would be inventing it.
 *  * A FILTER THAT MATCHED NOTHING. There are plans; this repository has none.
 *
 * EVERY ONE OF THEM IS A STATEMENT ABOUT THE ACCOUNT, which is why none of them may be
 * drawn over a read that failed: "no plan", "no organization" and a count of zero are
 * claims, and a dropped connection is not evidence for any of them. `overview.failed`
 * short-circuits the whole table below — see the render.
 *
 * One entry per case, ICON INCLUDED, so the branch below picks a whole case rather than a
 * pair of keys the component then has to work the icon back out of: a renamed message key
 * would otherwise change which glyph is drawn, silently and with nothing to type-check it.
 */
const EMPTY_STATES = {
  noOrg: { title: 'plans.empty.noOrgTitle', body: 'plans.empty.noOrgBody', Icon: Users },
  syncOff: { title: 'plans.empty.syncOffTitle', body: 'plans.empty.syncOffBody', Icon: CloudOff },
  filtered: { title: 'plans.empty.filteredTitle', body: 'plans.empty.filteredBody', Icon: NotebookPen },
  none: { title: 'plans.empty.title', body: 'plans.empty.body', Icon: NotebookPen },
} as const satisfies Record<string, { title: MessageKey; body: MessageKey; Icon: typeof Users }>

/** The block every one of the states above is drawn in, and the error one with it. */
function StateBlock({
  title,
  body,
  Icon,
  children,
}: {
  title: MessageKey
  body: MessageKey
  Icon: typeof Users
  children?: ReactNode
}) {
  const t = useT()
  return (
    <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
      <Icon className="w-8 h-8 text-icon-muted" />
      <p>{t(title)}</p>
      <p className="text-xs text-text-secondary/60 max-w-sm text-center">{t(body)}</p>
      {children}
    </div>
  )
}

function EmptyState({ title, body, Icon }: (typeof EMPTY_STATES)[keyof typeof EMPTY_STATES]) {
  return <StateBlock title={title} body={body} Icon={Icon} />
}

/**
 * The read did not go through.
 *
 * The SAME BLOCK as the empty states rather than a banner of its own: the reader is
 * looking at the place the list would be, and a differently shaped box there would read
 * as a fifth kind of nothing rather than as the list failing to arrive.
 *
 * With a button, which is the part the empty states have no use for. A failed read is the
 * one state of this page that a second attempt can fix, and until this existed there was
 * no way to make one short of leaving the page and coming back.
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  return (
    <StateBlock title="plans.error.title" body="plans.error.body" Icon={CloudOff}>
      <button type="button" onClick={onRetry} className={`${BTN_PRIMARY} mt-1`}>
        <RotateCcw className="w-3.5 h-3.5" />
        {t('common.retry')}
      </button>
    </StateBlock>
  )
}

export function PlansPage() {
  const t = useT()
  const { config, updatePlansRepo } = useConfig()

  // `null` = the read has not come back yet, which is a third state from "came back with
  // nothing": the first draws a line of text, the second an explanation.
  const [overview, setOverview] = useState<PlanOverview | null>(null)
  /**
   * Bumped to ask for the read again — the Retry button, and nothing else.
   *
   * A counter rather than a callback that refetches, so the one effect below stays the
   * only thing that touches `overview`: the cancellation flag, the loading state and the
   * failure fallback are then written once, and a retry cannot race the mount read it was
   * fired during.
   */
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  /**
   * What the reader has picked SINCE THE PAGE OPENED, or undefined while they have not.
   *
   * Held apart from the stored value rather than seeded from it, for the reason the
   * Tasks board's `repoKey` is: the config arrives asynchronously, so a `useState` seeded
   * from it would have to be corrected by an effect — a render with the wrong list on
   * screen. Resolved together in `repoId` below, choice first.
   */
  const [picked, setPicked] = useState<string | undefined>(undefined)
  /**
   * The plan on screen, or null for the list. The CARD itself and not its id: the header
   * of the detail page is drawn from it, so holding the id would mean looking the card
   * back up on every render — and finding nothing at all after a retry replaced the
   * overview it came from.
   */
  const [selected, setSelected] = useState<PlanCard | null>(null)

  /**
   * The plan this page was opened ON, when it was opened from somewhere else — today,
   * the "planned in" block on a ticket's page. Null whenever the modal was opened by
   * hand.
   *
   * Consumed ONCE, the one-shot deep link `Config` takes for `settingsInitialTab` and
   * the Tasks board for `tasksInitialTarget`; see the effect below for why it cannot be
   * a `useState` initialiser the way the board's is.
   */
  const initialPlanId = useStore((s) => s.plansInitialPlanId)
  const setInitialPlanId = useStore((s) => s.setPlansInitialPlanId)

  /**
   * The one scrolling element, and where the list was left.
   *
   * Opening a plan starts it at the top and coming back restores the offset — the same
   * courtesy the Tasks board extends to its backlog, and it matters more here: the list
   * is one long chronology, and losing your place in it after opening one row is the
   * whole cost of having looked.
   */
  const paneRef = useRef<HTMLDivElement>(null)
  const listOffsetRef = useRef(0)

  // Frozen at mount, so every row's "3d ago" is measured against one instant and the
  // list cannot renumber itself mid-render. Handed to the detail page too: one clock for
  // the feature, so a row and the page opened from it cannot date the same plan
  // differently.
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    // Back to the loading line for the duration of a retry: the stale failure block would
    // otherwise sit there with its button, looking like the click did nothing.
    setOverview(null)
    window.electronAPI.plans.list()
      .then((next) => {
        if (!cancelled) setOverview(next)
      })
      .catch(() => {
        // A rejection here is the BRIDGE, not the query: `listPlanSessions` answers with
        // an overview whatever the database does. Either way nothing was read, so it is
        // reported the same way a failed read is — with the error state and its retry,
        // not with an empty list that would claim the account holds no plans.
        if (!cancelled) setOverview(NOTHING_READ)
      })
    return () => { cancelled = true }
  }, [attempt])

  const cards = useMemo(
    () =>
      overview
        ? buildPlanCards(
            overview.sessions,
            overview.ticketSessionIds,
            overview.repos,
            overview.emailByOwner,
            overview.avatarByOwner,
          )
        : [],
    [overview],
  )

  /**
   * The deep link, applied once the LIST has landed, and that timing is the whole reason
   * this is an effect where the Tasks board seeds its selection in a `useState`
   * initialiser.
   *
   * `selected` is a `PlanCard` — the detail page draws its header from it — and a card
   * only exists once `plans:list` has come back and `buildPlanCards` has resolved the
   * repository name, the author and their photo against the org roster. There is nothing
   * to select at mount, so the id waits in the store until there is.
   *
   * CLEARED WHETHER OR NOT IT MATCHED, and the miss is a real case rather than
   * defensiveness: the plan may have been deleted, or its repository unshared, since the
   * ticket that linked to it was filed. The reader then gets the list, which is the
   * page's own honest fallback — and the link is not left armed to fire on the next
   * plain open.
   *
   * `cards.length` guards the empty case so a failed read does not consume the link
   * before it could ever have resolved: a retry that succeeds still opens the plan.
   */
  useEffect(() => {
    if (!initialPlanId || cards.length === 0) return
    const card = cards.find((candidate) => candidate.id === initialPlanId)
    if (card) setSelected(card)
    setInitialPlanId(null)
  }, [initialPlanId, cards, setInitialPlanId])

  /** Only the repositories that actually have a plan. See `planRepoOptions`. */
  const repoOptions = useMemo(
    () => planRepoOptions(cards, overview?.repos ?? []),
    [cards, overview],
  )

  /**
   * The repository the list is narrowed to, resolved from three places in order of how
   * much they know about what the reader wants.
   *
   * 1. What they have PICKED since the page opened.
   * 2. What they LEFT IT ON, read back off the account (`Config.plansRepo`). This is the
   *    whole point of storing it in the cloud: the app keeps no config file, so without
   *    it the filter would reset on every launch.
   * 3. ALL REPOSITORIES, which is both the default and the fallback for a stored id that
   *    no longer names a repository with a plan on it — deleted, unshared, or its last
   *    plan removed. That fallback is why the stored value needs no validation on the way
   *    in (see `updatePlansRepo`): an id that names nothing simply fails to match here,
   *    and the reader gets the whole list rather than an empty one.
   *
   * Only the STORED id is checked against what is on offer. A picked one cannot need it:
   * it came out of this very list of options, and the overview behind that list only ever
   * changes when the reader retries a failed read, which offers the list again from
   * scratch.
   */
  const repoId = useMemo(() => {
    if (picked !== undefined) return picked
    const stored = config?.plansRepo
    return stored && repoOptions.some((repo) => repo.id === stored) ? stored : ALL_REPOS
  }, [picked, config?.plansRepo, repoOptions])

  const visible = useMemo(
    () => filterPlanCards(cards, repoId === ALL_REPOS ? null : repoId),
    [cards, repoId],
  )

  /**
   * Recording the choice on the account, ONE WRITE AT A TIME.
   *
   * This used to be a bare fire-and-forget call per click, which was wrong in a way
   * nothing on screen showed: two selections made in quick succession are two independent
   * round trips with no arrival order, so the earlier one could land SECOND and leave
   * `plans_repo` on the repository the reader had just moved off. The damage surfaced a
   * launch later, when the page restored a filter they had replaced.
   *
   * `createLatestWriter` serializes them and drops the values in between, so the last
   * value SENT is always the last one picked. THE VIEW DOES NOT WAIT FOR ANY OF IT:
   * `setPicked` is synchronous and the list re-narrows on this render, exactly as before.
   * Only the persistence is coalesced.
   *
   * Held in a memo, because a writer rebuilt on every render would have a fresh, empty
   * queue and be straight back to firing in parallel.
   */
  const savePick = useMemo(() => createLatestWriter(updatePlansRepo), [updatePlansRepo])

  const pick = (next: string) => {
    setPicked(next)
    savePick(next === ALL_REPOS ? '' : next)
  }

  /**
   * Open one plan. The offset is read HERE rather than in the effect below: by the time
   * that runs, the pane has already been scrolled to the top of the plan.
   */
  const select = useCallback((card: PlanCard) => {
    listOffsetRef.current = paneRef.current?.scrollTop ?? 0
    setSelected(card)
  }, [])

  const back = useCallback(() => setSelected(null), [])

  /** Which of the two views is on screen. A change is what plays the sweep. */
  const pageKey = selected?.id ?? 'list'

  useEffect(() => {
    paneRef.current?.scrollTo({ top: pageKey === 'list' ? listOffsetRef.current : 0 })
  }, [pageKey])

  /**
   * Which emptiness this is. See `EMPTY_STATES`.
   *
   * `planSyncEnabled === false` sits BELOW the organization check and ABOVE the generic
   * one: an account with nothing to read from is the bigger problem, and a reader who
   * switched their own upload off deserves that explanation rather than the catch-all.
   */
  const empty =
    visible.length > 0 ? null
      : cards.length > 0 ? EMPTY_STATES.filtered
        : overview && !overview.hasOrg ? EMPTY_STATES.noOrg
          : config?.planSyncEnabled === false ? EMPTY_STATES.syncOff
            : EMPTY_STATES.none

  return (
    // One scrolling pane holding two pages: the list, and the plan that replaces it.
    <div ref={paneRef} className="h-full overflow-y-auto">
      {/* The title and the live indicator are rendered by the hosting modal.

          The page's padding is on the SWEEP LAYERS, not on the pane: a `sticky` child
          measures its offset from the scrolling element's padding box, so padding here
          would make the filter bar and the plan page's pinned bar pin a full 24px higher
          than they look like they should. Both layers carry it, so the page on its way
          out keeps the same inset as the one arriving.

          The TOP inset is left to each page instead, because on both of them it belongs
          to something opaque and pinned — the filter bar here, the back bar there — and
          a band stopping short of the pane's edge would leave a strip of content sliding
          past above it. */}
      <SweepPane
        pageKey={pageKey}
        order={pagePosition}
        horizontal={alwaysSideways}
        scrollRef={paneRef}
        className="px-6 pb-6"
      >
        {selected ? (
          <PlanDetailPage card={selected} now={now} paneRef={paneRef} onBack={back} />
        ) : (
          <>
            {/* Offered only when there is a choice to make: one repository means the
                filter can only ever narrow the list to itself. The count rides along with
                it, so withholding the bar withholds a count the list is already short
                enough to make by eye.

                Unmounted on the detail view along with the rest of the list, exactly as
                `TaskFilters` is: a bar that narrows a list nobody is looking at would pin
                itself over the plan and offer to filter it. */}
            {repoOptions.length > 1 && (
              <PlanFilters repoId={repoId} repos={repoOptions} count={visible.length} onChange={pick} />
            )}

            {/* `gap-3` between the heading and what it heads, as on the board. */}
            <div className={`flex flex-col gap-3 ${repoOptions.length > 1 ? 'pt-4' : 'pt-6'}`}>
              {/* The same heading the Tasks board puts over its list, down to the classes:
                  two pages reached from the same rail should name what is under them the
                  same way, and the glyph is the one the sidebar's Plans button already
                  carries so the nav entry and the heading read as one place. Above the list
                  and below the filter bar, which is pinned and would otherwise scroll a
                  heading out from under itself. */}
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <NotebookPen className="w-4 h-4" />
                <span>{t('plans.section')}</span>
              </div>

              {/* ONE gate, because there is now one read. Whether the reader belongs to an
                  organization rides in on the overview (`hasOrg`), so the page no longer has
                  to hold the list back for a second, slower answer before it can tell an
                  account with no organization from one whose plans simply have not arrived.

                  The FAILURE branch comes before every empty one, and that order is the
                  point: an errored read has no rows, so each of the four empty states would
                  otherwise match and state something about the account that nothing here
                  knows. */}
              {overview === null ? (
                <p className="py-10 text-center text-sm text-text-secondary">{t('common.loading')}</p>
              ) : overview.failed ? (
                <ErrorState onRetry={retry} />
              ) : empty ? (
                <EmptyState {...empty} />
              ) : (
                /* NO OUTER RULE. The list used to be framed in the same `line-subtle` as
                   the rules between its rows — but a line all the way round a list that
                   already sits on its own ground draws a box around something that was not
                   in doubt, and the rules INSIDE are doing the separating. The ground is
                   what marks the region now; the hairlines only part the rows.

                   No padding, on purpose. The rows carry their own `px-4 py-3` and must reach
                   the frame on both sides: an inset would leave the rules stopping short of the
                   border and turn a continuous list into a stack of slabs.

                   `overflow-hidden` is what makes the radius real. Each row's hover ground is a
                   full-bleed rectangle, so without it the first and last rows would paint square
                   corners over the rounded ones on the way past. It also spares the first and
                   last rows a radius of their own, which would have to be kept in step with this
                   one. The first row drops its top rule (`first:border-t-0` on the row) so the
                   frame is not doubled by it.

                   `rounded-xl bg-surface-subtle` is the board column's own pair, from
                   `Tasks/TaskBoard.tsx` minus its border, so the two pages read as one app: a
                   region of it sits on `surface-subtle` everywhere here. */
                <div className="rounded-xl bg-surface-subtle overflow-hidden">
                  {visible.map((card) => (
                    <PlanRow key={card.id} card={card} now={now} onSelect={select} />
                  ))}
                  {/* A list that came back at its cap says so, as its own last line INSIDE the
                      frame — the sentence is about this list, and a note floating under the
                      box would read as being about the page. The read is newest-first, so
                      what is missing is always the old end of it: without this line a list
                      silently short of its tail looks exactly like a complete one. */}
                  {overview.truncated && (
                    <p className="px-4 py-2 border-t border-line-subtle text-xs text-text-secondary/60">
                      {t('plans.truncated')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </SweepPane>
    </div>
  )
}
