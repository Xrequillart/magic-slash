'use client'

import { useEffect, useRef, useState } from 'react'
import { SelectIcon, type ButtonIconSize, type SelectIconGroup } from '@ds/desktop'
import { Activity, ArrowDownUp, Clock, FolderGit2, Play } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

/** A monorepo's own menu, which is what the grouped shape was written for. */
const PACKAGES: SelectIconGroup[] = [
  {
    label: 'magic-slash',
    items: [
      { id: '0:0', label: 'lint', hint: 'npm lint' },
      { id: '0:1', label: 'test', hint: 'npm test' },
    ],
  },
  {
    label: 'desktop',
    items: [
      { id: '1:0', label: 'dev', hint: 'npm dev', disabled: true },
      { id: '1:1', label: 'build', hint: 'npm build' },
      { id: '1:2', label: 'package', hint: 'npm package' },
    ],
  },
  {
    label: 'webapp',
    items: [
      { id: '2:0', label: 'dev', hint: 'pnpm dev' },
      { id: '2:1', label: 'build', hint: 'pnpm build' },
    ],
  },
]

/** One package: the axis flips to the KIND of script. */
const CATEGORIES: SelectIconGroup[] = [
  { label: 'dev', items: [{ id: '0:0', label: 'dev', hint: 'npm dev' }] },
  { label: 'build', items: [{ id: '0:1', label: 'build', hint: 'npm build' }] },
  {
    label: 'test',
    items: [
      { id: '0:2', label: 'test', hint: 'npm test' },
      { id: '0:3', label: 'test:watch', hint: 'npm test:watch' },
    ],
  },
  { label: 'lint', items: [] },
]

const PROPS: PropRow[] = [
  {
    name: 'icon',
    type: 'IconComponent',
    required: true,
    description:
      'The mark, from @ds/desktop/icons. Every row in the panel repeats it, unless a row carries an icon of its own.',
  },
  {
    name: 'title',
    type: 'string',
    required: true,
    description:
      'What the menu is — the tooltip and the accessible name at once. Required for ButtonIcon’s reason: the trigger carries no word.',
  },
  {
    name: 'groups',
    type: 'SelectIconGroup[]',
    required: true,
    description:
      'Headed runs of items. Always groups, even when there is one: a menu that is sometimes flat and sometimes grouped is two components wearing one name. An empty group draws nothing.',
  },
  { name: 'onSelect', type: '(item: SelectIconItem) => void', required: true, description: 'The row that was picked. The panel closes itself.' },
  {
    name: 'onOpen',
    type: '() => void',
    description:
      'Called when the panel opens. The scripts menu reads package.json here rather than on every render of every repository card — a menu nobody opened should cost nothing.',
  },
  { name: 'loading', type: 'boolean', fallback: 'false', description: 'Shows loadingLabel alone in the panel.' },
  { name: 'loadingLabel', type: 'string', description: 'Translated. Shown while onOpen’s work is in flight.' },
  { name: 'emptyLabel', type: 'string', description: 'Translated. Shown when no group has an item.' },
  {
    name: 'size',
    type: "'xs' | 'sm' | 'md' | 'lg'",
    fallback: "'sm'",
    description:
      'ButtonIcon’s ladder, read from ButtonIcon’s own table. The height and the radius are the rung’s; the width is not, because the chevron needs room the mark does not.',
  },
  {
    name: 'panelWidth',
    type: 'number',
    fallback: '280',
    description:
      'How wide the panel is, in pixels. A number and not a class: the panel is portalled and positioned by hand, so this same value is what the right-alignment and the viewport clamp are computed from. Pass the width of the longest row — the sidebar’s sort menu asks for 190, three short phrases and no hint, where 280 beside a 230px column overhangs the list it belongs to.',
  },
  {
    name: 'tone',
    type: "'neutral' | 'purple'",
    fallback: "'neutral'",
    description:
      'What it turns at rest and while open. The open tint is a step darker than the hover: pressing an already-open chip has to look like something happened, and it cannot look like hovering it.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement. Not the height, the ground or the radius.' },
]

/**
 * A themed host for the portalled panel, inside the `Stage`.
 *
 * The app needs none of this: `applyTheme` writes the theme onto
 * `document.documentElement`, so a panel at the end of the body inherits it. This
 * page is the opposite case — the theme is a `style` prop on the preview ground, and
 * a panel portalled past it lands on the site's own white canvas with
 * `--c-bg-tertiary` undefined, which paints a menu with no background at all.
 *
 * So the host sits IN the ground, and the panel is portalled into it rather than into
 * the body. It is `fixed` and positioned by the component, so a zero-sized host at
 * the end of the stage does not move it.
 */
function usePortalHost() {
  const ref = useRef<HTMLSpanElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => setHost(ref.current), [])
  return { ref, host }
}

function Demo({ groups, tone, size, loading }: {
  groups: SelectIconGroup[]
  tone?: 'neutral' | 'purple'
  size?: ButtonIconSize
  loading?: boolean
}) {
  const [picked, setPicked] = useState<string | null>(null)
  const { ref, host } = usePortalHost()
  return (
    <span className="inline-flex items-center gap-3">
      <span ref={ref} />
      <SelectIcon
        icon={Play}
        title="Run a script"
        groups={groups}
        tone={tone}
        size={size}
        loading={loading}
        loadingLabel="Loading…"
        emptyLabel="No scripts in this repository"
        portalTo={host}
        onSelect={(item) => setPicked(item.label)}
      />
      {picked && (
        <span className="font-mono text-[10px] text-text-secondary">ran {picked}</span>
      )}
    </span>
  )
}

/**
 * The other menu the app opens with this: the sidebar's sort order.
 *
 * TWO THINGS THE SCRIPTS MENU HAS NOT. The rows carry their OWN marks, because they
 * are three kinds of order rather than three of the same action, and one of them is
 * `selected` — which is what makes a menu a select: it says which order the list is
 * in before anything is picked.
 */
function SortDemo() {
  const [mode, setMode] = useState('recent')
  const { ref, host } = usePortalHost()
  const modes = [
    { id: 'recent', label: 'Newest first', icon: Clock },
    { id: 'status', label: 'By status', icon: Activity },
    { id: 'repository', label: 'By repository', icon: FolderGit2 },
  ]
  return (
    <span className="inline-flex items-center gap-3">
      <span ref={ref} />
      <SelectIcon
        icon={ArrowDownUp}
        title="Sort agents"
        panelWidth={190}
        groups={[{
          label: 'Sort by',
          items: modes.map((option) => ({ ...option, selected: option.id === mode })),
        }]}
        portalTo={host}
        onSelect={(item) => setMode(item.id)}
      />
    </span>
  )
}

export function SelectIconEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="SelectIcon"
        uses={[
          { id: 'buttonicon', label: 'ButtonIcon' },
          { id: 'icon', label: 'Icon' },
          { id: 'text', label: 'Text' },
        ]}
        onOpen={onOpen}
      >
        A <code>ButtonIcon</code> that opens a menu. Beside two links that open something
        elsewhere, a chip with no chevron promises the same thing they do — the chevron is the
        only mark on screen saying this one opens a list instead, and it turns over while the
        panel is up.
      </EntryHeader>

      <EntrySection
        title="It is a real menu"
        note="Open it. The panel is portalled to <body> and positioned against the trigger's own box, flipping above when the room below runs out — because the sidebar it was written for has overflow-hidden, where an absolutely-positioned panel was clipped and vanished under the terminal pane. That is the one place it parts from Status's menu, which opens inside a card that lets it out."
      >
        <Stage theme={theme} className="flex items-center gap-6">
          <Demo groups={PACKAGES} tone="purple" />
          <span className="font-mono text-[10px] text-text-secondary">
            purple — the scripts menu, as the app draws it. <code>dev</code> is disabled: it is
            already running.
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The groups are the caller's"
        note="It is handed groups the way Status is handed its options, and for the same reason: the scripts in a repository are that repository's, not a design language. The scripts menu flips its own axis on the package count — one package and the headers are the kinds of script, several and they are the packages, because webapp and desktop both define dev."
      >
        <Stage theme={theme} className="flex items-center gap-6">
          <Demo groups={CATEGORIES} tone="purple" />
          <span className="font-mono text-[10px] text-text-secondary">
            one package — and the empty <code>lint</code> group draws nothing rather than a
            header over air
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A current row, and rows with their own marks"
        note="A row given selected wears a check and the accent, and the panel becomes a radio group for a reader rather than a plain menu — that is what makes this a select rather than a list of commands. The scripts menu passes neither: nothing is ever the current script. A row may bring its own icon too, for a menu whose rows are the KINDS of something: three orders read as three things, where the sort glyph three times would say they do the same one. This one is 190 wide rather than the default 280: it holds three short phrases and no hint, and it opens from a 230px column."
      >
        <Stage theme={theme} className="flex items-center gap-6">
          <SortDemo />
          <span className="font-mono text-[10px] text-text-secondary">
            the sidebar’s sort order, as the app draws it
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Loading, and empty">
        <Stage theme={theme} className="flex items-center gap-6">
          <Demo groups={[]} tone="purple" loading />
          <Demo groups={[]} tone="purple" />
          <span className="font-mono text-[10px] text-text-secondary">
            in flight, then nothing to show
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Sizes and tones"
        note="The ladder is ButtonIcon's, read from ButtonIcon's own table rather than respelled here — a select and a button standing at different heights in one header row would be the whole argument for a shared scale, lost. The width is the one thing it does not borrow."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {(['xs', 'sm', 'md', 'lg'] as ButtonIconSize[]).map((size) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-8 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {size}
              </span>
              <Demo groups={CATEGORIES} size={size} />
              <Demo groups={CATEGORIES} size={size} tone="purple" />
              <span className="font-mono text-[10px] text-text-secondary">
                neutral, then purple
              </span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SelectIcon } from '@ds/desktop'
import { Activity, ArrowDownUp, Clock, FolderGit2, Play } from '@ds/desktop/icons'

<SelectIcon
  icon={Play}
  title={t('agentInfo.runScripts')}
  tone="purple"
  groups={groups}
  loading={loading}
  loadingLabel={t('common.loading')}
  emptyLabel={t('agentInfo.noScripts')}
  onOpen={fetchScripts}
  onSelect={handleSelect}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>portalTo</code> is why the panels on this page are themed at all. In the
          app the theme is written onto <code>document.documentElement</code>, so a panel at
          the end of the body inherits every colour; here it is a <code>style</code> prop on
          the preview ground, and a panel portalled past it paints{' '}
          <code>rgb(var(--c-bg-tertiary))</code> with nothing to resolve — a menu with no
          background. Each demo above hands it a host inside the ground.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It hands back an <code>id</code> and nothing else, so the caller owns the mapping
          back to its own data. The scripts menu keys on a pair of array indices: a name alone
          will not do — a monorepo has a <code>dev</code> per package — and a key built by
          joining two caller-chosen strings is how a separator ends up inside a value one day.
        </p>
      </EntrySection>
    </article>
  )
}
