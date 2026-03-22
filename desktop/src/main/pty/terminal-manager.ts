import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { execSync, spawn } from 'child_process'
import { updateAgentMetadata, updateAgentRepositories, createDefaultMetadata } from '../config/config'
import type { TerminalMetadata } from '../../types'
export type { TerminalMetadata }

export type TerminalState = 'idle' | 'working' | 'waiting' | 'completed' | 'error'

// Cached shell environment PATH (loaded once at startup)
let cachedShellPath: string | null = null

// Get the full PATH from user's shell environment
// This is needed because GUI apps on macOS don't inherit shell PATH
function getShellPath(): string {
  if (cachedShellPath) return cachedShellPath

  const home = os.homedir()

  // Common paths where CLI tools are installed
  const commonPaths = [
    path.join(home, '.local/bin'),           // claude CLI location
    path.join(home, '.npm-global/bin'),      // npm global
    path.join(home, '.nvm/versions/node'),   // nvm (will be expanded below)
    path.join(home, '.volta/bin'),           // Volta shims
    '/opt/homebrew/bin',                     // Homebrew on Apple Silicon
    '/opt/homebrew/sbin',
    '/usr/local/bin',                        // Homebrew on Intel / system
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin'
  ]

  // Try to find nvm node path (use semver sort instead of alphabetical)
  try {
    const nvmDir = path.join(home, '.nvm/versions/node')
    if (fs.existsSync(nvmDir)) {
      const versions = fs.readdirSync(nvmDir).sort((a, b) => {
        const parseVer = (v: string) => v.replace(/^v/, '').split('.').map(Number)
        const pa = parseVer(a)
        const pb = parseVer(b)
        for (let i = 0; i < 3; i++) {
          if ((pa[i] || 0) !== (pb[i] || 0)) return (pb[i] || 0) - (pa[i] || 0)
        }
        return 0
      })
      if (versions.length > 0) {
        commonPaths.unshift(path.join(nvmDir, versions[0], 'bin'))
      }
    }
  } catch {
    // Ignore nvm lookup errors
  }

  // Also try to get PATH from shell (may work in dev mode)
  const shell = getDefaultShell()
  try {
    const result = execSync(`${shell} -l -c 'echo $PATH'`, {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    if (result) {
      cachedShellPath = result
      return result
    }
  } catch {
    // Fall through to common paths
  }

  cachedShellPath = commonPaths.join(':')
  return cachedShellPath
}

// Get the default shell for the current platform
function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe'
  }

  const shells = [
    process.env.SHELL,
    '/bin/zsh',
    '/bin/bash',
    '/bin/sh'
  ]

  for (const shell of shells) {
    if (shell && fs.existsSync(shell)) {
      return shell
    }
  }

  return '/bin/sh'
}

// Update terminal state from hook callback
export function updateTerminalStateFromHook(terminalId: string, state: string) {
  const terminal = terminals.get(terminalId)
  if (!terminal) return

  const validStates: TerminalState[] = ['idle', 'working', 'waiting', 'completed', 'error']
  const newState = state as TerminalState

  if (!validStates.includes(newState)) return
  if (terminal.state === newState) return

  const previousState = terminal.state
  terminal.state = newState

  if (terminal.onStateChange) {
    terminal.onStateChange(newState, previousState)
  }
}

export interface Terminal {
  id: string
  name: string
  state: TerminalState
  repositories: string[]
  branchName: string | null
  createdAt: Date
  metadata: TerminalMetadata
  onStateChange?: (state: TerminalState, previousState: TerminalState) => void
  onBranchChange?: (branchName: string | null) => void
  onMetadataChange?: (metadata: TerminalMetadata) => void
  onRepositoriesChange?: (repositories: string[]) => void
}

const terminals = new Map<string, Terminal>()

// Register an agent (no PTY — overlay SDK handles communication)
export function registerAgent(
  id: string,
  name: string,
  repositories: string[],
  onStateChange?: (state: TerminalState, previousState: TerminalState) => void,
  onBranchChange?: (branchName: string | null) => void,
  onMetadataChange?: (metadata: TerminalMetadata) => void,
  onRepositoriesChange?: (repositories: string[]) => void,
  initialMetadata?: TerminalMetadata,
): Terminal {
  const terminal: Terminal = {
    id,
    name,
    state: 'idle',
    repositories,
    branchName: null,
    createdAt: new Date(),
    metadata: {
      ...createDefaultMetadata(),
      ...initialMetadata,
    },
    onStateChange,
    onBranchChange,
    onMetadataChange,
    onRepositoriesChange,
  }

  terminals.set(id, terminal)
  return terminal
}

export function killTerminal(id: string): void {
  terminals.delete(id)
}

export function getTerminal(id: string): Terminal | undefined {
  return terminals.get(id)
}

export function getAllTerminals(): Terminal[] {
  return Array.from(terminals.values())
}

export function cleanupAllTerminals(): void {
  terminals.clear()
}

// Update terminal metadata from hook callback
export function updateTerminalMetadataFromHook(terminalId: string, metadata: Partial<TerminalMetadata>) {
  const terminal = terminals.get(terminalId)
  if (!terminal) return

  // Merge repositoryMetadata instead of replacing it
  const existingRepoMetadata = terminal.metadata.repositoryMetadata || {}
  const newRepoMetadata = metadata.repositoryMetadata || {}
  const mergedRepoMetadata = { ...existingRepoMetadata, ...newRepoMetadata }

  // Merge new metadata with existing
  terminal.metadata = {
    ...terminal.metadata,
    ...metadata,
    repositoryMetadata: Object.keys(mergedRepoMetadata).length > 0 ? mergedRepoMetadata : undefined
  }

  // Persist metadata to disk
  try {
    updateAgentMetadata(terminalId, metadata)
  } catch (e) {
    console.error('[updateTerminalMetadataFromHook] Failed to persist metadata:', e)
  }

  if (terminal.onMetadataChange) {
    terminal.onMetadataChange(terminal.metadata)
  }
}

// Get terminal metadata
export function getTerminalMetadata(id: string): TerminalMetadata | null {
  const terminal = terminals.get(id)
  return terminal ? terminal.metadata : null
}

// Update terminal repositories from hook callback
export function updateTerminalRepositoriesFromHook(terminalId: string, repositories: string[]) {
  const terminal = terminals.get(terminalId)
  if (!terminal) return

  terminal.repositories = repositories

  // Persist repositories to disk
  try {
    updateAgentRepositories(terminalId, repositories)
  } catch (e) {
    console.error('[updateTerminalRepositoriesFromHook] Failed to persist repositories:', e)
  }

  if (terminal.onRepositoriesChange) {
    terminal.onRepositoriesChange(repositories)
  }
}

// Get terminal repositories
export function getTerminalRepositories(id: string): string[] | null {
  const terminal = terminals.get(id)
  return terminal ? terminal.repositories : null
}

// --- Overlay message system (via Claude Agent SDK) ---

// Expose getShellPath for the overlay SDK module
export function getShellPathForOverlay(): string {
  return getShellPath()
}

// Re-export overlay functions from the SDK module
export {
  sendOverlayMessage,
  respondToOverlay,
  resetOverlaySession,
  cleanupOverlay,
  abortOverlayQuery,
  getOverlaySessionId,
  setOverlaySessionId,
} from './overlay-sdk'

// Cache for Claude Code info (version, model, billing mode)
export interface ClaudeCodeInfo {
  version: string
  model: string
  accountType: string
}

let cachedClaudeInfo: ClaudeCodeInfo | null = null

export function getClaudeCodeInfo(): Promise<ClaudeCodeInfo> {
  if (cachedClaudeInfo) return Promise.resolve(cachedClaudeInfo)

  return new Promise((resolve) => {
    const shell = process.env.SHELL || '/bin/zsh'
    const cmd = `claude -p --output-format stream-json --verbose --max-turns 1`
    const proc = spawn(shell, ['-lc', cmd], {
      cwd: os.homedir(),
      env: { ...process.env, HOME: os.homedir(), SHELL: shell, PATH: getShellPath() },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let buffer = ''
    let resolved = false

    const fallback: ClaudeCodeInfo = { version: 'unknown', model: 'unknown', accountType: 'unknown' }

    proc.stdout?.on('data', (chunk: Buffer) => {
      if (resolved) return
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const parsed = JSON.parse(trimmed)
          if (parsed.type === 'system' && parsed.subtype === 'init') {
            resolved = true
            cachedClaudeInfo = {
              version: parsed.claude_code_version || 'unknown',
              model: parsed.model || 'unknown',
              accountType: parsed.apiKeySource || 'unknown',
            }
            proc.kill()
            resolve(cachedClaudeInfo)
            return
          }
        } catch { /* skip non-JSON */ }
      }
    })

    // Write a trivial prompt and close stdin
    proc.stdin?.write('hi\n')
    proc.stdin?.end()

    proc.on('close', () => {
      if (!resolved) {
        resolved = true
        resolve(fallback)
      }
    })

    // Timeout after 10s
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        proc.kill()
        resolve(fallback)
      }
    }, 10000)
  })
}
