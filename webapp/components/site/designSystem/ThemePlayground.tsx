'use client'

import { useState, type CSSProperties } from 'react'
import { Button, DiffStat, Kbd, Label, ProgressBar, PullRequestCard, Switch, TicketCard } from '@ds/desktop'
import { ChevronsUp, FolderGit2, Play, Plus, Ticket } from '@ds/desktop/icons'
import { DESKTOP_THEMES, DESKTOP_THEME_IDS, type DesktopThemeId } from '@/lib/desktopTheme'
import { useT } from '@/lib/i18n/useLanguage'
import { Reveal } from '../Reveal'
import { HomeHeading, HomeSection } from '../home/Shell'

/**
 * THE PLAYGROUND: a handful of the app's REAL components in a window painted with one
 * of its eight themes, and a row of pills to swap the theme.
 *
 * Nothing here is drawn for the page. The components come from `@ds/desktop`, the
 * folder Electron compiles, and a theme is nothing but the custom properties the app's
 * own registry sets on its root — which is exactly what `style` sets on the window
 * below, the same way the gallery's `Stage` does. So the repaint a reader sees on click
 * is the repaint the app does when its own theme changes.
 *
 * THE SAMPLE CONTENT IS ENGLISH, like the gallery's: it is what a ticket or a pull
 * request says in the app, not copy of this site.
 */
export function ThemePlayground() {
  const { t } = useT()
  const [themeId, setThemeId] = useState<DesktopThemeId>('midnight')
  const theme = DESKTOP_THEMES[themeId]

  return (
    <HomeSection>
      <Reveal>
        <HomeHeading
          eyebrow={t('site.designSystem.playgroundEyebrow')}
          title={t('site.designSystem.playgroundTitle')}
          subtitle={t('site.designSystem.playgroundSubtitle')}
        />
      </Reveal>

      <Reveal order={2} className="mt-10">
        <div role="radiogroup" aria-label={t('site.designSystem.playgroundThemes')} className="flex flex-wrap gap-2">
          {DESKTOP_THEME_IDS.map((id) => {
            const { label, vars } = DESKTOP_THEMES[id]
            const active = id === themeId
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setThemeId(id)}
                className={`inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-bold transition-colors ${
                  active ? 'border-ink bg-ink text-white' : 'border-hairline bg-white text-ink hover:bg-canvas'
                }`}
              >
                {/* The theme's own ground with its accent inside it: the two colours
                    that tell the eight apart at a glance. */}
                <span
                  aria-hidden
                  className="grid h-5 w-5 place-items-center rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: `rgb(${vars['--c-bg']})` }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `rgb(${vars['--c-accent']})` }} />
                </span>
                {label}
              </button>
            )
          })}
        </div>
      </Reveal>

      <Reveal order={3} className="mt-6">
        <div
          style={
            {
              ...theme.vars,
              backgroundColor: 'rgb(var(--c-bg))',
              colorScheme: theme.appearance,
            } as CSSProperties
          }
          className="overflow-hidden rounded-2xl border border-hairline text-ink shadow-lift transition-colors duration-300"
        >
          <WindowBar title={theme.label} />
          <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:p-6">
            <div className="flex min-w-0 flex-col gap-3">
              <TicketCard
                tracker="jira"
                ticketId="PER-1234"
                title="Sprint board should keep the repository it was left on"
                mark={{ icon: ChevronsUp, tone: 'red', label: 'Priority: Highest' }}
                status={{ label: 'In review', tone: 'accent' }}
                tags={[
                  { id: 'epic', label: 'Rebranding', color: 'rgb(var(--c-purple))', truncate: true },
                  { id: 'l1', label: 'desktop' },
                ]}
                notes={[{ id: 'reporter', text: 'Ada Lovelace' }]}
                action={{ icon: Play, title: 'Start an agent', onClick: () => undefined }}
                onOpen={() => undefined}
              />
              <PullRequestCard
                state="merged"
                title="PR #481"
                subtitle="Xrequillart/magic-slash"
                badge={{ label: 'Merged', tone: 'purple' }}
                open={{ label: 'View pull request', onOpen: () => undefined }}
              />
            </div>
            <Controls />
          </div>
        </div>
      </Reveal>
    </HomeSection>
  )
}

/** The window's title strip: the three lights, in the theme's own red, yellow, green. */
function WindowBar({ title }: { title: string }) {
  return (
    <div className="flex h-10 items-center gap-2 border-b border-line px-4" style={{ backgroundColor: 'var(--c-surface)' }}>
      {(['--c-red', '--c-yellow', '--c-green'] as const).map((light) => (
        <span key={light} aria-hidden className="h-3 w-3 rounded-full" style={{ backgroundColor: `rgb(var(${light}))` }} />
      ))}
      <span className="ml-3 text-[12px] font-medium text-text-secondary">{title}</span>
    </div>
  )
}

/** The small parts, live: the switch switches, the bar is read against its thresholds. */
function Controls() {
  const [notify, setNotify] = useState(true)

  return (
    <div className="flex min-w-0 flex-col gap-5 rounded-xl border border-line p-4" style={{ backgroundColor: 'var(--c-surface-subtle)' }}>
      <div className="flex flex-wrap gap-2">
        <Button tone="accent" size="md" icon={Plus}>
          New agent
        </Button>
        <Button tone="neutral" size="md">
          Cancel
        </Button>
        <Button tone="ghost" size="md">
          Skip
        </Button>
      </div>

      <label className="flex items-center justify-between gap-3 text-[13px]">
        <span>Notify me on every review</span>
        <Switch checked={notify} onChange={setNotify} label="Notify me on every review" />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Label icon={Ticket}>3 tickets</Label>
        <Label tone="github">#234</Label>
        <Label icon={FolderGit2}>magic-slash</Label>
      </div>

      <div className="flex items-center justify-between gap-3 text-[13px]">
        <span className="text-text-secondary">Uncommitted changes</span>
        <DiffStat additions={31} deletions={4} gauge />
      </div>

      <div className="flex flex-col gap-2 text-[13px]">
        <span className="flex justify-between text-text-secondary">
          <span>Context window</span>
          <span className="tabular-nums">72%</span>
        </span>
        <ProgressBar value={72} thresholds={{ warning: 65, danger: 85 }} size="md" />
      </div>

      <div className="flex items-center justify-between gap-3 text-[13px] text-text-secondary">
        <span>Open the command palette</span>
        <Kbd keys={['⌘', 'K']} />
      </div>
    </div>
  )
}
