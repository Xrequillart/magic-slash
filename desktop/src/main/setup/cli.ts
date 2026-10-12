import type { GhCliStatus } from '../../types'
import { runInLoginShell } from './shell-exec'

/**
 * THE CLIs THE SKILLS LEAN ON, checked from the Connections tab. One today: `gh`.
 *
 * It is more than a prerequisite now: the GitHub MCP server signs in with whatever
 * `gh auth token` prints (see mcp.ts), so a `gh` that is installed but logged out is a
 * GitHub server that fails at connect. The check therefore answers both questions,
 * installed and logged in, and says as whom.
 *
 * Through the login shell, as every probe in setup/: an app launched from the Dock has
 * launchd's PATH, which has never heard of /opt/homebrew/bin.
 */

/** `gh version 2.62.0 (2024-11-14)` → `2.62.0`. */
export function parseGhVersion(text: string): string | null {
  return text.match(/gh version (\S+)/)?.[1] ?? null
}

/** The handle in `gh auth status`, in its old (`as <user>`) or new (`account <user>`) wording. */
export function parseGhAccount(text: string): string | null {
  return text.match(/Logged in to \S+ account (\S+)/i)?.[1] ?? text.match(/Logged in to \S+ as (\S+)/i)?.[1] ?? null
}

export async function checkGhCli(): Promise<GhCliStatus> {
  const checkedAt = Date.now()
  const version = await runInLoginShell('gh --version')
  if (!version.ok) return { checkedAt, installed: false, version: null, loggedIn: false, account: null }

  // `gh auth status` exits non-zero when logged out OR when the stored token no longer
  // works; either way the MCP server would get nothing usable. It writes to stderr.
  const auth = await runInLoginShell('gh auth status --hostname github.com')
  return {
    checkedAt,
    installed: true,
    version: parseGhVersion(version.stdout),
    loggedIn: auth.ok,
    account: auth.ok ? parseGhAccount(`${auth.stdout}\n${auth.stderr}`) : null,
  }
}
