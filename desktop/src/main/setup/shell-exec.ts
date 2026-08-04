import * as fs from 'fs'
import { execFile, execFileSync } from 'child_process'

/**
 * Runs commands the way the USER's terminal would, not the way Electron's would.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * A GUI app launched from the Finder or the Dock inherits launchd's environment,
 * not a shell's: PATH is roughly /usr/bin:/bin:/usr/sbin:/sbin. Every tool the
 * setup cares about is installed somewhere else — Homebrew puts binaries in
 * /opt/homebrew/bin, `claude` lands in ~/.local/bin or a Node prefix, nvm and fnm
 * are shell functions that only exist once a profile has been sourced.
 *
 * So a plain execFile('claude', ...) reports "claude is not installed" on a machine
 * where the user's own terminal runs it fine — the single most confusing failure a
 * prerequisites check can produce, because the guidance it prints ("install claude")
 * is wrong. Running through `$SHELL -l -c` sources the profile first and sees the
 * same PATH the user does.
 *
 * The same trick is already how the app spawns agents (see pty/terminal-manager.ts,
 * which passes `-l`), so a tool visible to the setup is a tool the skills can run.
 */

/** The user's shell, falling back through the usual suspects. Mirrors terminal-manager. */
export function resolveShell(): string {
  const candidates = [process.env.SHELL, '/bin/zsh', '/bin/bash', '/bin/sh']
  for (const shell of candidates) {
    if (shell && fs.existsSync(shell)) return shell
  }
  return '/bin/sh'
}

export interface ShellResult {
  ok: boolean
  stdout: string
  stderr: string
}

/**
 * Run `command` through a login shell and capture its output.
 *
 * Never throws: a non-zero exit is an ANSWER here (the tool is absent, the MCP is
 * not configured), not an exception to handle at every call site.
 *
 * The timeout matters — a profile that blocks on a prompt or a slow network call
 * would otherwise hang the setup check, and with it the launch path that awaits it.
 */
export async function runInLoginShell(command: string, timeoutMs = 15_000): Promise<ShellResult> {
  return new Promise((resolve) => {
    execFile(
      resolveShell(),
      ['-l', '-c', command],
      { timeout: timeoutMs, encoding: 'utf-8' },
      (error, stdout, stderr) => {
        resolve({ ok: !error, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() })
      },
    )
  })
}

/**
 * Synchronous variant, for the one place that needs it: `telemetryHealth()` is a
 * sync IPC handler and already probes jq this way.
 */
export function runInLoginShellSync(command: string, timeoutMs = 15_000): ShellResult {
  try {
    const stdout = execFileSync(resolveShell(), ['-l', '-c', command], {
      timeout: timeoutMs,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, stdout: (stdout || '').trim(), stderr: '' }
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string }
    return { ok: false, stdout: (e.stdout || '').trim(), stderr: (e.stderr || '').trim() }
  }
}

/** Absolute path of `tool` as the user's shell resolves it, or null when absent. */
export async function which(tool: string): Promise<string | null> {
  // `command -v` over `which`: it is a POSIX builtin, so it also finds shell
  // functions and aliases — which is how nvm-managed `node` presents itself.
  const { ok, stdout } = await runInLoginShell(`command -v ${tool}`)
  return ok && stdout ? stdout.split('\n')[0].trim() : null
}
