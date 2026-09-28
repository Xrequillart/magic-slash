import type { RefObject } from 'react'
import { Agent, type AgentState } from './Agent'
import { ButtonIcon } from './ButtonIcon'
import { CircleUserRound, Power, RefreshCw, RotateCw } from './icons'
import { Label } from './Label'
import { MenuBarQuestion, type MenuBarQuestionProps } from './MenuBarQuestion'
import { MenuSidebarItem } from './MenuSidebarItem'
import { Text } from './Text'

/**
 * THE MENU BAR PANEL: the app's own window in place of the native tray menu. The app, the
 * person signed in and the update control across the top, every agent below, and a way
 * out at the foot.
 *
 * Moved here from the app's `TrayPopover`, which drew all of it by hand: a bare circle
 * glyph where every other surface shows the person's face, and three hand-rolled square
 * buttons for the update control. It is built from the system's parts now: the account is
 * the title bar's own `Label` with the photo, the update control a `ButtonIcon`, the rows
 * the sidebar's `Agent`, the way out a `MenuSidebarItem`.
 *
 * IT OWNS NO DATA. The window is created empty and polls the main process; what arrives
 * comes in here as props, translated.
 */

/** Where the updater is, and what its button does. */
export type MenuBarUpdate =
  | { phase: 'idle' | 'error'; title: string; onCheck: () => void }
  | { phase: 'busy'; title: string }
  | { phase: 'ready'; title: string; onInstall: () => void }

export interface MenuBarAgent {
  id: string
  name: string
  state: AgentState
  ticketId?: string
  /** The row's tooltip: the state, in words. */
  title: string
  onClick: () => void
  /** A question the agent is blocked on, drawn under its row. */
  question?: Omit<MenuBarQuestionProps, 'labels'> & { token: string }
}

export interface MenuBarPanelProps {
  /** Opens the app's window, from the app's name. */
  app: { title: string; onOpen: () => void }
  /**
   * Who is signed in — the title bar's account, same shape. `avatar` absent means nobody
   * is, and the label is then the invitation to sign in.
   */
  account: { label: string; title: string; onClick: () => void; avatar?: { src: string | null; alt: string } }
  update: MenuBarUpdate
  agents: MenuBarAgent[]
  /** Said when there is no agent at all. */
  empty: string
  /** "2 agents are waiting for you", when any are. */
  waiting?: string
  /** A line over the list, for an answer that did not go through. */
  notice?: string
  questionLabels: MenuBarQuestionProps['labels']
  quit: { label: string; onClick: () => void }
  /**
   * The panel's own box, for the window to size itself to it. A ref out, like the title
   * bar's `anchorRef`: the element is drawn in here, where the caller cannot reach it.
   */
  panelRef?: RefObject<HTMLDivElement>
}

function UpdateControl({ update }: { update: MenuBarUpdate }) {
  if (update.phase === 'ready') {
    // Accent and pressed-looking: the one state where the button is worth a click.
    return <ButtonIcon icon={RotateCw} title={update.title} onClick={update.onInstall} active />
  }
  if (update.phase === 'busy') {
    // The download starts on its own: the button only reports, it has nothing to do.
    return <ButtonIcon icon={RefreshCw} title={update.title} onClick={() => {}} busy />
  }
  return (
    <ButtonIcon
      icon={RefreshCw}
      title={update.title}
      onClick={update.onCheck}
      tone={update.phase === 'error' ? 'danger' : 'ghost'}
    />
  )
}

export function MenuBarPanel({
  app,
  account,
  update,
  agents,
  empty,
  waiting,
  notice,
  questionLabels,
  quit,
  panelRef,
}: MenuBarPanelProps) {
  const blocked = agents.some((agent) => agent.question)

  return (
    <div ref={panelRef} className="w-full select-none overflow-hidden rounded-xl border border-line bg-bg/80">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
        <button
          onClick={app.onOpen}
          title={app.title}
          className="truncate text-[13px] font-semibold text-ink transition-colors hover:text-accent"
        >
          Magic Slash
        </button>
        <div className="flex min-w-0 items-center gap-1">
          <Label
            tone="neutral"
            avatar={account.avatar}
            icon={CircleUserRound}
            title={account.title}
            onClick={account.onClick}
            truncate
            className="max-w-36"
          >
            {account.label}
          </Label>
          <UpdateControl update={update} />
        </div>
      </div>

      {waiting && (
        <div className="border-b border-line px-3.5 py-1.5">
          <Text size="2xs" weight="medium" tone="inherit" className="block text-accent">
            {waiting}
          </Text>
        </div>
      )}

      {/* The cap grows only while a question is on screen: a card is far taller than a
          row, and at 380px it would open inside a scroller instead of being read at a
          glance. 560px stays under the window's own maximum once the rest is added. */}
      <div className={`${blocked ? 'max-h-[560px]' : 'max-h-[380px]'} overflow-y-auto`}>
        {agents.length === 0 ? (
          <div className="px-3.5 py-6 text-center">
            <Text size="sm" tone="secondary">
              {empty}
            </Text>
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-2 py-2">
            {notice && (
              <Text size="2xs" tone="secondary" className="block px-2 py-1">
                {notice}
              </Text>
            )}
            {agents.map((agent) => (
              <div key={agent.id} className="flex flex-col gap-1">
                <Agent
                  name={agent.name}
                  state={agent.state}
                  ticketId={agent.ticketId}
                  title={agent.title}
                  onClick={agent.onClick}
                />
                {agent.question && (
                  <MenuBarQuestion key={agent.question.token} {...agent.question} labels={questionLabels} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line px-2 py-2">
        <MenuSidebarItem icon={Power} label={quit.label} onClick={quit.onClick} />
      </div>
    </div>
  )
}
