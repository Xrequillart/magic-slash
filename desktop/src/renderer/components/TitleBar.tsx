import { useState, useEffect } from 'react'
import { AppTitleBar, type TitleBarTitle } from '@ds/desktop'
import { useStore } from '../store'
import { canCloseAgent } from './agent-info-sidebar/utils'
import { useIsFullScreen } from '../hooks/useIsFullScreen'
import { useT } from '../i18n'

/**
 * THE BAR IS `AppTitleBar` NOW — `@ds/desktop/AppTitleBar.tsx` — and what is left here is
 * the wiring: the store, the translator, the fullscreen probe and ⌘W.
 *
 * The drawing that used to live here went whole, four inline SVGs included. Those SVGs
 * are gone rather than moved: a panel with three rules down one edge was a custom vector
 * standing in for a state, and the component says the same thing with lucide's own
 * `PanelLeftOpen`/`PanelLeftClose` pair — the chevron points at the edge the panel would
 * fold into, so the mark announces what the CLICK does instead of what the panel is.
 * `ButtonIcon`'s `active` carries the state that the old icon was also trying to carry.
 *
 * The marketing site's `AppWindowMockup` had copied those SVGs path for path. It renders
 * the component now, so the drawing and the app cannot disagree again.
 *
 * THE CODER/PLANNER SWITCH IS GONE from the bar — the product's call, it earned nothing
 * there. `canChangeAgentType` in `agent-info-sidebar/utils.ts` was its gate and no
 * surface calls it any more; it and its tests are left standing rather than deleted on
 * a drawing's behalf.
 */

export function TitleBar() {
  const t = useT()
  const { terminals, activeTerminalId, rightSidebar, leftSidebarVisible, toggleRightSidebar, toggleLeftSidebar, openCloseAgentModal, isSplitMode, splitTerminalId, focusedPane, isWideScreen, splitEnabled, splitActive, toggleSplitActive } = useStore()
  const isFullScreen = useIsFullScreen()
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId)
  const splitTerminal = terminals.find((t) => t.id === splitTerminalId)

  // The agent the close button acts on is the one being INSPECTED, which in split
  // mode is whichever pane has focus — the same rule the info sidebar uses, so the
  // button and the panel never disagree about which agent is on screen.
  const inspectedTerminal = isSplitMode && focusedPane === 'secondary' ? splitTerminal : activeTerminal
  const closeableTerminal = inspectedTerminal && canCloseAgent(inspectedTerminal.metadata?.status, inspectedTerminal.metadata?.type)
    ? inspectedTerminal
    : null

  // ⌘W lives here rather than in the sidebar now that the button does: it used to be
  // gated on the info sidebar being open, which meant the shortcut silently did
  // nothing with the sidebar collapsed even though the agent was perfectly closeable.
  useEffect(() => {
    if (!closeableTerminal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'w' || !(e.metaKey || e.ctrlKey)) return
      // Ctrl+W inside a terminal is readline's delete-previous-word, and the terminal
      // is where this app spends most of its focus. A window-level handler that
      // preventDefaults it would take that keystroke away from the shell and put an
      // archive dialog in its place — so a CTRL chord aimed at xterm is left to xterm.
      // ⌘W is not: nothing in the shell listens for it, and gating it on focus killed
      // the shortcut everywhere it was actually used.
      // (`.xterm` is the class the library puts on the element it is opened into.)
      if (!e.metaKey && e.target instanceof Element && e.target.closest('.xterm')) return
      e.preventDefault()
      openCloseAgentModal({
        terminalId: closeableTerminal.id,
        terminalName: closeableTerminal.name,
      })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeableTerminal, openCloseAgentModal])

  const splitToggleVisible = isWideScreen && splitEnabled && terminals.length >= 2
  const [showSplitToggle, setShowSplitToggle] = useState(splitToggleVisible)
  const [splitToggleExiting, setSplitToggleExiting] = useState(false)

  useEffect(() => {
    if (splitToggleVisible) {
      setShowSplitToggle(true)
      setSplitToggleExiting(false)
    } else if (showSplitToggle) {
      setSplitToggleExiting(true)
    }
  }, [splitToggleVisible])

  // One title normally, two when the window is split: the component draws a rule between
  // the pair and dims whichever is not being typed into.
  const titles: TitleBarTitle[] = []
  if (activeTerminal) {
    titles.push({
      id: activeTerminal.id,
      label: activeTerminal.metadata?.title || activeTerminal.name,
      focused: focusedPane === 'primary',
    })
  }
  if (isSplitMode && splitTerminal) {
    titles.push({
      id: splitTerminal.id,
      label: splitTerminal.metadata?.title || splitTerminal.name,
      focused: focusedPane === 'secondary',
    })
  }

  return (
    <AppTitleBar
      // In native fullscreen the traffic lights are gone, and their gutter with them.
      trafficLightGutter={!isFullScreen}
      left={{
        open: leftSidebarVisible,
        title: t('titlebar.toggleAgentsList'),
        onToggle: () => toggleLeftSidebar(),
      }}
      leftSwitch={showSplitToggle ? {
        options: [
          { id: 'normal', label: t('titlebar.normalView'), title: t('titlebar.normalViewTitle') },
          { id: 'split', label: t('titlebar.splitView'), title: t('titlebar.splitViewTitle') },
        ],
        value: splitActive ? 'split' : 'normal',
        onSelect: () => toggleSplitActive(),
        // The switch slides out by its own width when the second agent goes away, and
        // the keyframes are the desktop's own — which is why the animation is passed
        // IN rather than owned by the component, and why the unmount waits on it.
        className: splitToggleExiting ? 'animate-slide-out' : 'animate-slide-in',
        onAnimationEnd: () => {
          if (!splitToggleExiting) return
          setShowSplitToggle(false)
          setSplitToggleExiting(false)
        },
      } : undefined}
      titles={titles}
      // Closing the agent is offered here, next to the sidebar toggle, because the
      // info sidebar no longer has a header to carry it — and the action belongs
      // to the agent, not to a panel that may be collapsed.
      action={closeableTerminal ? {
        label: t('agentInfo.closeAgent'),
        title: `${t('agentInfo.closeAgent')} ⌘W`,
        onClick: () => openCloseAgentModal({
          terminalId: closeableTerminal.id,
          terminalName: closeableTerminal.name,
        }),
      } : undefined}
      // The info panel's toggle is the one control here that depends on there being an
      // agent at all: with an empty window there is nothing for it to show.
      right={terminals.length > 0 ? {
        open: rightSidebar === 'info',
        title: t('titlebar.info'),
        onToggle: () => toggleRightSidebar('info'),
      } : undefined}
    />
  )
}
