import * as fs from 'fs'
import { readConfig } from '../config/config'
import { expandPath } from '../config/validation'

/**
 * Pick the directory Claude Code must run in for a given agent.
 *
 * An agent created with ⌘N starts in the generic launch folder (~/Documents) and
 * keeps that folder as `repositories[0]`; attaching a repository afterwards only
 * appends to the list. Taking `repositories[0]` blindly would therefore relaunch
 * the agent in ~/Documents even though it is attached to a repo — so a configured
 * repository always wins over the launch folder, whatever its position in the list.
 *
 * Falls back to the first attached path that exists, then to `fallback`.
 */
export function resolveAgentCwd(repositories: string[] | undefined, fallback: string): string {
  const candidates = (repositories ?? [])
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .map(expandPath)
    .filter(p => fs.existsSync(p))

  if (candidates.length === 0) return fallback

  let configured: Set<string>
  try {
    configured = new Set(
      Object.values(readConfig().repositories ?? {})
        .map(repo => repo.path)
        .filter((p): p is string => typeof p === 'string' && p.length > 0)
        .map(expandPath)
    )
  } catch {
    configured = new Set()
  }

  return candidates.find(p => configured.has(p)) ?? candidates[0]
}
