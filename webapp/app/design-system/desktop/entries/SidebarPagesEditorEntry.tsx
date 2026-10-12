'use client'

import { useState } from 'react'
import { SidebarPagesEditor, type SidebarPagesEditorItem } from '@ds/desktop'
import { FolderGit2, ListTodo, NotebookPen, Sparkles } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'items', type: 'SidebarPagesEditorItem[]', required: true, description: 'Every page in the menu’s order, hidden ones included: `id`, `label`, `icon`, `visible`.' },
  { name: 'onReorder', type: '(ids: string[]) => void', required: true, description: 'The whole new order of ids, after a drag or an arrow key on a grip.' },
  { name: 'onVisibilityChange', type: '(id: string, visible: boolean) => void', required: true, description: 'One page shown or hidden. A hidden page keeps its place in the list, dimmed.' },
  { name: 'showLabel / hideLabel', type: 'string', required: true, description: 'The two options of each row’s select, translated.' },
  { name: 'moveLabel', type: '(label: string) => string', required: true, description: 'The grip’s accessible name, per row.' },
  { name: 'visibilityLabel', type: '(label: string) => string', required: true, description: 'The select’s accessible name, per row.' },
  { name: 'className', type: 'string', description: 'Placement only.' },
]

const START: SidebarPagesEditorItem[] = [
  { id: 'plans', label: 'Plans', icon: NotebookPen, visible: true },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, visible: true },
  { id: 'skills', label: 'Skills', icon: Sparkles, visible: false },
  { id: 'repositories', label: 'Repositories', icon: FolderGit2, visible: true },
]

export function SidebarPagesEditorEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [items, setItems] = useState(START)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SidebarPagesEditor" uses={usesOf('sidebarpageseditor')} onOpen={onOpen}>
        The sidebar’s pages, in the order the menu draws them, and which of them it leaves out.
      </EntryHeader>
      <EntrySection
        title="Drag a row, or nudge it from its grip"
        note="Opened from the Application page’s Sidebar card. Every change is written as it is made: the column behind the dialog is its own preview. Skills is hidden here, and keeps its place."
      >
        <Stage theme={theme} className="max-w-md">
          <SidebarPagesEditor
            items={items}
            onReorder={(ids) => setItems(ids.map((id) => items.find((item) => item.id === id)!))}
            onVisibilityChange={(id, visible) => setItems(items.map((item) => (item.id === id ? { ...item, visible } : item)))}
            showLabel="Always show"
            hideLabel="Don’t show"
            moveLabel={(label) => `Move ${label}`}
            visibilityLabel={(label) => `${label} visibility`}
          />
        </Stage>
      </EntrySection>
      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
      </EntrySection>
    </article>
  )
}
