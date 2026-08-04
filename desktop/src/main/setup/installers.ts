import { spawn } from 'child_process'
import type { PrerequisiteId } from '../../types'
import { CLAUDE_INSTALL_COMMAND } from './prerequisites'
import { resolveShell } from './shell-exec'

/**
 * One-click repair for the prerequisites we know how to install.
 *
 * The alternative was printing `brew install jq` and trusting the user to open a
 * terminal, which is exactly the manual step this whole change exists to remove. But
 * it stays USER-TRIGGERED: an app that installs software on someone's machine at
 * launch, unprompted, is not something anyone asked for.
 *
 * Most entries are Homebrew formulas. Claude Code is not — it ships its own installer
 * — but it is the one REQUIRED tool with no formula, so leaving it as a link to go
 * read a docs page made the app's most important prerequisite the only one it could
 * not actually help with.
 */

/**
 * The commands this may run, keyed by the prerequisite that needs them.
 *
 * An ALLOWLIST OF WHOLE COMMANDS, not a parameter, because the id arrives over IPC
 * from the renderer and what comes back goes to a shell. Nothing here interpolates
 * anything: a compromised renderer can pick one of these five strings, and cannot
 * turn any of them into arbitrary execution.
 */
export const INSTALL_COMMANDS: Partial<Record<PrerequisiteId, string>> = {
  jq: 'brew install jq',
  gh: 'brew install gh',
  git: 'brew install git',
  node: 'brew install node',
  claude: CLAUDE_INSTALL_COMMAND,
}

export interface InstallResult {
  ok: boolean
  /** Combined stdout+stderr, for the setup panel to show when it fails. */
  output: string
  error?: string
}

/**
 * Install a prerequisite, streaming output as it comes.
 *
 * Streamed rather than awaited-then-shown because an install can spend a minute with
 * nothing to say (brew updating its index, curl fetching a tarball), and a spinner
 * that hides that looks stuck.
 *
 * The 10-minute ceiling is for a genuinely slow first install (a `brew update` plus a
 * source build); past that, something is wrong and the promise resolves with what it
 * captured rather than hanging the panel forever.
 */
export function installPrerequisite(
  id: PrerequisiteId,
  onOutput?: (chunk: string) => void,
): Promise<InstallResult> {
  const command = INSTALL_COMMANDS[id]
  if (!command) {
    return Promise.resolve({ ok: false, output: '', error: `not installable: ${id}` })
  }

  return new Promise((resolve) => {
    // Login shell, like every other command here: neither brew nor curl's install
    // target is on a GUI app's PATH.
    const child = spawn(resolveShell(), ['-l', '-c', command], {
      env: {
        ...process.env,
        // Keep brew from opening a pager or asking anything — there is no terminal
        // attached to answer with. Harmless for the installer that is not brew.
        HOMEBREW_NO_AUTO_UPDATE: '1',
        HOMEBREW_NO_ENV_HINTS: '1',
      },
    })

    let output = ''
    const collect = (data: Buffer) => {
      const chunk = data.toString()
      output += chunk
      onOutput?.(chunk)
    }

    child.stdout?.on('data', collect)
    child.stderr?.on('data', collect)

    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({ ok: false, output, error: 'timeout' })
    }, 10 * 60 * 1000)

    child.on('error', (error) => {
      clearTimeout(timeout)
      resolve({ ok: false, output, error: error.message })
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      resolve({ ok: code === 0, output, error: code === 0 ? undefined : `install exited ${code}` })
    })
  })
}
