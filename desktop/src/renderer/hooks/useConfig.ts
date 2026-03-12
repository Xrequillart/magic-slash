import { useCallback } from 'react'
import { useStore } from '../store'

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

  const updateRepository = useCallback(async (name: string, updates: any) => {
    const result = await window.electronAPI.config.updateRepository(name, updates)
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

  const updateRepositoryLanguages = useCallback(async (name: string, languages: Record<string, string | null>) => {
    const result = await window.electronAPI.config.updateRepositoryLanguages(name, languages)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryCommitSettings = useCallback(async (name: string, settings: Record<string, any>) => {
    const result = await window.electronAPI.config.updateRepositoryCommitSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryPullRequestSettings = useCallback(async (name: string, settings: Record<string, any>) => {
    const result = await window.electronAPI.config.updateRepositoryPullRequestSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryIssuesSettings = useCallback(async (name: string, settings: Record<string, any>) => {
    const result = await window.electronAPI.config.updateRepositoryIssuesSettings(name, settings)
    setConfig(result.config)
    return result
  }, [setConfig])

  const updateRepositoryBranchSettings = useCallback(async (name: string, settings: Record<string, any>) => {
    const result = await window.electronAPI.config.updateRepositoryBranchSettings(name, settings)
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
    deleteRepository,
    renameRepository,
    updateRepositoryLanguages,
    updateRepositoryCommitSettings,
    updateRepositoryPullRequestSettings,
    updateRepositoryIssuesSettings,
    updateRepositoryBranchSettings,
    validatePath,
    getPRTemplate,
    createPRTemplate,
    updatePRTemplate,
  }
}
