'use client'

import { useState, type CSSProperties } from 'react'
import { Button, DiffStat, Kbd, Label, ProgressBar, PullRequestCard, Switch, ThemePreviewGrid, TicketCard } from '@ds/desktop'
import { ChevronsUp, FolderGit2, Play, Plus, Ticket } from '@ds/desktop/icons'
import type { DesktopTheme, DesktopThemeId } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, Stage } from '../parts'
import { THEME_PREVIEWS } from '../themeSwatches'

/**
 * THE THEMES PAGE: a handful of the app's REAL components in a window painted with one
 * of its eight themes, and the eight to pick from above it.
 *
 * It was the playground on Prestige's home page, and it moved here to sit beside
 * `Colours`: the palette says what a role is, this shows the roles resolving. Like
 * `Colours` it is a foundation page and not a component, so it has no "Built on" and
 * no "Used by".
 *
 * THE PICKER IS THE SHELL'S. The grid on this page and the one at the foot of the rail
 * write the same state, so a click here repaints the window below, the rail's picker and
 * every other entry the reader opens next. That is the claim of the heading, kept.
 *
 * Nothing here is drawn for the page: the components come from `@ds/desktop`, and a theme
 * is nothing but the custom properties the app's registry sets on its root.
 */
export function ThemesEntry({
  theme,
  themeId,
  onTheme,
}: {
  theme: DesktopTheme
  themeId?: DesktopThemeId
  onTheme?: (id: DesktopThemeId) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Themes">
        Eight themes. One click, and everything follows. These are not screenshots: they are
        the app’s components, rendered here, and they repaint exactly as they do in the app.
      </EntryHeader>

      <EntrySection
        title="Pick one"
        note="The same choice as the picker at the foot of the rail: every preview on every page follows it."
      >
        {themeId && onTheme && (
          <Stage theme={theme}>
            <ThemePreviewGrid
              themes={THEME_PREVIEWS}
              value={themeId}
              onSelect={(id) => onTheme(id as DesktopThemeId)}
            />
          </Stage>
        )}
      </EntrySection>

      <EntrySection title="In the window">
        <div
          style={
            {
              ...theme.vars,
              backgroundColor: 'rgb(var(--c-bg))',
              colorScheme: theme.appearance,
            } as CSSProperties
          }
          className="overflow-hidden rounded-2xl border border-hairline text-ink transition-colors duration-300"
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
      </EntrySection>
    </article>
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
