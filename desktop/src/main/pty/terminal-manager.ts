import * as pty from 'node-pty'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
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

// Status server port for hooks integration
let statusServerPort: number = 0

export function setStatusServerPort(port: number) {
  statusServerPort = port
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

  // Update activity time for working state
  if (newState === 'working') {
    lastActivityTime.set(terminalId, Date.now())
  } else if (newState === 'completed' || newState === 'idle') {
    lastActivityTime.delete(terminalId)
  }

  if (terminal.onStateChange) {
    terminal.onStateChange(newState, previousState)
  }
}

// Get the default shell for the current platform
function getDefaultShell(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'cmd.exe'
  }

  // Try common shells in order of preference
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

// Expand ~ to home directory
function expandPath(inputPath: string): string {
  if (!inputPath) return inputPath
  if (inputPath.startsWith('~')) {
    return path.join(os.homedir(), inputPath.slice(1))
  }
  return inputPath
}

export interface Terminal {
  id: string
  name: string
  pty: pty.IPty
  state: TerminalState
  repositories: string[]  // List of attached repository paths
  branchName: string | null
  cols: number
  rows: number
  createdAt: Date
  metadata: TerminalMetadata
  onStateChange?: (state: TerminalState, previousState: TerminalState) => void
  onBranchChange?: (branchName: string | null) => void
  onMetadataChange?: (metadata: TerminalMetadata) => void
  onRepositoriesChange?: (repositories: string[]) => void
}

const terminals = new Map<string, Terminal>()

// Buffer for terminal display history (for reconnection after refresh)
const displayBuffers = new Map<string, string>()
const DISPLAY_BUFFER_MAX_SIZE = 100000 // ~100KB per terminal

// Track last activity time (used by hooks)
const lastActivityTime = new Map<string, number>()

// Track terminals that were intentionally killed (to avoid auto-restart)
const intentionallyKilled = new Set<string>()

// Track restart attempts for exponential backoff (Phase 2.2)
interface RestartTracker {
  count: number
  firstAttempt: number
}
const restartTrackers = new Map<string, RestartTracker>()
const MAX_RESTARTS = 5
const RESTART_WINDOW_MS = 60_000
const RESTART_DELAYS = [500, 1000, 2000, 4000, 8000]
const STABLE_RUN_MS = 30_000

// Track PTY listener disposables for cleanup (Phase 2.3)
const ptyDisposables = new Map<string, Array<{ dispose: () => void }>>()

// Detect the current git branch for a given directory
function detectGitBranch(cwd: string): string | null {
  try {
    const result = execSync('/usr/bin/git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    if (!result || result === 'HEAD') return null
    return result
  } catch {
    return null
  }
}

export function createTerminal(
  id: string,
  name: string,
  cwd: string,
  onData: (data: string) => void,
  onStateChange: (state: TerminalState, previousState: TerminalState) => void,
  onExit: (exitCode: number) => void,
  onBranchChange?: (branchName: string | null) => void,
  onMetadataChange?: (metadata: TerminalMetadata) => void,
  onRepositoriesChange?: (repositories: string[]) => void,
  initialRepositories?: string[]
): Terminal {
  const shell = getDefaultShell()
  const expandedCwd = expandPath(cwd)

  // Ensure the cwd exists, fallback to Documents then home directory
  const defaultDir = path.join(os.homedir(), 'Documents')
  const workingDir = fs.existsSync(expandedCwd) ? expandedCwd : (fs.existsSync(defaultDir) ? defaultDir : os.homedir())

  // Use -l flag to spawn a login shell that loads the user's profile (.zshrc, .bashrc, etc.)
  // This enables zsh plugins like autosuggestions
  const ptyProcess = pty.spawn(shell, ['-l'], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: workingDir,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      HOME: os.homedir(),
      SHELL: shell,
      PATH: getShellPath(),
      // Magic Slash hook integration
      MAGIC_SLASH_TERMINAL_ID: id,
      MAGIC_SLASH_PORT: statusServerPort.toString(),
    }
  })

  // Detect initial git branch
  const initialBranch = detectGitBranch(workingDir)

  const terminal: Terminal = {
    id,
    name,
    pty: ptyProcess,
    state: 'idle',
    repositories: initialRepositories || [workingDir],
    branchName: initialBranch,
    cols: 120,
    rows: 30,
    createdAt: new Date(),
    metadata: createDefaultMetadata(),
    onStateChange,
    onBranchChange,
    onMetadataChange,
    onRepositoriesChange
  }

  terminals.set(id, terminal)
  displayBuffers.set(id, '')

  // Notify initial branch
  if (initialBranch && onBranchChange) {
    onBranchChange(initialBranch)
  }

  // Handle data output (store disposable for cleanup)
  const disposables: Array<{ dispose: () => void }> = []

  disposables.push(ptyProcess.onData((data: string) => {
    let displayBuffer = displayBuffers.get(id) || ''
    displayBuffer += data
    if (displayBuffer.length > DISPLAY_BUFFER_MAX_SIZE) {
      displayBuffer = displayBuffer.slice(-DISPLAY_BUFFER_MAX_SIZE)
    }
    displayBuffers.set(id, displayBuffer)

    onData(data)
  }))

  // Handle exit
  disposables.push(ptyProcess.onExit(({ exitCode }) => {
    terminal.state = exitCode === 0 ? 'completed' : 'error'
    onExit(exitCode)
  }))

  ptyDisposables.set(id, disposables)

  return terminal
}

export function writeToTerminal(id: string, data: string): void {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.pty.write(data)
    // State changes are now handled exclusively by Claude Code hooks
    // via updateTerminalStateFromHook() - no automatic state change on Enter
  }
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const terminal = terminals.get(id)
  if (terminal) {
    terminal.cols = cols
    terminal.rows = rows
    terminal.pty.resize(cols, rows)
  }
}

export function killTerminal(id: string): void {
  const terminal = terminals.get(id)
  if (terminal) {
    // Mark as intentionally killed to prevent auto-restart
    intentionallyKilled.add(id)
    // Dispose listeners before killing to prevent cascade
    const disposables = ptyDisposables.get(id)
    if (disposables) {
      for (const d of disposables) d.dispose()
      ptyDisposables.delete(id)
    }
    terminal.pty.kill()
    terminals.delete(id)
    displayBuffers.delete(id)
    lastActivityTime.delete(id)
    restartTrackers.delete(id)
  }
}

export function getTerminal(id: string): Terminal | undefined {
  return terminals.get(id)
}

// Get the current working directory of a terminal's PTY process
export function getTerminalCwd(id: string): string | null {
  const terminal = terminals.get(id)
  if (!terminal) return null

  try {
    const pid = terminal.pty.pid
    // On macOS, use lsof to get the cwd
    if (process.platform === 'darwin') {
      const { execSync } = require('child_process')
      const result = execSync(`lsof -p ${pid} | grep cwd | awk '{print $9}'`, {
        encoding: 'utf8',
        timeout: 2000,
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim()
      if (result) {
        return result
      }
    }
    // Fallback to first repository
    return terminal.repositories[0] || null
  } catch {
    return terminal.repositories[0] || null
  }
}

export function getAllTerminals(): Terminal[] {
  return Array.from(terminals.values())
}

export function cleanupAllTerminals(): void {
  for (const [id, terminal] of terminals) {
    try {
      const disposables = ptyDisposables.get(id)
      if (disposables) {
        for (const d of disposables) d.dispose()
      }
      terminal.pty.kill()
    } catch (e) {
      console.error(`Error killing terminal ${id}:`, e)
    }
  }
  terminals.clear()
  displayBuffers.clear()
  lastActivityTime.clear()
  ptyDisposables.clear()
  restartTrackers.clear()
}

// Get the display buffer for a terminal (used for reconnection after refresh)
export function getTerminalBuffer(id: string): string | null {
  const buffer = displayBuffers.get(id)
  return buffer !== undefined ? buffer : null
}

// Launch Claude Code in a terminal
export function launchClaude(
  id: string,
  name: string,
  cwd: string,
  onData: (data: string) => void,
  onStateChange: (state: TerminalState, previousState: TerminalState) => void,
  onExit: (exitCode: number) => void,
  onBranchChange?: (branchName: string | null) => void,
  onMetadataChange?: (metadata: TerminalMetadata) => void,
  initialMetadata?: TerminalMetadata,
  onRepositoriesChange?: (repositories: string[]) => void,
  initialRepositories?: string[]
): Terminal {
  const shell = getDefaultShell()
  const expandedCwd = expandPath(cwd)
  const defaultDir = path.join(os.homedir(), 'Documents')
  const workingDir = fs.existsSync(expandedCwd) ? expandedCwd : (fs.existsSync(defaultDir) ? defaultDir : os.homedir())

  // Track when PTY process started for stable-run detection
  let ptyStartTime = Date.now()

  // Function to create and attach a new PTY process
  const createPtyProcess = (currentCwd: string, cols: number = 120, rows: number = 30) => {
    const ptyProcess = pty.spawn(shell, ['-li', '-c', 'claude'], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: currentCwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        HOME: os.homedir(),
        SHELL: shell,
        PATH: getShellPath(),
        // Magic Slash hook integration
        MAGIC_SLASH_TERMINAL_ID: id,
        MAGIC_SLASH_PORT: statusServerPort.toString(),
      }
    })

    ptyStartTime = Date.now()

    // Store disposables for this PTY's listeners
    const disposables: Array<{ dispose: () => void }> = []

    // Handle data output
    disposables.push(ptyProcess.onData((data: string) => {
      let displayBuffer = displayBuffers.get(id) || ''
      displayBuffer += data
      if (displayBuffer.length > DISPLAY_BUFFER_MAX_SIZE) {
        displayBuffer = displayBuffer.slice(-DISPLAY_BUFFER_MAX_SIZE)
      }
      displayBuffers.set(id, displayBuffer)

      onData(data)

      // Reset restart counter if process has been running stably
      if (Date.now() - ptyStartTime > STABLE_RUN_MS) {
        restartTrackers.delete(id)
      }
    }))

    // Handle exit - auto-restart with backoff if not intentionally killed
    disposables.push(ptyProcess.onExit(({ exitCode }) => {
      // Check if this was an intentional kill
      if (intentionallyKilled.has(id)) {
        intentionallyKilled.delete(id)
        terminal.state = exitCode === 0 ? 'completed' : 'error'
        onExit(exitCode)
        return
      }

      // Check restart limits (exponential backoff)
      const now = Date.now()
      let tracker = restartTrackers.get(id)
      if (!tracker || (now - tracker.firstAttempt > RESTART_WINDOW_MS)) {
        tracker = { count: 0, firstAttempt: now }
      }
      tracker.count++
      restartTrackers.set(id, tracker)

      if (tracker.count > MAX_RESTARTS) {
        // Too many restarts — stop and show error
        const errorMsg = '\x1b[2J\x1b[H\x1b[31m--- Claude Code crashed too many times. Please restart the agent manually. ---\x1b[0m\r\n\r\n'
        onData(errorMsg)
        displayBuffers.set(id, errorMsg)
        terminal.state = 'error'
        if (terminal.onStateChange) {
          terminal.onStateChange('error', terminal.state)
        }
        onExit(exitCode)
        return
      }

      const delay = RESTART_DELAYS[Math.min(tracker.count - 1, RESTART_DELAYS.length - 1)]

      // Clear screen and add a visual message
      const clearAndRestart = `\x1b[2J\x1b[H\x1b[33m--- Claude Code exited, restarting (attempt ${tracker.count}/${MAX_RESTARTS})... ---\x1b[0m\r\n\r\n`
      onData(clearAndRestart)
      displayBuffers.set(id, clearAndRestart)

      // Restart after backoff delay
      setTimeout(() => {
        // Double-check terminal still exists and wasn't killed during the delay
        if (!terminals.has(id) || intentionallyKilled.has(id)) {
          intentionallyKilled.delete(id)
          return
        }

        // Dispose old listeners BEFORE killing old PTY to avoid cascade
        const oldDisposables = ptyDisposables.get(id)
        if (oldDisposables) {
          for (const d of oldDisposables) d.dispose()
        }

        // Kill the old PTY process
        try {
          terminal.pty.kill()
        } catch {
          // Already dead, ignore
        }

        // Create new PTY process and attach to terminal with current size
        const restartCwd = terminal.repositories[0] || workingDir
        const newPty = createPtyProcess(restartCwd, terminal.cols, terminal.rows)
        terminal.pty = newPty
        terminal.state = 'idle'

        // Notify state change
        if (terminal.onStateChange) {
          terminal.onStateChange('idle', 'error')
        }
      }, delay)
    }))

    ptyDisposables.set(id, disposables)

    return ptyProcess
  }

  // Detect initial git branch
  const initialBranch = detectGitBranch(workingDir)

  const ptyProcess = createPtyProcess(workingDir)

  const terminal: Terminal = {
    id,
    name,
    pty: ptyProcess,
    state: 'idle',
    repositories: initialRepositories || [workingDir],
    branchName: initialBranch,
    cols: 120,
    rows: 30,
    createdAt: new Date(),
    metadata: {
      ...createDefaultMetadata(),
      ...initialMetadata
    },
    onStateChange,
    onBranchChange,
    onMetadataChange,
    onRepositoriesChange
  }

  terminals.set(id, terminal)
  displayBuffers.set(id, '')

  // Notify initial branch
  if (initialBranch && onBranchChange) {
    onBranchChange(initialBranch)
  }

  return terminal
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
