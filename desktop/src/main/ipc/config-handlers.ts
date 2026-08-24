import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { execFileSync } from 'child_process'
import { codeToHtml } from 'shiki'
import {
  readConfig,
  writeConfig,
  addRepository,
  updateRepository,
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
  updateSplitActive,
  updateLaunchMode,
  updateDefaultAgentType,
  updateTheme,
  updateLanguage,
  updatePlanSyncEnabled,
  updateUsageLogsEnabled,
  updateDailyDigestEnabled,
  updateNotifications,
  setIntegration,
} from '../config/config'
import { getGitHubAuthStatus } from '../github'
import { reRegisterSpotlightShortcut } from '../spotlight-shortcut'
import { isValidSpotlightShortcut, isValidLaunchMode, isValidAgentType } from '../config/defaults'
import {
  codeAppearance, DEFAULT_CODE_THEME_MODE, isValidCodeThemeMode, isValidLanguage, isValidTheme,
  type Config, type FilePreviewResult, type ChangedLines,
} from '../../types'
import { applyLanguage, applyTheme, currentTheme } from '../appearance'
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
import {
  computeVisibleRanges, countShikiRows, numberShikiLines, renderRows, splitShikiLines, ROW_MARKER,
} from './hunkView'

/**
 * Unchanged lines kept on either side of a change when the preview shows only the
 * changed regions.
 *
 * Four, which is what a unified `git diff` gives by default (three) plus one: the
 * preview is read in a drawer rather than in a terminal, and the extra line is what
 * keeps a change from opening flush against an elision marker. Nothing to do with
 * CodeView's `CONTEXT_LINES`, which is a scroll anchor measured in pixels.
 */
const DIFF_CONTEXT_LINES = 4

/** A line the diff removed: what it said, and which line of the OLD file it was. */
export interface RemovedLine {
  text: string
  /**
   * Its number before the edit. The only number this line ever had — it does not
   * exist in the file on disk — and therefore the one the gutter shows for it.
   */
  oldLine: number
}

export interface ParsedDiff {
  addedNewLines: Set<number>
  /** Keyed by the NEW-file line each run of deletions sits before. */
  removedBeforeLines: Map<number, RemovedLine[]>
}

export function parseDiff(diffOutput: string): ParsedDiff {
  const addedNewLines = new Set<number>()
  const removedBeforeLines = new Map<number, RemovedLine[]>()
  const lines = diffOutput.split('\n')
  let newLineNum = 0
  // Tracked alongside the new-file counter, and only ever read for a removed line:
  // a deletion has no position in the file as it stands, so its old number is the
  // only thing that can be put in front of it.
  let oldLineNum = 0

  for (const line of lines) {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) { oldLineNum = parseInt(hunk[1], 10); newLineNum = parseInt(hunk[2], 10); continue }
    if (newLineNum === 0) continue
    if (line.startsWith('+')) { addedNewLines.add(newLineNum); newLineNum++ }
    else if (line.startsWith('-')) {
      const arr = removedBeforeLines.get(newLineNum) ?? []
      arr.push({ text: line.slice(1), oldLine: oldLineNum })
      removedBeforeLines.set(newLineNum, arr)
      oldLineNum++
    } else if (line.startsWith(' ')) { newLineNum++; oldLineNum++ }
  }
  return { addedNewLines, removedBeforeLines }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Every row shiki opens, capturing whatever `numberShikiLines` already stamped on it.
 *
 * Safe as one shared `/g` instance because every use below is `String.replace`, which
 * resets `lastIndex` before it starts and again when it finishes. Hand this to
 * `.test()` or `.exec()` and that stops being true.
 */
const ROW_OPEN = /<span class="line"([^>]*)>/g

/**
 * A row standing in for a line the diff removed.
 *
 * `data-line` is the OLD number, which is what the gutter must show — the line is
 * gone from the file, so its new-file number does not exist. `data-anchor` is the
 * new-file line it was injected before, and it is what decides whether the row
 * survives a collapse to the changed regions: the two numbers belong to different
 * files, and filtering on the wrong one keeps the wrong rows.
 */
function removedRowHtml(removed: RemovedLine, anchor: number): string {
  return `${ROW_MARKER} data-line="${removed.oldLine}" data-anchor="${anchor}" data-diff="remove">${escHtml(removed.text)}</span>`
}

export function annotateShikiHtml(
  html: string,
  diff: ParsedDiff | null,
  mode: 'normal' | 'all-add' | 'all-remove'
): string {
  if (mode !== 'normal') {
    const kind = mode === 'all-add' ? 'add' : 'remove'
    return html.replace(ROW_OPEN, (_m, attrs: string) => `${ROW_MARKER}${attrs} data-diff="${kind}">`)
  }
  if (!diff) return html

  let lineIndex = 0
  let result = html.replace(ROW_OPEN, (_m, attrs: string) => {
    lineIndex++
    const removed = diff.removedBeforeLines.get(lineIndex) ?? []
    diff.removedBeforeLines.delete(lineIndex)
    const removedHtml = removed.map(c => removedRowHtml(c, lineIndex)).join('')
    const attr = diff.addedNewLines.has(lineIndex) ? ' data-diff="add"' : ''
    return `${removedHtml}${ROW_MARKER}${attrs}${attr}>`
  })

  // Trailing removed lines (deleted at end of file). Their anchor is one past the
  // file's last line — a position no row of the document occupies, which is exactly
  // why they have to be appended here rather than injected in the walk above.
  if (diff.removedBeforeLines.size > 0) {
    const trailing = [...diff.removedBeforeLines.entries()]
      .sort(([a], [b]) => a - b)
      .flatMap(([anchor, removed]) => removed.map(c => removedRowHtml(c, anchor)))
      .join('')
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

/**
 * Highlight a file and stamp its line numbers on, or `null` if shiki could not.
 *
 * The numbering is folded in here rather than left to the callers on purpose: the
 * gutter reads `data-line` off the row, so EVERY preview has to have been through it —
 * the three diff modes, the spec panel's unannotated HTML, a status this version does
 * not know. Forgetting it does not degrade the preview, it blanks the gutter, and an
 * invariant with that failure mode should not be held by a comment at each call site.
 * Un-numbered shiki output has no name in this module as a result.
 */
async function highlightNumbered(text: string, mimeHint: string, shikiTheme: string): Promise<string | null> {
  const lang = KNOWN_LANGS.has(mimeHint) ? mimeHint : 'text'
  const raw = await codeToHtml(text, { lang, theme: shikiTheme }).catch(() => null)
  return raw ? numberShikiLines(raw) : null
}

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

export function setupConfigHandlers() {
  ipcMain.handle('config:get', async () => {
    await ensureHydrated()
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

  // Share a repository to an org (orgId) or make it personal (orgId null)
  ipcMain.handle('config:setRepositoryOrg', async (_event, { name, orgId }: { name: string; orgId: string | null }) => {
    const config = setRepositoryOrg(name, orgId ?? null)
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

  // Update repository plan settings.
  // Returns `rejected` alongside the config: unlike its siblings, the plan writer
  // names the keys whose value it refused so the renderer can say which one.
  ipcMain.handle('config:updateRepositoryPlanSettings', async (_event, { name, settings }) => {
    const { config, rejected } = updateRepositoryPlanSettings(name, settings)
    return { config, rejected }
  })

  // Update repository issues settings
  ipcMain.handle('config:updateRepositoryIssuesSettings', async (_event, { name, settings }) => {
    const config = updateRepositoryIssuesSettings(name, settings)
    return { config }
  })

  // Update repository jira settings (site URL + project key)
  ipcMain.handle('config:updateRepositoryJiraSettings', async (_event, { name, settings }) => {
    const config = updateRepositoryJiraSettings(name, settings)
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

  // Repaint Claude Code in the terminal panes to match the app theme
  ipcMain.handle('config:setSyncClaudeTheme', async (_event, { enabled }: { enabled: boolean }) => {
    const config = readConfig()
    config.syncClaudeTheme = enabled
    writeConfig(config)
    // Re-apply the current theme, which writes or removes the generated theme
    // file now that the setting has changed. Sessions already open follow: the
    // CLI watches its themes directory, so this reaches them without a restart.
    applyTheme(config.theme)
    return { config }
  })

  // Which appearance the file preview's syntax highlighting is painted in. Nothing
  // to re-apply: the highlighting is produced per read, and the renderer keys its
  // cache on the resolved appearance, so the next read of a file already on screen
  // comes back in the new one.
  ipcMain.handle('config:setCodeTheme', async (_event, { mode }: { mode: unknown }) => {
    const config = readConfig()
    config.codeTheme = isValidCodeThemeMode(mode) ? mode : DEFAULT_CODE_THEME_MODE
    writeConfig(config)
    return { config }
  })

  // Show/hide the Claude usage card in the left sidebar
  ipcMain.handle('config:setUsageCardEnabled', async (_event, { enabled }: { enabled: boolean }) => {
    const config = readConfig()
    config.usageCardEnabled = enabled
    writeConfig(config)
    return { config }
  })

  // Show/hide the agent's context card in the right sidebar
  ipcMain.handle('config:setAgentContextEnabled', async (_event, { enabled }: { enabled: boolean }) => {
    const config = readConfig()
    config.agentContextEnabled = enabled
    writeConfig(config)
    return { config }
  })

  // Collapse/expand that card (context gauge only)
  ipcMain.handle('config:setAgentContextMinimized', async (_event, { minimized }: { minimized: boolean }) => {
    const config = readConfig()
    config.agentContextMinimized = minimized
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

  // Activity recording (default ON, explicit false opts out). Gates WRITING only.
  ipcMain.handle('config:setUsageLogsEnabled', async (_event, { enabled }: { enabled: boolean }) => {
    const config = updateUsageLogsEnabled(enabled)
    return { config }
  })

  // Plan session sync (default ON, explicit false opts out). Gates the UPLOAD only:
  // the spec file and the in-app signal that it changed are unaffected.
  //
  // The runtime type check is not ceremony here, and it is why this handler carries one
  // where its neighbours do not: the annotation is erased at build time, the setting
  // reads as ON for anything that is not exactly `false`, and it decides whether the
  // user's own writing leaves their machine. A malformed payload must therefore not be
  // stored — storing `undefined` would silently read as ON right after someone asked
  // for OFF. Ignore it and hand back the config as it stands, so the UI reverts to what
  // is actually persisted instead of showing a state nothing agreed to.
  ipcMain.handle('config:setPlanSyncEnabled', async (_event, { enabled }: { enabled: boolean }) => {
    if (typeof enabled !== 'boolean') return { config: readConfig() }
    const config = updatePlanSyncEnabled(enabled)
    return { config }
  })

  // Opt-in daily team digest (default OFF).
  ipcMain.handle('config:setDailyDigestEnabled', async (_event, { enabled }: { enabled: boolean }) => {
    const config = updateDailyDigestEnabled(enabled)
    return { config }
  })

  // OS notifications: master switch + per-kind opt-outs, patched one flag at a time.
  ipcMain.handle('config:setNotifications', async (_event, { patch }: { patch: Partial<NonNullable<Config['notifications']>> }) => {
    const config = updateNotifications(patch)
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

  ipcMain.handle('config:updateTheme', async (_event, { theme }: { theme: string }) => {
    if (!isValidTheme(theme)) {
      throw new Error(`Invalid theme: '${theme}'.`)
    }
    // Two destinations, on purpose: the cloud so the choice follows the user,
    // and the main process so the native chrome, the local cache and every
    // open window (tray popover, quick launch) follow immediately.
    const config = updateTheme(theme)
    applyTheme(theme)
    return { config }
  })

  ipcMain.handle('config:updateLanguage', async (_event, { language }: { language: string }) => {
    if (!isValidLanguage(language)) {
      throw new Error(`Invalid language: '${language}'.`)
    }
    // Same two destinations as the theme: the cloud so the choice follows the
    // user, and the main process so the menus, the tray, the local cache and
    // every open window switch immediately.
    const config = updateLanguage(language)
    applyLanguage(language)
    return { config }
  })

  ipcMain.handle('config:updateLaunchMode', async (_event, { mode }: { mode: string }) => {
    if (!isValidLaunchMode(mode)) {
      throw new Error(`Invalid launch mode: '${mode}'. Must be one of: plan, default, acceptEdits, auto, bypassPermissions.`)
    }
    const config = updateLaunchMode(mode)
    return { config }
  })

  ipcMain.handle('config:updateDefaultAgentType', async (_event, { type }: { type: string }) => {
    if (!isValidAgentType(type)) {
      throw new Error(`Invalid agent type: '${type}'. Must be one of: coder, planner.`)
    }
    const config = updateDefaultAgentType(type)
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
    readFileForPreview(repoPath, filePath, status, previewShikiTheme())
  )
}

/**
 * The shiki theme a preview is highlighted with.
 *
 * GitHub's own pair, because the diff chrome CodeView draws over the result (the
 * +/- rails, the gutter) is GitHub's palette too — mixing a third highlighter's
 * colours in would put two different greens on the same added line.
 */
const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const

/**
 * Which of the two to use right now: the app's theme, unless the reader pinned an
 * appearance in Settings → Appearance.
 *
 * Resolved HERE rather than inside `readFileForPreview`, which stays a pure
 * function of its arguments — it is the one part of this file with a test suite,
 * and reading process-wide state from it would mean stubbing the config and the
 * native theme to read a file off disk.
 */
function previewShikiTheme(): string {
  return SHIKI_THEMES[codeAppearance(currentTheme(), readConfig().codeTheme)]
}

/** Is `child` the directory itself, or something beneath it? Plain string containment. */
function contains(dir: string, child: string): boolean {
  return child === dir || child.startsWith(dir + path.sep)
}

/**
 * `shikiTheme` defaults to the dark one rather than being resolved in here: this
 * function is pure on purpose (see `previewShikiTheme`), and the app itself always
 * passes an answer. The default only serves callers that do not care — the tests.
 */
export async function readFileForPreview(
  repoPath: string,
  filePath: string,
  status?: string,
  shikiTheme: string = SHIKI_THEMES.dark,
): Promise<FilePreviewResult> {
  const resolvedRepo = path.resolve(repoPath)
  const resolvedFile = path.resolve(repoPath, filePath)

  if (!contains(resolvedRepo, resolvedFile)) {
    return { error: 'path_traversal' }
  }

  const ext = path.extname(filePath).toLowerCase()
  const mimeHint = ext.startsWith('.') ? ext.slice(1) : ext

  if (status === 'deleted') {
    // Reads a git OBJECT, not the working tree. It runs before any descriptor is
    // opened, because a deleted file has nothing on disk to open — the lexical
    // containment above is the whole check this path needs.
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
      const numbered = await highlightNumbered(textContent, mimeHint, shikiTheme)
      const highlightedHtml = numbered ? annotateShikiHtml(numbered, null, 'all-remove') : null
      // No `changesOnlyHtml`: every line of a deleted file is a change, so there is
      // nothing to collapse and nothing for the header's toggle to switch between.
      return { content: textContent, highlightedHtml, encoding: 'utf8', size: buffer.length, mimeHint }
    } catch {
      return { error: 'not_found' }
    }
  }

  // Everything below reads the working tree, and the lexical check at the top of this
  // function is not enough to authorise that: `path.resolve` never follows a symlink,
  // so a link sitting inside the tree can name a target anywhere on disk and satisfy
  // it. The canonical paths have to agree too — the same two-step `readSpecFile`
  // applies before reading a spec (main/store/spec-file.ts).
  //
  // It matters most for the spec panel, whose `repoPath` is the spec's own parent
  // directory: lexical containment holds there by construction, so canonical
  // containment is the only thing between a `.magic/spec-*.md` symlink and the file
  // it points at.
  //
  // The result is held as an OPEN DESCRIPTOR rather than as a pathname. A validated
  // string still has to be re-resolved by every later call, and each re-resolution is
  // a fresh opportunity to swap the file — or one of its ancestor directories —
  // between the check and the read. A descriptor names the object itself: once it is
  // open, nothing on disk can change what it refers to, so the race has no mechanism
  // left rather than a narrower window.
  //
  // Opening comes FIRST, and the validation is then done on what was actually opened
  // (`fstatSync`) compared against the canonical path's own identity. Validating a
  // name and opening it afterwards would leave exactly the gap this closes.
  let fd: number | null = null
  try {
    fd = fs.openSync(resolvedFile, 'r')
    const opened = fs.fstatSync(fd)

    const realRepo = fs.realpathSync(resolvedRepo)
    const realFile = fs.realpathSync(resolvedFile)
    const named = fs.statSync(realFile)

    // The canonical name must be inside the root, AND must still designate the very
    // object the descriptor holds. Different device or inode means the path was
    // swapped between the open and the resolution, so the authorisation just computed
    // does not apply to what would be read.
    if (!contains(realRepo, realFile) || named.ino !== opened.ino || named.dev !== opened.dev) {
      fs.closeSync(fd)
      return { error: 'path_traversal' }
    }
  } catch {
    // ENOENT on any of them — the file is not there. Nothing canonical to compare and
    // nothing readable to leak; a spec's path is announced before it is written, so
    // this is a normal first state. Report it the way it has always been reported.
    if (fd !== null) fs.closeSync(fd)
    return { error: 'not_found' }
  }

  // From here on every read goes through `fd` — the descriptor validated above — and
  // never through a pathname. `finally` closes it on every exit, including the early
  // returns for an oversized or binary file.
  let stat: fs.Stats
  let content: string
  try {
    stat = fs.fstatSync(fd)

    if (stat.size > 10 * 1024 * 1024) {
      return { error: 'too_large', size: stat.size }
    }

    if (IMAGE_EXTS.has(ext)) {
      const buffer = Buffer.alloc(stat.size)
      fs.readSync(fd, buffer, 0, buffer.length, 0)
      const mime = MIME_MAP[ext] ?? 'image/png'
      const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`
      return { content: dataUrl, encoding: 'image', size: stat.size, mimeHint }
    }

    // Null-byte scan: reliable binary detection without loading the full file
    const sample = Buffer.alloc(Math.min(512, stat.size))
    fs.readSync(fd, sample, 0, sample.length, 0)

    if (sample.includes(0)) {
      return { encoding: 'binary', size: stat.size, mimeHint }
    }

    const whole = Buffer.alloc(stat.size)
    fs.readSync(fd, whole, 0, whole.length, 0)
    content = whole.toString('utf8')
  } catch {
    return { error: 'not_found' }
  } finally {
    if (fd !== null) fs.closeSync(fd)
    fd = null
  }

  // Already numbered — see `highlightNumbered`. Every branch below starts from this
  // document, including the `catch` that throws the annotation away.
  const numbered = await highlightNumbered(content, mimeHint, shikiTheme)

  let highlightedHtml: string | null = numbered
  let changesOnlyHtml: string | undefined
  let changedLines: ChangedLines | undefined
  if (numbered) {
    if (status === 'added' || status === 'untracked') {
      highlightedHtml = annotateShikiHtml(numbered, null, 'all-add')
    } else if (status === 'modified' || status === 'renamed') {
      try {
        const diffOut = execFileSync('git', ['diff', 'HEAD', '--', filePath], { cwd: repoPath }).toString()
        const diff = parseDiff(diffOut)
        // Read the positions out BEFORE annotating. `annotateShikiHtml` drains
        // `removedBeforeLines` as it walks the document — it deletes each entry once it
        // has emitted the row — so afterwards there is nothing left to report.
        changedLines = {
          added: [...diff.addedNewLines].sort((a, b) => a - b),
          removedBefore: [...diff.removedBeforeLines.keys()].sort((a, b) => a - b),
        }
        // The file's own length, taken from the row count rather than from
        // `content.split('\n')`: a file ending in a newline gives shiki one extra
        // empty row, and the two numbers then disagree by one for the rest of the
        // computation — which is enough to lose the last line of the last region.
        const totalLines = countShikiRows(numbered)
        const annotated = annotateShikiHtml(numbered, diff, 'normal')
        // Assigned before the collapse is attempted, so a throw below can only cost
        // the changes-only view, never the full one the panel falls back to.
        highlightedHtml = annotated

        const ranges = computeVisibleRanges(
          [...changedLines.added, ...changedLines.removedBefore],
          totalLines,
          DIFF_CONTEXT_LINES,
        )
        // `null` means the regions already cover the file — a change on every line,
        // or a file short enough that the context reaches both ends. Emitting a
        // second copy of the same document would be pure IPC weight, and the absence
        // is also what tells the header there is no toggle to offer.
        if (ranges) changesOnlyHtml = renderRows(splitShikiLines(annotated), ranges, totalLines)
      } catch { /* leave unhighlighted on error */ }
    }
  }
  return { content, highlightedHtml, changesOnlyHtml, encoding: 'utf8', size: stat.size, mimeHint, changedLines }
}
