import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Config, TerminalInfo, TerminalState, TerminalMetadata, WorkspaceTerminal, WorkspaceLayout, RepositoryMetadata, ScriptTerminalInfo } from '../../types'

interface CloseAgentModalData {
  terminalId: string
  terminalName: string
  repositoryMetadata?: Record<string, RepositoryMetadata>
}

interface AppState {
  // Config
  config: Config | null
  configLoading: boolean
  configError: string | null

  // Terminals
  terminals: TerminalInfo[]
  activeTerminalId: string | null

  // UI
  currentPage: 'config' | 'terminals' | 'workspace' | 'skills'
  rightSidebar: 'info' | null
  leftSidebarVisible: boolean
  iconSidebarVisible: boolean

  // Workspace terminals
  workspaceTerminals: WorkspaceTerminal[]
  workspaceLayout: WorkspaceLayout
  activeWorkspacePane: number

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

  setCurrentPage: (page: 'config' | 'terminals' | 'workspace' | 'skills') => void
  setRightSidebar: (sidebar: 'info' | null) => void
  toggleRightSidebar: (sidebar: 'info') => void
  toggleLeftSidebar: () => void
  toggleIconSidebar: () => void

  // Workspace terminal actions
  addWorkspaceTerminal: (paneIndex: number, id: string, name: string, repositories: string[]) => void
  removeWorkspaceTerminal: (paneIndex: number) => void
  setWorkspaceLayout: (layout: WorkspaceLayout) => void
  setActiveWorkspacePane: (paneIndex: number) => void

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

        currentPage: 'terminals',
        rightSidebar: null,
        leftSidebarVisible: true,
        iconSidebarVisible: true,

        workspaceTerminals: [],
        workspaceLayout: 1,
        activeWorkspacePane: 0,

        scriptTerminals: [],

        closeAgentModal: null,
        noReposWarningShown: false,

        // Actions
        setConfig: (config) => set({ config, configLoading: false, configError: null }),
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
            return {
              terminals: newTerminals,
              activeTerminalId:
                state.activeTerminalId === id
                  ? newTerminals[0]?.id || null
                  : state.activeTerminalId,
            }
          }),

        setActiveTerminal: (activeTerminalId) => set({ activeTerminalId }),

        setCurrentPage: (currentPage) => set({ currentPage }),
        setRightSidebar: (rightSidebar) => set({ rightSidebar }),
        toggleRightSidebar: (sidebar) => set((state) => ({
          rightSidebar: state.rightSidebar === sidebar ? null : sidebar
        })),
        toggleLeftSidebar: () => set((state) => ({ leftSidebarVisible: !state.leftSidebarVisible })),
        toggleIconSidebar: () => set((state) => ({ iconSidebarVisible: !state.iconSidebarVisible })),

        // Workspace terminal actions
        addWorkspaceTerminal: (paneIndex, id, name, repositories) =>
          set((state) => {
            // Remove existing terminal at this pane if any
            const filtered = state.workspaceTerminals.filter((t) => t.paneIndex !== paneIndex)
            return {
              workspaceTerminals: [...filtered, { id, paneIndex, name, repositories }],
              activeWorkspacePane: paneIndex,
            }
          }),

        removeWorkspaceTerminal: (paneIndex) =>
          set((state) => ({
            workspaceTerminals: state.workspaceTerminals.filter((t) => t.paneIndex !== paneIndex),
          })),

        setWorkspaceLayout: (workspaceLayout) => set({ workspaceLayout }),
        setActiveWorkspacePane: (activeWorkspacePane) => set({ activeWorkspacePane }),

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
        }),
      }
    ),
    // Local storage persist for UI preferences (permanent)
    {
      name: 'magic-slash-storage',
      partialize: (state) => ({
        leftSidebarVisible: state.leftSidebarVisible,
        iconSidebarVisible: state.iconSidebarVisible,
        workspaceLayout: state.workspaceLayout,
      }),
    }
  )
)
