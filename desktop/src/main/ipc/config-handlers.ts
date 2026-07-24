import { ipcMain, type BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { execFileSync } from 'child_process'
import { codeToHtml } from 'shiki'
import {
  readConfig,
  writeConfig,
  CONFIG_FILE,
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
  updateSplitActive,
  updateLaunchMode,
  updateUsageLogsEnabled,
  setIntegration,
} from '../config/config'
import { getGitHubAuthStatus } from '../github'
import { reRegisterSpotlightShortcut } from '../spotlight-shortcut'
import { repairConfig } from '../config/migrate'
import { isValidSpotlightShortcut, isValidLaunchMode } from '../config/defaults'
import { validateConfig } from '../config/schema-validator'
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
import { ensureHydrated } from '../store/hydrate'

interface ParsedDiff {
  addedNewLines: Set<number>
  removedBeforeLines: Map<number, string[]>
}

function parseDiff(diffOutput: string): ParsedDiff {
  const addedNewLines = new Set<number>()
  const removedBeforeLines = new Map<number, string[]>()
  const lines = diffOutput.split('\n')
  let newLineNum = 0

  for (const line of lines) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) { newLineNum = parseInt(hunk[1], 10); continue }
    if (newLineNum === 0) continue
    if (line.startsWith('+')) { addedNewLines.add(newLineNum); newLineNum++ }
    else if (line.startsWith('-')) {
      const arr = removedBeforeLines.get(newLineNum) ?? []
      arr.push(line.slice(1))
      removedBeforeLines.set(newLineNum, arr)
    } else if (line.startsWith(' ')) { newLineNum++ }
  }
  return { addedNewLines, removedBeforeLines }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function annotateShikiHtml(
  html: string,
  diff: ParsedDiff | null,
  mode: 'normal' | 'all-add' | 'all-remove'
): string {
  if (mode === 'all-add') return html.replace(/<span class="line">/g, '<span class="line" data-diff="add">')
  if (mode === 'all-remove') return html.replace(/<span class="line">/g, '<span class="line" data-diff="remove">')
  if (!diff) return html

  let lineIndex = 0
  let result = html.replace(/<span class="line">/g, () => {
    lineIndex++
    const removed = diff.removedBeforeLines.get(lineIndex) ?? []
    diff.removedBeforeLines.delete(lineIndex)
    const removedHtml = removed.map(c =>
      `<span class="line" data-diff="remove">${escHtml(c)}</span>`
    ).join('')
    const attr = diff.addedNewLines.has(lineIndex) ? ' data-diff="add"' : ''
    return `${removedHtml}<span class="line"${attr}>`
  })

  // Trailing removed lines (deleted at end of file)
  if (diff.removedBeforeLines.size > 0) {
    const trailing = [...diff.removedBeforeLines.values()].flat()
      .map(c => `<span class="line" data-diff="remove">${escHtml(c)}</span>`).join('')
    result = result.replace('</code>', trailing + '</code>')
  }
  return result
}

const KNOWN_LANGS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rs', 'go', 'sh', 'bash',
  'zsh', 'json', 'jsonc', 'yaml', 'yml', 'toml', 'html', 'css', 'scss',
  'less', 'vue', 'svelte', 'rb', 'php', 'java', 'kt', 'swift', 'c', 'cpp',
  'cs', 'sql', 'graphql', 'xml', 'dockerfile', 'tf', 'prisma', 'md',
])

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'])

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

export function setupConfigHandlers(getMainWindow: () => BrowserWindow | null) {
  // Get config (also validates and notifies renderer of any errors)
  ipcMain.handle('config:get', async () => {
    await ensureHydrated()
    const config = readConfig()
    try {
      const validation = validateConfig(config)
      if (!validation.valid) {
        getMainWindow()?.webContents.send('config:validationErrors', {
          errors: validation.errors,
          configPath: CONFIG_FILE,
        })
      }
    } catch {
      // Validation failures already handled in readConfig
    }
    return config
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
  ipcMain.handle('config:setHistoryEnabled', async (_event, { enabled }: { enabled: boolean }) => {
    const config = readConfig()
    config.historyEnabled = enabled
    writeConfig(config)
    return { config }
  })

  // Show/hide the Claude usage card in the sidebar
  ipcMain.handle('config:setUsageCardEnabled', async (_event, { enabled }: { enabled: boolean }) => {
    const config = readConfig()
    config.usageCardEnabled = enabled
    writeConfig(config)
    return { config }
  })

  // Collapse/expand the sidebar usage card (gauges-only)
  ipcMain.handle('config:setUsageCardMinimized', async (_event, { minimized }: { minimized: boolean }) => {
    const config = readConfig()
    config.usageCardMinimized = minimized
    writeConfig(config)
    return { config }
  })

  // GDPR opt-in for writing usage logs (default OFF). Gates WRITING only.
  ipcMain.handle('config:setUsageLogsEnabled', async (_event, { enabled }: { enabled: boolean }) => {
    const config = updateUsageLogsEnabled(enabled)
    return { config }
  })

  ipcMain.handle('config:updateSplitEnabled', async (_event, { enabled }) => {
    const config = updateSplitEnabled(enabled)
    return { config }
  })

  // Update split active setting (single/dual view mode)
  ipcMain.handle('config:updateSplitActive', async (_event, { active }) => {
    const config = updateSplitActive(active)
    return { config }
  })

  // Update spotlight settings (enable/disable + shortcut)
  ipcMain.handle('config:updateSpotlight', async (_event, { enabled, shortcut }: { enabled: boolean; shortcut: string }) => {
    if (typeof enabled !== 'boolean') {
      throw new Error('Invalid spotlight enabled value: must be a boolean')
    }
    if (!isValidSpotlightShortcut(shortcut)) {
      throw new Error(`Invalid spotlight shortcut: '${shortcut}'. Must be one of the supported accelerators.`)
    }
    const config = readConfig()
    config.spotlight = { enabled, shortcut }
    writeConfig(config)
    const result = reRegisterSpotlightShortcut()
    return { config, registered: result.registered }
  })

  ipcMain.handle('config:updateLaunchMode', async (_event, { mode }: { mode: string }) => {
    if (!isValidLaunchMode(mode)) {
      throw new Error(`Invalid launch mode: '${mode}'. Must be one of: plan, default, acceptEdits, auto, bypassPermissions.`)
    }
    const config = updateLaunchMode(mode)
    return { config }
  })

  // Toggle an integration flag (only atlassian is user-settable). Detection/
  // display only — no token is ever stored (see ticket #124 locked decisions).
  ipcMain.handle('config:setIntegration', async (_event, { name, enabled }: { name: 'atlassian'; enabled: boolean }) => {
    const config = setIntegration(name, enabled)
    return { config }
  })

  // GitHub CLI auth status for DISPLAY only (`gh auth status`). No token stored.
  ipcMain.handle('config:getGitHubAuthStatus', async () => {
    return getGitHubAuthStatus()
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

  // Repair config (fix invalid values with defaults)
  ipcMain.handle('config:repair', async () => {
    return repairConfig()
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

  ipcMain.handle('config:readFile', (_event, repoPath: string, filePath: string, status?: string) =>
    readFileForPreview(repoPath, filePath, status)
  )
}

export async function readFileForPreview(repoPath: string, filePath: string, status?: string): Promise<object> {
  const resolvedRepo = path.resolve(repoPath)
  const resolvedFile = path.resolve(repoPath, filePath)

  if (!resolvedFile.startsWith(resolvedRepo + path.sep) && resolvedFile !== resolvedRepo) {
    return { error: 'path_traversal' }
  }

  const ext = path.extname(filePath).toLowerCase()
  const mimeHint = ext.startsWith('.') ? ext.slice(1) : ext

  if (status === 'deleted') {
    try {
      const buffer = execFileSync('git', ['show', `HEAD:${filePath}`], { cwd: repoPath, maxBuffer: 11 * 1024 * 1024 })
      if (buffer.length > 10 * 1024 * 1024) {
        return { error: 'too_large', size: buffer.length }
      }

      // Image detection
      if (IMAGE_EXTS.has(ext)) {
        const mime = MIME_MAP[ext] ?? 'image/png'
        const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`
        return { content: dataUrl, encoding: 'image', size: buffer.length, mimeHint }
      }

      // Binary detection (null-byte scan)
      const sample = buffer.subarray(0, Math.min(512, buffer.length))
      if (sample.includes(0)) {
        return { encoding: 'binary', size: buffer.length, mimeHint }
      }

      // UTF-8 text — highlight server-side, all lines red (file was deleted)
      const textContent = buffer.toString('utf8')
      const lang = KNOWN_LANGS.has(mimeHint) ? mimeHint : 'text'
      const raw = await codeToHtml(textContent, { lang, theme: 'github-dark' }).catch(() => null)
      const highlightedHtml = raw ? annotateShikiHtml(raw, null, 'all-remove') : null
      return { content: textContent, highlightedHtml, encoding: 'utf8', size: buffer.length, mimeHint }
    } catch {
      return { error: 'not_found' }
    }
  }

  let stat: fs.Stats
  try {
    stat = fs.statSync(resolvedFile)
  } catch {
    return { error: 'not_found' }
  }

  if (stat.size > 10 * 1024 * 1024) {
    return { error: 'too_large', size: stat.size }
  }

  if (IMAGE_EXTS.has(ext)) {
    const buffer = fs.readFileSync(resolvedFile)
    const mime = MIME_MAP[ext] ?? 'image/png'
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`
    return { content: dataUrl, encoding: 'image', size: stat.size, mimeHint }
  }

  // Null-byte scan: reliable binary detection without loading the full file
  const fd = fs.openSync(resolvedFile, 'r')
  const sample = Buffer.alloc(Math.min(512, stat.size))
  fs.readSync(fd, sample, 0, sample.length, 0)
  fs.closeSync(fd)

  if (sample.includes(0)) {
    return { encoding: 'binary', size: stat.size, mimeHint }
  }

  const content = fs.readFileSync(resolvedFile, 'utf8')
  const lang = KNOWN_LANGS.has(mimeHint) ? mimeHint : 'text'
  const raw = await codeToHtml(content, { lang, theme: 'github-dark' }).catch(() => null)

  let highlightedHtml: string | null = raw
  if (raw) {
    if (status === 'added' || status === 'untracked') {
      highlightedHtml = annotateShikiHtml(raw, null, 'all-add')
    } else if (status === 'modified' || status === 'renamed') {
      try {
        const diffOut = execFileSync('git', ['diff', 'HEAD', '--', filePath], { cwd: repoPath }).toString()
        highlightedHtml = annotateShikiHtml(raw, parseDiff(diffOut), 'normal')
      } catch { /* leave unhighlighted on error */ }
    }
  }
  return { content, highlightedHtml, encoding: 'utf8', size: stat.size, mimeHint }
}
