'use client'

import type { CSSProperties } from 'react'
import {
  ModalHeader,
  TaskBoard,
  type BoardColumnTone,
  type StatusTone,
  type TicketCardNote,
  type TicketCardTag,
  type Tracker,
} from '@ds/desktop'
import {
  ArrowDownWideNarrow,
  BotMessageSquare,
  CalendarRange,
  ChevronsUp,
  ChevronUp,
  CircleCheck,
  CircleDashed,
  Columns3,
  FolderGit2,
  Layers,
  ListTodo,
  LoaderCircle,
  NotebookPen,
  OctagonAlert,
  Play,
  RefreshCw,
  Sparkles,
} from '@ds/desktop/icons'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import { DESKTOP_THEMES } from '@/lib/desktopTheme'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import type { IconComponent } from '@ds/desktop/types'
import { FeatureLegend, LegendTile } from './FeatureLegend'

/**
 * The visual under the `Tasks` row: the app's Tasks window, DRAWN WITH THE APP'S OWN
 * COMPONENTS rather than redrawn in the site's.
 *
 * IT WAS A TRACING, band for band, and the tracing is what went stale. The page it
 * copied was a list of repository cards with a row per ticket; the app deals one
 * repository's tickets into FOUR COLUMNS now.
 *
 * THE BOARD IS ONE COMPONENT, and that is the whole reason this file is short.
 * `TaskBoard` in `design-system/desktop/` owns the grid, the columns, the cards and the
 * sticky wiring, and `desktop/src/renderer/pages/Tasks/TaskBoard.tsx` renders the very
 * same file — it is an ADAPTER now, turning a `BoardCard` into the props below. So the
 * window here is not a drawing of the app's board: it IS the app's board, given invented
 * tickets. `PlanModalMockup` next door made the same move first and its header is the
 * long version of the argument.
 *
 * WHAT MAKES THAT WORK IS THE GROUND: `/design-system`'s own `Stage` writes a theme's
 * `--c-*` variables onto one element and paints the app's window colour under them, and
 * this does the same with `DESKTOP_THEMES.dark` — the app's DEFAULT theme
 * (`DEFAULT_THEME` in `desktop/src/types.ts`), so what is on the page is what an
 * untouched install looks like. Everything nested inside then resolves `bg-bg-secondary`,
 * `text-ink` and `bg-surface` exactly as it would in Electron.
 *
 * WHAT IS STILL THIS FILE'S OWN, because a design system holds none of it:
 *
 *   1. THE PANEL. `PageModal` portals to `document.body` and covers the viewport, which
 *      is right for a dialog and useless for a picture of one. Its panel is three
 *      classes — `bg-bg-secondary`, `rounded-2xl`, a shadow — and those are spelled
 *      below. The HEADER inside it is the real component.
 *   2. THE FOUR COLUMNS' TABLE. `TaskBoard`'s `COLUMNS` — a heading, a glyph and a tone
 *      each, with `alert` on Blocked alone — copied rather than imported: it lives in
 *      `pages/Tasks/` because what a column MEANS is the app's vocabulary.
 *   3. WHICH CONTROLS THE BAR CARRIES. `FilterBar` draws the band and knows what a
 *      control in one looks like; WHAT they narrow — a repository, a sprint, an epic, an
 *      agent — is vocabulary, so the app builds that list in `TaskFilters.ts` and this
 *      file builds its own, four controls long.
 *   4. THE BRANCH ON THE TRACKER. A Jira ticket has a status, an epic and a reporter
 *      where a GitHub issue has a parent, an author and a count of children, and only the
 *      labels line up. `pages/Tasks/TaskBoard.tsx` holds that branch in the app; it is the
 *      app's vocabulary, which is exactly the half a design system may not hold, so the
 *      invented tickets below carry it as data.
 *
 * THE WORDS ARE THE APP'S, key for key — `tasks.*` in `desktop/src/i18n/` — because a
 * mockup of a screen that reworded it is a mockup of a different screen. What a TRACKER
 * sends is not translated at all: a Jira status is the word a site's own board column is
 * called, a priority is that site's own tier, an epic has a title somebody typed, a label
 * is a string the repository chose, and a login is an account. The app prints all five as
 * they arrive, so all five are literals here, and a French reader sees exactly what the
 * French app would show them. Only the ticket TITLES are prose, so only they are keys.
 *
 * ONE REPOSITORY AND BOTH TRACKERS, which is the board's own shape: the picker at the top
 * chooses which repository, and that repository's GitHub issues and its Jira sprint are
 * dealt into the SAME four columns. The old drawing put each tracker on a card of its
 * own; there are no cards any more, and the trackers are told apart by the badge on every
 * ticket instead.
 *
 * `aria-hidden` AND `inert`, where the old tracing needed only the first. Its rows were
 * spans; these are real components, so `TicketCard` is a `role="button"` with a
 * `tabIndex` and `Select` is a real `<button>` that would open a real panel. `inert` takes
 * the whole drawing out of the tab order and out of reach of the pointer, which is what
 * makes a picture of a window a picture rather than a window that lies about what it does.
 */

/**
 * GitHub's mark, re-exported under the name eight of this site's drawings already import
 * it by.
 *
 * IT WAS A COPY OF THE PATH, drawn here because this was the first file on the site that
 * needed one and lucide dropped every brand glyph in v1. The design system carries it now
 * — `design-system/desktop/brand.tsx`, on the 24-unit grid Lucide's own icons use — and
 * the desktop app draws that one. A second octocat on this site would be the same mark
 * maintained twice, so the name stays and the drawing moves.
 */
export { Github as GithubMark } from '@ds/desktop/icons'

/**
 * The app's default theme, as the variables every component under it resolves against.
 * `dark` and not `midnight`: this is what the app looks like before anybody has been to
 * Settings.
 */
const THEME = DESKTOP_THEMES.dark

/**
 * `inert`, as a spread and as the EMPTY STRING, which is a pair of facts about React 18
 * rather than a preference.
 *
 * `@types/react@18` declares the prop as a boolean, and `react-dom@18.3.1` has never
 * heard of it — the string does not appear anywhere in its bundle. So `inert` written as
 * a boolean type-checks and is then DROPPED at render as "a non-boolean attribute given
 * true", while the empty string goes through the unknown-attribute path and lands in the
 * DOM as `inert=""`, which is what the browser reads.
 */
const INERT = { inert: '' } as unknown as { inert?: boolean }

/** Nothing is wired. Every control below is a drawing of a control. */
const noop = () => undefined

/**
 * The repository the board is showing, wearing the colour the app hands out FIRST —
 * `PROJECT_COLORS[0]`, the fallback an unconfigured repository gets by index. Imported
 * rather than spelled, so a repaint of the palette repaints this drawing with it.
 *
 * ONE, and that is the page's own rule rather than a simplification: the picker has no
 * "all repositories" entry, because four columns holding six repositories' tickets are
 * four columns nobody can read down. The second repository the Plans drawing invents is
 * in the picker's list and not on the board.
 */
const CHECKOUT = { key: 'checkout', label: 'acme/checkout-api', color: PROJECT_COLORS[0] }
const BILLING = { key: 'billing', label: 'acme/billing-web', color: PROJECT_COLORS[1] }

/**
 * The two epics, in the colours Jira records for them. CSS values and not tokens: an
 * epic's hue comes off the site, so Tailwind has never seen it — `TicketCardTag.color`'s
 * whole contract.
 */
const CHECKOUT_EPIC = { id: 'epic:checkout', label: 'Checkout', color: '#a855f7', truncate: true }
const INVOICING_EPIC = { id: 'epic:invoicing', label: 'Invoicing', color: '#22c55e', truncate: true }

/**
 * `TaskBoard`'s own table, copied — the four columns, and the whole of what distinguishes
 * one from another.
 *
 * BLOCKED LEADS, which is the argument rather than the workflow: it is the only column
 * that asks something of the reader, and a column nobody scrolls to is a column that says
 * nothing. It is also the only one tinted, for the same reason — the other three are
 * states work passes through, and colouring them would make the board a traffic light.
 */
const COLUMNS: readonly {
  key: string
  title: MessageKey
  icon: IconComponent
  tone: BoardColumnTone
}[] = [
  { key: 'blocked', title: 'site.tasksCard.columnBlocked', icon: OctagonAlert, tone: 'alert' },
  { key: 'backlog', title: 'site.tasksCard.columnBacklog', icon: CircleDashed, tone: 'neutral' },
  { key: 'progress', title: 'site.tasksCard.columnProgress', icon: LoaderCircle, tone: 'neutral' },
  { key: 'done', title: 'site.tasksCard.columnDone', icon: CircleCheck, tone: 'neutral' },
]

/**
 * ONE INVENTED TICKET, in the two halves a real one is split into: the fields
 * the tracker fixes, and the words the site chose.
 *
 * `status`, `priority`, the epic titles, the labels, the logins and the names are all
 * LITERALS — see the file header. Only `title` is a key.
 */
interface Card {
  tracker: Tracker
  ticketId: string
  title: MessageKey
  /** Jira only: the site's own word for the column the ticket sits in on ITS board. */
  status?: { label: string; tone: StatusTone }
  /**
   * Jira only, and beside the id rather than down with the metadata: priority is the
   * field that decides which of two tickets you pick up. The LEVEL picks the arrow and
   * the hue (Jira fixes the five tiers), the NAME is the site's.
   */
  priority?: { icon: IconComponent; tone: StatusTone; name: string }
  tags?: readonly TicketCardTag[]
  notes?: readonly TicketCardNote[]
  /** Somebody is already on it: the plate goes green and the button becomes a mark. */
  agent?: boolean
}

/**
 * The board, column by column — one repository's GitHub issues and its Jira sprint,
 * dealt by `taskBoard.ts`' own rules:
 *
 *   BLOCKED   a Jira status the app reads as blocked, or a GitHub `blocked` label.
 *   BACKLOG   Jira To Do, and an open GitHub issue nobody has an agent on.
 *   PROGRESS  a Jira status in flight — "In Review" here — and, on the GitHub side, an
 *             issue an AGENT is on: an issue has no status, so a running agent is the
 *             only evidence this app has that the work has started.
 *   DONE      a finished Jira ticket, and a recently closed issue.
 *
 * Neither Done card offers a Start button, which is the app's own rule and not a gap in
 * the drawing: there is nothing to start on work that is over, and a dead control would
 * invite the press it then refuses.
 */
const BOARD: Record<string, readonly Card[]> = {
  blocked: [
    {
      tracker: 'jira',
      ticketId: 'PAY-318',
      title: 'site.tasksCard.jira1',
      status: { label: 'Blocked', tone: 'accent' },
      priority: { icon: ChevronsUp, tone: 'red', name: 'Highest' },
      tags: [INVOICING_EPIC],
      notes: [{ id: 'reporter', text: 'Camille Roux' }],
    },
  ],
  backlog: [
    {
      tracker: 'github',
      ticketId: '#412',
      title: 'site.tasksCard.gh3',
      tags: [
        { id: 'label:bug', label: 'bug' },
        { id: 'label:payments', label: 'payments' },
      ],
      notes: [{ id: 'author', text: '@lmartel' }],
    },
    {
      tracker: 'jira',
      ticketId: 'PAY-311',
      title: 'site.tasksCard.jira2',
      status: { label: 'To Do', tone: 'neutral' },
      tags: [CHECKOUT_EPIC],
      notes: [{ id: 'reporter', text: 'Théo Vasseur' }],
    },
    {
      tracker: 'jira',
      ticketId: 'PAY-307',
      title: 'site.tasksCard.jira4',
      status: { label: 'To Do', tone: 'neutral' },
      priority: { icon: ChevronUp, tone: 'orange', name: 'High' },
      tags: [INVOICING_EPIC],
      notes: [{ id: 'reporter', text: 'Camille Roux' }],
    },
    {
      tracker: 'github',
      ticketId: '#404',
      title: 'site.tasksCard.gh1',
      tags: [{ id: 'label:bug', label: 'bug' }],
      notes: [{ id: 'author', text: '@lmartel' }],
    },
  ],
  progress: [
    {
      tracker: 'github',
      ticketId: '#398',
      title: 'site.tasksCard.gh4',
      tags: [{ id: 'label:payments', label: 'payments' }],
      notes: [{ id: 'author', text: '@nadia-b' }],
      agent: true,
    },
    {
      tracker: 'jira',
      ticketId: 'PAY-302',
      title: 'site.tasksCard.jira3',
      status: { label: 'In Review', tone: 'accent' },
      tags: [INVOICING_EPIC],
      notes: [{ id: 'reporter', text: 'Nadia Bahri' }],
      agent: true,
    },
  ],
  done: [
    {
      tracker: 'jira',
      ticketId: 'PAY-296',
      title: 'site.tasksCard.jira5',
      status: { label: 'Done', tone: 'green' },
      tags: [CHECKOUT_EPIC],
      notes: [{ id: 'reporter', text: 'Théo Vasseur' }],
    },
    {
      tracker: 'github',
      ticketId: '#391',
      title: 'site.tasksCard.gh2',
      tags: [{ id: 'label:enhancement', label: 'enhancement' }],
      notes: [{ id: 'author', text: '@lmartel' }],
    },
  ],
}

/** Where a ticket's own tracker would send you. Printed nowhere; the copy button holds it. */
function ticketUrl(card: Card): string {
  return card.tracker === 'jira'
    ? `https://acme.atlassian.net/browse/${card.ticketId}`
    : `https://github.com/acme/checkout-api/issues/${card.ticketId.slice(1)}`
}

/**
 * The four things this screen does that a still image of it cannot show.
 *
 * A LEGEND AND NOT A FEATURE LIST: every one of them annotates something visible in the
 * drawing above. Every claim is checked against the source rather than written from the
 * feature's reputation — `utils/taskBoard.ts` for what puts a ticket in a column,
 * `pages/Tasks/TaskBoard.tsx` for when Start is offered at all, and `TaskFilters.tsx` for
 * what the bar
 * narrows.
 *
 * THE TWO IT REPLACED went with the page they described. "Only what is free to take" was
 * true of a list that hid work in flight; the board shows it, in a column of its own, so
 * the claim is now the opposite of what is on screen. "Filter it down, then order it" is
 * folded into the first entry, where the repository picker belongs anyway: it is what
 * chooses the board rather than what narrows it.
 */
const LEGEND: readonly {
  id: string
  icon: IconComponent
  name: MessageKey
  description: MessageKey
}[] = [
  {
    id: 'columns',
    icon: Columns3,
    name: 'site.tasksCard.legendColumnsTitle',
    description: 'site.tasksCard.legendColumnsDesc',
  },
  {
    id: 'start',
    icon: Play,
    name: 'site.tasksCard.legendStartTitle',
    description: 'site.tasksCard.legendStartDesc',
  },
  {
    id: 'trackers',
    icon: Layers,
    name: 'site.tasksCard.legendTrackersTitle',
    description: 'site.tasksCard.legendTrackersDesc',
  },
  {
    id: 'fields',
    icon: ChevronsUp,
    name: 'site.tasksCard.legendFieldsTitle',
    description: 'site.tasksCard.legendFieldsDesc',
  },
]

/**
 * `legend` — the box of definitions under the drawing. On by default, which is what
 * `/features` wants; a caller that already has a paragraph beside the picture can turn
 * it off.
 */
export function TasksModalMockup({ legend = true }: { legend?: boolean } = {}) {
  const { t } = useT()

  return (
    <div className="flex flex-col">
      {/* THE PLATE THE WINDOW SITS ON, and the crop at the bottom of it.

          `tone-sky`, the ground this family of drawings stands on: a near-black window
          dropped straight onto white reads as a hole cut in the section, and on a coloured
          plate it reads as a screen photographed on a desk.

          `pb-0` AND A NEGATIVE MARGIN BELOW: the window runs 48px past the bottom of the
          plate and `overflow-hidden` cuts it. A backlog is never something you have seen
          all of, so the frame says so and the longest column pays for it. */}
      <div
        aria-hidden
        {...INERT}
        className="overflow-hidden rounded-2xl bg-tone-sky p-5 pb-0 sm:p-12 sm:pb-0"
      >
        {/* THE THEME GROUND. Everything below this element resolves the app's colour
            roles against these variables — see the file header. `text-ink` is on it and
            not only inside it, because anything drawn in `currentColor` would otherwise
            climb past it to the site's own near-black ink and come out invisible.

            `colorScheme` so a scrollbar or a form control inside the window is drawn
            dark, which is what the app's own `Stage` does on `/design-system`. */}
        <div
          style={{ ...THEME.vars, colorScheme: THEME.appearance } as CSSProperties}
          /* `min-w-[880px]` IS THE BOARD'S OWN FLOOR, and it is measured rather than
             chosen: four columns in a 24px-inset panel with 12px gutters give ~199px
             each at this width, which is what a `TicketCard`'s top line needs to hold a
             `PER-1234` badge, a priority mark and its two buttons without one of them
             wrapping. `PlanModalMockup`'s 720 is the page's own measure; a board cannot
             have it, because a board that shrinks honestly squeezes its cards rather
             than its columns.

             SO THE PLATE CROPS THE RIGHT EDGE at `/features`, where the column is 816px
             wide: the three columns that hold work you can pick up are whole and Done is
             cut, which is the same thing the bottom crop says and the right column to
             lose it on. `/desktop` gives the same drawing the band's full 1100px and
             nothing is cut at all. */
          className="-mb-12 min-w-[880px] overflow-hidden rounded-2xl bg-bg-secondary text-ink shadow-lift"
        >
          {/* THE REAL HEADER. `PageModal` renders this exact element with this exact
              prop shape; what is not here is the portal, the backdrop and the two sizes
              it travels between, none of which a picture has any use for.

              THE FOUR TABS OF THE ONE PAGE OVERLAY, in the sidebar's own order —
              `PAGE_TABS` in `desktop/src/renderer/App.tsx`, glyphs included. "Plans" and
              "Skills" are printed rather than translated, the call `lib/features.ts`
              makes for the same two words: the app's own French catalogue spells both
              exactly the same way. */}
          <ModalHeader
            title={t('site.tasksCard.title')}
            icon={ListTodo}
            tabs={{
              ariaLabel: t('site.tasksCard.title'),
              activeKey: 'tasks',
              items: [
                { key: 'plans', label: 'Plans', icon: NotebookPen },
                { key: 'tasks', label: t('site.tasksCard.title'), icon: ListTodo },
                { key: 'skills', label: 'Skills', icon: Sparkles },
                { key: 'settings', label: t('site.tasksCard.tabRepositories'), icon: FolderGit2 },
              ],
              onSelect: noop,
            }}
            fullScreen={{ expanded: false, onToggle: noop, expandTitle: '', collapseTitle: '' }}
            onClose={noop}
            closeTitle=""
          />

          {/* `px-6` is the page's own gutter, and the number the filter bar's full bleed
              below is spelled from. */}
          {/* `px-6` is the page's own gutter, and the number the filter bar's full bleed
              is spelled from. */}
          <div className="px-6 pb-6">
            <div className="pt-6">
              {/* THE WHOLE PAGE IS ONE COMPONENT, and it is the app's: `TaskBoard` draws
                  the heading, the pinned bar of controls and the board, and the desktop
                  renders this same file from `pages/Tasks/index.tsx`. Nothing below is a
                  drawing of the app — it IS the app, given invented tickets.

                  No `paneRef`, because nothing here scrolls: the bands sit at rest, which
                  is the honest state for a picture of a page.

                  FOUR CONTROLS AND NOT SIX. The repository picker leads, because it is
                  the only one that decides what the page is ABOUT rather than how much of
                  it is on screen, and the sprint chip follows it: the two answer one
                  question between them. The epic and agent pickers are the two the app
                  itself draws conditionally — only once a visible ticket hangs off an
                  epic, only once one has an agent — and they are left out here for the
                  room, which is the one liberty this drawing takes with the bar. */}
              <TaskBoard
                heading={{
                  icon: ListTodo,
                  title: t('site.tasksCard.section'),
                  count: t('site.tasksCard.total'),
                  actions: [{
                    id: 'reload',
                    label: t('site.tasksCard.reload'),
                    icon: RefreshCw,
                    onClick: noop,
                  }],
                }}
                filters={{
                  // `-mx-6 px-6` is the page's own inset spelled as a full bleed: what
                  // scrolls past has to go under an opaque band edge to edge.
                  className: '-mx-6 px-6',
                  before: [
                    {
                      kind: 'select',
                      id: 'repo',
                      value: CHECKOUT.key,
                      options: [
                        { value: CHECKOUT.key, label: CHECKOUT.label, color: CHECKOUT.color },
                        { value: BILLING.key, label: BILLING.label, color: BILLING.color },
                      ],
                      onChange: noop,
                      placeholder: t('site.tasksCard.pickRepo'),
                      width: 208,
                      // The repository tile the sidebar and the webapp draw a repository
                      // with, rather than the bare dot a filter keeps: the picker names
                      // the page's subject now. Never tinted — it has no default to be
                      // away from, so a rule guessed here would leave it permanently lit.
                      marker: 'repo',
                    },
                    // WHICH sprint the board is showing. A chip and not a fifth control: a
                    // sprint NAMES a thing and the name does not change while you look at
                    // it. Jira's own name for it, so a literal.
                    { kind: 'chip', id: 'sprint', label: 'PAY Sprint 24', icon: CalendarRange },
                  ],
                  search: { value: '', onChange: noop, placeholder: t('site.tasksCard.search') },
                  after: [{
                    // A glyph here and on neither of its neighbours, because it is the one
                    // picker whose values do not name their own subject: "Newest" beside a
                    // repository name reads as a second thing to filter by until the arrow
                    // says it is an order.
                    kind: 'select',
                    id: 'sort',
                    value: 'recent',
                    options: [
                      { value: 'recent', label: t('site.tasksCard.sortRecent') },
                      { value: 'priority', label: t('site.tasksCard.sortPriority') },
                    ],
                    onChange: noop,
                    width: 152,
                    icon: ArrowDownWideNarrow,
                  }],
                }}
                columns={COLUMNS.map((column) => ({
                id: column.key,
                title: t(column.title),
                icon: column.icon,
                tone: column.tone,
                // The count, always, zero included: a column that showed nothing and said
                // nothing would be indistinguishable from one that failed to render.
                count: BOARD[column.key].length,
                empty: t('site.tasksCard.columnEmpty'),
                cards: BOARD[column.key].map((card) => ({
                  id: card.ticketId,
                  tracker: card.tracker,
                  ticketId: card.ticketId,
                  title: t(card.title),
                  ...(card.priority
                    ? { mark: { icon: card.priority.icon, tone: card.priority.tone, label: card.priority.name } }
                    : {}),
                  ...(card.status ? { status: card.status } : {}),
                  tags: [...(card.tags ?? [])],
                  notes: [...(card.notes ?? [])],
                  copy: {
                    value: ticketUrl(card),
                    label: t('site.tasksCard.copyLink'),
                    copiedLabel: t('site.tasksCard.copyLinkDone'),
                  },
                  // THE SAME SLOT, THREE OUTCOMES, which is what keeps the cards of a
                  // column aligned whatever state they are in: an agent's mark, a Start
                  // button, or nothing at all on the two that are finished.
                  ...(card.agent
                    ? { agent: { icon: BotMessageSquare, label: t('site.tasksCard.agentHint') } }
                    : column.key === 'done'
                      ? {}
                      : { action: { icon: Play, title: t('site.tasksCard.startAgent'), onClick: noop } }),
                  onOpen: noop,
                })),
              }))} />
            </div>
          </div>
        </div>
      </div>

      {legend ? (
        <FeatureLegend
          items={LEGEND.map((entry) => ({
            id: entry.id,
            mark: (
              <LegendTile tone="bg-accent/10 text-accent">
                <entry.icon className="h-4 w-4" />
              </LegendTile>
            ),
            name: entry.name,
            description: entry.description,
          }))}
        />
      ) : null}
    </div>
  )
}
