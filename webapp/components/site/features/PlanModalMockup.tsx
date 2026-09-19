'use client'

import type { CSSProperties } from 'react'
import { ItemGroup, ModalHeader, PlanItem, SectionHeader, Select, type StatusTone } from '@ds/desktop'
import { FolderGit2, ListTodo, NotebookPen, Sparkles } from '@ds/desktop/icons'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import { DESKTOP_THEMES } from '@/lib/desktopTheme'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { FeatureLegend, LegendTile } from './FeatureLegend'

/**
 * The visual under the `Plans` row: the app's Plans window, DRAWN WITH THE APP'S OWN
 * COMPONENTS rather than redrawn in the site's.
 *
 * THAT IS THE ONE THING THIS FILE DOES DIFFERENTLY, and it is worth reading before
 * changing anything here. Every other mockup on this page — `TasksModalMockup` next
 * door, `SkillsModalMockup` under it — traces the app band by band in the site's own
 * tokens, because the app paints from CSS variables and this webapp has one light
 * palette. That trade buys a drawing that cannot be wrong on this site and can drift
 * from the product on any release.
 *
 * It does not have to be paid any more. `design-system/desktop/` is compiled into THIS
 * bundle by Next and into the renderer by Vite (see `design-system/README.md`), and
 * `/design-system` has been rendering those components live on this site for as long as
 * the folder has existed. So the window below is `ModalHeader`, `Select`,
 * `SectionHeader`, `ItemGroup` and four `PlanItem`s — the same files Electron ships.
 * A row that changes shape in the app changes shape here, with nobody to remember it.
 *
 * WHAT MAKES THAT WORK IS THE GROUND, and it is the only piece of stagecraft in the
 * file: `/design-system`'s own `Stage` writes a theme's `--c-*` variables onto one
 * element and paints the app's window colour under them, and this does the same with
 * `DESKTOP_THEMES.dark` — the app's DEFAULT theme (`DEFAULT_THEME` in
 * `desktop/src/types.ts`), so what is on the page is what an untouched install looks
 * like. Everything nested inside then resolves `bg-bg-secondary`, `text-ink` and
 * `border-line-subtle` exactly as it would in Electron.
 *
 * WHAT IS STILL THIS FILE'S OWN, because a design system holds none of it:
 *
 *   1. THE PANEL. `PageModal` portals to `document.body` and covers the viewport, which
 *      is right for a dialog and useless for a picture of one. Its panel is three
 *      classes — `bg-bg-secondary`, `rounded-2xl`, a shadow — and those are spelled
 *      below. The HEADER inside it is the real component.
 *   2. THE FILTER BAR'S BOX. `PlanFilters` lives in the app (it reads the store and the
 *      catalogue); what it draws is a `Select` and a count in a bordered band, so the
 *      band is here and the control is the app's.
 *   3. THE LIVE PILL. `LiveIndicator` is the app's too, and it reports a connection this
 *      page has no opinion about. Ten classes, drawn from the same tokens.
 *
 * THE WORDS ARE THE APP'S, key for key — `plans.*` and `relative.*` in
 * `desktop/src/i18n/` — for `TasksModalMockup`'s reason: a mockup of a screen that
 * reworded it is a mockup of a different screen. What the APP reads from a database is a
 * literal here, exactly as it is there: repository names, the numbers on the badges, and
 * the people who wrote the plans.
 *
 * `aria-hidden` AND `inert`, where the neighbours need only the first. Their panels are
 * spans; these are real components, so `Item` is a `role="button"` with a `tabIndex` and
 * `Select` is a real `<button>` that would open a real panel. `inert` takes the whole
 * drawing out of the tab order and out of reach of the pointer, which is what makes a
 * picture of a window a picture rather than a window that lies about what it does.
 */

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
 * DOM as `inert=""`, which is what the browser reads. The cast is what lets the value
 * the browser needs past the typing that describes React 19's behaviour.
 */
const INERT = { inert: '' } as unknown as { inert?: boolean }

/** Nothing is wired. Every control below is a drawing of a control. */
const noop = () => undefined

/**
 * `PlanRow`'s own table, copied — the two statuses, the plate each is drawn on and the
 * word that goes on it. `green` once the tickets exist, `yellow` while the spec is still
 * being written, which is what `STATUS_LOOK` in `pages/Plans/PlanRow.tsx` says and what
 * the webapp's `/plans` list says too.
 */
const STATUS_LOOK = {
  planned: { tone: 'green', labelKey: 'site.planCard.statusPlanned' },
  planning: { tone: 'yellow', labelKey: 'site.planCard.statusPlanning' },
} as const satisfies Record<string, { tone: StatusTone; labelKey: MessageKey }>

/**
 * The two repositories the Tasks drawing above already invented, wearing the two colours
 * the app hands out FIRST — `PROJECT_COLORS[0]` and `[1]`, the fallback an unconfigured
 * repository gets by index. Imported rather than spelled, so a repaint of the palette
 * repaints this drawing with it.
 */
const CHECKOUT = { label: 'acme/checkout-api', color: PROJECT_COLORS[0] }
const BILLING = { label: 'acme/billing-web', color: PROJECT_COLORS[1] }

/**
 * Four invented planning sessions on those two repositories.
 *
 * The TITLES and the IDEAS are prose, so they are catalogue keys. The numbers are the
 * database's own sequence within an organization (`PlanIdBadge`), the names are people,
 * and the repositories are repositories: all three are printed by the app exactly as
 * they arrive, so all three are literals here.
 *
 * The dates are keys because they are PHRASED — `relative.ago` wrapped around
 * `relative.days` — and the two languages phrase them differently. So is the ticket
 * count, which the app words and pluralises before the component ever sees it.
 *
 * NEWEST FIRST, which is the order the list is read in: `planRecency` sorts on when the
 * session was STARTED, so the dates run down the column instead of contradicting it.
 */
const PLANS: readonly {
  number: number
  title: MessageKey
  idea: MessageKey
  status: keyof typeof STATUS_LOOK
  when: MessageKey
  repository: { label: string; color: string }
  author: string
  tickets: MessageKey
}[] = [
  {
    number: 14,
    title: 'site.planCard.plan1',
    idea: 'site.planCard.idea1',
    status: 'planned',
    when: 'site.planCard.when1',
    repository: CHECKOUT,
    author: 'Camille Roux',
    tickets: 'site.planCard.tickets1',
  },
  {
    number: 13,
    title: 'site.planCard.plan2',
    idea: 'site.planCard.idea2',
    status: 'planning',
    when: 'site.planCard.when2',
    repository: BILLING,
    author: 'Théo Vasseur',
    tickets: 'site.planCard.tickets2',
  },
  {
    number: 11,
    title: 'site.planCard.plan3',
    idea: 'site.planCard.idea3',
    status: 'planned',
    when: 'site.planCard.when3',
    repository: CHECKOUT,
    author: 'Nadia Bahri',
    tickets: 'site.planCard.tickets3',
  },
  {
    number: 9,
    title: 'site.planCard.plan4',
    idea: 'site.planCard.idea4',
    status: 'planned',
    when: 'site.planCard.when4',
    repository: BILLING,
    author: 'Camille Roux',
    tickets: 'site.planCard.tickets4',
  },
]

/**
 * `LiveIndicator`, in its connected state.
 *
 * WHAT IT REPORTS IS THE CONNECTION AND NOT THE LIST, which is the honest reading and
 * the one the app's own note insists on: `plan_sessions` is deliberately outside the
 * realtime publication, so a teammate's plan arrives on the next read. The dot answers
 * "is the backend reachable at all", which is still the answer to "why does this look
 * emptier than I expected".
 */
function LivePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green/10 px-2 py-1 text-xs font-medium text-green">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green" />
      </span>
      {label}
    </span>
  )
}

/**
 * The four things this screen does that a still image of it cannot show.
 *
 * Every claim is checked against the source rather than written from the feature's
 * reputation: `pages/Plans/index.tsx` for the one chronology and for where the filter is
 * stored, `PlanRow.tsx` for what the two statuses are derived from, and
 * `PlanDetailPage.tsx` for what a row opens.
 */
const LEGEND: readonly {
  id: string
  icon: typeof NotebookPen
  name: MessageKey
  description: MessageKey
}[] = [
  {
    id: 'shared',
    icon: Sparkles,
    name: 'site.planCard.legendSharedTitle',
    description: 'site.planCard.legendSharedDesc',
  },
  {
    id: 'status',
    icon: ListTodo,
    name: 'site.planCard.legendStatusTitle',
    description: 'site.planCard.legendStatusDesc',
  },
  {
    id: 'spec',
    icon: NotebookPen,
    name: 'site.planCard.legendSpecTitle',
    description: 'site.planCard.legendSpecDesc',
  },
  {
    id: 'filter',
    icon: FolderGit2,
    name: 'site.planCard.legendFilterTitle',
    description: 'site.planCard.legendFilterDesc',
  },
]

/**
 * `legend` — the box of definitions under the drawing, on by default the way the Tasks
 * and Agents drawings have it. `/features` wants it; a caller that already has a
 * paragraph beside the picture can turn it off.
 */
export function PlanModalMockup({ legend = true }: { legend?: boolean } = {}) {
  const { t } = useT()

  return (
    <div className="flex flex-col">
      {/* THE PLATE THE WINDOW SITS ON, and the crop at the bottom of it.

          `tone-sky`, the ground the three drawings under this one stand on: a near-black
          window dropped straight onto white reads as a hole cut in the section, and on a
          coloured plate it reads as a screen photographed on a desk.

          `pb-0` AND A NEGATIVE MARGIN BELOW: the window runs 48px past the bottom of the
          plate and `overflow-hidden` cuts it. A chronology is never something you have
          seen all of, so the frame says so and the fourth row pays for it. */}
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
          /* `min-w-[720px]` IS WHAT MAKES THIS A WINDOW RATHER THAN A RESPONSIVE PANEL,
             and 720 is not a taste: it is the width the window has at the page's own
             measure (816px of column, less the plate's 48px gutters), so nothing moves
             on a desktop and the whole rule is about what happens below it.

             Without it the window SHRANK to the phone, and a real component shrinks
             honestly — `PlanItem` gives its title `min-w-0 flex-1`, so at 390px the
             status plate and the date kept their sizes and the title was squeezed to a
             single letter. The neighbouring drawings are drawn wider than a phone on
             purpose for exactly this reason (see the `min-w-0` note in
             `FeaturesContent`); they simply have literals stiff enough to stay that way
             on their own, and this one does not. The plate's `overflow-hidden` crops the
             right edge, which is the same crop the bottom already takes. */
          className="-mb-12 min-w-[720px] overflow-hidden rounded-2xl bg-bg-secondary text-ink shadow-lift"
        >
          {/* THE REAL HEADER. `PageModal` renders this exact element with this exact
              prop shape; what is not here is the portal, the backdrop and the two sizes
              it travels between, none of which a picture has any use for. */}
          <ModalHeader
            title="Plans"
            icon={NotebookPen}
            /* THE FOUR TABS OF THE ONE PAGE OVERLAY, in the sidebar's own order —
               `PAGE_TABS` in `desktop/src/renderer/App.tsx`, glyphs included. They are
               in the drawing because the window really does host all four: a plan's
               ticket rows open the board, a ticket's page names the plan it came out
               of, and no overlay closes in between.

               "Plans" and "Skills" are printed rather than translated, the call
               `lib/features.ts` makes for the same two words: the app's own French
               catalogue spells both exactly the same way. */
            tabs={{
              ariaLabel: 'Plans',
              activeKey: 'plans',
              items: [
                { key: 'plans', label: 'Plans', icon: NotebookPen },
                { key: 'tasks', label: t('site.planCard.tabTasks'), icon: ListTodo },
                { key: 'skills', label: 'Skills', icon: Sparkles },
                { key: 'settings', label: t('site.planCard.tabRepositories'), icon: FolderGit2 },
              ],
              onSelect: noop,
            }}
            right={<LivePill label={t('site.planCard.live')} />}
            fullScreen={{ expanded: false, onToggle: noop, expandTitle: '', collapseTitle: '' }}
            onClose={noop}
            closeTitle=""
          />

          {/* `px-6` and a `max-w-6xl` centred column are what `PlansPage` hands its
              sweep layers; the drawing is narrower than that cap at every width, so only
              the gutter is spelled. */}
          <div className="px-6 pb-6">
            {/* THE FILTER BAR. Full-bleed via `-mx-6 px-6`, as `PlanFilters` is: what
                scrolls past has to go under an opaque band edge to edge. The hairline
                under it is always drawn there, because the list below opens on a rule of
                its own and a band with no edge would read as its first row. */}
            <div className="-mx-6 flex items-center gap-3 border-b border-line-subtle px-6 py-3">
              <Select
                value=""
                options={[
                  { value: 'checkout', label: CHECKOUT.label, color: CHECKOUT.color },
                  { value: 'billing', label: BILLING.label, color: BILLING.color },
                ]}
                onChange={noop}
                placeholder={t('site.planCard.allRepos')}
                clearLabel={t('site.planCard.allRepos')}
                width={224}
                icon={FolderGit2}
              />
              <span className="ml-auto flex-shrink-0 text-xs text-text-secondary/50">
                {t('site.planCard.count')}
              </span>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              {/* `spacing="none"`, because the wrapper's `gap-3` already spaces the
                  heading from what it heads — the arrangement the real page uses. */}
              <SectionHeader
                icon={NotebookPen}
                title={t('site.planCard.section')}
                spacing="none"
              />

              <ItemGroup>
                {PLANS.map((plan) => (
                  <PlanItem
                    key={plan.number}
                    number={plan.number}
                    title={t(plan.title)}
                    status={{
                      label: t(STATUS_LOOK[plan.status].labelKey),
                      tone: STATUS_LOOK[plan.status].tone,
                    }}
                    when={t(plan.when)}
                    idea={t(plan.idea)}
                    repository={plan.repository}
                    author={{ name: plan.author, avatarUrl: null }}
                    tickets={t(plan.tickets)}
                    onSelect={noop}
                  />
                ))}
              </ItemGroup>
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
