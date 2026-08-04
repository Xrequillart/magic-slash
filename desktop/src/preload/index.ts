import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { TerminalMetadata, RepositoryConfig, UserProfile, ClaudeAccount, SpendSummary, Config, AuthStatus, GitHubAuthStatus, Org, Member, Invitation, MembershipRole, OrgSharedConfig, OrgActivity, OrgAgent, OrgAgentChange, RealtimeStatus, SkillCounts, UsageStats, TelemetryHealth, ThemeId, LanguageId, SetupStatus, McpServerId, PrerequisiteId } from '../types'

export type TerminalState = 'idle' | 'working' | 'waiting' | 'completed' | 'error'

export interface TerminalInfo {
  id: string
  name: string
  state: TerminalState
  repositories: string[]
  createdAt?: Date
}

// Config API
const configApi = {
  getConfig: () => ipcRenderer.invoke('config:get'),

  addRepository: (name: string, path: string, keywords: string[]) =>
    ipcRenderer.invoke('config:addRepository', { name, path, keywords }),

  updateRepository: (name: string, updates: Partial<RepositoryConfig>) =>
    ipcRenderer.invoke('config:updateRepository', { name, updates }),

  deleteRepository: (name: string) =>
    ipcRenderer.invoke('config:deleteRepository', { name }),

  renameRepository: (oldName: string, newName: string) =>
    ipcRenderer.invoke('config:renameRepository', { oldName, newName }),

  setRepositoryOrg: (name: string, orgId: string | null) =>
    ipcRenderer.invoke('config:setRepositoryOrg', { name, orgId }),

  updateRepositoryLanguages: (name: string, languages: Record<string, string | null>) =>
    ipcRenderer.invoke('config:updateRepositoryLanguages', { name, languages }),

  updateRepositoryCommitSettings: (name: string, settings: Partial<NonNullable<RepositoryConfig['commit']>>) =>
    ipcRenderer.invoke('config:updateRepositoryCommitSettings', { name, settings }),

  updateRepositoryResolveSettings: (name: string, settings: Partial<NonNullable<RepositoryConfig['resolve']>>) =>
    ipcRenderer.invoke('config:updateRepositoryResolveSettings', { name, settings }),

  updateRepositoryPullRequestSettings: (name: string, settings: Partial<NonNullable<RepositoryConfig['pullRequest']>>) =>
    ipcRenderer.invoke('config:updateRepositoryPullRequestSettings', { name, settings }),

  updateRepositoryIssuesSettings: (name: string, settings: Partial<NonNullable<RepositoryConfig['issues']>>) =>
    ipcRenderer.invoke('config:updateRepositoryIssuesSettings', { name, settings }),

  updateRepositoryBranchSettings: (name: string, settings: Partial<NonNullable<RepositoryConfig['branches']>>) =>
    ipcRenderer.invoke('config:updateRepositoryBranchSettings', { name, settings }),

  updateRepositoryWorktreeFilesSettings: (name: string, settings: string[]) =>
    ipcRenderer.invoke('config:updateRepositoryWorktreeFilesSettings', { name, settings }),

  setSyncClaudeTheme: (enabled: boolean): Promise<{ config: Config }> =>
    ipcRenderer.invoke('config:setSyncClaudeTheme', { enabled }),
  setUsageCardEnabled: (enabled: boolean): Promise<{ config: Config }> =>
    ipcRenderer.invoke('config:setUsageCardEnabled', { enabled }),
  setUsageCardMinimized: (minimized: boolean): Promise<{ config: Config }> =>
    ipcRenderer.invoke('config:setUsageCardMinimized', { minimized }),
  setUsageLogsEnabled: (enabled: boolean): Promise<{ config: Config }> =>
    ipcRenderer.invoke('config:setUsageLogsEnabled', { enabled }),
  setDailyDigestEnabled: (enabled: boolean): Promise<{ config: Config }> =>
    ipcRenderer.invoke('config:setDailyDigestEnabled', { enabled }),

  updateSplitEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('config:updateSplitEnabled', { enabled }),

  updateSplitActive: (active: boolean) =>
    ipcRenderer.invoke('config:updateSplitActive', { active }),

  updateSpotlight: (spotlight: { enabled: boolean; shortcut: string }) =>
    ipcRenderer.invoke('config:updateSpotlight', spotlight),

  updateLaunchMode: (mode: string) =>
    ipcRenderer.invoke('config:updateLaunchMode', { mode }),

  updateTheme: (theme: ThemeId) =>
    ipcRenderer.invoke('config:updateTheme', { theme }),

  updateLanguage: (language: LanguageId): Promise<{ config: Config }> =>
    ipcRenderer.invoke('config:updateLanguage', { language }),

  repair: (): Promise<{ repaired: boolean; fixes: string[] }> =>
    ipcRenderer.invoke('config:repair'),

  onValidationErrors: (callback: (data: { errors: string[]; configPath: string }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { errors: string[]; configPath: string }) => callback(data)
    ipcRenderer.on('config:validationErrors', listener)
    return () => ipcRenderer.removeListener('config:validationErrors', listener)
  },

  // The config changed WITHOUT this window asking: a setting or a repository was
  // edited on the web app, or on this account's other machine, and reached us over
  // Realtime. The whole config is in the payload, so there is nothing to fetch.
  onChanged: (callback: (config: Config) => void) => {
    const listener = (_event: IpcRendererEvent, config: Config) => callback(config)
    ipcRenderer.on('config:changed', listener)
    return () => ipcRenderer.removeListener('config:changed', listener)
  },

  validatePath: (path: string) =>
    ipcRenderer.invoke('config:validatePath', { path }),

  // Configured repositories whose path is missing or is not a git repository.
  getInvalidRepos: (): Promise<InvalidRepo[]> => ipcRenderer.invoke('repos:getInvalid'),

  onInvalidRepos: (callback: (repos: InvalidRepo[]) => void) => {
    const listener = (_event: IpcRendererEvent, repos: InvalidRepo[]) => callback(repos)
    ipcRenderer.on('repos:invalid', listener)
    return () => ipcRenderer.removeListener('repos:invalid', listener)
  },

  hasGitHubRemote: (path: string) =>
    ipcRenderer.invoke('config:hasGitHubRemote', { path }),

  getGitHubAuthStatus: (): Promise<GitHubAuthStatus> =>
    ipcRenderer.invoke('config:getGitHubAuthStatus'),

  setIntegration: (name: 'atlassian', enabled: boolean): Promise<{ config: Config }> =>
    ipcRenderer.invoke('config:setIntegration', { name, enabled }),

  getGitStatus: (path: string) =>
    ipcRenderer.invoke('config:getGitStatus', { path }),

  getGitDiffStats: (path: string) =>
    ipcRenderer.invoke('config:getGitDiffStats', { path }),

  getBranchCommits: (path: string, targetBranch?: string) =>
    ipcRenderer.invoke('config:getBranchCommits', { path, targetBranch }),

  getRemoteBranches: (path: string) =>
    ipcRenderer.invoke('config:getRemoteBranches', { path }),

  getGitHubRepoUrl: (path: string) =>
    ipcRenderer.invoke('config:getGitHubRepoUrl', { path }),

  getPRTemplate: (repoPath: string) =>
    ipcRenderer.invoke('config:getPRTemplate', { repoPath }),

  createPRTemplate: (repoPath: string, language: string) =>
    ipcRenderer.invoke('config:createPRTemplate', { repoPath, language }),

  updatePRTemplate: (repoPath: string, content: string) =>
    ipcRenderer.invoke('config:updatePRTemplate', { repoPath, content }),

  setAutoStart: (enabled: boolean) =>
    ipcRenderer.invoke('config:setAutoStart', { enabled }),

  getAutoStart: (): Promise<boolean> =>
    ipcRenderer.invoke('config:getAutoStart'),

  readFile: (repoPath: string, filePath: string, status?: string) =>
    ipcRenderer.invoke('config:readFile', repoPath, filePath, status),

}

// Terminal API
const terminalApi = {
  create: (id: string, name: string, cwd: string) =>
    ipcRenderer.invoke('terminal:create', { id, name, cwd }),

  launchClaude: (id: string, name: string, cwd: string, initialPrompt?: string) =>
    ipcRenderer.invoke('terminal:launchClaude', { id, name, cwd, initialPrompt }),

  write: (id: string, data: string) =>
    ipcRenderer.invoke('terminal:write', { id, data }),

  resize: (id: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:resize', { id, cols, rows }),

  kill: (id: string) =>
    ipcRenderer.invoke('terminal:kill', { id }),

  get: (id: string) =>
    ipcRenderer.invoke('terminal:get', { id }),

  getAll: () =>
    ipcRenderer.invoke('terminal:getAll'),

  getCwd: (id: string) =>
    ipcRenderer.invoke('terminal:getCwd', { id }),

  getSessions: () =>
    ipcRenderer.invoke('terminal:getSessions'),

  getAgents: () =>
    ipcRenderer.invoke('terminal:getAgents'),

  getBuffer: (id: string) =>
    ipcRenderer.invoke('terminal:getBuffer', { id }),

  updateMetadata: (id: string, metadata: Partial<TerminalMetadata>) =>
    ipcRenderer.invoke('terminal:updateMetadata', { id, metadata }),

  updateRepositories: (id: string, repositories: string[]) =>
    ipcRenderer.invoke('terminal:updateRepositories', { id, repositories }),

  updateSplitPane: (id: string, pane: 'left' | 'right') =>
    ipcRenderer.invoke('terminal:updateSplitPane', { id, pane }),

  // Event listeners
  onData: (callback: (data: { id: string; data: string }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: string; data: string }) => callback(data)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.removeListener('terminal:data', listener)
  },

  onState: (callback: (data: { id: string; state: TerminalState; previousState: TerminalState }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: string; state: TerminalState; previousState: TerminalState }) => callback(data)
    ipcRenderer.on('terminal:state', listener)
    return () => ipcRenderer.removeListener('terminal:state', listener)
  },

  onExit: (callback: (data: { id: string; exitCode: number }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: string; exitCode: number }) => callback(data)
    ipcRenderer.on('terminal:exit', listener)
    return () => ipcRenderer.removeListener('terminal:exit', listener)
  },

  onBranch: (callback: (data: { id: string; branchName: string | null }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: string; branchName: string | null }) => callback(data)
    ipcRenderer.on('terminal:branch', listener)
    return () => ipcRenderer.removeListener('terminal:branch', listener)
  },

  onMetadata: (callback: (data: { id: string; metadata: TerminalMetadata }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: string; metadata: TerminalMetadata }) => callback(data)
    ipcRenderer.on('terminal:metadata', listener)
    return () => ipcRenderer.removeListener('terminal:metadata', listener)
  },

  onCommandStart: (callback: (data: { id: string; command: string }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: string; command: string }) => callback(data)
    ipcRenderer.on('terminal:commandStart', listener)
    return () => ipcRenderer.removeListener('terminal:commandStart', listener)
  },

  onCommandEnd: (callback: (data: { id: string; exitCode: number }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: string; exitCode: number }) => callback(data)
    ipcRenderer.on('terminal:commandEnd', listener)
    return () => ipcRenderer.removeListener('terminal:commandEnd', listener)
  },

  onRepositories: (callback: (data: { id: string; repositories: string[] }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: string; repositories: string[] }) => callback(data)
    ipcRenderer.on('terminal:repositories', listener)
    return () => ipcRenderer.removeListener('terminal:repositories', listener)
  },
}

// Command History API
const historyApi = {
  get: (repoPath: string) =>
    ipcRenderer.invoke('history:get', { repoPath }),

  add: (repoPath: string, command: string) =>
    ipcRenderer.invoke('history:add', { repoPath, command }),

  getSuggestion: (repoPath: string, prefix: string) =>
    ipcRenderer.invoke('history:getSuggestion', { repoPath, prefix }),

  getLast: (repoPath: string) =>
    ipcRenderer.invoke('history:getLast', { repoPath }),
}

// Connectivity API (cloud is mandatory: the renderer blocks the whole app until
// the backend reports 'ok'). See main/ipc/connectivity-handlers.ts.
export type ConnectivityStatus = 'ok' | 'unauthorized' | 'unreachable' | 'disabled'

export type StoreWriteKind = 'config' | 'agents'

export interface InvalidRepo {
  name: string
  path: string
  reason: 'missing' | 'not-git' | 'no-local-path'
}

const connectivityApi = {
  check: (): Promise<ConnectivityStatus> => ipcRenderer.invoke('connectivity:check'),
  onStatusChanged: (callback: (status: ConnectivityStatus) => void) => {
    const listener = (_event: IpcRendererEvent, status: ConnectivityStatus) => callback(status)
    ipcRenderer.on('connectivity:statusChanged', listener)
    return () => ipcRenderer.removeListener('connectivity:statusChanged', listener)
  },
  // A write-through to the cloud failed; the local cache was re-synced from the
  // DB (the failed change may be lost). Carries which write failed.
  onWriteError: (callback: (data: { kind: StoreWriteKind }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { kind: StoreWriteKind }) => callback(data)
    ipcRenderer.on('store:writeError', listener)
    return () => ipcRenderer.removeListener('store:writeError', listener)
  },
}

// Window API
const windowApi = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
}

// Dialog API
const dialogApi = {
  openFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  openFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFile'),
}

// Skills API
const skillsApi = {
  list: () => ipcRenderer.invoke('skills:list'),
  get: (name: string) => ipcRenderer.invoke('skills:get', { name }),
  create: (name: string, content: string, imagePath?: string) =>
    ipcRenderer.invoke('skills:create', { name, content, imagePath }),
  update: (name: string, content: string, imagePath?: string) =>
    ipcRenderer.invoke('skills:update', { name, content, imagePath }),
  delete: (name: string) => ipcRenderer.invoke('skills:delete', { name }),
  getImage: (name: string): Promise<string | null> => ipcRenderer.invoke('skills:getImage', { name }),
  download: (name: string) => ipcRenderer.invoke('skills:download', { name }),
  import: (): Promise<{ success: boolean; name?: string; canceled?: boolean }> =>
    ipcRenderer.invoke('skills:import'),
  listRepoSkills: () => ipcRenderer.invoke('skills:listRepoSkills'),
  getRepoSkill: (filePath: string) => ipcRenderer.invoke('skills:getRepoSkill', { filePath }),
}

// Scripts API
const scriptsApi = {
  getProjectScripts: (repoPath: string) =>
    ipcRenderer.invoke('scripts:getProjectScripts', { repoPath }),
  run: (repoPath: string, scriptName: string, packageManager: string, agentId: string, agentName: string) =>
    ipcRenderer.invoke('scripts:run', { repoPath, scriptName, packageManager, agentId, agentName }),
  stop: (id: string) =>
    ipcRenderer.invoke('scripts:stop', { id }),
}

// Tray API (for popover window)
const trayApi = {
  getAgents: (): Promise<Array<{ id: string; name: string; state: string; ticketId: string; title: string; createdAt: number }>> =>
    ipcRenderer.invoke('tray:getAgents'),
  focusAgent: (id: string) => ipcRenderer.invoke('tray:focusAgent', id),
  openSettings: () => ipcRenderer.invoke('tray:openSettings'),
  quit: () => ipcRenderer.invoke('tray:quit'),
  onFocusAgent: (callback: (data: { id: string }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: string }) => callback(data)
    ipcRenderer.on('tray:focusAgent', listener)
    return () => ipcRenderer.removeListener('tray:focusAgent', listener)
  },
  onOpenSettings: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('tray:openSettings', listener)
    return () => ipcRenderer.removeListener('tray:openSettings', listener)
  },
}

// Quick Launch API
const quickLaunchApi = {
  dispatch: (ticketId: string, action: string) =>
    ipcRenderer.invoke('quicklaunch:dispatch', { ticketId, action }),
  close: () => ipcRenderer.invoke('quicklaunch:close'),
  resize: (height: number) => ipcRenderer.invoke('quicklaunch:resize', { height }),
  onDispatch: (callback: (data: { ticketId: string; action: string }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { ticketId: string; action: string }) => callback(data)
    ipcRenderer.on('quicklaunch:dispatch', listener)
    return () => ipcRenderer.removeListener('quicklaunch:dispatch', listener)
  },
}

// Shell API
const shellApi = {
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  openInVSCode: (path: string): Promise<void> => ipcRenderer.invoke('shell:openInVSCode', path),
}

// Update status type
export type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; version: string; releaseNotes?: string }
  | { type: 'error'; message: string; phase?: 'check' | 'download' | 'install' }

// Updater API
const updaterApi = {
  check: () => ipcRenderer.invoke('updater:check'),
  install: () => ipcRenderer.invoke('updater:install'),
  getVersion: (): Promise<string> => ipcRenderer.invoke('updater:getVersion'),
  getPendingWhatsNew: (): Promise<{ version: string; releaseNotes: string } | null> =>
    ipcRenderer.invoke('updater:getPendingWhatsNew'),
  clearPendingWhatsNew: (): Promise<void> => ipcRenderer.invoke('updater:clearPendingWhatsNew'),
  getReleaseNotes: (version: string): Promise<string | null> =>
    ipcRenderer.invoke('updater:getReleaseNotes', version),
  onStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: IpcRendererEvent, status: UpdateStatus) => callback(status)
    ipcRenderer.on('updater:status', listener)
    return () => ipcRenderer.removeListener('updater:status', listener)
  },
}

// PR Review Watcher API
const prWatcherApi = {
  setEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('prWatcher:setEnabled', enabled),
  getStatus: (): Promise<{ enabled: boolean; pollIntervalMs: number; watchingCount: number; lastTickAt: number | null }> =>
    ipcRenderer.invoke('prWatcher:getStatus'),
  setInterval: (ms: number) =>
    ipcRenderer.invoke('prWatcher:setInterval', ms),
  setAutoLaunchSkills: (enabled: boolean) =>
    ipcRenderer.invoke('prWatcher:setAutoLaunchSkills', enabled),
  sendCommand: (terminalId: string, command: string): Promise<{ launched: boolean; copied: boolean }> =>
    ipcRenderer.invoke('prWatcher:sendCommand', { terminalId, command }),
  onUpdated: (callback: (data: PRWatcherUpdate) => void) => {
    const listener = (_event: IpcRendererEvent, data: PRWatcherUpdate) => callback(data)
    ipcRenderer.on('prWatcher:updated', listener)
    return () => ipcRenderer.removeListener('prWatcher:updated', listener)
  },
}

interface PRWatcherUpdate {
  terminalId: string
  repoPath: string
  prUrl: string
  status: string
  commentCount: number
  reviewers: string[]
  merged: boolean
  closed: boolean
}

// Profile API
const profileApi = {
  get: (): Promise<UserProfile | null> => ipcRenderer.invoke('profile:get'),
  save: (data: UserProfile) => ipcRenderer.invoke('profile:save', data),
}

// Setup API — machine prerequisites, MCP servers and integrations. Replaces what the
// install script used to do; see main/setup/.
const setupApi = {
  getStatus: (): Promise<SetupStatus> => ipcRenderer.invoke('setup:getStatus'),
  provisionMcp: (id: McpServerId): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('setup:provisionMcp', { id }),
  removeMcp: (id: McpServerId): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('setup:removeMcp', { id }),
  installPrerequisite: (id: PrerequisiteId): Promise<{ ok: boolean; output: string; error?: string }> =>
    ipcRenderer.invoke('setup:installPrerequisite', { id }),
  reinstallSkills: (): Promise<{ updated: string[]; errors: string[] }> =>
    ipcRenderer.invoke('setup:reinstallSkills'),
  setIntegrations: (atlassian: boolean): Promise<SetupStatus> =>
    ipcRenderer.invoke('setup:setIntegrations', { atlassian }),
  // Homebrew output, line by line, while an install runs.
  onInstallProgress: (callback: (data: { id: PrerequisiteId; chunk: string }) => void) => {
    const listener = (_event: IpcRendererEvent, data: { id: PrerequisiteId; chunk: string }) => callback(data)
    ipcRenderer.on('setup:installProgress', listener)
    return () => ipcRenderer.removeListener('setup:installProgress', listener)
  },
}

// Usage API (Claude account + estimated spend)
const usageApi = {
  getAccount: (): Promise<ClaudeAccount | null> => ipcRenderer.invoke('usage:getAccount'),
  getSpend: (): Promise<SpendSummary> => ipcRenderer.invoke('usage:getSpend'),
  getTelemetryHealth: (): Promise<TelemetryHealth> => ipcRenderer.invoke('usage:getTelemetryHealth'),
}

// Auth API (optional cloud auth via Supabase — never required for the app to run)
const authApi = {
  status: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:status'),
  login: (email: string, password: string): Promise<AuthStatus> =>
    ipcRenderer.invoke('auth:login', { email, password }),
  signup: (email: string, password: string, opts?: { orgName?: string; invitationToken?: string }): Promise<AuthStatus> =>
    ipcRenderer.invoke('auth:signup', { email, password, orgName: opts?.orgName, invitationToken: opts?.invitationToken }),
  logout: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:logout'),
  requestPasswordReset: (email: string): Promise<void> =>
    ipcRenderer.invoke('auth:requestPasswordReset', { email }),
  confirmPasswordReset: (email: string, code: string, newPassword: string): Promise<void> =>
    ipcRenderer.invoke('auth:confirmPasswordReset', { email, code, newPassword }),
  updatePassword: (newPassword: string): Promise<void> =>
    ipcRenderer.invoke('auth:updatePassword', { newPassword }),
  requestEmailChange: (newEmail: string): Promise<void> =>
    ipcRenderer.invoke('auth:requestEmailChange', { newEmail }),
  confirmEmailChange: (newEmail: string, code: string): Promise<AuthStatus> =>
    ipcRenderer.invoke('auth:confirmEmailChange', { newEmail, code }),
  deleteAccount: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:deleteAccount'),
  onStatusChanged: (callback: (status: AuthStatus) => void) => {
    const listener = (_event: IpcRendererEvent, status: AuthStatus) => callback(status)
    ipcRenderer.on('auth:statusChanged', listener)
    return () => ipcRenderer.removeListener('auth:statusChanged', listener)
  },
}

// Org API (organization membership + invitations + multi-org management)
const orgApi = {
  current: (): Promise<Org | null> => ipcRenderer.invoke('org:current'),
  // orgId omitted → the active org.
  members: (orgId?: string): Promise<Member[]> => ipcRenderer.invoke('org:members', { orgId }),
  list: (): Promise<Org[]> => ipcRenderer.invoke('org:list'),
  // Team dashboard: org-wide agents roster + live realtime propagation.
  listAgents: (): Promise<OrgAgent[]> => ipcRenderer.invoke('org:listAgents'),
  // Team dashboard: org-wide usage stats (read is open to any member).
  getUsageStats: (): Promise<UsageStats> => ipcRenderer.invoke('org:getUsageStats'),
  // Team dashboard: run count per skill for ONE org. orgId is required — the page
  // has a tab per org, and the active-org default every other call uses would
  // answer about a different one than the tab on screen.
  getSkillCounts: (orgId: string): Promise<SkillCounts> =>
    ipcRenderer.invoke('org:getSkillCounts', { orgId }),
  // Team dashboard, Personal tab: the caller's OWN runs outside any org. Takes no
  // org id because there is none to take — see the RPC for why that is a separate
  // question rather than a null argument.
  getPersonalSkillCounts: (): Promise<SkillCounts> =>
    ipcRenderer.invoke('org:getPersonalSkillCounts'),
  // Team dashboard: org-wide activity events driving the flow metrics. sinceMs is
  // clamped to 90 days in the main process; the renderer narrows further itself.
  getActivity: (sinceMs?: number): Promise<OrgActivity> => ipcRenderer.invoke('org:getActivity', { sinceMs }),
  // Team dashboard: pick up a colleague's task. Resolves their repo(s) to a LOCAL
  // configured path; rejects when nothing maps locally. Renderer then launches.
  pickUpTask: (ticketId: string, repositories: string[]): Promise<{ cwd: string; initialPrompt: string }> =>
    ipcRenderer.invoke('org:pickUpTask', { ticketId, repositories }),
  getRealtimeStatus: (): Promise<RealtimeStatus> => ipcRenderer.invoke('org:realtimeStatus'),
  onAgentsChanged: (callback: (change: OrgAgentChange) => void) => {
    const listener = (_event: IpcRendererEvent, change: OrgAgentChange) => callback(change)
    ipcRenderer.on('org:agentsChanged', listener)
    return () => ipcRenderer.removeListener('org:agentsChanged', listener)
  },
  onRealtimeStatus: (callback: (status: RealtimeStatus) => void) => {
    const listener = (_event: IpcRendererEvent, status: RealtimeStatus) => callback(status)
    ipcRenderer.on('org:realtimeStatusChanged', listener)
    return () => ipcRenderer.removeListener('org:realtimeStatusChanged', listener)
  },
  invitations: (orgId?: string): Promise<Invitation[]> => ipcRenderer.invoke('org:invitations', { orgId }),
  invite: (email: string, role?: MembershipRole, orgId?: string): Promise<Invitation> =>
    ipcRenderer.invoke('org:invite', { email, role, orgId }),
  /** Create an organization (caller becomes admin). Returns the new org id. */
  create: (name: string): Promise<string> => ipcRenderer.invoke('org:create', { name }),
  deleteInvitation: (id: string): Promise<void> =>
    ipcRenderer.invoke('org:deleteInvitation', { id }),
  accept: (token: string): Promise<{ orgId: string; config: Config }> =>
    ipcRenderer.invoke('org:accept', { token }),
  applySharedConfig: (): Promise<Config> => ipcRenderer.invoke('org:applyShared'),
  setSharedConfig: (shared: OrgSharedConfig, orgId?: string): Promise<void> =>
    ipcRenderer.invoke('org:setShared', { shared, orgId }),
  removeMember: (orgId: string, userId: string): Promise<void> =>
    ipcRenderer.invoke('org:removeMember', { orgId, userId }),
  leave: (orgId: string): Promise<void> => ipcRenderer.invoke('org:leave', { orgId }),
  updateRole: (orgId: string, userId: string, role: MembershipRole): Promise<void> =>
    ipcRenderer.invoke('org:updateRole', { orgId, userId, role }),
  archive: (orgId: string): Promise<void> => ipcRenderer.invoke('org:archive', { orgId }),
}

// Expose APIs to renderer
/**
 * Appearance. `initial` is handed over as a launch argument by the main process
 * (see main/theme.ts) rather than fetched, so the renderer can paint the right
 * theme on its first frame instead of flashing the default and correcting.
 */
function launchArgument(name: string): string | null {
  const prefix = `--magic-${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : null
}

const themeApi = {
  initial: (): string | null => launchArgument('theme'),

  onChanged: (callback: (theme: ThemeId) => void) => {
    const listener = (_event: IpcRendererEvent, theme: ThemeId) => callback(theme)
    ipcRenderer.on('theme:changed', listener)
    return () => ipcRenderer.removeListener('theme:changed', listener)
  },
}

/**
 * Interface language. Read like the theme, and for the same reason: a cold start
 * in French must not flash English while the config hydrates. Changes are asked
 * for through `config.updateLanguage` (the choice is a stored preference), so
 * there is no `set` here.
 */
const languageApi = {
  initial: (): string | null => launchArgument('language'),

  onChanged: (callback: (language: LanguageId) => void) => {
    const listener = (_event: IpcRendererEvent, language: LanguageId) => callback(language)
    ipcRenderer.on('language:changed', listener)
    return () => ipcRenderer.removeListener('language:changed', listener)
  },
}

/**
 * Interface scale. Applied by the main process on the window's webContents, so
 * the renderer only reads it and asks for changes — it never scales itself.
 */
const zoomApi = {
  initial: (): number | null => {
    const raw = launchArgument('zoom')
    const value = raw === null ? NaN : Number(raw)
    return Number.isFinite(value) ? value : null
  },

  set: (zoom: number): Promise<number> => ipcRenderer.invoke('appearance:setZoom', { zoom }),

  onChanged: (callback: (zoom: number) => void) => {
    const listener = (_event: IpcRendererEvent, zoom: number) => callback(zoom)
    ipcRenderer.on('zoom:changed', listener)
    return () => ipcRenderer.removeListener('zoom:changed', listener)
  },
}

contextBridge.exposeInMainWorld('electronAPI', {
  config: configApi,
  terminal: terminalApi,
  history: historyApi,
  window: windowApi,
  dialog: dialogApi,
  shell: shellApi,
  updater: updaterApi,
  skills: skillsApi,
  scripts: scriptsApi,
  tray: trayApi,
  quickLaunch: quickLaunchApi,
  prWatcher: prWatcherApi,
  profile: profileApi,
  usage: usageApi,
  setup: setupApi,
  auth: authApi,
  org: orgApi,
  connectivity: connectivityApi,
  theme: themeApi,
  zoom: zoomApi,
  language: languageApi,
})

// Type definitions for the renderer
declare global {
  interface Window {
    electronAPI: {
      config: typeof configApi
      terminal: typeof terminalApi
      history: typeof historyApi
      window: typeof windowApi
      dialog: typeof dialogApi
      shell: typeof shellApi
      updater: typeof updaterApi
      skills: typeof skillsApi
      scripts: typeof scriptsApi
      tray: typeof trayApi
      quickLaunch: typeof quickLaunchApi
      prWatcher: typeof prWatcherApi
      profile: typeof profileApi
      usage: typeof usageApi
      setup: typeof setupApi
      auth: typeof authApi
      org: typeof orgApi
      connectivity: typeof connectivityApi
      theme: typeof themeApi
      zoom: typeof zoomApi
      language: typeof languageApi
    }
  }

}
