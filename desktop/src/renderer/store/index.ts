import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Config, TerminalInfo, TerminalState, TerminalMetadata, ScriptTerminalInfo, SettingsTab, Org } from '../../types'
import { migrateSkillsContextWindow } from '../pages/Skills/contextWindow'

interface CloseAgentModalData {
  terminalId: string
  terminalName: string
}

/** Agents is the only page; everything else opens as a centered overlay. */
export type ModalId = 'settings' | 'skills' | 'team'

/**
 * The two windows the Skills page offers as presets — the ones worth comparing,
 * and the two values its switch can force.
 *
 * Kept as a closed pair rather than a bare `number`: the switch renders one
 * segment per member, so widening this type would silently leave a preset
 * undrawn.
 */
export type SkillsContextWindow = 200_000 | 1_000_000

/**
 * The model context window the Skills page sizes its listing budget against.
 *
 * Claude Code derives that budget from the window (1% of it, in characters), so
 * the same set of skills is comfortable on a 1M model and already over budget on
 * a 200k one. On 'auto' — the default — the page reads the window off the agents
 * actually running, which Claude Code reports through the statusline hook. The
 * two presets are explicit overrides: what these skills would look like on
 * another model, and the answer when nothing is running.
 *
 * A viewing preference, never written back to Claude Code's settings.
 */
export type SkillsContextWindowSetting = 'auto' | SkillsContextWindow

interface AppState {
  // Config
  config: Config | null
  configLoading: boolean
  configError: string | null

  // Organization (cloud, multi-org). Held globally so the switcher and other
  // views react live to the active org / membership set. Ephemeral (not
  // persisted) — refreshed from the main process on mount and after mutations.
  activeOrg: Org | null
  orgs: Org[]

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
  // When set, the Config page selects this settings tab on mount, then resets it
  // to null. Lets other views (e.g. the sidebar account menu) deep-link a tab.
  settingsInitialTab: SettingsTab | null
  // Which organization the Organization page is scoped to. Held here rather than
  // in the page because the settings rail lists the organizations too, and both
  // it and the page's tab strip have to agree on which one is open. `null` = the
  // user has not picked one, so the page falls back to the first.
  settingsOrgId: string | null
  // The overlay currently on screen, if any. Only one can be open at a time.
  activeModal: ModalId | null
  rightSidebar: 'info' | null
  leftSidebarVisible: boolean
  // Which context window the Skills page's budget gauges are scaled to. See
  // SkillsContextWindowSetting above.
  skillsContextWindow: SkillsContextWindowSetting

  // Script terminals
  scriptTerminals: ScriptTerminalInfo[]

  // Close agent modal
  closeAgentModal: CloseAgentModalData | null

  // Launch repository-setup modal: dismissed for this session ("Later"). Session
  // storage, so it survives a renderer reload but comes back on the next launch.
  repoSetupDismissed: boolean

  selectedFile: { repoPath: string; path: string; status: string } | null

  // Actions
  setConfig: (config: Config) => void
  setConfigLoading: (loading: boolean) => void
  setConfigError: (error: string | null) => void

  setActiveOrg: (org: Org | null) => void
  setOrgs: (orgs: Org[]) => void

  addTerminal: (terminal: TerminalInfo) => void
  updateTerminalState: (id: string, state: TerminalState) => void
  updateTerminalBranch: (id: string, branchName: string | null) => void
  updateTerminalMetadata: (id: string, metadata: Partial<TerminalMetadata>) => void
  updateTerminalRepositories: (id: string, repositories: string[]) => void
  removeTerminal: (id: string) => void
  clearTerminals: () => void
  setActiveTerminal: (id: string | null) => void
  setSplitTerminalId: (id: string | null) => void
  setFocusedPane: (pane: 'primary' | 'secondary') => void
  setSplitMode: (enabled: boolean) => void
  setIsWideScreen: (wide: boolean) => void
  toggleSplitEnabled: () => void
  toggleSplitActive: () => void
  moveTerminalToPane: (id: string, pane: 'left' | 'right') => void

  setSettingsInitialTab: (tab: SettingsTab | null) => void
  setSettingsOrgId: (orgId: string | null) => void
  openModal: (modal: ModalId) => void
  closeModal: () => void
  openSettingsModal: (tab?: SettingsTab) => void
  setRightSidebar: (sidebar: 'info' | null) => void
  toggleRightSidebar: (sidebar: 'info') => void
  toggleLeftSidebar: () => void
  setSkillsContextWindow: (contextWindow: SkillsContextWindowSetting) => void

  // Close agent modal actions
  openCloseAgentModal: (data: CloseAgentModalData) => void
  closeCloseAgentModal: () => void

  // Script terminal actions
  addScriptTerminal: (script: ScriptTerminalInfo) => void
  removeScriptTerminal: (id: string) => void
  updateScriptTerminalState: (id: string, state: 'running' | 'error') => void

  // Launch repository-setup modal actions
  setRepoSetupDismissed: (dismissed: boolean) => void

  setSelectedFile: (file: { repoPath: string; path: string; status: string } | null) => void
  closeFilePreview: () => void
}

export const useStore = create<AppState>()(
  persist(
    persist(
      (set, get) => ({
        // Initial state
        config: null,
        configLoading: true,
        configError: null,

        activeOrg: null,
        orgs: [],

        terminals: [],
        activeTerminalId: null,

        splitTerminalId: null,
        focusedPane: 'primary',
        isSplitMode: false,
        isWideScreen: false,
        splitEnabled: false,
        splitActive: false,
        rightPaneTerminalIds: [],

        settingsInitialTab: null,
        settingsOrgId: null,
        activeModal: null,
        rightSidebar: null,
        leftSidebarVisible: true,
        skillsContextWindow: 'auto',

        scriptTerminals: [],

        closeAgentModal: null,
        repoSetupDismissed: false,
        selectedFile: null,

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

        setActiveOrg: (activeOrg) => set({ activeOrg }),
        setOrgs: (orgs) => set({ orgs }),

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
              // The info sidebar describes an agent, so it has nothing to show
              // once the last one is gone: leaving it open would slide an empty
              // panel back in on the next launch's blank slate.
              rightSidebar: newTerminals.length === 0 ? null : state.rightSidebar,
            }
          }),

        // Drop every terminal and the pane layout around them. Used when the app
        // loses its session: the store is a module singleton that outlives the
        // gate, so without this the next account would inherit the previous
        // one's tabs. The PTYs themselves are killed by the main process.
        clearTerminals: () =>
          set({
            terminals: [],
            activeTerminalId: null,
            splitTerminalId: null,
            rightPaneTerminalIds: [],
            focusedPane: 'primary',
            scriptTerminals: [],
            closeAgentModal: null,
            selectedFile: null,
            rightSidebar: null,
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

        setSettingsInitialTab: (settingsInitialTab) => set({ settingsInitialTab }),
        setSettingsOrgId: (settingsOrgId) => set({ settingsOrgId }),
        // Modals are overlays, never destinations: the agents page stays mounted
        // and visible behind them. Two things are normalised on open — the file
        // preview panel is dismissed (it sits above the overlay in the z-order),
        // and a blank agents page gets its first agent selected so the overlay
        // never floats over an empty app.
        openModal: (modal) => set((state) => {
          const updates: Partial<AppState> = { activeModal: modal, selectedFile: null }
          if (!state.activeTerminalId && state.terminals.length > 0) {
            updates.activeTerminalId = state.terminals[0].id
          }
          return updates
        }),
        closeModal: () => set({ activeModal: null }),
        // Convenience wrapper: opens Settings straight on a given tab.
        openSettingsModal: (tab) => {
          if (tab) set({ settingsInitialTab: tab })
          get().openModal('settings')
        },
        setRightSidebar: (rightSidebar) => set({ rightSidebar }),
        toggleRightSidebar: (sidebar) => set((state) => ({
          rightSidebar: state.rightSidebar === sidebar ? null : sidebar
        })),
        toggleLeftSidebar: () => set((state) => ({ leftSidebarVisible: !state.leftSidebarVisible })),
        setSkillsContextWindow: (skillsContextWindow) => set({ skillsContextWindow }),

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

        // Launch repository-setup modal actions
        setRepoSetupDismissed: (repoSetupDismissed) => set({ repoSetupDismissed }),

        setSelectedFile: (selectedFile) => set({ selectedFile }),
        closeFilePreview: () => set({ selectedFile: null }),
      }),
      // Session storage persist for activeTerminalId (cleared on app close)
      {
        name: 'magic-slash-session',
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({
          activeTerminalId: state.activeTerminalId,
          splitTerminalId: state.splitTerminalId,
          rightPaneTerminalIds: state.rightPaneTerminalIds,
          repoSetupDismissed: state.repoSetupDismissed,
        }),
      }
    ),
    // Local storage persist for UI preferences (permanent)
    {
      name: 'magic-slash-storage',
      // v1 — skillsContextWindow gained an 'auto' state and made it the default.
      // Without a migration, every user carries a stored `200_000` written by the
      // old default and keeps overriding the window their agents report; the
      // point of the feature is precisely that the stored value stops winning
      // over reality.
      version: 1,
      // Annotated: zustand infers the persisted shape from what `migrate` returns,
      // and an inferred `'auto' | 1_000_000` would then reject the 200K preset in
      // `partialize` below.
      migrate: (persistedState): Partial<AppState> => {
        const state = (persistedState ?? {}) as Partial<AppState>
        return {
          ...state,
          skillsContextWindow: migrateSkillsContextWindow(state.skillsContextWindow),
        }
      },
      partialize: (state) => ({
        leftSidebarVisible: state.leftSidebarVisible,
        skillsContextWindow: state.skillsContextWindow,
      }),
    }
  )
)
