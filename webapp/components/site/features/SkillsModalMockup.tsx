'use client'

import type { CSSProperties } from 'react'
import { ModalHeader, SkillsOverview, SkillsRail, type SkillsOverviewCard } from '@ds/desktop'
import {
  AlertTriangle,
  FolderGit2,
  FolderInput,
  Gauge,
  GitFork,
  LayoutGrid,
  ListTodo,
  NotebookPen,
  PenTool,
  Plus,
  Sparkles,
  VSCode,
  Wand2,
} from '@ds/desktop/icons'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import type { IconComponent } from '@ds/desktop/types'
import { DESKTOP_THEMES } from '@/lib/desktopTheme'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { FeatureLegend, LegendTile } from './FeatureLegend'

/**
 * The visual under the `Skills` row: the app's Skills window, DRAWN WITH THE APP'S OWN
 * COMPONENTS rather than redrawn in the site's.
 *
 * IT WAS A TRACING, band for band and class for class, in the site's `onink` ramp — and a
 * tracing is a copy that drifts: the rail had grown `MenuSidebarItem` rows and `Label`
 * repository headings in the app that the drawing never learned about. The page's bands
 * are in the design system now — `SkillsRail`, `SkillsOverview` (warnings, `SkillBudget`,
 * the card sections) — and `desktop/src/renderer/pages/Skills/index.tsx` renders those
 * same files. So the window here is not a drawing of the app's page: it IS the app's page,
 * given invented skills. `TasksModalMockup` made the same move first and its header is the
 * long version of the argument.
 *
 * THE GROUND is `DESKTOP_THEMES.dark`, the app's default theme, written onto the window as
 * the `--c-*` variables every component under it resolves against — so `bg-bg-secondary`,
 * `text-ink` and `bg-surface` come out exactly as they would in Electron.
 *
 * WHAT IS STILL THIS FILE'S OWN:
 *
 *   1. THE PANEL. `PageModal` portals to `document.body` and covers the viewport, which is
 *      useless for a picture of one. Its panel is `bg-bg-secondary`, `rounded-2xl`, a
 *      shadow, 72rem wide and 85vh tall, with the page in a `flex-1 overflow-hidden` under
 *      the header — spelled below. The HEADER is the real component.
 *   2. THE PAGE SHELL: the rail beside a `flex-1 p-6` pane, which is three classes in
 *      `SkillsPage` itself. The pane is `overflow-hidden` here where the app's scrolls:
 *      macOS draws no scrollbar at rest, and neither does this.
 *   3. THE NUMBERS. The app computes the budget from the running agent's context window;
 *      a picture has no agent, so the figures are chosen — 32,400 of 40,000 characters,
 *      the 1% of a 1M window. Four fifths full: empty bars say nothing, and full ones
 *      would make the drawing an error state.
 *
 * THE WORDS ARE THE APP'S, key for key — `skills.*` in `desktop/src/i18n/`. A skill's NAME
 * is the string its own `SKILL.md` declares, so it is a literal; so are the window presets,
 * which the app's French catalogue spells "200K tokens" and "1M tokens" too.
 *
 * `aria-hidden` AND `inert`: these are real components, with real buttons in them, and
 * `inert` takes the whole drawing out of the tab order and out of reach of the pointer.
 */

/** The app's default theme. See the header. */
const THEME = DESKTOP_THEMES.dark

/** `inert` as the empty string, for React 18's reason — see `TasksModalMockup`. */
const INERT = { inert: '' } as unknown as { inert?: boolean }

/** Nothing is wired. Every control below is a drawing of a control. */
const noop = () => undefined

/**
 * `PageModal`'s panel at `size="page"`: 72rem wide, and 85vh tall on a window whose inner
 * height is ~940px — a 1080p display less the menu bar and the dock. The page fills
 * whatever the header leaves, as it does in the app.
 */
const WINDOW_WIDTH = 1152
const WINDOW_HEIGHT = 800

/**
 * What the window is shrunk BY, and the one number here that knows about the page around
 * it: 1152 × 0.652 is 751px, the inner width of the plate in the features column
 * (`max-w-site` 1100, less the 220px rail and the 64px gap, less the plate's own `p-8`).
 *
 * `zoom` AND NOT `transform: scale`: `zoom` reflows, so the plate sizes itself to the
 * scaled drawing. Narrower than that — a tablet, a phone — and the window runs off the
 * right of the plate and is cropped there.
 */
const WINDOW_ZOOM = 0.652

/**
 * ALL EIGHT SKILLS MAGIC SLASH SHIPS, and all eight because the rail counts them: a group
 * reading "BUILT-IN 8" over six rows is a drawing contradicting itself. Named the way the
 * app names them — the colon form every `SKILL.md` in `skills/` declares. Their pictures
 * are the `skill-*.png` the site already ships.
 */
const BUILT_IN = [
  { name: 'magic:plan', picto: '/img/skill-plan.png', description: 'site.commands.plan' },
  { name: 'magic:start', picto: '/img/skill-start.png', description: 'site.commands.start' },
  { name: 'magic:continue', picto: '/img/skill-continue.png', description: 'site.commands.continue' },
  { name: 'magic:commit', picto: '/img/skill-commit.png', description: 'site.commands.commit' },
  { name: 'magic:pr', picto: '/img/skill-pr.png', description: 'site.commands.pr' },
  { name: 'magic:review', picto: '/img/skill-review.png', description: 'site.commands.review' },
  { name: 'magic:resolve', picto: '/img/skill-resolve.png', description: 'site.commands.resolve' },
  { name: 'magic:done', picto: '/img/skill-done.png', description: 'site.commands.done' },
] as const satisfies readonly { name: string; picto: string; description: MessageKey }[]

/**
 * Two skills of the reader's own, and one a repository carries — an invented project. No
 * pictures: a skill you wrote this morning has none, and the app draws its fallback tile.
 */
const CUSTOM = [
  { name: 'deploy-preview', description: 'site.skillsCard.deployPreview' },
  { name: 'release-notes', description: 'site.skillsCard.releaseNotes' },
] as const satisfies readonly { name: string; description: MessageKey }[]

/** The repository, in the colour the app hands out first — the one the Tasks drawing uses. */
const REPO = {
  name: 'acme/checkout-api',
  color: PROJECT_COLORS[0],
  skills: [{ name: 'db-migrate', description: 'site.skillsCard.dbMigrate' }],
} as const satisfies { name: string; color: string; skills: readonly { name: string; description: MessageKey }[] }

/** The two skills the warnings band is complaining about, with the app's word counts. */
const LONG_DESCRIPTIONS = [
  { name: 'deploy-preview', words: 184 },
  { name: 'release-notes', words: 126 },
] as const

/** See the header, point 3. */
const CHARS = 32_400
const CHAR_BUDGET = 40_000

/** The legend under the drawing: four things a still image of this window cannot show. */
const LEGEND: readonly {
  id: string
  icon: IconComponent
  tone: string
  name: MessageKey
  description: MessageKey
}[] = [
  { id: 'rail', icon: LayoutGrid, tone: 'bg-accent/15 text-accent', name: 'site.skillsCard.legendRailTitle', description: 'site.skillsCard.legendRailDesc' },
  { id: 'budget', icon: Gauge, tone: 'bg-accent/15 text-accent', name: 'site.skillsCard.legendBudgetTitle', description: 'site.skillsCard.legendBudgetDesc' },
  { id: 'warnings', icon: AlertTriangle, tone: 'bg-orange/15 text-orange', name: 'site.skillsCard.legendWarningsTitle', description: 'site.skillsCard.legendWarningsDesc' },
  { id: 'edit', icon: PenTool, tone: 'bg-accent/15 text-accent', name: 'site.skillsCard.legendEditTitle', description: 'site.skillsCard.legendEditDesc' },
]

export function SkillsModalMockup() {
  const { t, locale } = useT()

  const card = (name: string, description: string, extra: Partial<SkillsOverviewCard> = {}): SkillsOverviewCard => ({
    key: name,
    name,
    description,
    onClick: noop,
    ...extra,
  })

  return (
    <div className="flex flex-col">
      {/* THE PLATE THE WINDOW SITS ON. `tone-sky`, the ground this family of drawings stands
          on, and SURROUNDED rather than cropped: the window is whole, and what it cuts off
          at the bottom it cuts off itself, exactly as the app's own 85vh panel does. */}
      <div aria-hidden {...INERT} className="overflow-hidden rounded-2xl bg-tone-sky p-5 sm:p-8">
        <div
          // `text-ink` on the ground itself, so anything drawn in `currentColor` resolves
          // against the app's ink rather than climbing to the site's own near-black.
          className="flex flex-col overflow-hidden rounded-2xl bg-bg-secondary text-ink shadow-lift"
          style={{
            ...THEME.vars,
            colorScheme: THEME.appearance,
            width: WINDOW_WIDTH,
            height: WINDOW_HEIGHT,
            zoom: WINDOW_ZOOM,
          } as CSSProperties}
        >
          {/* THE REAL HEADER, with the four tabs of the one page overlay in the sidebar's
              own order — `PAGE_TABS` in `desktop/src/renderer/App.tsx`. */}
          <ModalHeader
            title={t('site.agentsCard.skills')}
            icon={Sparkles}
            tabs={{
              ariaLabel: t('site.agentsCard.skills'),
              activeKey: 'skills',
              items: [
                { key: 'plans', label: 'Plans', icon: NotebookPen },
                { key: 'tasks', label: t('site.tasksCard.title'), icon: ListTodo },
                { key: 'skills', label: t('site.agentsCard.skills'), icon: Sparkles },
                { key: 'settings', label: t('site.tasksCard.tabRepositories'), icon: FolderGit2 },
              ],
              onSelect: noop,
            }}
            fullScreen={{ expanded: false, onToggle: noop, expandTitle: '', collapseTitle: '' }}
            onClose={noop}
            closeTitle=""
          />

          <div className="flex-1 overflow-hidden">
            <div className="h-full flex">
              <SkillsRail
                overviewLabel={t('site.skillsCard.allSkills')}
                activeKey="all"
                onSelect={noop}
                ariaLabel={t('site.skillsCard.allSkills')}
                groups={[
                  {
                    id: 'built-in',
                    label: t('site.skillsCard.builtIn'),
                    icon: Sparkles,
                    rows: BUILT_IN.map((s) => ({ key: s.name, label: s.name, thumb: { src: s.picto, alt: s.name } })),
                  },
                  {
                    id: 'custom',
                    label: t('site.skillsCard.custom'),
                    icon: PenTool,
                    rows: CUSTOM.map((s) => ({ key: s.name, label: s.name, thumb: { src: null, alt: s.name } })),
                    action: { icon: Plus, title: t('site.skillsCard.new'), onClick: noop },
                  },
                  {
                    id: 'repo',
                    label: REPO.name,
                    repoColor: REPO.color,
                    rows: REPO.skills.map((s) => ({ key: s.name, label: s.name, icon: GitFork })),
                  },
                ]}
              />

              <div className="flex-1 overflow-hidden p-6">
                <SkillsOverview
                  warnings={{
                    title: t('site.skillsCard.warnings'),
                    notices: [{
                      id: 'long',
                      variant: 'warning',
                      actions: [
                        { label: t('site.skillsCard.openInVSCode'), icon: VSCode, onClick: noop },
                        { label: t('site.skillsCard.fixWithAgent'), icon: Wand2, onClick: noop, primary: true },
                      ],
                      rows: LONG_DESCRIPTIONS.map((entry) => ({
                        id: entry.name,
                        name: entry.name,
                        detail: t('site.skillsCard.words', { count: entry.words }),
                      })),
                      children: t('site.skillsCard.longDesc'),
                    }],
                  }}
                  budget={{
                    title: t('site.skillsCard.budgetSection'),
                    help: t('site.skillsCard.budgetHelp'),
                    // PARKED ON AUTO, which is the whole argument of the gauge: the window
                    // came off the running agent, not off a setting.
                    window: {
                      label: t('site.skillsCard.windowLabel'),
                      items: [
                        { key: 'auto', label: 'Auto · 1M' },
                        { key: '200000', label: '200K tokens' },
                        { key: '1000000', label: '1M tokens' },
                      ],
                      activeKey: 'auto',
                      hint: t('site.skillsCard.windowHint'),
                    },
                    meters: [
                      { label: t('site.skillsCard.chars'), value: CHARS, max: CHAR_BUDGET, unit: t('site.skillsCard.unitChars'), locale, tone: 'accent' },
                      { label: t('site.skillsCard.tokens'), value: CHARS / 4, max: CHAR_BUDGET / 4, unit: t('site.skillsCard.unitTokens'), locale, tone: 'warning' },
                    ],
                    // Collapsed in the app on arrival, and never opened here: `inert`.
                    how: { label: t('site.skillsCard.how'), notes: [] },
                    breakdown: {
                      label: t('site.skillsCard.details'),
                      rows: [...BUILT_IN, ...CUSTOM, ...REPO.skills].map((s) => ({ id: s.name, name: s.name })),
                    },
                  }}
                  sections={[
                    {
                      id: 'built-in',
                      icon: Sparkles,
                      title: t('site.skillsCard.builtIn'),
                      hint: t('site.skillsCard.builtInHelp'),
                      cards: BUILT_IN.map((s) =>
                        card(s.name, t(s.description), {
                          imageUrl: s.picto,
                          badge: { label: t('site.skillsCard.sourceBuiltIn'), color: 'rgb(var(--c-accent))' },
                        }),
                      ),
                    },
                    {
                      id: 'custom',
                      icon: PenTool,
                      title: t('site.skillsCard.custom'),
                      hint: t('site.skillsCard.customHelp'),
                      actions: [
                        { id: 'import', label: t('site.skillsCard.import'), icon: FolderInput, onClick: noop },
                        { id: 'new', label: t('site.skillsCard.new'), icon: Plus, onClick: noop },
                      ],
                      cards: CUSTOM.map((s) => card(s.name, t(s.description), { imageUrl: null })),
                    },
                    {
                      id: 'repos',
                      icon: GitFork,
                      title: t('site.skillsCard.repos'),
                      hint: t('site.skillsCard.reposHelp'),
                      repos: [{
                        id: REPO.name,
                        name: REPO.name,
                        color: REPO.color,
                        cards: REPO.skills.map((s) => card(s.name, t(s.description))),
                      }],
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <FeatureLegend
        items={LEGEND.map((item) => ({
          id: item.id,
          mark: (
            <LegendTile tone={item.tone}>
              <item.icon className="h-4 w-4" />
            </LegendTile>
          ),
          name: item.name,
          description: item.description,
        }))}
      />
    </div>
  )
}
