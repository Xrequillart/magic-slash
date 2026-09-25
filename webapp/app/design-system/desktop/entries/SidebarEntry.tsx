'use client'

import { useState } from 'react'
import {
  Sidebar,
  UsageClaudeCodeCard,
  type MenuSidebarEntry,
  type SidebarAgentRow,
  type SidebarList,
} from '@ds/desktop'
import { Activity, ArrowDownUp, Clock, FolderGit2, ListTodo, NotebookPen, Plus, Sparkles } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** Nothing happens when this is pressed, and that is the point: every handler here is
 *  a drawing of a handler. The component cannot tell the difference. */
const noop = () => undefined

/** The app's own menu, in the app's own order, with the account last. */
const MENU: MenuSidebarEntry[] = [
  { id: 'plans', icon: NotebookPen, label: 'Plans', shortcut: '⌘T', onClick: noop },
  { id: 'tasks', icon: ListTodo, label: 'Tasks', shortcut: '⌘J', onClick: noop },
  { id: 'skills', icon: Sparkles, label: 'Skills', shortcut: '⌘;', onClick: noop },
  { id: 'account', avatar: { src: null, alt: '' }, label: 'Camille', shortcut: '⌘,', onClick: noop },
]

/** The two controls on the AGENTS header: the one that CHANGES the list, then the one
 *  that adds to it. The first is a `SelectIcon` — a chevron, and the order in force
 *  checked inside the menu it opens — and the second a plain mark. */
const ACTIONS: SidebarList['actions'] = [
  {
    id: 'sort',
    icon: ArrowDownUp,
    title: 'Sort agents',
    // Narrower than the default 280: three short phrases, no hint, and a 230px column
    // to hang under.
    panelWidth: 190,
    groups: [{
      label: 'Sort by',
      items: [
        { id: 'recent', label: 'Newest first', icon: Clock, selected: true },
        { id: 'status', label: 'By status', icon: Activity },
        { id: 'repository', label: 'By repository', icon: FolderGit2 },
      ],
    }],
    onSelect: noop,
  },
  { id: 'new', icon: Plus, title: 'New agent  ⌘N', onClick: noop },
]

/** Four agents on an invented project — two at work, one asking a question, one done. */
const AGENTS: SidebarAgentRow[] = [
  { id: 'a', name: 'PAY-318 · invoice VAT', state: 'working' },
  { id: 'b', name: '#409 · rate limits', state: 'working' },
  { id: 'c', name: 'PAY-311 · card change', state: 'waiting' },
  { id: 'd', name: '#404 · empty basket', state: 'completed' },
]

/** The same four, filed under the repository each belongs to — the heading sits on the
 *  row that OPENS the group. */
const GROUPED: SidebarAgentRow[] = [
  { ...AGENTS[0], heading: { label: 'checkout', color: '#6E9EE8' } },
  AGENTS[1],
  { ...AGENTS[2], heading: { label: 'billing', color: '#C2A35E' } },
  { ...AGENTS[3], heading: { label: 'No repository' } },
]

/** The foot: the account's two rate limits, which is what hangs there in the app. */
const USAGE = {
  account: 'camille@acme.dev',
  limits: [
    { id: 'session', label: 'Session', shortLabel: '5h', percent: 38, reset: '2h14' },
    { id: 'weekly', label: 'Weekly', shortLabel: '7d', percent: 71, reset: '3d' },
  ],
  thresholds: { warning: 65, danger: 85 },
  expandLabel: 'Show usage',
  collapseLabel: 'Hide usage',
  emptyLabel: 'No usage yet',
  emptyHint: 'Start an agent and its limits appear here.',
}

/**
 * The column, boxed.
 *
 * `h-full` is the component's own, because in the app it fills the window — so the
 * workbench has to give it a height to fill, and 520px is about what a laptop shows.
 */
function Column({ children }: { children: React.ReactNode }) {
  return <div className="h-[520px] overflow-hidden rounded-lg">{children}</div>
}

const PROPS: PropRow[] = [
  {
    name: 'menu',
    type: 'MenuSidebarEntry[]',
    required: true,
    description:
      'The rows that take you somewhere, the account among them. MenuSidebar’s own shape, passed straight through: the menu is already a component.',
  },
  {
    name: 'lists',
    type: 'SidebarList[]',
    required: true,
    description:
      'One list, or one per pane when the window is split. Each carries its own header, its controls, its attention count, its agents and its drop target — the column draws them in order with a divider between.',
  },
  {
    name: 'menuAriaLabel · listsAriaLabel',
    type: 'string',
    description:
      'What each landmark is, translated. The app had two navs here and named neither, which is worse for a reader moving by landmark than having one: two places both called “navigation”.',
  },
  {
    name: 'emptyLabel',
    type: 'string',
    description:
      'There is no agent at all, anywhere — centred in the space the lists would fill. Distinct from a list’s emptyHint, which is one empty zone beside a full one.',
  },
  {
    name: 'version',
    type: 'string',
    description:
      'The build, spelled by the caller — “v0.94.2”. Drawn verbatim, because which prefix a version wears is not this column’s question.',
  },
  {
    name: 'collapsed',
    type: 'boolean',
    fallback: 'false',
    description:
      'Folded away: it slides out by its own width rather than unmounting, so the agents are where they were when it comes back.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins. Not the width, the ground, or the order of the regions.',
  },
]

export function SidebarEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  const [selected, setSelected] = useState('a')
  // The fold the usage card keeps: config in the app, local state in a drawing.
  const [usageCollapsed, setUsageCollapsed] = useState(false)

  const list = (over: Partial<SidebarList> = {}): SidebarList => ({
    id: 'agents',
    label: 'Agents',
    actions: ACTIONS,
    attention: { label: 'Needs attention', count: 1 },
    agents: AGENTS.map((agent) => ({ ...agent, active: agent.id === selected })),
    onSelectAgent: (id) => setSelected(id),
    ...over,
  })

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="Sidebar"
        uses={usesOf('sidebar')}
        onOpen={onOpen}
      >
        The app’s left column, whole — and it knows nothing. Every other component in
        this folder is a piece of the sidebar; this one <em>is</em> the sidebar.
      </EntryHeader>

      <EntrySection
        title="No store, no translator, no clock"
        note="Hand it arrays and it draws them. Every string arrives translated and every number arrives computed — “AGENTS”, the attention count, the empty line, the version. The one rule it keeps for itself is about drawing rather than meaning: the attention banner hides itself at zero, so a calm list stays calm. Press a row."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <Column>
            <Sidebar
              menu={MENU}
              menuAriaLabel="Pages"
              listsAriaLabel="Agents"
              lists={[list()]}
              usage={{ ...USAGE, collapsed: usageCollapsed, onToggle: () => setUsageCollapsed(c => !c) }}
              version="v0.94.2"
            />
          </Column>
          <span className="font-mono text-[10px] text-text-secondary">
            the real column, at its own 230px
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="This is why it is a component"
        note="The public site carried a 394-line redrawing of this column — band for band, every padding copied out of the app with a comment saying where it came from — and it had already fallen behind: it still showed a Team row the app had replaced with Plans. A drawing that IS the component cannot fall behind it."
      >
        <Stage theme={theme}>
          <Snippet>{`// on the marketing site, inside an AppGround that paints the app's theme
<Sidebar menu={PAGES} lists={[{ label: 'Agents', agents: AGENTS }]} version="v0.94.2" />`}</Snippet>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Lists, plural — and that is the split"
        note="One list normally; two when the window is split, each with its own header, its own drop target and its own agents, a divider between them. The column does not know which pane is focused or what a drop means: it takes a list per pane and calls back. The pane chip holds its width open even when it has nothing to say, so the + stays flush against the right edge instead of shunting sideways every time the window is split."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <Column>
            <Sidebar
              menu={MENU}
              lists={[
                list({ id: 'left', pane: { label: 'Left' }, agents: AGENTS.slice(0, 2), drop: { over: true } }),
                list({
                  id: 'right',
                  pane: { label: 'Right' },
                  actions: undefined,
                  attention: undefined,
                  agents: [],
                  emptyHint: 'Drop agents here',
                }),
              ]}
              version="v0.94.2"
            />
          </Column>
          <span className="font-mono text-[10px] text-text-secondary">
            the left zone lit, as it is under a dragged agent
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A heading belongs to the row that opens it"
        note="Not a list of groups holding rows: the app walks this same flat order with ⌘↑/⌘↓, and a nested shape would have to be flattened back out to do it. Where a group starts is the caller’s question anyway — in a split each pane is filtered separately, so one global pass would leave the second pane opening mid-group with no heading at all. The last group has no repository, so it has no colour: the glyph inherits the heading’s muted ink."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <Column>
            <Sidebar menu={MENU} lists={[list({ agents: GROUPED })]} version="v0.94.2" />
          </Column>
          <Snippet>{`{ id, name, state, heading: { label: 'checkout', color } }`}</Snippet>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Sidebar } from '@ds/desktop'

<Sidebar
  collapsed={!leftSidebarVisible}
  menu={[plans, tasks, skills, accountEntry]}
  lists={[{ id: 'agents', label: t('sidebar.agents'), actions, agents: rows }]}
  usage={usageCardEnabled ? usageCard : undefined}
  version="v0.94.2"
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The app’s own <code>Sidebar.tsx</code> is now the other half and nothing else:
          the store, the translator, the keyboard shortcuts, and what a drop means. Not
          one class string in it.
        </p>
      </EntrySection>
    </article>
  )
}
