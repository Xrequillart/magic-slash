import { BrowserWindow } from 'electron'
import { readConfig } from '../config/config'
import type { WorkflowChange } from '../../types'

/**
 * Tell every window that these repositories' workflows changed (`workflow:changed`),
 * one event per repository. Every window, not just the main one: whichever shows a
 * repository's Workflow tab has to follow a save made from another.
 *
 * The cache is keyed by repo id and the renderer by config key, so the name is looked
 * up here; a repository no longer in the config (unshared, deleted) goes out with a
 * null name, so a screen still showing it can let go.
 */
export function notifyWorkflowsChanged(repoIds: string[]): void {
  if (repoIds.length === 0) return
  const repositories = readConfig().repositories
  const names = new Map<string, string>()
  for (const [name, repo] of Object.entries(repositories)) if (repo.id) names.set(repo.id, name)
  for (const repoId of repoIds) {
    const change: WorkflowChange = { repoId, name: names.get(repoId) ?? null }
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('workflow:changed', change)
    }
  }
}
