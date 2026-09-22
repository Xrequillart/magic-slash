import { describe, expect, it } from 'vitest'
import {
  selectInfoSidebarOpen,
  selectInspectedTerminalId,
  type InfoSidebarState,
} from './infoSidebar'

const BASE: InfoSidebarState = {
  terminals: [{ id: 'a1' }, { id: 'a2' }],
  config: null,
  isSplitMode: false,
  focusedPane: 'primary',
  activeTerminalId: 'a1',
  splitTerminalId: null,
}

describe('selectInspectedTerminalId', () => {
  it('names the active agent outside split mode', () => {
    expect(selectInspectedTerminalId(BASE)).toBe('a1')
    // Split mode with the primary pane focused is still the active agent: the split
    // terminal only answers for the pane that has focus.
    expect(selectInspectedTerminalId({ ...BASE, isSplitMode: true, splitTerminalId: 'a2' })).toBe('a1')
  })

  it('names the split agent when the second pane has focus', () => {
    expect(selectInspectedTerminalId({
      ...BASE, isSplitMode: true, focusedPane: 'secondary', splitTerminalId: 'a2',
    })).toBe('a2')
  })

  // Not merely defensive: `focusedPane` survives a terminal being removed, so a
  // secondary focus with nothing in that pane is a state the store does produce.
  it('names nothing when the focused pane is empty', () => {
    expect(selectInspectedTerminalId({
      ...BASE, isSplitMode: true, focusedPane: 'secondary', splitTerminalId: null,
    })).toBeNull()
  })
})

describe('selectInfoSidebarOpen', () => {
  it('follows the inspected agent, not the window', () => {
    const state: InfoSidebarState = {
      ...BASE,
      terminals: [{ id: 'a1', infoSidebarOpen: false }, { id: 'a2', infoSidebarOpen: true }],
    }
    expect(selectInfoSidebarOpen(state)).toBe(false)
    // The whole bug this replaced: switching agents used to carry the last agent's
    // flag along, so closing it on one closed it on every one of them.
    expect(selectInfoSidebarOpen({ ...state, activeTerminalId: 'a2' })).toBe(true)
  })

  it('reads the app default for an agent nobody has toggled', () => {
    expect(selectInfoSidebarOpen(BASE)).toBe(true)
    expect(selectInfoSidebarOpen({ ...BASE, config: {} })).toBe(true)
    expect(selectInfoSidebarOpen({ ...BASE, config: { infoSidebarOnCreate: true } })).toBe(true)
    expect(selectInfoSidebarOpen({ ...BASE, config: { infoSidebarOnCreate: false } })).toBe(false)
  })

  it('lets the agent’s own decision beat the app default, both ways', () => {
    const closedByDefault = { ...BASE, config: { infoSidebarOnCreate: false } }
    expect(selectInfoSidebarOpen({
      ...closedByDefault, terminals: [{ id: 'a1', infoSidebarOpen: true }],
    })).toBe(true)
    // And a stored `false` is not mistaken for "never chose": it has to survive a
    // default of on, or closing the panel would undo itself on the next read.
    expect(selectInfoSidebarOpen({
      ...BASE, terminals: [{ id: 'a1', infoSidebarOpen: false }],
    })).toBe(false)
  })

  it('is shut when no agent is inspected', () => {
    expect(selectInfoSidebarOpen({ ...BASE, terminals: [], activeTerminalId: null })).toBe(false)
    // An id pointing at an agent that is gone reads the same way. This is what used
    // to need its own branch when the last agent was closed.
    expect(selectInfoSidebarOpen({ ...BASE, terminals: [] })).toBe(false)
  })
})
