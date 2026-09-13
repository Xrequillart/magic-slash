'use client'

import { useState } from 'react'
import { MenuSidebar, type MenuSidebarEntry as Entry } from '@ds/desktop'
import { ListTodo, NotebookPen, Sparkles } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

/** The app's own menu, in the app's own order. */
const PAGES: Omit<Entry, 'onClick'>[] = [
  { id: 'plans', icon: NotebookPen, label: 'Plans', shortcut: '⌘T' },
  { id: 'tasks', icon: ListTodo, label: 'Tasks', shortcut: '⌘J' },
  { id: 'skills', icon: Sparkles, label: 'Skills', shortcut: '⌘;' },
]

const ACCOUNT: Omit<Entry, 'onClick'> = {
  id: 'account',
  avatar: { src: null, alt: '' },
  label: 'Camille',
  shortcut: '⌘,',
}

const PROPS: PropRow[] = [
  {
    name: 'items',
    type: 'MenuSidebarEntry[]',
    required: true,
    description:
      'The rows, each one MenuSidebarItem’s props plus a stable id. Items and not children: a list whose contents arrive as nodes cannot promise anything about them, and the promise here is that every row is the same row.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    description:
      'What this navigation is, translated. A page with two landmarks and no names on them has two places called “navigation”, which is worse for a reader moving by landmark than having none — and the app’s sidebar has exactly that: this menu, and the agent list below it.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Where the group sits: the column’s padding, a margin. Not the gap between rows.',
  },
]

/** The real thing, in a column the width of the app's sidebar. */
function Menu() {
  const [opened, setOpened] = useState<string | null>(null)
  return (
    <div className="flex flex-col gap-2">
      <div className="w-[228px] rounded-lg bg-surface-sunken">
        <MenuSidebar
          ariaLabel="Pages"
          className="px-2 py-3"
          items={[...PAGES, ACCOUNT].map((row) => ({
            ...row,
            onClick: () => setOpened(row.label),
          }))}
        />
      </div>
      {opened && <span className="font-mono text-[10px] text-text-secondary">opened {opened}</span>}
    </div>
  )
}

export function MenuSidebarEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="MenuSidebar"
        uses={[{ id: 'menusidebaritem', label: 'MenuSidebarItem' }]}
        onOpen={onOpen}
      >
        The sidebar’s menu: the rows that take you somewhere, as one list. It is a{' '}
        <code>&lt;nav&gt;</code> — which is the whole reason it exists as a component rather
        than as a <code>div</code> around three buttons.
      </EntryHeader>

      <EntrySection
        title="A landmark, not a column of buttons"
        note="Four controls that navigate are a landmark a screen reader can jump to; four buttons in a column are four buttons. The app drew them loose, so the one part of the sidebar that IS navigation was the one part not announced as such. Press a row — each one opens its page."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <Menu />
          <span className="font-mono text-[10px] text-text-secondary">
            the app’s four, at the sidebar’s own width
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Items, not children"
        note="Status takes options, SelectIcon takes groups, and this takes rows, for the same reason all three do: a list whose contents arrive as nodes is a list that cannot promise anything about them — and the promise here is that every row is the same row. It is also what lets the account control, which is one row wearing three faces, hand over a row instead of rendering one."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          <Snippet>{`items={[
  { id: 'plans', icon: NotebookPen, label: t('sidebar.plans'), shortcut: '⌘T', onClick: openPlans },
  { id: 'tasks', icon: ListTodo, label: t('sidebar.tasks'), shortcut: '⌘J', onClick: openTasks },
  { id: 'skills', icon: Sparkles, label: t('sidebar.skills'), shortcut: '⌘;', onClick: openSkills },
  accountEntry,
]}`}</Snippet>
          <span className="font-mono text-[10px] text-text-secondary">
            the id is stable across renders — a route name, not an index
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The order is the caller’s"
        note="And it carries meaning: in the app it is the order the work happens in — you plan something, then you pick it up, and Skills is the reference material for doing so. Putting the reference list above either view of live work would be filing the manual in front of the job. This component has no way to know that, so it does not try. The keyboard shortcuts deliberately do not follow it either: ⌘T opens the first row and ⌘J the second, so moving a row changes nothing but the reading order."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <div className="w-[228px] rounded-lg bg-surface-sunken">
            <MenuSidebar
              ariaLabel="Reversed"
              className="px-2 py-3"
              items={[...PAGES].reverse().map((row) => ({ ...row, onClick: () => undefined }))}
            />
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            the same three, reversed — nothing stops you, and nothing should
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { MenuSidebar } from '@ds/desktop'

<MenuSidebar
  ariaLabel={t('sidebar.menu.aria')}
  className="px-2 pt-3"
  items={items}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The rhythm between rows belongs here; the padding <em>around</em> the group belongs
          to whatever column it is dropped into, and arrives through <code>className</code>.
        </p>
      </EntrySection>
    </article>
  )
}
