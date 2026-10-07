import type { ReactNode, RefObject } from 'react'
import { AppTitleBar, Sidebar, type SidebarAgentRow } from '@ds/desktop'
import { FolderGit2, ListTodo, NotebookPen, Plus, Sparkles } from '@ds/desktop/icons'
import { MIDNIGHT_VARS } from './theme'

export const WINDOW = { width: 1280, height: 800 }

const noop = () => undefined

export type MenuPage = 'plans' | 'tasks' | 'repositories' | null

/**
 * THE DESKTOP WINDOW — title bar, agents column, the main pane and the info panel — on
 * the midnight theme, drawn with the app's own components. Everything that moves in it
 * is a prop, so the film's clock drives it frame by frame.
 */
export function AppWindow({
  agents,
  title,
  page = null,
  main,
  panel,
  overlay,
  layer,
  rootRef,
}: {
  agents: SidebarAgentRow[]
  title: string
  page?: MenuPage
  main: ReactNode
  panel?: ReactNode
  overlay?: ReactNode
  /** Drawn over the whole window, title bar included: the spotlight. */
  layer?: ReactNode
  /** The window's root, which the film measures notes against. */
  rootRef?: RefObject<HTMLDivElement>
}) {
  return (
    <div
      ref={rootRef}
      className="app-root relative flex flex-col overflow-hidden rounded-xl text-ink"
      style={{
        ...MIDNIGHT_VARS,
        width: WINDOW.width,
        height: WINDOW.height,
        backgroundColor: 'rgb(var(--c-bg))',
        colorScheme: 'dark',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)',
      }}
    >
      <div className="relative shrink-0">
        <span className="absolute left-4 top-3 z-10 flex gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: '#FF5F57' }} />
          <span className="h-3 w-3 rounded-full" style={{ background: '#FEBC2E' }} />
          <span className="h-3 w-3 rounded-full" style={{ background: '#28C840' }} />
        </span>
        <AppTitleBar
          left={{ open: true, title: 'Agents', onToggle: noop }}
          titles={[{ id: 'active', label: title }]}
          right={panel ? { open: true, title: 'Info', onToggle: noop } : undefined}
          settings={{ open: false, title: 'Quick settings', onToggle: noop }}
          account={{ label: 'Xavier', title: 'Account', avatar: { src: null, alt: '' }, onClick: noop }}
        />
      </div>
      <div className="relative flex min-h-0 flex-1">
        <div className="flex shrink-0">
          <Sidebar
            menu={[
              { id: 'plans', icon: NotebookPen, label: 'Plans', shortcut: '⌘T', onClick: noop, active: page === 'plans' },
              { id: 'tasks', icon: ListTodo, label: 'Tasks', shortcut: '⌘J', onClick: noop, active: page === 'tasks' },
              { id: 'skills', icon: Sparkles, label: 'Skills', shortcut: '⌘;', onClick: noop },
              { id: 'repositories', icon: FolderGit2, label: 'Repositories', shortcut: '⌘P', onClick: noop, active: page === 'repositories' },
            ]}
            lists={[
              {
                id: 'agents',
                label: 'Agents',
                actions: [{ id: 'new', icon: Plus, title: 'New agent', onClick: noop }],
                agents,
                emptyHint: 'No agent yet',
              },
            ]}
            usage={{
              className: 'mx-2 mb-2',
              account: 'Xavier',
              limits: [
                { id: 'session', label: 'Current session', shortLabel: 'Session', percent: 38, reset: 'Resets in 3h' },
                { id: 'weekly', label: 'This week', shortLabel: 'Week', percent: 22, reset: 'Resets Monday' },
              ],
              thresholds: { warning: 65, danger: 85 },
              onToggle: noop,
              expandLabel: 'Expand',
              collapseLabel: 'Collapse',
              emptyLabel: 'No usage yet',
              emptyHint: '',
            }}
          />
        </div>
        <main className="relative min-w-0 flex-1 overflow-hidden">{main}</main>
        {panel}
        {overlay}
      </div>
      {layer}
    </div>
  )
}
