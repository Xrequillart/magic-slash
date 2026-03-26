import { contextBridge, ipcRenderer } from 'electron'
import type { TerminalMetadata } from '../types'

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

  updateRepository: (name: string, updates: any) =>
    ipcRenderer.invoke('config:updateRepository', { name, updates }),

  deleteRepository: (name: string) =>
    ipcRenderer.invoke('config:deleteRepository', { name }),

  renameRepository: (oldName: string, newName: string) =>
    ipcRenderer.invoke('config:renameRepository', { oldName, newName }),

  updateRepositoryLanguages: (name: string, languages: Record<string, string | null>) =>
    ipcRenderer.invoke('config:updateRepositoryLanguages', { name, languages }),

  updateRepositoryCommitSettings: (name: string, settings: Record<string, any>) =>
    ipcRenderer.invoke('config:updateRepositoryCommitSettings', { name, settings }),

  updateRepositoryResolveSettings: (name: string, settings: Record<string, any>) =>
    ipcRenderer.invoke('config:updateRepositoryResolveSettings', { name, settings }),

  updateRepositoryPullRequestSettings: (name: string, settings: Record<string, any>) =>
    ipcRenderer.invoke('config:updateRepositoryPullRequestSettings', { name, settings }),

  updateRepositoryIssuesSettings: (name: string, settings: Record<string, any>) =>
    ipcRenderer.invoke('config:updateRepositoryIssuesSettings', { name, settings }),

  updateRepositoryBranchSettings: (name: string, settings: Record<string, any>) =>
    ipcRenderer.invoke('config:updateRepositoryBranchSettings', { name, settings }),

  updateRepositoryWorktreeFilesSettings: (name: string, settings: Record<string, any>) =>
    ipcRenderer.invoke('config:updateRepositoryWorktreeFilesSettings', { name, settings }),

  updateSplitEnabled: (enabled: boolean) =>
    ipcRenderer.invoke('config:updateSplitEnabled', { enabled }),

  validatePath: (path: string) =>
    ipcRenderer.invoke('config:validatePath', { path }),

  hasGitHubRemote: (path: string) =>
    ipcRenderer.invoke('config:hasGitHubRemote', { path }),

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

}

// Terminal API
const terminalApi = {
  create: (id: string, name: string, cwd: string) =>
    ipcRenderer.invoke('terminal:create', { id, name, cwd }),

  launchClaude: (id: string, name: string, cwd: string) =>
    ipcRenderer.invoke('terminal:launchClaude', { id, name, cwd }),

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
    const listener = (_event: any, data: { id: string; data: string }) => callback(data)
    ipcRenderer.on('terminal:data', listener)
    return () => ipcRenderer.removeListener('terminal:data', listener)
  },

  onState: (callback: (data: { id: string; state: TerminalState; previousState: TerminalState }) => void) => {
    const listener = (_event: any, data: { id: string; state: TerminalState; previousState: TerminalState }) => callback(data)
    ipcRenderer.on('terminal:state', listener)
    return () => ipcRenderer.removeListener('terminal:state', listener)
  },

  onExit: (callback: (data: { id: string; exitCode: number }) => void) => {
    const listener = (_event: any, data: { id: string; exitCode: number }) => callback(data)
    ipcRenderer.on('terminal:exit', listener)
    return () => ipcRenderer.removeListener('terminal:exit', listener)
  },

  onBranch: (callback: (data: { id: string; branchName: string | null }) => void) => {
    const listener = (_event: any, data: { id: string; branchName: string | null }) => callback(data)
    ipcRenderer.on('terminal:branch', listener)
    return () => ipcRenderer.removeListener('terminal:branch', listener)
  },

  onMetadata: (callback: (data: { id: string; metadata: TerminalMetadata }) => void) => {
    const listener = (_event: any, data: { id: string; metadata: TerminalMetadata }) => callback(data)
    ipcRenderer.on('terminal:metadata', listener)
    return () => ipcRenderer.removeListener('terminal:metadata', listener)
  },

  onCommandStart: (callback: (data: { id: string; command: string }) => void) => {
    const listener = (_event: any, data: { id: string; command: string }) => callback(data)
    ipcRenderer.on('terminal:commandStart', listener)
    return () => ipcRenderer.removeListener('terminal:commandStart', listener)
  },

  onCommandEnd: (callback: (data: { id: string; exitCode: number }) => void) => {
    const listener = (_event: any, data: { id: string; exitCode: number }) => callback(data)
    ipcRenderer.on('terminal:commandEnd', listener)
    return () => ipcRenderer.removeListener('terminal:commandEnd', listener)
  },

  onRepositories: (callback: (data: { id: string; repositories: string[] }) => void) => {
    const listener = (_event: any, data: { id: string; repositories: string[] }) => callback(data)
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
  getVersion: (): Promise<string> => ipcRenderer.invoke('updater:getVersion'),
  getPendingWhatsNew: (): Promise<{ version: string; releaseNotes: string } | null> =>
    ipcRenderer.invoke('updater:getPendingWhatsNew'),
  clearPendingWhatsNew: (): Promise<void> => ipcRenderer.invoke('updater:clearPendingWhatsNew'),
  getReleaseNotes: (version: string): Promise<string | null> =>
    ipcRenderer.invoke('updater:getReleaseNotes', version),
  onStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: any, status: UpdateStatus) => callback(status)
    ipcRenderer.on('updater:status', listener)
    return () => ipcRenderer.removeListener('updater:status', listener)
  },
}

// Expose APIs to renderer
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
    }
  }
}
