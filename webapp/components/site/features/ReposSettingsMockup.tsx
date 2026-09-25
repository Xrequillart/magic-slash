'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ModalHeader, RepositoryList } from '@ds/desktop'
import {
  Building2,
  FolderGit2,
  ListTodo,
  Lock,
  NotebookPen,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from '@ds/desktop/icons'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import type { IconComponent } from '@ds/desktop/types'
import { DESKTOP_THEMES } from '@/lib/desktopTheme'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { FeatureLegend, LegendTile } from './FeatureLegend'

/**
 * The visual under the `multiRepo` row: the app's Repositories window, DRAWN WITH THE
 * APP'S OWN COMPONENTS rather than redrawn in the site's.
 *
 * IT WAS A TRACING, and what it traced is gone: a Settings modal with a rail of eleven
 * tabs and an account footer. The window lost the rail — preferences went to the quick
 * settings sheet, identity to the account sheet — and what is left is one page, the
 * repositories, reached as the fourth tab of the page overlay. So the drawing is that:
 * `ModalHeader` with the four tabs, and `RepositoryList` under it, which is the very file
 * `desktop/src/renderer/pages/Config/index.tsx` renders.
 *
 * THE GROUND is `DESKTOP_THEMES.dark`, the app's default theme, as `--c-*` variables on
 * the window — see `TasksModalMockup`, whose header is the long version of the argument.
 *
 * WHAT THE DRAWING ARGUES is the row's own sentence: one GitHub repository is one
 * configuration, and the organization owns it. So both sections the app shows are here —
 * a personal repository under the padlock, and the organization's three under its name —
 * and one of the three is a colleague's this machine has not bound to a folder yet. That
 * row is the inheritance made visible: the configuration arrived before the clone did.
 *
 * Repository names, the organization's name and the paths are data the app prints as it
 * finds them, so they are literals; everything the app translates is a catalogue key.
 */

/** The app's default theme. */
const THEME = DESKTOP_THEMES.dark

/** `inert` as the empty string, for React 18's reason — see `TasksModalMockup`. */
const INERT = { inert: '' } as unknown as { inert?: boolean }

const noop = () => undefined

/**
 * THE PAGE OVERLAY, as the Settings drawings on this page all need it: the plate, the
 * themed panel, the real `ModalHeader` on the Repositories tab, and the page's own column
 * — `mx-auto max-w-6xl flex flex-col gap-6 p-6`, the sweep layer's classes in
 * `pages/Config/index.tsx`.
 *
 * AT THE PLATE'S WIDTH, NOT SHRUNK. Settings are rows — a label at the left, a control at
 * the right — and they reflow the way the app's own do in a narrower window, so there is
 * no proportion to protect with a zoom and every word stays at a readable size. The floor
 * is 720px, below which the rows would start to wrap: a phone crops the right edge rather
 * than squeezing them.
 */
export function SettingsWindow({ tone, children }: { tone: 'bg-tone-mist' | 'bg-tone-sky'; children: ReactNode }) {
  const { t } = useT()

  return (
    <div aria-hidden {...INERT} className={`overflow-hidden rounded-2xl ${tone} p-5 sm:p-12`}>
      <div
        className="min-w-[720px] overflow-hidden rounded-2xl bg-bg-secondary text-ink shadow-lift"
        style={{ ...THEME.vars, colorScheme: THEME.appearance } as CSSProperties}
      >
        {/* THE FOUR TABS OF THE ONE PAGE OVERLAY, in the sidebar's own order —
            `PAGE_TABS` in `desktop/src/renderer/App.tsx`, glyphs included. */}
        <ModalHeader
          title={t('site.tasksCard.tabRepositories')}
          icon={FolderGit2}
          tabs={{
            ariaLabel: t('site.tasksCard.tabRepositories'),
            activeKey: 'settings',
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">{children}</div>
      </div>
    </div>
  )
}

/**
 * The repositories, in the colours the app hands out by index — so `checkout-api` wears
 * the same blue here as in the Tasks drawing above.
 */
const PERSONAL = [
  { name: 'side-project', path: '~/Code/side-project', color: PROJECT_COLORS[4] },
] as const

const ORG = {
  name: 'Acme',
  repos: [
    { name: 'checkout-api', path: '~/Code/acme/checkout-api', color: PROJECT_COLORS[0], agents: 2 },
    { name: 'billing-web', path: '~/Code/acme/billing-web', color: PROJECT_COLORS[1], agents: 1 },
    // A colleague's repository, shared with the organization and not yet cloned here.
    { name: 'mobile-app', color: PROJECT_COLORS[2] },
  ],
} as const

/** The four claims the row makes, each pointing at a part of the screen above. */
const LEGEND: readonly { id: string; icon: IconComponent; name: MessageKey; description: MessageKey }[] = [
  { id: 'oneConfig', icon: FolderGit2, name: 'site.reposCard.legendOneConfigTitle', description: 'site.reposCard.legendOneConfigDesc' },
  { id: 'admin', icon: ShieldCheck, name: 'site.reposCard.legendAdminTitle', description: 'site.reposCard.legendAdminDesc' },
  { id: 'inherit', icon: Users, name: 'site.reposCard.legendInheritTitle', description: 'site.reposCard.legendInheritDesc' },
  { id: 'skills', icon: RefreshCw, name: 'site.reposCard.legendSkillsTitle', description: 'site.reposCard.legendSkillsDesc' },
]

export function ReposSettingsMockup() {
  const { t } = useT()

  const row = (repo: { name: string; path?: string; color: string; agents?: number }) => ({
    key: repo.name,
    name: repo.name,
    color: repo.color,
    href: '#',
    ...(repo.path
      ? { path: repo.path, remote: { connected: true, label: t('site.reposCard.connected') } }
      : { missingPath: t('site.reposCard.noLocalFolder') }),
    ...(repo.agents
      ? { agents: t(repo.agents > 1 ? 'site.reposCard.agents.other' : 'site.reposCard.agents.one') }
      : {}),
  })

  return (
    <div className="flex flex-col">
      <SettingsWindow tone="bg-tone-sky">
        <RepositoryList
          add={{ label: t('site.reposCard.add'), onClick: noop }}
          sections={[
            { id: 'personal', icon: Lock, title: t('site.reposCard.personal'), rows: PERSONAL.map(row), empty: '' },
            { id: 'acme', icon: Building2, title: ORG.name, rows: ORG.repos.map(row), empty: '' },
          ]}
        />
      </SettingsWindow>

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
    </div>
  )
}
