import { useCallback } from 'react'
import { useStore } from '../store'
import type { Config, LanguageId, PlanSettingsInput, RepositoryConfig, ThemeId } from '../../types'

export function useConfig() {
  const { config, configLoading, configError, setConfig, setConfigLoading, setConfigError } = useStore()

  const loadConfig = useCallback(async () => {
    setConfigLoading(true)
    try {
      const cfg = await window.electronAPI.config.getConfig()
      setConfig(cfg)
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to load config')
    }
  }, [setConfig, setConfigLoading, setConfigError])

  const addRepository = useCallback(async (name: string, path: string, keywords: string[]) => {
    const result = await window.electronAPI.config.addRepository(name, path, keywords)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepository = useCallback(async (name: string, updates: Partial<RepositoryConfig>) => {
    const result = await window.electronAPI.config.updateRepository(name, updates)
    setConfig(result.config)
    return result
  }, [setConfig])

  // On repo:*, not config:*, because the write goes through the dedicated
  // fill-or-correct RPC rather than the admin-only `repositories_update` that
  // updateRepository uses. Same store refresh, different authority.
  const setRepositoryRemoteUrl = useCallback(async (name: string, remoteUrl: string) => {
    const result = await window.electronAPI.repo.setRemoteUrl(name, remoteUrl)
    setConfig(result.config)
    return result
  }, [setConfig])

  const deleteRepository = useCallback(async (name: string) => {
    const result = await window.electronAPI.config.deleteRepository(name)
    setConfig(result.config)
    return result
  }, [setConfig])

  const renameRepository = useCallback(async (oldName: string, newName: string) => {
    const result = await window.electronAPI.config.renameRepository(oldName, newName)
    setConfig(result.config)
    return result
  }, [setConfig])

  const setRepositoryOrg = useCallback(async (name: string, orgId: string | null) => {
    const result = await window.electronAPI.config.setRepositoryOrg(name, orgId)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryLanguages = useCallback(async (name: string, languages: Record<string, string | null>) => {
    const result = await window.electronAPI.config.updateRepositoryLanguages(name, languages)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryCommitSettings = useCallback(async (name: string, settings: Partial<NonNullable<RepositoryConfig['commit']>>) => {
    const result = await window.electronAPI.config.updateRepositoryCommitSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryResolveSettings = useCallback(async (name: string, settings: Partial<NonNullable<RepositoryConfig['resolve']>>) => {
    const result = await window.electronAPI.config.updateRepositoryResolveSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryPullRequestSettings = useCallback(async (name: string, settings: Partial<NonNullable<RepositoryConfig['pullRequest']>>) => {
    const result = await window.electronAPI.config.updateRepositoryPullRequestSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryPlanSettings = useCallback(async (name: string, settings: PlanSettingsInput) => {
    const result = await window.electronAPI.config.updateRepositoryPlanSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryIssuesSettings = useCallback(async (name: string, settings: Partial<NonNullable<RepositoryConfig['issues']>>) => {
    const result = await window.electronAPI.config.updateRepositoryIssuesSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryJiraSettings = useCallback(async (name: string, settings: Partial<NonNullable<RepositoryConfig['jira']>>) => {
    const result = await window.electronAPI.config.updateRepositoryJiraSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryBranchSettings = useCallback(async (name: string, settings: Partial<NonNullable<RepositoryConfig['branches']>>) => {
    const result = await window.electronAPI.config.updateRepositoryBranchSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryWorktreeFilesSettings = useCallback(async (name: string, settings: string[]) => {
    const result = await window.electronAPI.config.updateRepositoryWorktreeFilesSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateSplitEnabled = useCallback(async (enabled: boolean) => {
    const result = await window.electronAPI.config.updateSplitEnabled(enabled)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateSpotlight = useCallback(async (spotlight: { enabled: boolean; shortcut: string }) => {
    const result = await window.electronAPI.config.updateSpotlight(spotlight)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateLaunchMode = useCallback(async (mode: string) => {
    const result = await window.electronAPI.config.updateLaunchMode(mode)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateDefaultAgentType = useCallback(async (type: string) => {
    const result = await window.electronAPI.config.updateDefaultAgentType(type)
    setConfig(result.config)
    return result
  }, [setConfig])

  // Repainting is the main process's job (it also owns the native chrome and
  // the other windows), so this only records the choice.
  const updateTheme = useCallback(async (theme: ThemeId) => {
    const result = await window.electronAPI.config.updateTheme(theme)
    setConfig(result.config)
    return result
  }, [setConfig])

  // Same division of labour: the main process owns the generated Claude Code
  // theme and the terminals it is handed to, so this only records the choice.
  const updateSyncClaudeTheme = useCallback(async (enabled: boolean) => {
    const result = await window.electronAPI.config.setSyncClaudeTheme(enabled)
    setConfig(result.config)
    return result
  }, [setConfig])

  // The two sidebar panels, recorded the same way — Appearance shows them as one
  // pair, and the renderer reads the flags straight off the config to decide.
  const updateUsageCardEnabled = useCallback(async (enabled: boolean) => {
    const result = await window.electronAPI.config.setUsageCardEnabled(enabled)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateAgentContextEnabled = useCallback(async (enabled: boolean) => {
    const result = await window.electronAPI.config.setAgentContextEnabled(enabled)
    setConfig(result.config)
    return result
  }, [setConfig])

  // Expanded/compact for those same two cards. The ± button inside each card
  // writes the same setting, so Settings and the sidebars cannot disagree.
  const updateUsageCardMinimized = useCallback(async (minimized: boolean) => {
    const result = await window.electronAPI.config.setUsageCardMinimized(minimized)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateAgentContextMinimized = useCallback(async (minimized: boolean) => {
    const result = await window.electronAPI.config.setAgentContextMinimized(minimized)
    setConfig(result.config)
    return result
  }, [setConfig])

  // OS notifications. Patched one flag at a time and merged in the main process,
  // so the master switch never destroys the per-kind choices under it. Every
  // producer re-reads the config when it is about to notify, so there is nothing
  // to restart here either.
  const updateNotifications = useCallback(async (patch: Partial<NonNullable<Config['notifications']>>) => {
    const result = await window.electronAPI.config.setNotifications(patch)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateDailyDigestEnabled = useCallback(async (enabled: boolean) => {
    const result = await window.electronAPI.config.setDailyDigestEnabled(enabled)
    setConfig(result.config)
    return result
  }, [setConfig])

  // Re-rendering in the new language is the main process's job too (it owns the
  // menus, the tray and the other windows), so this only records the choice.
  const updateLanguage = useCallback(async (language: LanguageId) => {
    const result = await window.electronAPI.config.updateLanguage(language)
    setConfig(result.config)
    return result
  }, [setConfig])

  const validatePath = useCallback(async (path: string) => {
    return window.electronAPI.config.validatePath(path)
  }, [])

  const getPRTemplate = useCallback(async (repoPath: string) => {
    return window.electronAPI.config.getPRTemplate(repoPath)
  }, [])

  const createPRTemplate = useCallback(async (repoPath: string, language: string) => {
    return window.electronAPI.config.createPRTemplate(repoPath, language)
  }, [])

  const updatePRTemplate = useCallback(async (repoPath: string, content: string) => {
    return window.electronAPI.config.updatePRTemplate(repoPath, content)
  }, [])

  return {
    config,
    configLoading,
    configError,
    loadConfig,
    addRepository,
    updateRepository,
    setRepositoryRemoteUrl,
    deleteRepository,
    renameRepository,
    setRepositoryOrg,
    updateRepositoryLanguages,
    updateRepositoryCommitSettings,
    updateRepositoryResolveSettings,
    updateRepositoryPullRequestSettings,
    updateRepositoryIssuesSettings,
    updateRepositoryJiraSettings,
    updateRepositoryPlanSettings,
    updateRepositoryBranchSettings,
    updateRepositoryWorktreeFilesSettings,
    updateSplitEnabled,
    updateSpotlight,
    updateLaunchMode,
    updateDefaultAgentType,
    updateTheme,
    updateSyncClaudeTheme,
    updateUsageCardEnabled,
    updateUsageCardMinimized,
    updateAgentContextEnabled,
    updateAgentContextMinimized,
    updateNotifications,
    updateDailyDigestEnabled,
    updateLanguage,
    validatePath,
    getPRTemplate,
    createPRTemplate,
    updatePRTemplate,
  }
}
