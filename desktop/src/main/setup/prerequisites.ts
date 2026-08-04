import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { PrerequisiteId, PrerequisiteStatus } from '../../types'
import { runInLoginShell, which } from './shell-exec'

/**
 * What the machine needs before any skill can run, and what is missing.
 *
 * This is the check `install/install.sh` used to do in its preflight section, moved
 * into the app so there is one place that knows the answer — the script could only
 * ever report the state of the machine at the moment someone ran it, which said
 * nothing about the state six months and one `brew uninstall` later.
 *
 * Nothing here installs anything. Detection and repair are deliberately split:
 * see brew.ts, which the user triggers explicitly.
 */

/** Claude Code's own minimum, and the version the skills are written against. */
const MIN_NODE_MAJOR = 20

/** Claude Code's official installer — the same one its docs tell people to run. */
export const CLAUDE_INSTALL_COMMAND = 'curl -fsSL https://claude.ai/install.sh | bash'

/**
 * Where `claude` lives when no shell will admit it exists.
 *
 * A last resort behind the interactive-shell retry in shell-exec, for the case that
 * retry cannot fix: a PATH export that lives somewhere neither shell startup path
 * reads (a fish config, a dotfiles manager, a profile guarded by an `if
 * [[ -o interactive ]]`). It also closes the loop right after our own install button
 * runs — install.sh drops the binary in ~/.local/bin and appends the PATH line to a
 * profile, so without this the re-check could still say "not installed" on a machine
 * where we had just installed it.
 */
function claudeFallbackPaths(): string[] {
  const home = os.homedir()
  return [
    path.join(home, '.local', 'bin', 'claude'), // native installer (current)
    path.join(home, '.claude', 'local', 'claude'), // older local install
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
  ]
}

interface Probe {
  id: PrerequisiteId
  /** Command printing a version string; parsed loosely (see parseMajor). */
  versionCommand: string
  /** A missing OPTIONAL tool degrades a feature; a missing required one blocks. */
  required: boolean
  /** Homebrew formula name, when brew can install it. */
  formula: string | null
  /** A self-contained install command, for what brew has no formula for. */
  installScript?: string
  /** Absolute paths to try when no shell can resolve the command. */
  fallbackPaths?: () => string[]
  /** Minimum major version, when one is enforced. */
  minMajor?: number
  /** Where to send someone brew cannot help. */
  docsUrl?: string
}

const PROBES: Probe[] = [
  // Claude Code itself. Not a brew formula, but it ships an official installer we can
  // run, so this is a button rather than a link to go read something.
  {
    id: 'claude',
    versionCommand: 'claude --version',
    required: true,
    formula: null,
    installScript: CLAUDE_INSTALL_COMMAND,
    fallbackPaths: claudeFallbackPaths,
    docsUrl: 'https://claude.ai/download',
  },
  { id: 'node', versionCommand: 'node -v', required: true, formula: 'node', minMajor: MIN_NODE_MAJOR },
  { id: 'git', versionCommand: 'git --version', required: true, formula: 'git' },
  // Required, and the least obvious of the lot: the telemetry hooks parse Claude
  // Code's payload with jq and end in `|| true`, so without it they emit nothing and
  // exit 0 — a completely silent failure (see usage/telemetry-health.ts).
  { id: 'jq', versionCommand: 'jq --version', required: true, formula: 'jq' },
  // Optional: /magic:resolve falls back to a non-threaded reply without it.
  { id: 'gh', versionCommand: 'gh --version', required: false, formula: 'gh' },
]

/**
 * First version-looking number in a tool's output, as [major, full].
 *
 * Loose on purpose — every tool answers differently ("v20.11.0", "git version
 * 2.39.3 (Apple Git-146)", "jq-1.7.1", "2.40.1 (Claude Code)") and a strict parser
 * would have to be corrected every time one of them changes its banner. Getting the
 * major right is all any caller needs; the full string is for display only.
 */
export function parseVersion(output: string): { major: number | null; version: string | null } {
  const match = output.match(/(\d+)\.(\d+)(?:\.(\d+))?/)
  if (!match) return { major: null, version: null }
  return { major: Number(match[1]), version: match[0] }
}

/** Whether Homebrew is available to install things with. */
export async function hasHomebrew(): Promise<boolean> {
  return (await which('brew')) !== null
}

/** Human-facing install command for a tool, or null when we can only link to docs. */
function installCommand(probe: Probe, brewPresent: boolean): string | null {
  // Its own installer wins: it works regardless of whether brew is here.
  if (probe.installScript) return probe.installScript
  if (!probe.formula) return null
  if (process.platform === 'darwin') {
    return brewPresent ? `brew install ${probe.formula}` : null
  }
  // Debian/Ubuntu names node "nodejs"; everything else matches the formula.
  const pkg = probe.formula === 'node' ? 'nodejs' : probe.formula
  return `sudo apt install ${pkg}`
}

/** Whether the app can run the install itself, rather than only printing a command. */
function isInstallable(probe: Probe, brewPresent: boolean): boolean {
  // install.sh covers macOS and Linux; it is the shell it needs that Windows lacks.
  if (probe.installScript) return process.platform !== 'win32'
  return process.platform === 'darwin' && brewPresent && probe.formula !== null
}

/**
 * Ask an absolute path for its version, for a tool no shell could resolve.
 *
 * Quoted because a home directory is allowed to contain spaces, and X_OK rather than
 * mere existence because a non-executable file there would fail in a far more
 * confusing way than being reported absent.
 */
async function probeFallbackPaths(probe: Probe): Promise<{ ok: boolean; output: string }> {
  for (const candidate of probe.fallbackPaths?.() ?? []) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK)
    } catch {
      continue
    }
    const args = probe.versionCommand.split(' ').slice(1).join(' ')
    const { ok, stdout, stderr } = await runInLoginShell(`"${candidate}" ${args}`)
    if (ok) return { ok, output: stdout || stderr }
  }
  return { ok: false, output: '' }
}

async function probeOne(probe: Probe, brewPresent: boolean): Promise<PrerequisiteStatus> {
  let { ok, stdout, stderr } = await runInLoginShell(probe.versionCommand)

  // No shell could find it. Before calling it missing — the single most confusing
  // thing this check can get wrong — look where it is actually installed.
  if (!ok) {
    const fallback = await probeFallbackPaths(probe)
    if (fallback.ok) {
      ok = true
      stdout = fallback.output
      stderr = ''
    }
  }

  // Some tools print their version to stderr; take whichever stream spoke.
  const { major, version } = parseVersion(stdout || stderr)
  const installed = ok
  const outdated = installed && probe.minMajor !== undefined && major !== null && major < probe.minMajor

  return {
    id: probe.id,
    installed,
    outdated,
    version: installed ? version : null,
    minVersion: probe.minMajor !== undefined ? String(probe.minMajor) : null,
    required: probe.required,
    installCommand: installCommand(probe, brewPresent),
    installable: isInstallable(probe, brewPresent),
    docsUrl: probe.docsUrl ?? null,
  }
}

/**
 * Probe every prerequisite, concurrently.
 *
 * Concurrent because each probe pays for a login shell (~100-300ms with a real
 * profile, and twice that for a tool that needs the interactive retry) and they are
 * independent; serially this would be the slowest part of the launch path for no
 * reason.
 */
export async function checkPrerequisites(): Promise<PrerequisiteStatus[]> {
  const brewPresent = await hasHomebrew()
  return Promise.all(PROBES.map((probe) => probeOne(probe, brewPresent)))
}

/** True when something REQUIRED is missing or too old — i.e. skills cannot run. */
export function hasBlockingIssue(statuses: PrerequisiteStatus[]): boolean {
  return statuses.some((s) => s.required && (!s.installed || s.outdated))
}
