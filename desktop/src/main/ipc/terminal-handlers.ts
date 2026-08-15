import os from 'os'
import { ipcMain, BrowserWindow } from 'electron'
// Aliased: `t` is already the local name for a terminal throughout this file.
import { t as translate } from '../i18n'
import {
  createTerminal,
  launchClaude,
  writeToTerminal,
  resizeTerminal,
  killTerminal,
  getTerminal,
  getTerminalCwd,
  getTerminalBuffer,
  getAllTerminals,
  cleanupAllTerminals,
  updateTerminalMetadataFromHook,
  updateTerminalRepositoriesFromHook,
  noteTerminalUserInput,
  syncTerminalCwd,
  relaunchTerminalInResolvedCwd,
  type TerminalMetadata,
} from '../pty/terminal-manager'
import { noteTerminalInput, isUserInput } from '../questions/pending-questions'
import { resolveAgentCwd } from '../pty/agent-cwd'
import {
  saveAgent,
  archiveAgent,
  readAgents,
  updateAgentSplitPane,
} from '../config/agents'
import { addHistoryEntry } from '../config/activity-history'
import { recordUsageSnapshot } from '../usage/usage-events'
import { readConfig } from '../config/config'
import { expandPath } from '../config/validation'
import { checkRepoPath } from '../config/repo-validation'
import { ensureHydrated } from '../store/hydrate'
import type { HistoryAction } from '../../types'

/**
 * Strict repo-path guard used on agent creation (⌘N). When the launch cwd maps
 * to a configured repository, that repository must be a valid git repo (folder
 * exists AND has .git). Throws a descriptive error otherwise so the renderer can
 * prompt the user to re-point the folder instead of creating a broken agent.
 */
function assertLaunchTargetValid(cwd: unknown): void {
  if (typeof cwd !== 'string' || cwd.length === 0) return
  const expanded = expandPath(cwd)
  const config = readConfig()
  const match = Object.entries(config.repositories ?? {}).find(
    ([, repo]) => expandPath(repo.path) === expanded,
  )
  if (!match) return
  const [name, repo] = match
  const { valid, reason } = checkRepoPath(repo.path)
  if (!valid) {
    const detail = reason === 'missing' ? 'the folder no longer exists' : 'it is not a git repository'
    throw new Error(`Repository "${name}" is invalid: ${detail}. Re-point the folder in Settings before launching an agent.`)
  }
}

let getMainWindow: () => BrowserWindow | null
let showNotification: (title: string, body: string) => void
let onAgentChange: (() => void) | null = null

// Track last notification time per terminal to avoid spam
const lastNotificationTime = new Map<string, number>()
// Track previous metadata status per terminal for history entries. SEEDED from the
// persisted agents.status in restoreAgents — see seedStatusBaseline.
const previousStatus = new Map<string, string>()

/**
 * The activity event each workflow status produces, or null for statuses that record
 * nothing.
 *
 * EXHAUSTIVE BY TYPE, and that is the point. Keying on
 * `NonNullable<TerminalMetadata['status']>` makes tsc reject a new status that has no
 * entry here. `CI green` had none for months — magic-pr sent it, it was stored as an
 * off-enum value in agents.status, and it produced no event, so a fact the product
 * knew was never recorded. The map cannot fall out of step with the union again; a
 * test covers the other direction, that no SKILL.md sends a status outside it.
 *
 * `in review` and `Review addressed` stay separate actions: they are opposite
 * meanings — a reviewer picking the PR up versus the author re-pushing fixes — and
 * the flow metrics need them apart to measure time-to-first-review honestly.
 */
export const STATUS_TO_ACTION: Record<NonNullable<TerminalMetadata['status']>, HistoryAction | null> = {
  '': null, // cleared status: an absence, not an event
  'in progress': 'started',
  'committed': 'committed',
  'ready for PR': 'ready_for_pr',
  'PR created': 'pr_created',
  'CI green': 'ci_green',
  'in review': 'review',
  'changes requested': 'review_changes_requested',
  'Review addressed': 'review_addressed',
  'PR merged': 'merged',
}

/**
 * Prime the status baseline from what the database already holds.
 *
 * Without this the map starts empty on every launch, so the first status a restored
 * agent reported was compared against "" and logged again — a duplicate `committed`
 * every time the app restarted mid-task. The persisted status is exactly the last
 * value that WAS logged, so seeding from it makes the dedupe survive a restart.
 */
function seedStatusBaseline(agents: { id: string; metadata?: TerminalMetadata; name?: string }[]): void {
  for (const agent of agents) {
    previousStatus.set(agent.id, agent.metadata?.status || '')
    previousTitle.set(agent.id, agent.metadata?.title || agent.name || '')
  }
}

// Track the previous title per terminal, for the rename event. Seeded from the
// persisted metadata for the same reason as previousStatus: a cold map would report
// every restored agent as renamed on the first metadata push after a launch.
const previousTitle = new Map<string, string>()
// Terminals whose end-of-session usage snapshot has already been flushed, so the
// kill path and the natural-exit path never write two rows for one session.
const usageFlushed = new Set<string>()
const NOTIFICATION_COOLDOWN = 30000 // 30 seconds between notifications per terminal

/**
 * Flush ONE aggregated usage snapshot for a terminal at session end. Reads the
 * in-memory usage gauge (populated by the statusLine hook) and appends a single
 * usage_events row via recordUsageSnapshot (itself a GDPR-gated, fire-and-forget
 * no-op when the opt-in is off). Deduped per terminal id so it can be called from
 * both the explicit-kill path and the natural-exit path without double-writing.
 *
 * MUST be called BEFORE archiveAgent(id) so the store's agentIdMap can still map
 * the app id → agents.id uuid (mirrors how addHistoryEntry resolves the agent).
 * tokens is intentionally not derived from contextTokens (a point-in-time context
 * gauge, not cumulative session tokens) — see recordUsageSnapshot/appendUsage.
 */
function flushUsageSnapshot(id: string): void {
  if (usageFlushed.has(id)) return
  const terminal = getTerminal(id)
  const usage = terminal?.metadata?.usage
  if (!usage) return
  usageFlushed.add(id)
  // Materialise the model-id set as an array HERE: on a failed write the payload
  // goes to the on-disk outbox as JSON, and JSON.stringify(new Set()) is `{}` —
  // an offline session would replay an empty object into a text[] column. Null
  // rather than [] when nothing was seen, to match array_length(model_ids, 1),
  // which is NULL for an empty array anyway.
  const modelIds = terminal?.modelIds?.size ? Array.from(terminal.modelIds) : undefined
  void recordUsageSnapshot({
    agentId: id,
    model: usage.model,
    modelId: usage.modelId,
    contextWindowSize: usage.contextWindowSize,
    modelIds,
    costUsd: usage.costUsd,
    linesAdded: usage.linesAdded,
    linesRemoved: usage.linesRemoved,
    durationMs: usage.durationMs,
    occurredAt: Date.now(),
  })
}

// Helper to show notification with cooldown, focus check and per-kind opt-out
function maybeShowNotification(
  id: string,
  _name: string,
  title: string,
  body: string,
  kind: 'agentWaiting' | 'agentCompleted',
) {
  // Read per notification rather than captured: Settings → Notifications takes
  // effect on the next agent state change, with no restart and no re-wiring.
  // Absent means never chosen, which is ON — only an explicit false silences it.
  if (readConfig().notifications?.[kind] === false) {
    return
  }

  const mainWindow = getMainWindow()

  // Don't notify if window is focused
  if (mainWindow && mainWindow.isFocused()) {
    return
  }

  // Check cooldown
  const now = Date.now()
  const lastTime = lastNotificationTime.get(id) || 0
  if (now - lastTime < NOTIFICATION_COOLDOWN) {
    return
  }

  // Show notification and update last time
  lastNotificationTime.set(id, now)
  showNotification(title, body)
}

/**
 * Creates the base IPC-forwarding callbacks for a terminal.
 */
export function createBaseCallbacks(id: string, windowGetter: () => BrowserWindow | null) {
  return {
    onData: (data: string) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:data', { id, data })
    },
    onStateChange: (state: string, previousState: string) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:state', { id, state, previousState })
    },
    onExit: (exitCode: number) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:exit', { id, exitCode })
    },
    onBranchChange: (branchName: string | null) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:branch', { id, branchName })
    },
    onMetadataChange: (metadata: TerminalMetadata) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:metadata', { id, metadata })
    },
    onRepositoriesChange: (repositories: string[]) => {
      const win = windowGetter()
      if (win) win.webContents.send('terminal:repositories', { id, repositories })
    },
  }
}

function createTerminalCallbacks(id: string, name: string) {
  const base = createBaseCallbacks(id, getMainWindow)
  return {
    onData: base.onData,
    onStateChange: (state: string, previousState: string) => {
      base.onStateChange(state, previousState)

      const t = getTerminal(id)
      const displayName = t?.metadata?.title || name

      if (state === 'waiting' && previousState !== 'waiting') {
        maybeShowNotification(
          id,
          displayName,
          translate('notification.waiting.title'),
          translate('notification.waiting.body', { name: displayName }),
          'agentWaiting',
        )
        addHistoryEntry({
          agentId: id,
          agentName: displayName,
          action: 'waiting',
          ticketId: t?.metadata?.ticketId,
          description: t?.metadata?.description,
          repositories: t?.repositories || [],
        })
      }

      // An agent that died is a fact the activity feed never carried: the terminal
      // painted a red banner and the row went quiet, which reads exactly like an
      // agent nobody touched again. Both error paths in terminal-manager (a failed
      // spawn and exhausted restarts) funnel through this transition, so recording
      // it here covers them without duplicating the call at each site.
      if (state === 'error' && previousState !== 'error') {
        addHistoryEntry({
          agentId: id,
          agentName: displayName,
          action: 'agent_errored',
          ticketId: t?.metadata?.ticketId,
          description: t?.metadata?.description,
          repositories: t?.repositories || [],
        })
      }

      if (state === 'completed' && previousState !== 'completed') {
        maybeShowNotification(
          id,
          displayName,
          translate('notification.completed.title'),
          translate('notification.completed.body', { name: displayName }),
          'agentCompleted',
        )
        addHistoryEntry({
          agentId: id,
          agentName: displayName,
          action: 'completed',
          ticketId: t?.metadata?.ticketId,
          description: t?.metadata?.description,
          repositories: t?.repositories || [],
        })
      }
    },
    onExit: (exitCode: number) => {
      // Best-effort flush for a session that ends WITHOUT an explicit kill (e.g.
      // Claude Code exited on its own and exhausted its auto-restarts). This
      // callback is not invoked during auto-restart (terminal-manager only calls
      // it once restarts are given up), and killTerminal disposes this listener
      // before pty.kill so an intentional kill never double-fires here; the
      // usageFlushed guard defends against any overlap regardless.
      flushUsageSnapshot(id)
      base.onExit(exitCode)
      previousStatus.delete(id)
      previousTitle.delete(id)
    },
    onBranchChange: base.onBranchChange,
    onMetadataChange: (metadata: TerminalMetadata) => {
      base.onMetadataChange(metadata)

      // A rename is how an agent stops being "Agent 3" and becomes the ticket it is
      // working on, which is the moment its whole history becomes attributable to a
      // piece of work. Guarded on a non-empty previous title so the first naming of a
      // brand-new agent reads as its creation, not as a rename.
      const newTitle = metadata.title
      if (newTitle !== undefined) {
        const oldTitle = previousTitle.get(id) ?? ''
        if (oldTitle && newTitle && newTitle !== oldTitle) {
          const t = getTerminal(id)
          addHistoryEntry({
            agentId: id,
            agentName: newTitle,
            action: 'agent_renamed',
            ticketId: t?.metadata?.ticketId,
            description: t?.metadata?.description,
            repositories: t?.repositories || [],
          })
        }
        previousTitle.set(id, newTitle)
      }

      // Track status changes and create history entries
      const newStatus = metadata.status || ''
      const oldStatus = previousStatus.get(id) || ''
      if (newStatus && newStatus !== oldStatus) {
        const action = STATUS_TO_ACTION[newStatus as NonNullable<TerminalMetadata['status']>]
        if (action) {
          const t = getTerminal(id)
          addHistoryEntry({
            agentId: id,
            agentName: t?.metadata?.title || t?.name || name,
            action,
            ticketId: t?.metadata?.ticketId,
            description: t?.metadata?.description,
            repositories: t?.repositories || [],
          })
        }
        previousStatus.set(id, newStatus)
      }
    },
    onRepositoriesChange: base.onRepositoriesChange,
  }
}

export function restoreAgents() {
  try {
    // Filter out sidebar agents (VS Code extension) and any legacy enabled
    // scheduled-only records. The cleanup migration normally drops the latter,
    // but it logs-and-continues if agents.json is unwritable (read-only fs,
    // full disk, permissions) — so guard here too, mirroring the pre-removal
    // restore behavior, to never launch such a record as an interactive terminal.
    const agents = readAgents().filter(a => {
      if (a.id.startsWith('sidebar-')) return false
      const legacySchedule = (a as { schedule?: { enabled?: boolean } }).schedule
      return !legacySchedule?.enabled
    })

    // Before the early returns below: the baseline must be primed even when nothing
    // is relaunched, because a status can still arrive for an agent from a Claude
    // Code the app did not spawn.
    seedStatusBaseline(agents as { id: string; metadata?: TerminalMetadata }[])

    // Only restore if there are no running terminals yet
    const existingTerminals = getAllTerminals()
    if (existingTerminals.length > 0) {
      // Already have running terminals, no need to restore
      return
    }

    // No agents to restore
    if (agents.length === 0) {
      return
    }

    for (const agent of agents) {
      const cwd = resolveAgentCwd(agent.repositories, os.homedir())

      const callbacks = createTerminalCallbacks(agent.id, agent.name)
      const terminal = launchClaude(
        agent.id,
        agent.name,
        cwd,
        callbacks.onData,
        callbacks.onStateChange,
        callbacks.onExit,
        callbacks.onBranchChange,
        callbacks.onMetadataChange,
        agent.metadata as TerminalMetadata | undefined,
        callbacks.onRepositoriesChange,
        agent.repositories
      )

      // Save the TERMINAL's metadata, not the agent's. launchClaude folds the
      // branch it just detected into the metadata it returns (initialMetadataFor),
      // and writing `agent.metadata` back here would persist the stale copy the
      // agent was loaded with — undoing the detection on every restore. This is
      // also what backfills the branch of agents created before it was captured at
      // all: they pick it up the next time the app restores them.
      saveAgent(agent.id, agent.name, agent.repositories, terminal.metadata, agent.tsCreate)
    }
  } catch (error) {
    console.error('Error restoring agents:', error)
  }
}

/**
 * Kill every running agent PTY, keeping the agent records themselves untouched.
 * Called on sign-out: a session belongs to the account that started it, so it
 * must not outlive that account's session and leak into the next one (the
 * renderer rebuilds its list from getAllTerminals() whenever the app remounts).
 *
 * The agents stay in the store — scoped to their owner — so the next sign-in
 * relaunches that user's own agents through restoreAgents(), which deliberately
 * no-ops while any terminal is still alive and needs this clean slate to run.
 */
export function teardownAgentSessions(): void {
  cleanupAllTerminals()
}

export function setupTerminalHandlers(
  mainWindowGetter: () => BrowserWindow | null,
  notificationCallback: (title: string, body: string) => void,
  agentChangeCallback?: () => void,
) {
  getMainWindow = mainWindowGetter
  showNotification = notificationCallback
  onAgentChange = agentChangeCallback || null

  // Create a new terminal
  ipcMain.handle('terminal:create', async (_event, { id, name, cwd }) => {
    if (typeof id !== 'string' || typeof name !== 'string') {
      throw new Error('terminal:create requires id (string) and name (string)')
    }
    const callbacks = createTerminalCallbacks(id, name)
    const terminal = createTerminal(
      id,
      name,
      cwd,
      callbacks.onData,
      callbacks.onStateChange,
      callbacks.onExit,
      callbacks.onBranchChange,
      callbacks.onMetadataChange
    )

    return {
      id: terminal.id,
      name: terminal.name,
      state: terminal.state,
      repositories: terminal.repositories,
      branchName: terminal.branchName
    }
  })

  // Launch Claude in a new terminal
  ipcMain.handle('terminal:launchClaude', async (_event, { id, name, cwd, initialPrompt }) => {
    if (typeof id !== 'string' || typeof name !== 'string') {
      throw new Error('terminal:launchClaude requires id (string) and name (string)')
    }
    // The DB is the source of truth; make sure agents/config are loaded before we
    // save a new agent (so we never clobber the hydrated cache).
    await ensureHydrated()
    // Strict repo-path validation on ⌘N.
    assertLaunchTargetValid(cwd)
    const callbacks = createTerminalCallbacks(id, name)
    const terminal = launchClaude(
      id,
      name,
      cwd,
      callbacks.onData,
      callbacks.onStateChange,
      callbacks.onExit,
      callbacks.onBranchChange,
      callbacks.onMetadataChange,
      undefined,
      callbacks.onRepositoriesChange,
      undefined,
      typeof initialPrompt === 'string' ? initialPrompt : undefined
    )

    // Save agent to disk immediately
    const tsCreate = Date.now()
    saveAgent(terminal.id, terminal.name, terminal.repositories, terminal.metadata, tsCreate)

    addHistoryEntry({
      agentId: terminal.id,
      agentName: terminal.metadata?.title || terminal.name,
      action: 'agent_created',
      ticketId: terminal.metadata?.ticketId,
      description: terminal.metadata?.description,
      repositories: terminal.repositories,
    })

    return {
      id: terminal.id,
      name: terminal.name,
      state: terminal.state,
      repositories: terminal.repositories,
      branchName: terminal.branchName,
      metadata: terminal.metadata,
      tsCreate
    }
  })

  // Write to terminal
  ipcMain.handle('terminal:write', async (_event, { id, data }) => {
    if (typeof id !== 'string' || typeof data !== 'string') return
    // Someone may be answering this agent's question right here, in the terminal —
    // which changes what the menu bar panel is still allowed to do with it (AC4).
    // What exactly, and why it is not a plain clear, is in noteTerminalInput: this
    // channel also carries xterm's own focus reports, and treating those as an answer
    // is what used to make the panel show nothing at all.
    //
    // ⚠️ THIS BELONGS IN THIS HANDLER, NOT IN writeToTerminal(). That function is
    // shared: pr-review-handlers.ts and script-handlers.ts call it for writes the APP
    // makes on its own, which say nothing about the user having answered anything —
    // moving this down there would silently wipe legitimate pending questions.
    // Only this handler carries what came out of the terminal view.
    noteTerminalInput(id, data)
    // Same channel, same reason for living here rather than in writeToTerminal, and
    // the same filter: a focus report is not somebody typing. What it guards is the
    // silent relaunch in syncTerminalCwd — once a session has been talked to, its
    // conversation is worth more than its working directory being right.
    if (isUserInput(data)) noteTerminalUserInput(id)
    writeToTerminal(id, data)
  })

  // Resize terminal
  ipcMain.handle('terminal:resize', async (_event, { id, cols, rows }) => {
    if (typeof id !== 'string' || typeof cols !== 'number' || typeof rows !== 'number') return
    if (cols <= 0 || rows <= 0) return
    resizeTerminal(id, cols, rows)
  })

  // Kill terminal
  ipcMain.handle('terminal:kill', async (_event, { id }) => {
    if (typeof id !== 'string') return
    const t = getTerminal(id)
    if (t) {
      addHistoryEntry({
        agentId: id,
        agentName: t.metadata?.title || t.name,
        action: 'agent_closed',
        ticketId: t.metadata?.ticketId,
        description: t.metadata?.description,
        repositories: t.repositories || [],
      })
    }
    // Flush the aggregated usage snapshot BEFORE archiveAgent so the store can still
    // resolve this agent's uuid (one write per session; GDPR-gated inside).
    flushUsageSnapshot(id)
    killTerminal(id)
    // Archive, never delete: the row is kept so the events above keep their link.
    archiveAgent(id)
    usageFlushed.delete(id)
  })

  // Get terminal info
  ipcMain.handle('terminal:get', async (_event, { id }) => {
    const terminal = getTerminal(id)
    if (!terminal) return null

    const savedAgents = readAgents()
    const savedAgent = savedAgents.find(a => a.id === id)

    return {
      id: terminal.id,
      name: terminal.name,
      state: terminal.state,
      repositories: terminal.repositories,
      branchName: terminal.branchName,
      createdAt: terminal.createdAt,
      tsCreate: savedAgent?.tsCreate,
      metadata: terminal.metadata
    }
  })

  // Get all terminals
  ipcMain.handle('terminal:getAll', async () => {
    await ensureHydrated()
    const savedAgents = readAgents()
    const agentMap = new Map(savedAgents.map(a => [a.id, a]))
    return getAllTerminals().map(t => ({
      id: t.id,
      name: t.name,
      state: t.state,
      repositories: t.repositories,
      branchName: t.branchName,
      createdAt: t.createdAt,
      tsCreate: agentMap.get(t.id)?.tsCreate,
      metadata: t.metadata,
      splitPane: agentMap.get(t.id)?.splitPane,
    }))
  })

  // Get current working directory of a terminal (queries the PTY process)
  ipcMain.handle('terminal:getCwd', async (_event, { id }) => {
    if (typeof id !== 'string') return null
    return getTerminalCwd(id)
  })

  const handleGetAgents = async () => {
    await ensureHydrated()
    return readAgents()
  }
  ipcMain.handle('terminal:getSessions', handleGetAgents) // legacy alias
  ipcMain.handle('terminal:getAgents', handleGetAgents)

  // Update agent split pane assignment
  ipcMain.handle('terminal:updateSplitPane', async (_event, { id, pane }) => {
    return updateAgentSplitPane(id, pane)
  })

  // Get terminal display buffer (for reconnection after refresh)
  ipcMain.handle('terminal:getBuffer', async (_event, { id }) => {
    if (typeof id !== 'string') return null
    return getTerminalBuffer(id)
  })

  // Update terminal metadata
  ipcMain.handle('terminal:updateMetadata', async (_event, { id, metadata }) => {
    if (typeof id !== 'string' || typeof metadata !== 'object' || metadata === null) return
    updateTerminalMetadataFromHook(id, metadata)
    onAgentChange?.()
  })

  // Update terminal repositories
  ipcMain.handle('terminal:updateRepositories', async (_event, { id, repositories }) => {
    if (typeof id !== 'string' || !Array.isArray(repositories)) return
    updateTerminalRepositoriesFromHook(id, repositories)
    onAgentChange?.()
    // Notify renderer
    const mainWindow = getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('terminal:repositories', { id, repositories })
    }

    // Attaching the first repository to an agent leaves Claude Code running in the
    // launch folder, where git and the skills read the wrong project. Reconcile it.
    //
    // Deliberately NOT in updateTerminalRepositoriesFromHook: that function is also
    // how Claude Code itself reports repositories mid-task, and an agent that is
    // working has not asked to be interrupted. This handler is the explicit human
    // action — attaching a repository from the agent info panel.
    const sync = syncTerminalCwd(id)
    if (sync.action !== 'none' && mainWindow) {
      mainWindow.webContents.send('terminal:cwdSync', { id, action: sync.action, cwd: sync.cwd, from: sync.from })
    }
  })

  // Relaunch an agent in the directory its repositories resolve to. The offer the
  // user accepts when syncTerminalCwd declined to do it on its own.
  ipcMain.handle('terminal:relaunchInCwd', async (_event, { id }) => {
    if (typeof id !== 'string') return null
    return relaunchTerminalInResolvedCwd(id)
  })
}

export function cleanupTerminals() {
  // Cleanup all PTY processes
  // Note: Agents are already saved individually via saveAgent() when created/updated,
  // so we don't need to save them again here
  cleanupAllTerminals()
}
