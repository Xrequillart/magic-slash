import { ipcMain } from 'electron'
import {
  readConfig,
  addRepository,
  updateRepository,
  deleteRepository,
  renameRepository,
  updateRepositoryLanguages,
  updateRepositoryCommitSettings,
  updateRepositoryResolveSettings,
  updateRepositoryPullRequestSettings,
  updateRepositoryIssuesSettings,
  updateRepositoryBranchSettings,
  updateRepositoryWorktreeFilesSettings,
  updateSplitEnabled,
} from '../config/config'
import {
  validateRepoName,
  validateRepoPath,
  isGitRepository,
  hasGitHubRemote,
  getGitStatus,
  getGitDiffStats,
  getBranchCommits,
  getGitHubRepoUrl,
  getPRTemplate,
  createPRTemplate,
  updatePRTemplate,
  getRemoteBranches
} from '../config/validation'
import {
  getCommandHistory,
  addCommandToHistory,
  findBestMatch,
  getLastCommand
} from '../config/command-history'

export function setupConfigHandlers() {
  // Get config
  ipcMain.handle('config:get', async () => {
    return readConfig()
  })

  // Add repository
  ipcMain.handle('config:addRepository', async (_event, { name, path, keywords }) => {
    const nameValidation = validateRepoName(name)
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error)
    }

    const pathValidation = validateRepoPath(path)
    if (!pathValidation.valid) {
      throw new Error(pathValidation.error)
    }

    const config = addRepository(name, pathValidation.expandedPath || path, keywords || [])
    return {
      config,
      warning: pathValidation.warning
    }
  })

  // Update repository
  ipcMain.handle('config:updateRepository', async (_event, { name, updates }) => {
    if (updates.path) {
      const pathValidation = validateRepoPath(updates.path)
      if (!pathValidation.valid) {
        throw new Error(pathValidation.error)
      }
      updates.path = pathValidation.expandedPath || updates.path
    }

    const config = updateRepository(name, updates)
    return { config }
  })

  // Delete repository
  ipcMain.handle('config:deleteRepository', async (_event, { name }) => {
    const config = deleteRepository(name)
    return { config }
  })

  // Rename repository
  ipcMain.handle('config:renameRepository', async (_event, { oldName, newName }) => {
    const nameValidation = validateRepoName(newName)
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error)
    }

    const config = renameRepository(oldName, newName)
    return { config }
  })

  // Update repository languages
  ipcMain.handle('config:updateRepositoryLanguages', async (_event, { name, languages }) => {
    const config = updateRepositoryLanguages(name, languages)
    return { config }
  })

  // Update repository commit settings
  ipcMain.handle('config:updateRepositoryCommitSettings', async (_event, { name, settings }) => {
    const config = updateRepositoryCommitSettings(name, settings)
    return { config }
  })

  // Update repository resolve settings
  ipcMain.handle('config:updateRepositoryResolveSettings', async (_event, { name, settings }) => {
    const config = updateRepositoryResolveSettings(name, settings)
    return { config }
  })

  // Update repository pull request settings
  ipcMain.handle('config:updateRepositoryPullRequestSettings', async (_event, { name, settings }) => {
    const config = updateRepositoryPullRequestSettings(name, settings)
    return { config }
  })

  // Update repository issues settings
  ipcMain.handle('config:updateRepositoryIssuesSettings', async (_event, { name, settings }) => {
    const config = updateRepositoryIssuesSettings(name, settings)
    return { config }
  })

  // Update repository branch settings
  ipcMain.handle('config:updateRepositoryBranchSettings', async (_event, { name, settings }) => {
    const config = updateRepositoryBranchSettings(name, settings)
    return { config }
  })

  // Update repository worktree files settings
  ipcMain.handle('config:updateRepositoryWorktreeFilesSettings', async (_event, { name, settings }) => {
    const config = updateRepositoryWorktreeFilesSettings(name, settings)
    return { config }
  })

  // Update split enabled setting
  ipcMain.handle('config:updateSplitEnabled', async (_event, { enabled }) => {
    const config = updateSplitEnabled(enabled)
    return { config }
  })

  // Validate path
  ipcMain.handle('config:validatePath', async (_event, { path }) => {
    return isGitRepository(path)
  })

  // Check if repo has GitHub remote
  ipcMain.handle('config:hasGitHubRemote', async (_event, { path }) => {
    return hasGitHubRemote(path)
  })

  // Get git status
  ipcMain.handle('config:getGitStatus', async (_event, { path }) => {
    return getGitStatus(path)
  })

  // Get git diff stats
  ipcMain.handle('config:getGitDiffStats', async (_event, { path }) => {
    try {
      return getGitDiffStats(path)
    } catch {
      return { additions: 0, deletions: 0, filesChanged: 0, isGitRepo: false, files: [] }
    }
  })

  // Get branch commits (commits on current branch vs base branch)
  ipcMain.handle('config:getBranchCommits', async (_event, { path, targetBranch }) => {
    return getBranchCommits(path, targetBranch)
  })

  // Get remote branches
  ipcMain.handle('config:getRemoteBranches', async (_event, { path }) => {
    return getRemoteBranches(path)
  })

  // Get GitHub repo URL from remote
  ipcMain.handle('config:getGitHubRepoUrl', async (_event, { path }) => {
    return getGitHubRepoUrl(path)
  })

  // Get PR template
  ipcMain.handle('config:getPRTemplate', async (_event, { repoPath }) => {
    return getPRTemplate(repoPath)
  })

  // Create PR template
  ipcMain.handle('config:createPRTemplate', async (_event, { repoPath, language }) => {
    return createPRTemplate(repoPath, undefined, language)
  })

  // Update PR template
  ipcMain.handle('config:updatePRTemplate', async (_event, { repoPath, content }) => {
    return updatePRTemplate(repoPath, content)
  })

  // Command history handlers
  ipcMain.handle('history:get', async (_event, { repoPath }) => {
    return getCommandHistory(repoPath)
  })

  ipcMain.handle('history:add', async (_event, { repoPath, command }) => {
    addCommandToHistory(repoPath, command)
    return { success: true }
  })

  ipcMain.handle('history:getSuggestion', async (_event, { repoPath, prefix }) => {
    return findBestMatch(repoPath, prefix)
  })

  ipcMain.handle('history:getLast', async (_event, { repoPath }) => {
    return getLastCommand(repoPath)
  })
}
