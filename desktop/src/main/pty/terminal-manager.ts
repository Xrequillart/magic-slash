import * as pty from 'node-pty'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { execSync, execFileSync } from 'child_process'
import { claudeThemeFlag } from '../claude-theme'
import { readConfig } from '../config/config'
import { updateAgentMetadata, updateAgentRepositories, createDefaultMetadata, mergeMetadata } from '../config/agents'
import { withDetectedBranch } from './initial-metadata'
import { createTuiReadyScanner } from './tui-ready'
import { bufferOutlivesExit } from './exited-buffer'
import { expandPath } from '../config/validation'
import { resolveAgentCwd } from './agent-cwd'
import { getCommonPaths } from '../utils/paths'
import { clearPendingQuestion, clearAllPendingQuestions } from '../questions/pending-questions'
import type { TerminalMetadata, TerminalState, LaunchMode, TerminalUsage, InitialPromptMode } from '../../types'
export type { TerminalMetadata, TerminalState }

const DEFAULT_PTY_ROWS = 40

// Cached shell environment PATH (loaded once at startup)
let cachedShellPath: string | null = null

// Get the full PATH from user's shell environment
// This is needed because GUI apps on macOS don't inherit shell PATH
function getShellPath(): string {
  if (cachedShellPath) return cachedShellPath

  const home = os.homedir()
  const commonPaths = [
    ...getCommonPaths(),
    path.join(home, '.nvm/versions/node'),   // nvm (will be expanded below)
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
    const result = execFileSync(shell, ['-l', '-c', 'echo $PATH'], {
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

// User's pre-existing statusLine command, preserved and chained by our wrapper script.
// Empty string means the user had no statusLine (wrapper stays silent in-terminal).
let innerStatusLine: string = ''

export function setInnerStatusLine(command: string) {
  innerStatusLine = command || ''
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
  isRestarting?: boolean
  /** Where the CURRENT PTY was spawned. Compared against the directory the
   *  agent's repositories resolve to, to know whether it is running in the
   *  wrong place — see syncTerminalCwd. */
  cwd: string
  /** The folder the agent was created in, kept as the fallback for when none of
   *  its attached paths is usable. Never changes over the agent's life. */
  launchDir: string
  /** Whether this session has ever been talked to — a keystroke, or a prompt
   *  passed at launch. A session nobody has said anything to holds nothing worth
   *  keeping, which is what makes a silent relaunch safe. */
  hasUserInput?: boolean
  /** Every model.id the statusLine has reported for this session, in order of
   *  first appearance (a Set iterates in insertion order). Lives on the terminal
   *  rather than in a module map so it survives a respawn and dies with the
   *  object — more than one entry means a /model switch happened mid-session and
   *  the end-of-session snapshot describes only the last model. */
  modelIds?: Set<string>
  /** Replaces the running Claude Code with a fresh one in a given directory.
   *  Only set for agents (launchClaude), not for plain shells. */
  respawn?: (cwd: string, notice?: string) => void
}

const terminals = new Map<string, Terminal>()

// Buffer for terminal display history (for reconnection after refresh)
const displayBuffers = new Map<string, string>()
const DISPLAY_BUFFER_MAX_SIZE = 100000 // ~100KB per terminal

// Append data to a terminal's display buffer, truncating on a newline boundary when too large
function appendToDisplayBuffer(id: string, data: string): void {
  let buf = (displayBuffers.get(id) || '') + data
  if (buf.length > DISPLAY_BUFFER_MAX_SIZE) {
    const sliced = buf.slice(-DISPLAY_BUFFER_MAX_SIZE)
    const firstNewline = sliced.indexOf('\n')
    buf = firstNewline > 0 ? sliced.slice(firstNewline + 1) : sliced
    // Reset ANSI state to prevent color bleeding from truncated escape sequences
    buf = '\x1b[0m' + buf
  }
  displayBuffers.set(id, buf)
}

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

/**
 * How long to wait for the input box to announce itself before typing a draft
 * anyway. See `./tui-ready` for the announcement.
 *
 * The fallback is the whole reason this is a timeout and not a promise: if a future
 * version stops enabling bracketed paste, the draft still arrives — a stray echo
 * above the banner is a blemish, a prompt that never appears is a broken button.
 */
const TUI_READY_TIMEOUT_MS = 8_000

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
  initialRepositories?: string[],
  options?: { loginShell?: boolean }
): Terminal {
  const shell = getDefaultShell()
  const expandedCwd = expandPath(cwd)

  // Ensure the cwd exists, fallback to Documents then home directory
  const defaultDir = path.join(os.homedir(), 'Documents')
  const workingDir = fs.existsSync(expandedCwd) ? expandedCwd : (fs.existsSync(defaultDir) ? defaultDir : os.homedir())

  // Use -l flag for login shells to load the user's profile (.zshrc, .bashrc, etc.)
  // Script terminals use a plain shell to avoid background job notifications from profile hooks
  const shellArgs = (options?.loginShell ?? true) ? ['-l'] : []
  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-256color',
    cols: 120,
    rows: DEFAULT_PTY_ROWS,
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
      ...(statusServerPort > 0 ? { MAGIC_SLASH_PORT: statusServerPort.toString() } : {}),
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
    rows: DEFAULT_PTY_ROWS,
    createdAt: new Date(),
    metadata: withDetectedBranch(createDefaultMetadata(), initialBranch),
    onStateChange,
    onBranchChange,
    onMetadataChange,
    onRepositoriesChange,
    cwd: workingDir,
    launchDir: workingDir
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
    appendToDisplayBuffer(id, data)
    onData(data)
  }))

  // Handle exit
  disposables.push(ptyProcess.onExit(({ exitCode }) => {
    terminal.state = exitCode === 0 ? 'completed' : 'error'
    // A FAILED process leaves its output behind — that is what makes it readable in the
    // dialog opened from the card the failure leaves on screen, and `killTerminal` is
    // what frees it when that card goes. A clean exit keeps nothing: see
    // `bufferOutlivesExit` for why the two are not symmetric.
    if (!bufferOutlivesExit(exitCode)) displayBuffers.delete(id)
    // Nothing can answer a question whose process is gone.
    clearPendingQuestion(id)
    onExit(exitCode)
  }))

  ptyDisposables.set(id, disposables)

  return terminal
}

/**
 * Returns whether the data actually reached a PTY.
 *
 * An unknown id is a silent no-op, which is fine for the callers that fire and
 * forget — but the menu bar panel reports back to the user whether their answer
 * was delivered, and "written nowhere" must not read as success there.
 */
export function writeToTerminal(id: string, data: string): boolean {
  const terminal = terminals.get(id)
  if (!terminal) return false
  try {
    terminal.pty.write(data)
  } catch (e) {
    console.error(`[writeToTerminal] Failed to write to terminal ${id}:`, e)
    return false
  }
  // State changes are now handled exclusively by Claude Code hooks
  // via updateTerminalStateFromHook() - no automatic state change on Enter
  return true
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const terminal = terminals.get(id)
  if (!terminal) return
  if (isNaN(cols) || isNaN(rows)) return
  cols = Math.max(1, Math.floor(cols))
  rows = Math.max(1, Math.floor(rows))
  // Skip if dimensions haven't changed to avoid unnecessary SIGWINCH
  if (terminal.cols === cols && terminal.rows === rows) return
  terminal.cols = cols
  terminal.rows = rows
  terminal.pty.resize(cols, rows)
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
    clearPendingQuestion(id)
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
    if (!Number.isInteger(pid) || pid <= 0) {
      return terminal.repositories[0] || null
    }
    // On macOS, use lsof to get the cwd
    if (process.platform === 'darwin') {
      const result = execFileSync('lsof', ['-p', String(pid), '-Fn'], {
        encoding: 'utf8',
        timeout: 2000,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      // lsof -Fn outputs lines starting with 'f' for file descriptor and 'n' for name
      // Find the cwd entry: look for 'fcwd' followed by 'n<path>'
      const lines = result.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === 'fcwd' && i + 1 < lines.length && lines[i + 1].startsWith('n')) {
          const cwdPath = lines[i + 1].slice(1)
          if (cwdPath) return cwdPath
        }
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
  clearAllPendingQuestions()
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
  initialRepositories?: string[],
  initialPrompt?: string,
  launchModeOverride?: LaunchMode,
  initialPromptMode: InitialPromptMode = 'run'
): Terminal {
  const shell = getDefaultShell()
  const expandedCwd = expandPath(cwd)
  const defaultDir = path.join(os.homedir(), 'Documents')
  const workingDir = fs.existsSync(expandedCwd) ? expandedCwd : (fs.existsSync(defaultDir) ? defaultDir : os.homedir())

  // Track when PTY process started for stable-run detection
  let ptyStartTime = Date.now()

  // Only hand the prompt over on first spawn, not on restarts — a restart is a crash
  // recovery, and re-running (or re-typing) the opening prompt into a session that may
  // already have acted on it is worse than starting quiet.
  //
  // Two variables because the two modes reach Claude Code by different roads and can
  // never both be taken: `run` puts the prompt on the command line, `draft` types it
  // into the input box once the TUI is up. See `InitialPromptMode`.
  let pendingPrompt = initialPromptMode === 'run' ? (initialPrompt || null) : null
  let pendingDraft = initialPromptMode === 'draft' ? (initialPrompt || null) : null

  // Function to create and attach a new PTY process
  const createPtyProcess = (currentCwd: string, cols: number = 120, rows: number = DEFAULT_PTY_ROWS) => {
    const launchMode = launchModeOverride ?? readConfig().launchMode
    const modeFlag = launchMode && launchMode !== 'default' ? ` --permission-mode ${launchMode}` : ''
    // Resolved per spawn rather than per terminal, so a restart picks up a theme
    // (or a setting) changed while the session was running.
    const themeFlag = claudeThemeFlag()
    const claudeCmd = pendingPrompt
      ? `claude${modeFlag}${themeFlag} ${JSON.stringify(pendingPrompt)}`
      : `claude${modeFlag}${themeFlag}`
    pendingPrompt = null
    const ptyProcess = pty.spawn(shell, ['-li', '-c', claudeCmd], {
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
        ...(statusServerPort > 0 ? { MAGIC_SLASH_PORT: statusServerPort.toString() } : {}),
        // Chained statusLine: the wrapper relays the user's original statusLine if any
        ...(innerStatusLine ? { MAGIC_SLASH_INNER_STATUSLINE: innerStatusLine } : {}),
      }
    })

    ptyStartTime = Date.now()

    // Store disposables for this PTY's listeners
    const disposables: Array<{ dispose: () => void }> = []

    /**
     * The draft this spawn still owes the input box, and the machinery that gets it
     * there — see `TUI_READY_MARKER`.
     *
     * Claimed out of `pendingDraft` here rather than read from it below, for the same
     * reason `pendingPrompt` is nulled at the top: a restart must not retype it.
     *
     * Written with NO trailing carriage return, which is the entire point of the mode:
     * the text lands in the box as if it had been typed, and the person adds their own
     * words and presses Return themselves.
     */
    let pendingType = pendingDraft
    pendingDraft = null
    const tuiReady = createTuiReadyScanner()
    let draftTimer: ReturnType<typeof setTimeout> | null = null

    const typeDraft = () => {
      const text = pendingType
      pendingType = null
      if (draftTimer) {
        clearTimeout(draftTimer)
        draftTimer = null
      }
      if (!text) return
      try {
        ptyProcess.write(text)
      } catch (e) {
        console.error(`[launchClaude] Failed to type the opening draft into terminal ${id}:`, e)
      }
    }

    if (pendingType) {
      draftTimer = setTimeout(typeDraft, TUI_READY_TIMEOUT_MS)
      // Disposed with the listeners, so a terminal killed during startup does not fire
      // a write at a PTY that is already gone.
      disposables.push({
        dispose: () => {
          if (draftTimer) clearTimeout(draftTimer)
          draftTimer = null
          pendingType = null
        },
      })
    }

    // Handle data output
    disposables.push(ptyProcess.onData((data: string) => {
      appendToDisplayBuffer(id, data)
      onData(data)

      // The input box just opened: type the draft into it.
      if (pendingType && tuiReady.seen(data)) typeDraft()

      // Reset restart counter if process has been running stably
      if (Date.now() - ptyStartTime > STABLE_RUN_MS) {
        restartTrackers.delete(id)
      }
    }))

    // Handle exit - auto-restart with backoff if not intentionally killed
    disposables.push(ptyProcess.onExit(({ exitCode }) => {
      // Cleared here, before any of the branches below, because all of them mean the
      // same thing for a pending question: the process that asked it is gone. A
      // restarted Claude Code has no memory of the prompt either, so keystrokes aimed
      // at it would land in a fresh session.
      clearPendingQuestion(id)

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
        displayBuffers.delete(id)
        const previousStateBeforeError = terminal.state
        terminal.state = 'error'
        if (terminal.onStateChange) {
          terminal.onStateChange('error', previousStateBeforeError)
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
      terminal.isRestarting = true
      setTimeout(() => {
        // Double-check terminal still exists and wasn't killed during the delay
        if (!terminals.has(id) || intentionallyKilled.has(id) || terminals.get(id) !== terminal) {
          intentionallyKilled.delete(id)
          terminal.isRestarting = false
          return
        }

        try {
          // Repositories attached since the first spawn are honored here, so an
          // agent bound to a repo after launch restarts inside that repo.
          respawnInCwd(resolveAgentCwd(terminal.repositories, workingDir))
        } catch (e) {
          console.error(`[launchClaude] Restart failed for terminal ${id}:`, e)
          terminal.isRestarting = false
          const previousStateBeforeFailure = terminal.state
          terminal.state = 'error'
          if (terminal.onStateChange) {
            terminal.onStateChange('error', previousStateBeforeFailure)
          }
          onExit(1)
        }
      }, delay)
    }))

    ptyDisposables.set(id, disposables)

    return ptyProcess
  }

  /**
   * Replaces the running Claude Code with a fresh one in `targetCwd`, keeping the
   * terminal's identity, size, metadata and place in the UI.
   *
   * Shared by the crash auto-restart and by the deliberate relaunch that follows
   * attaching a repository: both need this exact sequence, and the order matters —
   * the old listeners are disposed BEFORE the kill, or the dying PTY's own exit
   * handler fires and cascades into a second, competing restart.
   */
  const respawnInCwd = (targetCwd: string, notice?: string) => {
    // Nothing can answer a question whose process is about to be replaced. The
    // crash path has already done this from its exit handler; the deliberate
    // relaunch has no exit handler left to run, and needs it done here.
    clearPendingQuestion(id)

    if (notice) {
      onData(notice)
      displayBuffers.set(id, notice)
    }

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

    const previousState = terminal.state
    terminal.pty = createPtyProcess(targetCwd, terminal.cols, terminal.rows)
    terminal.cwd = targetCwd
    terminal.state = 'idle'
    terminal.isRestarting = false

    // Notify state change
    if (terminal.onStateChange) {
      terminal.onStateChange('idle', previousState)
    }

    // The new directory may differ from the original one (repository attached
    // after launch), so re-read the branch from where we now are.
    const branch = detectGitBranch(targetCwd)
    if (branch !== terminal.branchName) {
      terminal.branchName = branch
      if (terminal.onBranchChange) {
        terminal.onBranchChange(branch)
      }
      // Persist it too, not just paint it. Guarded on non-null: a detached HEAD
      // or a non-repo cwd reports nothing, and overwriting a branch a skill
      // recorded with "no branch" would lose the better answer.
      if (branch) {
        terminal.metadata = mergeMetadata(terminal.metadata, { branchName: branch })
        try {
          updateAgentMetadata(id, { branchName: branch })
        } catch (e) {
          console.error(`[launchClaude] Failed to persist branch for terminal ${id}:`, e)
        }
      }
    }
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
    rows: DEFAULT_PTY_ROWS,
    createdAt: new Date(),
    metadata: withDetectedBranch({ ...createDefaultMetadata(), ...initialMetadata }, initialBranch),
    onStateChange,
    onBranchChange,
    onMetadataChange,
    onRepositoriesChange,
    cwd: workingDir,
    launchDir: workingDir,
    // A prompt handed over at launch counts as having talked to the session: the
    // conversation it starts is just as real as a typed one, and just as lost on
    // a relaunch — even though no keystroke ever reached the PTY. True of a `draft`
    // too, and for a plainer reason: a relaunch would wipe the text out of the input
    // box, along with whatever the person had added to it.
    hasUserInput: Boolean(initialPrompt),
    respawn: respawnInCwd
  }

  terminals.set(id, terminal)
  displayBuffers.set(id, '')

  // Notify initial branch
  if (initialBranch && onBranchChange) {
    onBranchChange(initialBranch)
  }

  return terminal
}

export function updateTerminalMetadataFromHook(terminalId: string, metadata: Partial<TerminalMetadata>) {
  const terminal = terminals.get(terminalId)
  if (!terminal) return

  terminal.metadata = mergeMetadata(terminal.metadata, metadata)

  try {
    updateAgentMetadata(terminalId, metadata)
  } catch (e) {
    console.error('[updateTerminalMetadataFromHook] Failed to persist metadata:', e)
  }

  if (terminal.onMetadataChange) {
    terminal.onMetadataChange(terminal.metadata)
  }
}

// Update terminal usage stats from the statusLine wrapper.
// In-memory only: statusLine fires very frequently and usage is ephemeral session data,
// so we deliberately skip disk persistence (updateAgentMetadata) and the onMetadataChange
// callback. The IPC send to the renderer is handled by the caller (setUsageCallback in index.ts).
export function updateTerminalUsageFromHook(terminalId: string, usage: TerminalUsage) {
  const terminal = terminals.get(terminalId)
  if (!terminal) return
  terminal.metadata = { ...terminal.metadata, usage }

  // Accumulated outside metadata.usage, which is wholly replaced above — see Terminal.modelIds.
  if (usage.modelId) {
    if (!terminal.modelIds) terminal.modelIds = new Set()
    terminal.modelIds.add(usage.modelId)
  }
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

/**
 * A human typed into this agent's terminal, so the session now holds a
 * conversation a relaunch would throw away.
 *
 * ⚠️ Call this from the `terminal:write` IPC handler and nowhere else — that
 * handler is the only channel carrying what actually came out of the terminal
 * view. `writeToTerminal` is shared with writes the APP makes on its own (script
 * and PR-review handlers), which say nothing about anyone having typed, and it
 * also carries xterm's own focus reports; see isUserInput.
 */
export function noteTerminalUserInput(terminalId: string): void {
  const terminal = terminals.get(terminalId)
  if (terminal) terminal.hasUserInput = true
}

export type CwdSyncResult =
  | { action: 'none' }
  | { action: 'relaunched' | 'suggested'; cwd: string; from: string }

/**
 * Reconciles where Claude Code is RUNNING with where its agent is supposed to be
 * working, after that agent's repositories changed.
 *
 * An agent created with ⌘N starts in the generic launch folder and stays there:
 * attaching a repository only appends to a list, it does not move a live process.
 * So the agent shows a repository in the app while `claude`, git and every
 * `/magic:*` skill still see ~/Documents. The only way to move it is to replace
 * the process, which is what this does.
 *
 * The catch is that a relaunch is not free: Claude Code comes back with no memory
 * of the conversation, and cannot be resumed into it either — its session history
 * is keyed by directory, so a session started in the launch folder does not exist
 * as far as the repository folder is concerned. Hence the split:
 *
 *   - a session nobody has said anything to yet holds nothing worth keeping, and
 *     is replaced silently. This is the ordinary case, since attaching the repo
 *     is usually the first thing done to a brand-new agent;
 *   - anything else is the person's call, so this only reports that a relaunch is
 *     available and leaves the process alone until they ask for it.
 *
 * Returns `none` when nothing is needed, which covers the common non-event of
 * attaching a SECOND repository: the resolved directory doesn't move, so neither
 * does the process.
 */
export function syncTerminalCwd(terminalId: string): CwdSyncResult {
  const terminal = terminals.get(terminalId)
  // No respawn means a plain shell (sidebar, scripts) rather than an agent, and a
  // restart already in flight will resolve the directory itself when it lands.
  if (!terminal || !terminal.respawn || terminal.isRestarting) return { action: 'none' }

  const target = resolveAgentCwd(terminal.repositories, terminal.launchDir)
  const from = terminal.cwd
  if (target === from) return { action: 'none' }

  if (!terminal.hasUserInput && terminal.state === 'idle') {
    return relaunchTerminalInResolvedCwd(terminalId)
      ? { action: 'relaunched', cwd: target, from }
      : { action: 'none' }
  }

  return { action: 'suggested', cwd: target, from }
}

/**
 * Replaces the agent's Claude Code with a fresh one in the directory its
 * repositories resolve to. Returns that directory, or null if it could not be
 * done. Called by syncTerminalCwd for a session that holds nothing, and directly
 * when the user accepts the offer for one that does.
 */
export function relaunchTerminalInResolvedCwd(terminalId: string): string | null {
  const terminal = terminals.get(terminalId)
  if (!terminal || !terminal.respawn) return null

  const target = resolveAgentCwd(terminal.repositories, terminal.launchDir)
  const notice = `\x1b[2J\x1b[H\x1b[33m--- Relaunching Claude Code in ${target} ---\x1b[0m\r\n\r\n`

  try {
    terminal.respawn(target, notice)
  } catch (e) {
    console.error(`[relaunchTerminalInResolvedCwd] Failed for terminal ${terminalId}:`, e)
    return null
  }

  // The process that was talked to is gone, and its replacement has not been. So
  // a later repository change is eligible for the silent treatment again.
  terminal.hasUserInput = false
  // Deliberate, so it must not eat into the crash budget — five of these in a
  // minute would otherwise leave the agent declared dead.
  restartTrackers.delete(terminalId)

  return target
}

