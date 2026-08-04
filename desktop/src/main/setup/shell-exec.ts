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
 * WHY A LOGIN SHELL IS NOT ENOUGH
 * ---------------------------------------------------------------------------
 * `-l` alone reads the LOGIN files and stops there: for zsh that is .zshenv,
 * .zprofile and .zlogin — NOT .zshrc, which zsh reserves for interactive shells
 * (bash draws the same line between .bash_profile and .bashrc). And .zshrc is
 * precisely where people put `export PATH="$HOME/.local/bin:$PATH"` and the nvm
 * loader, because that is what every install guide tells them to paste. So the
 * exact tools this module cares about are the ones a login-only shell cannot see,
 * and `claude` reported itself missing on machines whose terminal ran it fine.
 *
 * Hence the two-step below: try the quiet login shell, and only when that fails
 * retry with `-i` so the interactive files are sourced too. Failure-only, because
 * an interactive shell is the slower and noisier of the two (a profile may print a
 * banner or a prompt), and there is no reason to pay for it on the happy path.
 *
 * This finally matches how the app SPAWNS agents — pty/terminal-manager.ts passes
 * `-li` — so a tool visible to the setup is a tool the skills can actually run.
 */

/**
 * Env for the interactive attempt: keep a shell that thinks it has a user from
 * blocking on one. Without a tty, zsh may complain about the terminal definition,
 * and oh-my-zsh is happy to ask about an update — on a pipe, that question is a
 * 15-second timeout instead of a prompt.
 */
const INTERACTIVE_ENV = {
  TERM: process.env.TERM || 'dumb',
  DISABLE_AUTO_UPDATE: 'true',
  DISABLE_UPDATE_PROMPT: 'true',
  ZSH_DISABLE_COMPFIX: 'true',
}

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
  const login = await runOnce(['-l', '-c', command], timeoutMs)
  if (login.ok) return login
  // Not found by the login shell — it may simply never have read .zshrc. Ask again
  // as an interactive shell before believing the tool is absent.
  const interactive = await runOnce(['-i', '-l', '-c', command], timeoutMs, INTERACTIVE_ENV)
  // The login shell's stderr is the honest error to report when BOTH fail: the
  // interactive one is the noisier of the two and may bury it under profile output.
  return interactive.ok ? interactive : login
}

/** One `$SHELL <args>` run. Never throws — a non-zero exit is an answer, not a fault. */
function runOnce(args: string[], timeoutMs: number, extraEnv?: Record<string, string>): Promise<ShellResult> {
  return new Promise((resolve) => {
    execFile(
      resolveShell(),
      args,
      {
        timeout: timeoutMs,
        encoding: 'utf-8',
        env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
      },
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
  const login = runOnceSync(['-l', '-c', command], timeoutMs)
  if (login.ok) return login
  const interactive = runOnceSync(['-i', '-l', '-c', command], timeoutMs, INTERACTIVE_ENV)
  return interactive.ok ? interactive : login
}

function runOnceSync(args: string[], timeoutMs: number, extraEnv?: Record<string, string>): ShellResult {
  try {
    const stdout = execFileSync(resolveShell(), args, {
      timeout: timeoutMs,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
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
