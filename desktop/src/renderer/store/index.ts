import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Config, TerminalInfo, TerminalState, TerminalMetadata, ScriptTerminalInfo } from '../../types'

interface CloseAgentModalData {
  terminalId: string
  terminalName: string
}

interface AppState {
  // Config
  config: Config | null
  configLoading: boolean
  configError: string | null

  // Terminals
  terminals: TerminalInfo[]
  activeTerminalId: string | null

  // Split screen
  splitTerminalId: string | null
  focusedPane: 'primary' | 'secondary'
  isSplitMode: boolean
  isWideScreen: boolean
  splitEnabled: boolean
  splitActive: boolean
  rightPaneTerminalIds: string[]

  // UI
  currentPage: 'config' | 'terminals' | 'skills'
  rightSidebar: 'info' | null
  leftSidebarVisible: boolean
  iconSidebarVisible: boolean

  // Script terminals
  scriptTerminals: ScriptTerminalInfo[]

  // Close agent modal
  closeAgentModal: CloseAgentModalData | null

  // No repos warning modal
  noReposWarningShown: boolean

  // Actions
  setConfig: (config: Config) => void
  setConfigLoading: (loading: boolean) => void
  setConfigError: (error: string | null) => void

  addTerminal: (terminal: TerminalInfo) => void
  updateTerminalState: (id: string, state: TerminalState) => void
  updateTerminalBranch: (id: string, branchName: string | null) => void
  updateTerminalMetadata: (id: string, metadata: Partial<TerminalMetadata>) => void
  updateTerminalRepositories: (id: string, repositories: string[]) => void
  removeTerminal: (id: string) => void
  setActiveTerminal: (id: string | null) => void
  setSplitTerminalId: (id: string | null) => void
  setFocusedPane: (pane: 'primary' | 'secondary') => void
  setSplitMode: (enabled: boolean) => void
  setIsWideScreen: (wide: boolean) => void
  toggleSplitEnabled: () => void
  toggleSplitActive: () => void
  moveTerminalToPane: (id: string, pane: 'left' | 'right') => void

  setCurrentPage: (page: 'config' | 'terminals' | 'skills') => void
  setRightSidebar: (sidebar: 'info' | null) => void
  toggleRightSidebar: (sidebar: 'info') => void
  toggleLeftSidebar: () => void
  toggleIconSidebar: () => void

  // Close agent modal actions
  openCloseAgentModal: (data: CloseAgentModalData) => void
  closeCloseAgentModal: () => void

  // Script terminal actions
  addScriptTerminal: (script: ScriptTerminalInfo) => void
  removeScriptTerminal: (id: string) => void
  updateScriptTerminalState: (id: string, state: 'running' | 'error') => void

  // No repos warning modal actions
  setNoReposWarningShown: (shown: boolean) => void
}

export const useStore = create<AppState>()(
  persist(
    persist(
      (set) => ({
        // Initial state
        config: null,
        configLoading: true,
        configError: null,

        terminals: [],
        activeTerminalId: null,

        splitTerminalId: null,
        focusedPane: 'primary',
        isSplitMode: false,
        isWideScreen: false,
        splitEnabled: false,
        splitActive: false,
        rightPaneTerminalIds: [],

        currentPage: 'terminals',
        rightSidebar: null,
        leftSidebarVisible: true,
        iconSidebarVisible: true,

        scriptTerminals: [],

        closeAgentModal: null,
        noReposWarningShown: false,

        // Actions
        setConfig: (config) => set({
          config,
          configLoading: false,
          configError: null,
          ...(config?.splitEnabled !== undefined ? { splitEnabled: config.splitEnabled } : {}),
          ...(config?.splitActive !== undefined ? { splitActive: config.splitActive } : {}),
        }),
        setConfigLoading: (configLoading) => set({ configLoading }),
        setConfigError: (configError) => set({ configError, configLoading: false }),

        addTerminal: (terminal) =>
          set((state) => {
            // Prevent duplicates - don't add if terminal with same ID exists
            if (state.terminals.some((t) => t.id === terminal.id)) {
              return { activeTerminalId: terminal.id }
            }
            return {
              terminals: [...state.terminals, terminal],
              activeTerminalId: terminal.id,
              rightSidebar: 'info',
            }
          }),

        updateTerminalState: (id, state) =>
          set((s) => ({
            terminals: s.terminals.map((t) =>
              t.id === id ? { ...t, state } : t
            ),
          })),

        updateTerminalBranch: (id, branchName) =>
          set((s) => ({
            terminals: s.terminals.map((t) =>
              t.id === id ? { ...t, branchName: branchName || undefined } : t
            ),
          })),

        updateTerminalMetadata: (id, metadata) =>
          set((s) => ({
            terminals: s.terminals.map((t) =>
              t.id === id ? { ...t, metadata: { ...t.metadata, ...metadata } } : t
            ),
          })),

        updateTerminalRepositories: (id, repositories) =>
          set((s) => ({
            terminals: s.terminals.map((t) =>
              t.id === id ? { ...t, repositories } : t
            ),
          })),

        removeTerminal: (id) =>
          set((state) => {
            const newTerminals = state.terminals.filter((t) => t.id !== id)
            const newRightIds = state.rightPaneTerminalIds.filter(tid => tid !== id)
            return {
              terminals: newTerminals,
              activeTerminalId:
                state.activeTerminalId === id
                  ? newTerminals.filter(t => !newRightIds.includes(t.id))[0]?.id || null
                  : state.activeTerminalId,
              splitTerminalId:
                state.splitTerminalId === id ? (newRightIds[0] || null) : state.splitTerminalId,
              focusedPane:
                state.splitTerminalId === id ? 'primary' : state.focusedPane,
              rightPaneTerminalIds: newRightIds,
            }
          }),

        setActiveTerminal: (activeTerminalId) =>
          set((state) => {
            if (state.isSplitMode && activeTerminalId === state.splitTerminalId) {
              return {
                activeTerminalId,
                splitTerminalId: state.activeTerminalId,
                focusedPane: 'primary',
              }
            }
            return { activeTerminalId }
          }),

        setSplitTerminalId: (splitTerminalId) =>
          set((state) => state.splitTerminalId === splitTerminalId ? {} : { splitTerminalId }),
        setFocusedPane: (focusedPane) =>
          set((state) => state.focusedPane === focusedPane ? {} : { focusedPane }),
        setSplitMode: (isSplitMode) =>
          set((state) => state.isSplitMode === isSplitMode ? {} : { isSplitMode }),
        setIsWideScreen: (isWideScreen) =>
          set((state) => state.isWideScreen === isWideScreen ? {} : { isWideScreen }),
        toggleSplitEnabled: () =>
          set((state) => ({ splitEnabled: !state.splitEnabled })),
        toggleSplitActive: () =>
          set((state) => {
            if (state.splitActive) {
              // Switching to single: move all right-pane agents back to left in config.json
              for (const id of state.rightPaneTerminalIds) {
                window.electronAPI?.terminal.updateSplitPane(id, 'left').catch(() => {})
              }
              window.electronAPI?.config.updateSplitActive(false).catch(() => {})
              return { splitActive: false, rightPaneTerminalIds: [], splitTerminalId: null, focusedPane: 'primary' }
            }
            window.electronAPI?.config.updateSplitActive(true).catch(() => {})
            return { splitActive: true }
          }),
        moveTerminalToPane: (id, pane) => {
          window.electronAPI?.terminal.updateSplitPane(id, pane).catch(() => {})
          return set((state) => {
            if (pane === 'right') {
              if (state.rightPaneTerminalIds.includes(id)) return {}
              const newRightIds = [...state.rightPaneTerminalIds, id]
              const updates: Partial<AppState> = { rightPaneTerminalIds: newRightIds }
              if (id === state.activeTerminalId) {
                const leftTerminals = state.terminals.filter(t => !newRightIds.includes(t.id))
                updates.activeTerminalId = leftTerminals[0]?.id || null
              }
              if (!state.splitTerminalId || !newRightIds.includes(state.splitTerminalId)) {
                updates.splitTerminalId = id
              }
              return updates
            } else {
              if (!state.rightPaneTerminalIds.includes(id)) return {}
              const newRightIds = state.rightPaneTerminalIds.filter(tid => tid !== id)
              const updates: Partial<AppState> = { rightPaneTerminalIds: newRightIds }
              if (id === state.splitTerminalId) {
                updates.splitTerminalId = newRightIds[0] || null
              }
              return updates
            }
          })
        },

        setCurrentPage: (currentPage) => set({ currentPage }),
        setRightSidebar: (rightSidebar) => set({ rightSidebar }),
        toggleRightSidebar: (sidebar) => set((state) => ({
          rightSidebar: state.rightSidebar === sidebar ? null : sidebar
        })),
        toggleLeftSidebar: () => set((state) => ({ leftSidebarVisible: !state.leftSidebarVisible })),
        toggleIconSidebar: () => set((state) => ({ iconSidebarVisible: !state.iconSidebarVisible })),

        // Close agent modal actions
        openCloseAgentModal: (data) => set({ closeAgentModal: data }),
        closeCloseAgentModal: () => set({ closeAgentModal: null }),

        // Script terminal actions
        addScriptTerminal: (script) =>
          set((state) => ({
            scriptTerminals: [...state.scriptTerminals, script],
          })),

        removeScriptTerminal: (id) =>
          set((state) => ({
            scriptTerminals: state.scriptTerminals.filter((s) => s.id !== id),
            activeTerminalId: state.activeTerminalId === id
              ? state.terminals[0]?.id || null
              : state.activeTerminalId,
          })),

        updateScriptTerminalState: (id, newState) =>
          set((state) => ({
            scriptTerminals: state.scriptTerminals.map((s) =>
              s.id === id ? { ...s, state: newState } : s
            ),
          })),

        // No repos warning modal actions
        setNoReposWarningShown: (noReposWarningShown) => set({ noReposWarningShown }),
      }),
      // Session storage persist for activeTerminalId (cleared on app close)
      {
        name: 'magic-slash-session',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          activeTerminalId: state.activeTerminalId,
          splitTerminalId: state.splitTerminalId,
          rightPaneTerminalIds: state.rightPaneTerminalIds,
        }),
      }
    ),
    // Local storage persist for UI preferences (permanent)
    {
      name: 'magic-slash-storage',
      partialize: (state) => ({
        leftSidebarVisible: state.leftSidebarVisible,
        iconSidebarVisible: state.iconSidebarVisible,
      }),
    }
  )
)
