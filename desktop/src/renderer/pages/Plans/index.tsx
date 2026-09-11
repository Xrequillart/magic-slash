import { useEffect, useMemo, useState } from 'react'
import { CloudOff, NotebookPen, Users } from 'lucide-react'
import type { PlanOverview } from '../../../types'
import { useConfig } from '../../hooks/useConfig'
import { useT, type MessageKey } from '../../i18n'
import { buildPlanCards, filterPlanCards, planRepoOptions } from '../../utils/planRows'
import { ALL_REPOS, PlanFilters } from './PlanFilters'
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
 * The list is the whole of it. The detail view, a session's tickets and its spec are not
 * built here; see `PlanRow` for why a row is deliberately inert.
 */

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

function EmptyState({ title, body, Icon }: (typeof EMPTY_STATES)[keyof typeof EMPTY_STATES]) {
  const t = useT()
  return (
    <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
      <Icon className="w-8 h-8 text-icon-muted" />
      <p>{t(title)}</p>
      <p className="text-xs text-text-secondary/60 max-w-sm text-center">{t(body)}</p>
    </div>
  )
}

export function PlansPage() {
  const t = useT()
  const { config, updatePlansRepo } = useConfig()

  // `null` = the read has not come back yet, which is a third state from "came back with
  // nothing": the first draws a line of text, the second an explanation.
  const [overview, setOverview] = useState<PlanOverview | null>(null)
  /**
   * What the reader has picked SINCE THE PAGE OPENED, or undefined while they have not.
   *
   * Held apart from the stored value rather than seeded from it, for the reason the
   * Tasks board's `repoKey` is: the config arrives asynchronously, so a `useState` seeded
   * from it would have to be corrected by an effect — a render with the wrong list on
   * screen. Resolved together in `repoId` below, choice first.
   */
  const [picked, setPicked] = useState<string | undefined>(undefined)

  // Frozen at mount, so every row's "3d ago" is measured against one instant and the
  // list cannot renumber itself mid-render.
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    window.electronAPI.plans.list()
      .then((next) => {
        if (!cancelled) setOverview(next)
      })
      .catch(() => {
        // An empty overview and not an error banner: every failure path in
        // `listPlanSessions` already degrades to this shape, so a rejection here is the
        // bridge itself — and the page has nothing better to say about that than what
        // its empty state already says.
        if (!cancelled) {
          setOverview({
            sessions: [], ticketSessionIds: [], repos: [], emailByOwner: {}, avatarByOwner: {}, hasOrg: false,
          })
        }
      })
    return () => { cancelled = true }
  }, [])

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
   * it came out of this very list of options, and the overview behind that list is read
   * once and never refetched, so there is no moment at which it could go stale.
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

  // Recorded on the account as well as held here: the write is fire-and-forget, and the
  // list re-narrows off `picked` without waiting for it.
  const pick = (next: string) => {
    setPicked(next)
    updatePlansRepo(next === ALL_REPOS ? '' : next).catch(() => { /* the view is already right */ })
  }

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
    <div className="h-full overflow-y-auto">
      {/* The title and the live indicator are rendered by the hosting modal. The top
          inset is the filter bar's own padding rather than the pane's: the bar pins to
          the top of this scroller, and an opaque band stopping short of the pane's edge
          would leave a strip of list sliding past above it. */}
      <div className="px-6 pb-6">
        {/* Offered only when there is a choice to make: one repository means the filter
            can only ever narrow the list to itself. The count rides along with it, so
            withholding the bar withholds a count the list is already short enough to
            make by eye. */}
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
              account with no organization from one whose plans simply have not arrived. */}
          {overview === null ? (
            <p className="py-10 text-center text-sm text-text-secondary">{t('common.loading')}</p>
          ) : empty ? (
            <EmptyState {...empty} />
          ) : (
            /* The list sits in a FRAME, and the frame is the same `line-subtle` as the
               rules between the rows: one hairline drawn all the way round rather than a
               heavier edge, so the box reads as the list's own outline and not as a card
               the rows were put inside.

               No padding, on purpose. The rows carry their own `px-4 py-3` and must reach
               the frame on both sides: an inset would leave the rules stopping short of the
               border and turn a continuous list into a stack of slabs.

               `overflow-hidden` is what makes the radius real. Each row's hover ground is a
               full-bleed rectangle, so without it the first and last rows would paint square
               corners over the rounded ones on the way past. It also spares the first and
               last rows a radius of their own, which would have to be kept in step with this
               one. The first row drops its top rule (`first:border-t-0` on the row) so the
               frame is not doubled by it.

               `rounded-xl bg-surface-subtle border border-line-subtle` is the board column's
               own string, from `Tasks/TaskBoard.tsx`, and it is copied rather than chosen so
               the two pages read as one app: a framed region of the app sits on
               `surface-subtle` everywhere here, and a bare frame with no ground was the thing
               that looked foreign. */
            <div className="rounded-xl bg-surface-subtle border border-line-subtle overflow-hidden">
              {visible.map((card) => <PlanRow key={card.id} card={card} now={now} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
