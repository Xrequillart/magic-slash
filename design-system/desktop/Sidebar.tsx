import { Fragment } from 'react'
import type { DragEvent, MouseEvent, ReactNode } from 'react'
import { Agent, type AgentProps } from './Agent'
import { ButtonIcon } from './ButtonIcon'
import { AlertTriangle, FolderGit2 } from './icons'
import { MenuSidebar, type MenuSidebarEntry } from './MenuSidebar'
import { UsageClaudeCodeCard, type UsageClaudeCodeCardProps } from './UsageClaudeCodeCard'
import { SelectIcon, type SelectIconProps } from './SelectIcon'
import type { IconComponent } from './types'

/**
 * THE LEFT COLUMN, WHOLE — and it knows nothing.
 *
 * Every other component in this folder is a piece of the sidebar; this is the sidebar.
 * It draws the menu, the agent list with its header and its groups, the usage card and
 * the build number, in that order, on the app's own ground at the app's own width. What
 * it does NOT have is a single fact of its own: no store, no
 * translator, no clock, no idea what an agent IS beyond a name and a state. Hand it
 * arrays and it draws them; hand it nothing and it draws an empty column.
 *
 * THAT IS THE WHOLE POINT, and the marketing site is why. `AgentsSidebarMockup` on the
 * public site was a 394-line REDRAWING of this column — band for band, every padding
 * copied out of `Sidebar.tsx` with a comment saying so — and it had already fallen
 * behind: it still shows a `Team` row with ⌘T, a page the app replaced with `Plans`.
 * A drawing that IS the component cannot fall behind it. `AppGround` on the site
 * paints the desktop theme's variables under it, so `bg-surface-sunken` here resolves
 * to the same colour it does in Electron.
 *
 * SO EVERY STRING ARRIVES TRANSLATED and every number arrives computed. "AGENTS", the
 * attention count, the pane chip, the empty line, the version: all of them are the
 * caller's. The one rule this component keeps for itself is the one that is about
 * DRAWING rather than about meaning — the attention banner hides itself at zero, so a
 * calm list stays calm.
 *
 * LISTS, PLURAL, and that is the split. One list normally; two when the window is
 * split, each with its own header, its own drop target and its own agents, a divider
 * between them. The component does not know which pane is focused or what a drop
 * means — it takes a list per pane and calls back.
 *
 * THE USAGE CARD IS DRAWN HERE. `UsageClaudeCodeCard` is imported and rendered by this
 * column; what arrives is its data. It used to come through the foot slot with everything
 * else, and that was the mistake this folder keeps making: which component hangs under the
 * list is a style decision, and a slot posts it out to the call site where no drawing of
 * this column can reach it.
 *
 * AND THERE IS NO SLOT LEFT. The foot used to be a `ReactNode` for the update flow, on the
 * grounds that a folder which cannot import the app cannot own something that talks to
 * Electron. Half of that was true and the half that mattered was not: the DRAWING was
 * never the IPC's. The update is a dialog now — `UpdateDialog`, in this folder, over the
 * whole window rather than under this column — and nothing hangs beneath the usage card,
 * so every prop this component takes is data.
 */

/** The app's own width, and deliberately not resizable: see the note in the desktop's
 *  `Sidebar.tsx`. A number and not a class, because the collapse is the negative of it. */
export const SIDEBAR_WIDTH = 230

/** One mark in a list's header that ACTS when pressed — the control that adds to the
 *  list. The shape `ButtonIcon` needs, and nothing more; a control that opens a menu
 *  instead is a `SidebarSelectAction`. */
export interface SidebarAction {
  id: string
  icon: IconComponent
  /** The tooltip and the accessible name. Translated. An icon-only control with no
   *  name is a control only its author can use, and `ButtonIcon` will not let you
   *  skip it. */
  title: string
  /**
   * REQUIRED, the way `MenuSidebarItem`'s is, and for the same reason: a control that
   * can be drawn with nothing behind it is a control that will one day ship with
   * nothing behind it. An illustration passes a handler that does nothing — one token,
   * and it says on the page that the button is a drawing.
   */
  onClick: () => void
  /** Tinted, and `aria-pressed`: the list is not in the order it was learned in. */
  active?: boolean
}

/**
 * A header control that opens a MENU rather than doing something — the sort order.
 *
 * `SelectIcon`'s own props, passed straight through, the way the menu entries are
 * `MenuSidebar`'s: the chevron, the panel, the portal and the flip are already a
 * component, and a column that respelled any of them would be a second menu language
 * living in a header.
 *
 * IT REPLACED A BUTTON AND A REF. The sort control used to be a plain `SidebarAction`
 * whose panel the app drew itself, anchored to a `ref` this interface handed back —
 * the one ref that ever travelled in a data object here. A chevron says the control
 * opens a list before it is pressed, which is what the bare mark never did, and the
 * panel comes with it.
 */
export interface SidebarSelectAction extends Omit<SelectIconProps, 'size' | 'className'> {
  id: string
}

/** One row of a list: an agent, plus the repository heading it may open. */
export interface SidebarAgentRow
  extends Pick<AgentProps, 'name' | 'state' | 'ticketId' | 'active' | 'title'> {
  /** Stable across renders — the agent's id, not an index. */
  id: string
  /**
   * A repository heading drawn ABOVE this row.
   *
   * ON THE ROW THAT OPENS THE GROUP rather than as a list of groups holding rows, and
   * the flat array is the reason: the app walks this same order with ⌘↑/⌘↓, and a
   * nested shape would have to be flattened back out to do it. Where a group starts is
   * the caller's question anyway — in a split each pane is filtered separately, so one
   * global pass would leave the second pane opening mid-group with no heading at all.
   */
  heading?: { label: string; color?: string }
}

export interface SidebarList {
  /** Stable across renders — 'agents', 'left', 'right'. */
  id: string
  /** The word over the list. "AGENTS". Translated; drawn upper-case. */
  label: string
  /**
   * The pane this list fills, as a chip: "Left", "Right".
   *
   * `visible` rather than simply omitting it, because the chip RESERVES ITS WIDTH when
   * it has nothing to say. The controls after it sit flush against the right edge, and
   * a chip that appeared and disappeared would shunt them sideways every time the
   * window was split.
   */
  pane?: { label: string; visible?: boolean }
  /** The controls on this list's header, in reading order. The one that CHANGES the
   *  list belongs before the one that ADDS to it. Either kind: a mark that acts, or a
   *  mark with a chevron that opens a menu. */
  actions?: (SidebarAction | SidebarSelectAction)[]
  /**
   * How many agents on this list are stuck on the person — waiting on an answer, or
   * dead on an error.
   *
   * A COUNT AND NOT A GROUP: the agents it counts stay exactly where they are in the
   * list below. At zero it draws nothing, which is the one judgement this component
   * makes on its own — a banner reading 0 is a calm list being shouted at.
   */
  attention?: { label: string; count: number }
  agents: SidebarAgentRow[]
  /** This list is empty while another is not — "drop agents here". The quiet hint
   *  inside a drop target, not the whole column's empty state. */
  emptyHint?: string
  onSelectAgent?: (id: string, event: MouseEvent<HTMLButtonElement>) => void
  draggable?: boolean
  onAgentDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void
  /** Makes the list a drop target. `over` is the caller's — it knows which zone the
   *  pointer is in; this only paints it. */
  drop?: {
    over?: boolean
    onDragOver?: (event: DragEvent<HTMLDivElement>) => void
    onDragLeave?: (event: DragEvent<HTMLDivElement>) => void
    onDrop?: (event: DragEvent<HTMLDivElement>) => void
  }
}

export interface SidebarProps {
  /** The rows that take you somewhere, the account among them. `MenuSidebar`'s own
   *  shape, passed straight through: the menu is already a component. */
  menu: MenuSidebarEntry[]
  /** What that menu IS, translated — "Pages", "Main". */
  menuAriaLabel?: string
  /**
   * What this column's second landmark IS, translated — "Agents".
   *
   * The app had two `<nav>`s here and named neither, which is worse for a reader
   * moving by landmark than having one: two places both called "navigation".
   */
  listsAriaLabel?: string
  /** One list, or one per pane when the window is split. */
  lists: SidebarList[]
  /** There is no agent at all, anywhere — centred in the space the lists would fill.
   *  Distinct from a list's `emptyHint`, which is one empty zone beside a full one. */
  emptyLabel?: string
  /** The account's rate limits, under the scroll. Absent when the reader switched it off. */
  usage?: UsageClaudeCodeCardProps
  /** The build, spelled by the caller — "v0.94.2". Drawn verbatim, because which
   *  prefix a version wears is not this column's question. */
  version?: string
  /** Folded away: it slides out by its own width rather than unmounting, so the
   *  agents are where they were when it comes back. */
  collapsed?: boolean
  /** Margins. Not the width, the ground, or the order of the regions. */
  className?: string
}

export function Sidebar({
  menu,
  menuAriaLabel,
  listsAriaLabel,
  lists,
  emptyLabel,
  usage,
  version,
  collapsed = false,
  className = '',
}: SidebarProps) {
  const empty = lists.every((list) => list.agents.length === 0)

  return (
    <div
      className={`bg-surface-sunken flex flex-col h-full relative z-10
        transition-all duration-300 ease-in-out ${className}`}
      style={{ width: SIDEBAR_WIDTH, marginLeft: collapsed ? -SIDEBAR_WIDTH : 0 }}
    >
      {/* THE MENU IS FIRST and the order inside it is the caller's: in the app it is
          the order the work happens in — you plan something, then you pick it up, and
          the reference material is for doing so. This column would have no way to know
          that, so it does not try. */}
      <MenuSidebar ariaLabel={menuAriaLabel} className="px-2 pt-3" items={menu} />

      <nav
        aria-label={listsAriaLabel}
        className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col"
      >
        {lists.map((list, index) => (
          <div key={list.id} className="flex flex-col">
            {/* The divider between panes, drawn by the second list rather than
                between the two: a separator is a fact about what follows it, and a
                sibling in the loop would need a key of its own to say nothing. */}
            {index > 0 && <div className="border-t border-line-subtle mx-2 my-2" />}
            <ListHeader list={list} />
            <DropZone drop={list.drop}>
              <Attention attention={list.attention} />
              <AgentRows list={list} />
              {list.agents.length === 0 && list.emptyHint && (
                <div className="text-text-secondary/30 text-xs text-center py-3">
                  {list.emptyHint}
                </div>
              )}
            </DropZone>
          </div>
        ))}

        {empty && emptyLabel && (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-xs p-4 text-center">
            {emptyLabel}
          </div>
        )}
      </nav>

      {usage && <UsageClaudeCodeCard {...usage} />}

      {version && (
        // `pt-1`: the usage card above carries its own bottom margin, and the pair
        // used to add up to a blank row between the card and the number.
        <div className="px-4 pt-1 pb-2 text-xs text-text-secondary flex items-center justify-start gap-2">
          <span className="opacity-60">{version}</span>
        </div>
      )}
    </div>
  )
}

/**
 * The word over a list, and the controls that act on it.
 *
 * PADDING ON THE LEFT ONLY, and it is load-bearing: `pl-2` puts the label on the same
 * 16px line as the menu rows above and the agent rows below, which all sit at `px-2`
 * inside a `px-2` column, while no `pr` keeps the last control flush against the right
 * edge. The chip comes BEFORE the controls for the same reason — it holds its width
 * even when empty, so a control ordered before it would leave a permanent invisible
 * gutter to its right.
 *
 * ONE GEOMETRY FOR EVERY LIST. The app spelled this row twice — once for the column
 * and once for the second pane, at `px-2 pt-2 pb-1 justify-between` instead of `pl-2
 * pt-3 pb-2` with an `mr-auto` — so the two headers of one sidebar sat on different
 * lines. They are the same row now.
 */
function ListHeader({ list }: { list: SidebarList }) {
  return (
    <div className="pl-2 pt-3 pb-2 flex items-center gap-1">
      <div className="text-xs text-text-secondary/50 uppercase tracking-wider mr-auto">
        {list.label}
      </div>

      {list.pane && (
        <span
          className={`text-[10px] bg-surface px-1.5 py-0.5 rounded transition-opacity duration-150 ${
            list.pane.visible === false
              ? 'opacity-0'
              : 'text-text-secondary/40 opacity-100'
          }`}
          // Out of the tree for a reader when it is only holding its width open: an
          // empty pane name read aloud is noise the eye never sees.
          aria-hidden={list.pane.visible === false}
        >
          {list.pane.label}
        </span>
      )}

      {/* WHICH KIND IS READ OFF `groups`, not off a `kind` field: a control that opens
          a menu is exactly a control that was given one, and a discriminant beside it
          would be a second place to say the same thing — and one day the wrong one. */}
      {list.actions?.map((action) =>
        'groups' in action ? (
          <SelectIcon key={action.id} {...action} />
        ) : (
          <ButtonIcon
            key={action.id}
            icon={action.icon}
            title={action.title}
            onClick={action.onClick}
            active={action.active}
          />
        ),
      )}
    </div>
  )
}

/** The count of agents stuck on the person. Nothing at zero — see `SidebarList`. */
function Attention({ attention }: { attention?: SidebarList['attention'] }) {
  if (!attention || attention.count === 0) return null

  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-orange">
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{attention.label}</span>
      <span className="ml-auto">{attention.count}</span>
    </div>
  )
}

/**
 * A list's rows, and the headings some of them open.
 *
 * `<Fragment>` and not a wrapper per row: a heading and the row under it are two
 * siblings in one column, and a box around the pair would give the group a ground the
 * design never asked for.
 */
function AgentRows({ list }: { list: SidebarList }) {
  if (list.agents.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      {list.agents.map((agent) => (
        <Fragment key={agent.id}>
          {agent.heading && <GroupHeading heading={agent.heading} />}
          <Agent
            name={agent.name}
            state={agent.state}
            ticketId={agent.ticketId}
            active={agent.active}
            title={agent.title}
            draggable={list.draggable}
            onClick={(event) => list.onSelectAgent?.(agent.id, event)}
            onDragStart={(event) => list.onAgentDragStart?.(agent.id, event)}
          />
        </Fragment>
      ))}
    </div>
  )
}

/**
 * The repository a run of rows belongs to.
 *
 * THE ICON IS BARE AND TINTED rather than sitting in its own plate: the column is
 * 230px, so a filled tile would outweigh both the rows under it and the header above,
 * and eat width the name needs. The colour still comes across — it is the same hue the
 * repository wears everywhere else in the app.
 *
 * A `<div>`, NEVER A BUTTON, and with no `tabIndex`: these are decoration. They stay
 * out of the keyboard order, so ⌘↑/⌘↓ visit exactly the agents they visited before.
 *
 * NO COLOUR IS A COLOUR. The group holding the agents attached to no repository has
 * none to be tinted with, so the glyph inherits the heading's muted ink. That is the
 * intent rather than an oversight.
 */
function GroupHeading({ heading }: { heading: NonNullable<SidebarAgentRow['heading']> }) {
  return (
    <div className="flex items-center gap-2 px-2 pt-2 pb-1 text-xs text-text-secondary/50 tracking-wider">
      <FolderGit2 className="w-3 h-3 flex-shrink-0" style={{ color: heading.color }} />
      <span className="truncate">{heading.label}</span>
    </div>
  )
}

/**
 * A list as somewhere to drop an agent.
 *
 * TRANSPARENT UNTIL SOMETHING IS OVER IT, and it is always the same box — a zone that
 * only existed while dragging would be a target that appears under the pointer after
 * the pointer has already chosen where to go.
 *
 * Without `drop` it renders the plain column and no handlers: one list has nowhere to
 * move an agent TO, so it is not a target.
 */
function DropZone({ drop, children }: { drop?: SidebarList['drop']; children: ReactNode }) {
  if (!drop) return <div className="flex flex-col gap-1">{children}</div>

  return (
    <div
      className={`flex flex-col gap-1 rounded-lg transition-colors ${
        drop.over ? 'bg-accent/10' : ''
      }`}
      onDragOver={drop.onDragOver}
      onDragLeave={drop.onDragLeave}
      onDrop={drop.onDrop}
    >
      {children}
    </div>
  )
}
