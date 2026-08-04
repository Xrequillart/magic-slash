import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The retry is the whole point of this module, so it is what gets tested.
 *
 * `zsh -l -c` reads .zshenv/.zprofile/.zlogin and stops — it never reads .zshrc, which
 * is where `export PATH="$HOME/.local/bin:$PATH"` and the nvm loader actually live. So
 * a login-only probe reported `claude` missing on machines whose terminal ran it fine.
 * These tests pin the fix: ask again interactively before believing a tool is absent.
 */

const execFile = vi.hoisted(() => vi.fn())
vi.mock('child_process', () => ({ execFile, execFileSync: vi.fn() }))

/** Answer per invocation, so a test can make the login shell fail and the next succeed. */
function respond(...outcomes: Array<{ ok: boolean; stdout?: string; stderr?: string }>) {
  let call = 0
  execFile.mockImplementation((_file, _args, _options, callback) => {
    const outcome = outcomes[Math.min(call++, outcomes.length - 1)]
    callback(outcome.ok ? null : new Error('exit 127'), outcome.stdout ?? '', outcome.stderr ?? '')
  })
}

/** The shell flags each call was made with, in order. */
function flagsPerCall(): string[][] {
  return execFile.mock.calls.map((call) => (call[1] as string[]).slice(0, -1))
}

describe('runInLoginShell', () => {
  beforeEach(() => {
    execFile.mockReset()
    vi.resetModules()
  })

  it('asks the login shell only, when the login shell finds it', async () => {
    const { runInLoginShell } = await import('./shell-exec')
    respond({ ok: true, stdout: '2.1.221 (Claude Code)' })

    const result = await runInLoginShell('claude --version')

    expect(result).toEqual({ ok: true, stdout: '2.1.221 (Claude Code)', stderr: '' })
    // No interactive retry on the happy path: it is slower and can print a banner.
    expect(flagsPerCall()).toEqual([['-l', '-c']])
  })

  it('retries interactively when the login shell cannot find the tool', async () => {
    const { runInLoginShell } = await import('./shell-exec')
    // Exactly the bug: absent from the login shell, present once .zshrc is read.
    respond(
      { ok: false, stderr: 'zsh:1: command not found: claude' },
      { ok: true, stdout: '2.1.221 (Claude Code)' },
    )

    const result = await runInLoginShell('claude --version')

    expect(result.ok).toBe(true)
    expect(result.stdout).toBe('2.1.221 (Claude Code)')
    expect(flagsPerCall()).toEqual([['-l', '-c'], ['-i', '-l', '-c']])
  })

  it('reports the login shell error when both attempts fail', async () => {
    const { runInLoginShell } = await import('./shell-exec')
    respond(
      { ok: false, stderr: 'zsh:1: command not found: claude' },
      { ok: false, stderr: 'oh-my-zsh banner noise' },
    )

    const result = await runInLoginShell('claude --version')

    expect(result.ok).toBe(false)
    // The clean error, not whatever the noisier interactive profile printed over it.
    expect(result.stderr).toBe('zsh:1: command not found: claude')
  })

  it('passes a non-interactive TERM to the interactive retry', async () => {
    const { runInLoginShell } = await import('./shell-exec')
    respond({ ok: false, stderr: 'not found' }, { ok: false, stderr: 'not found' })

    await runInLoginShell('claude --version')

    // Without a tty, a shell that thinks it has a user can block on a prompt or
    // complain about the terminal — which would burn the timeout instead of answering.
    const options = execFile.mock.calls[1][2] as { env: Record<string, string> }
    expect(options.env.TERM).toBeTruthy()
    expect(options.env.DISABLE_AUTO_UPDATE).toBe('true')
  })
})

describe('which', () => {
  beforeEach(() => {
    execFile.mockReset()
    vi.resetModules()
  })

  it('returns the resolved path, from the interactive retry when needed', async () => {
    const { which } = await import('./shell-exec')
    respond({ ok: false, stderr: 'not found' }, { ok: true, stdout: '/Users/x/.local/bin/claude' })

    expect(await which('claude')).toBe('/Users/x/.local/bin/claude')
  })

  it('returns null when no shell can resolve it', async () => {
    const { which } = await import('./shell-exec')
    respond({ ok: false, stderr: 'not found' })

    expect(await which('claude')).toBeNull()
  })
})
