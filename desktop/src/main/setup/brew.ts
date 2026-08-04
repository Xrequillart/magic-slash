import { spawn } from 'child_process'
import type { PrerequisiteId } from '../../types'
import { resolveShell } from './shell-exec'

/**
 * One-click repair for the prerequisites Homebrew can install.
 *
 * The alternative was printing `brew install jq` and trusting the user to open a
 * terminal, which is exactly the manual step this whole change exists to remove. But
 * it stays USER-TRIGGERED: an app that installs software on someone's machine at
 * launch, unprompted, is not something anyone asked for.
 */

/**
 * Formulas this may install, mapped from the prerequisite that needs them.
 *
 * An ALLOWLIST, not a parameter, because the formula name arrives over IPC from the
 * renderer and ends up inside a shell command. Anything not in this map is refused,
 * so a compromised renderer cannot turn `brew install` into arbitrary execution.
 */
const INSTALLABLE: Partial<Record<PrerequisiteId, string>> = {
  jq: 'jq',
  gh: 'gh',
  git: 'git',
  node: 'node',
}

export interface InstallResult {
  ok: boolean
  /** Combined stdout+stderr, for the setup panel to show when it fails. */
  output: string
  error?: string
}

/**
 * Install a prerequisite with Homebrew, streaming output as it comes.
 *
 * Streamed rather than awaited-then-shown because a brew install can spend a minute
 * updating its index with nothing to say, and a spinner that hides that looks stuck.
 *
 * The 10-minute ceiling is for a genuinely slow first install (a `brew update` plus a
 * source build); past that, something is wrong and the promise resolves with what it
 * captured rather than hanging the panel forever.
 */
export function installPrerequisite(
  id: PrerequisiteId,
  onOutput?: (chunk: string) => void,
): Promise<InstallResult> {
  const formula = INSTALLABLE[id]
  if (!formula) {
    return Promise.resolve({ ok: false, output: '', error: `not installable: ${id}` })
  }

  return new Promise((resolve) => {
    // Login shell, like every other command here: brew is not on a GUI app's PATH.
    const child = spawn(resolveShell(), ['-l', '-c', `brew install ${formula}`], {
      env: {
        ...process.env,
        // Keep brew from opening a pager or asking anything — there is no terminal
        // attached to answer with.
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
      resolve({ ok: code === 0, output, error: code === 0 ? undefined : `brew exited ${code}` })
    })
  })
}
