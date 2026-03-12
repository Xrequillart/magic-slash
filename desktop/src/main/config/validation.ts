import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'

// Get extended PATH for git commands (GUI apps on macOS don't inherit shell PATH)
function getExtendedPath(): string {
  const home = os.homedir()
  const commonPaths = [
    '/opt/homebrew/bin',      // Homebrew on Apple Silicon
    '/opt/homebrew/sbin',
    '/usr/local/bin',         // Homebrew on Intel / system
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    path.join(home, '.local/bin'),
  ]
  return [...commonPaths, process.env.PATH || ''].join(':')
}

// Execute git command with proper PATH
function execGitSync(command: string, cwd: string): string {
  const extendedPath = getExtendedPath()
  const gitPath = '/usr/bin/git'
  const fullCommand = command.replace(/^git\s/, `${gitPath} `)
  return execSync(fullCommand, {
    cwd,
    encoding: 'utf8',
    timeout: 3000,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, PATH: extendedPath }
  })
}

export interface ValidationResult {
  valid: boolean
  error?: string
  warning?: string
  expandedPath?: string
}

export interface GitCheckResult {
  isGit: boolean
  exists: boolean
  expandedPath?: string
}

export interface PRTemplateResult {
  exists: boolean
  path?: string
  fullPath?: string
  content?: string
}

export interface CreateTemplateResult {
  success: boolean
  path: string
  fullPath: string
}

export function validateRepoName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' }
  }

  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return { valid: false, error: 'Name cannot be empty' }
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' }
  }

  const validPattern = /^[a-zA-Z0-9_-]+$/
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, numbers, hyphens and underscores' }
  }

  return { valid: true }
}

export function expandPath(inputPath: string): string {
  if (!inputPath) return inputPath

  // Trim whitespace and newlines
  const trimmed = inputPath.trim()

  if (trimmed.startsWith('~')) {
    return path.join(os.homedir(), trimmed.slice(1))
  }
  return trimmed
}

export function validateRepoPath(repoPath: string): ValidationResult {
  if (!repoPath || typeof repoPath !== 'string') {
    return { valid: false, error: 'Path is required', expandedPath: '' }
  }

  const expandedPath = expandPath(repoPath.trim())

  if (expandedPath.length === 0) {
    return { valid: false, error: 'Path cannot be empty', expandedPath }
  }

  // Check if directory exists
  if (!fs.existsSync(expandedPath)) {
    return {
      valid: true,
      warning: 'Directory does not exist',
      expandedPath
    }
  }

  // Check if it's a directory
  const stats = fs.statSync(expandedPath)
  if (!stats.isDirectory()) {
    return {
      valid: false,
      error: 'Path is not a directory',
      expandedPath
    }
  }

  // Check if it's a git repository
  const gitPath = path.join(expandedPath, '.git')
  if (!fs.existsSync(gitPath)) {
    return {
      valid: true,
      warning: 'Not a git repository',
      expandedPath
    }
  }

  return { valid: true, expandedPath }
}

export function isGitRepository(repoPath: string): GitCheckResult {
  const expandedPath = expandPath(repoPath)

  if (!fs.existsSync(expandedPath)) {
    return { isGit: false, exists: false }
  }

  const gitPath = path.join(expandedPath, '.git')
  const isGit = fs.existsSync(gitPath)

  return { isGit, exists: true, expandedPath }
}

export function hasGitHubRemote(repoPath: string): boolean {
  const expandedPath = expandPath(repoPath)

  if (!fs.existsSync(expandedPath)) {
    return false
  }

  try {
    const result = execGitSync('git remote -v', expandedPath)
    // Check if any remote URL contains github.com
    return result.includes('github.com')
  } catch {
    return false
  }
}

export interface GitFileStatus {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
  staged: boolean
}

export interface GitStatusResult {
  branch: string
  files: GitFileStatus[]
  ahead: number
  behind: number
}

export function getGitStatus(repoPath: string): GitStatusResult | null {
  const expandedPath = expandPath(repoPath)

  if (!fs.existsSync(expandedPath)) {
    return null
  }

  try {
    // Get branch name
    const branch = execGitSync('git branch --show-current', expandedPath).trim()

    // Get ahead/behind counts
    let ahead = 0
    let behind = 0
    try {
      const status = execGitSync('git status -sb', expandedPath)
      const match = status.match(/\[ahead (\d+)(?:, behind (\d+))?\]|\[behind (\d+)\]/)
      if (match) {
        ahead = parseInt(match[1] || '0', 10)
        behind = parseInt(match[2] || match[3] || '0', 10)
      }
    } catch {
      // Ignore errors for ahead/behind
    }

    // Get file statuses using porcelain format
    const statusOutput = execGitSync('git status --porcelain', expandedPath)

    const files: GitFileStatus[] = []
    const lines = statusOutput.split('\n').filter(line => line.trim())

    for (const line of lines) {
      const indexStatus = line[0]
      const workTreeStatus = line[1]
      const filePath = line.slice(3).trim()

      // Determine status
      let status: GitFileStatus['status'] = 'modified'
      let staged = false

      if (indexStatus === '?' && workTreeStatus === '?') {
        status = 'untracked'
      } else if (indexStatus === 'A' || workTreeStatus === 'A') {
        status = 'added'
        staged = indexStatus === 'A'
      } else if (indexStatus === 'D' || workTreeStatus === 'D') {
        status = 'deleted'
        staged = indexStatus === 'D'
      } else if (indexStatus === 'R' || workTreeStatus === 'R') {
        status = 'renamed'
        staged = indexStatus === 'R'
      } else if (indexStatus === 'M' || workTreeStatus === 'M') {
        status = 'modified'
        staged = indexStatus === 'M'
      }

      files.push({ path: filePath, status, staged })
    }

    return { branch, files, ahead, behind }
  } catch {
    return null
  }
}

export interface GitDiffStats {
  additions: number
  deletions: number
  filesChanged: number
  isGitRepo: boolean
  files: Array<{
    path: string
    additions: number
    deletions: number
    status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
  }>
}

export function getGitDiffStats(repoPath: string): GitDiffStats {
  const expandedPath = expandPath(repoPath)
  const emptyResult: GitDiffStats = { additions: 0, deletions: 0, filesChanged: 0, isGitRepo: false, files: [] }

  if (!fs.existsSync(expandedPath)) {
    return emptyResult
  }

  // Check if it's a git repo (including worktrees)
  try {
    execGitSync('git rev-parse --git-dir', expandedPath)
  } catch {
    return emptyResult
  }

  try {
    let additions = 0
    let deletions = 0
    let filesChanged = 0
    const files: GitDiffStats['files'] = []

    // Get numstat for tracked files (staged + unstaged changes)
    // This gives us additions and deletions per file
    try {
      const numstat = execGitSync('git diff --numstat HEAD', expandedPath)

      const lines = numstat.split('\n').filter(line => line.trim())
      for (const line of lines) {
        const parts = line.split('\t')
        if (parts.length >= 3) {
          const add = parseInt(parts[0], 10)
          const del = parseInt(parts[1], 10)
          const filePath = parts[2]
          if (!isNaN(add)) additions += add
          if (!isNaN(del)) deletions += del
          filesChanged++
          files.push({
            path: filePath,
            additions: isNaN(add) ? 0 : add,
            deletions: isNaN(del) ? 0 : del,
            status: 'modified'
          })
        }
      }
    } catch {
      // If HEAD doesn't exist (new repo), try without HEAD
      try {
        const numstat = execGitSync('git diff --numstat', expandedPath)

        const lines = numstat.split('\n').filter(line => line.trim())
        for (const line of lines) {
          const parts = line.split('\t')
          if (parts.length >= 3) {
            const add = parseInt(parts[0], 10)
            const del = parseInt(parts[1], 10)
            const filePath = parts[2]
            if (!isNaN(add)) additions += add
            if (!isNaN(del)) deletions += del
            filesChanged++
            files.push({
              path: filePath,
              additions: isNaN(add) ? 0 : add,
              deletions: isNaN(del) ? 0 : del,
              status: 'modified'
            })
          }
        }
      } catch {
        // Ignore
      }
    }

    // Get file statuses to determine added/deleted/renamed
    try {
      const statusOutput = execGitSync('git status --porcelain', expandedPath)
      const statusLines = statusOutput.split('\n').filter(line => line.trim())

      for (const line of statusLines) {
        const indexStatus = line[0]
        const workTreeStatus = line[1]
        const filePath = line.slice(3).trim()

        // Determine status
        let status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' = 'modified'

        if (indexStatus === '?' && workTreeStatus === '?') {
          status = 'untracked'
        } else if (indexStatus === 'A' || workTreeStatus === 'A') {
          status = 'added'
        } else if (indexStatus === 'D' || workTreeStatus === 'D') {
          status = 'deleted'
        } else if (indexStatus === 'R' || workTreeStatus === 'R') {
          status = 'renamed'
        }

        // Update status in files array or add new entry for untracked
        const existingFile = files.find(f => f.path === filePath)
        if (existingFile) {
          existingFile.status = status
        } else if (status === 'untracked') {
          files.push({
            path: filePath,
            additions: 0,
            deletions: 0,
            status: 'untracked'
          })
          filesChanged++
        }
      }
    } catch {
      // Ignore
    }

    return { additions, deletions, filesChanged, isGitRepo: true, files }
  } catch {
    return { additions: 0, deletions: 0, filesChanged: 0, isGitRepo: true, files: [] }
  }
}

export function parseKeywords(keywordsInput: string): string[] {
  if (!keywordsInput || typeof keywordsInput !== 'string') {
    return []
  }

  return keywordsInput
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0)
}

export function getPRTemplate(repoPath: string): PRTemplateResult {
  const expandedPath = expandPath(repoPath)

  // Common PR template locations
  const templatePaths = [
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/pull_request_template.md',
    'docs/pull_request_template.md',
    'PULL_REQUEST_TEMPLATE.md',
    'pull_request_template.md'
  ]

  for (const templatePath of templatePaths) {
    const fullPath = path.join(expandedPath, templatePath)
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8')
        return {
          exists: true,
          path: templatePath,
          fullPath,
          content
        }
      } catch (error) {
        console.error('Error reading PR template:', error)
      }
    }
  }

  return { exists: false }
}

export function createPRTemplate(repoPath: string, content?: string, language: string = 'en'): CreateTemplateResult {
  const expandedPath = expandPath(repoPath)
  const githubDir = path.join(expandedPath, '.github')
  const templatePath = path.join(githubDir, 'PULL_REQUEST_TEMPLATE.md')

  // Create .github directory if it doesn't exist
  if (!fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir, { recursive: true })
  }

  // Default templates
  const defaultTemplates: Record<string, string> = {
    en: `## Summary

<!-- Briefly describe what this PR does -->

## Changes

<!-- List the main changes -->

-

## How to test

<!-- Step-by-step instructions to test -->

1.
2.
3.

## Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated (if needed)
`,
    fr: `## Resumen

<!-- Decrivez brievement ce que fait cette PR -->

## Changements

<!-- Listez les principaux changements -->

-

## Comment tester

<!-- Instructions etape par etape pour tester -->

1.
2.
3.

## Checklist

- [ ] Le code respecte les conventions du projet
- [ ] Tests ajoutes/mis a jour
- [ ] Documentation mise a jour (si necessaire)
`
  }

  const templateContent = content || defaultTemplates[language] || defaultTemplates.en

  try {
    fs.writeFileSync(templatePath, templateContent)
    return {
      success: true,
      path: '.github/PULL_REQUEST_TEMPLATE.md',
      fullPath: templatePath
    }
  } catch (error) {
    console.error('Error creating PR template:', error)
    throw error
  }
}

export function updatePRTemplate(repoPath: string, content: string): CreateTemplateResult {
  const template = getPRTemplate(repoPath)

  if (!template.exists || !template.fullPath) {
    throw new Error('PR template not found')
  }

  try {
    fs.writeFileSync(template.fullPath, content)
    return {
      success: true,
      path: template.path!,
      fullPath: template.fullPath
    }
  } catch (error) {
    console.error('Error updating PR template:', error)
    throw error
  }
}

export interface BranchCommit {
  hash: string
  shortHash: string
  subject: string
  author: string
  date: string
  relativeDate: string
  isPushed: boolean
}

export interface BranchCommitsResult {
  commits: BranchCommit[]
  baseBranch: string
  currentBranch: string
  isGitRepo: boolean
}

export function getGitHubRepoUrl(repoPath: string): string | null {
  const expandedPath = expandPath(repoPath)

  if (!fs.existsSync(expandedPath)) {
    return null
  }

  try {
    const remoteUrl = execGitSync('git remote get-url origin', expandedPath).trim()

    // Parse SSH format: git@github.com:owner/repo.git
    const sshMatch = remoteUrl.match(/^git@github\.com:(.+?)(?:\.git)?$/)
    if (sshMatch) {
      return `https://github.com/${sshMatch[1]}`
    }

    // Parse HTTPS format: https://github.com/owner/repo.git
    const httpsMatch = remoteUrl.match(/^https?:\/\/github\.com\/(.+?)(?:\.git)?$/)
    if (httpsMatch) {
      return `https://github.com/${httpsMatch[1]}`
    }

    return null
  } catch {
    return null
  }
}

export function getBranchCommits(repoPath: string, targetBranch?: string): BranchCommitsResult {
  const expandedPath = expandPath(repoPath)
  const emptyResult: BranchCommitsResult = { commits: [], baseBranch: '', currentBranch: '', isGitRepo: false }

  if (!fs.existsSync(expandedPath)) {
    return emptyResult
  }

  try {
    // Check if it's a git repo
    execGitSync('git rev-parse --git-dir', expandedPath)
  } catch {
    return emptyResult
  }

  try {
    // Get current branch
    const currentBranch = execGitSync('git branch --show-current', expandedPath).trim()

    if (!currentBranch) {
      return { ...emptyResult, isGitRepo: true }
    }

    // Determine base branch
    let baseBranch = ''

    // If targetBranch is provided, try to use it
    if (targetBranch) {
      try {
        execGitSync(`git rev-parse --verify ${targetBranch}`, expandedPath)
        baseBranch = targetBranch
      } catch {
        // Try with origin/ prefix
        try {
          execGitSync(`git rev-parse --verify origin/${targetBranch}`, expandedPath)
          baseBranch = `origin/${targetBranch}`
        } catch {
          // Target branch not found, fall through to auto-detection
        }
      }
    }

    // Auto-detect base branch if not set (main or master)
    if (!baseBranch) {
      try {
        execGitSync('git rev-parse --verify main', expandedPath)
        baseBranch = 'main'
      } catch {
        try {
          execGitSync('git rev-parse --verify master', expandedPath)
          baseBranch = 'master'
        } catch {
          // Neither main nor master exists, try origin/main or origin/master
          try {
            execGitSync('git rev-parse --verify origin/main', expandedPath)
            baseBranch = 'origin/main'
          } catch {
            try {
              execGitSync('git rev-parse --verify origin/master', expandedPath)
              baseBranch = 'origin/master'
            } catch {
              // No base branch found
              return { commits: [], baseBranch: '', currentBranch, isGitRepo: true }
            }
          }
        }
      }
    }

    // If we're on the base branch, no commits to show
    if (currentBranch === baseBranch || currentBranch === baseBranch.replace('origin/', '')) {
      return { commits: [], baseBranch, currentBranch, isGitRepo: true }
    }

    // Get commits between base branch and current branch
    // Format: hash|shortHash|subject|author|date|relativeDate
    const logFormat = '%H|%h|%s|%an|%ad|%ar'
    const logOutput = execGitSync(
      `git log ${baseBranch}..HEAD --format="${logFormat}" --date=short`,
      expandedPath
    )

    // Get pushed commits on origin/currentBranch to determine which are pushed
    let pushedHashes: Set<string> = new Set()
    try {
      const pushedOutput = execGitSync(
        `git log origin/${currentBranch} --format="%H"`,
        expandedPath
      )
      pushedHashes = new Set(pushedOutput.split('\n').map(h => h.trim()).filter(Boolean))
    } catch {
      // origin/branch doesn't exist - no commits are pushed
    }

    const commits: BranchCommit[] = []
    const lines = logOutput.split('\n').filter(line => line.trim())

    for (const line of lines) {
      const parts = line.split('|')
      if (parts.length >= 6) {
        const hash = parts[0]
        commits.push({
          hash,
          shortHash: parts[1],
          subject: parts[2],
          author: parts[3],
          date: parts[4],
          relativeDate: parts[5],
          isPushed: pushedHashes.has(hash),
        })
      }
    }

    return { commits, baseBranch, currentBranch, isGitRepo: true }
  } catch (error) {
    console.error('[getBranchCommits] Error:', error)
    return { commits: [], baseBranch: '', currentBranch: '', isGitRepo: true }
  }
}
