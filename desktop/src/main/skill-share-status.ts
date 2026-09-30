import { execFile } from 'child_process'
import type { SkillShareResult } from '../types'

/**
 * Whether the repository's copy of a skill has reached the teammates, for the workflow
 * editor's warnings. A copy into the checkout is not yet shared: it is once committed
 * and pushed, so the warning follows it through each state instead of clearing at the
 * copy.
 *
 *   - `missing`: the repository has no such skill
 *   - `uncommitted`: in the working tree, untracked or changed since HEAD
 *   - `unpushed`: committed, and not on the remote development branch as far as the
 *     local remote-tracking ref knows (never fetched: that is the user's call)
 *   - `shared`: on that remote ref
 *   - `unknown`: nothing to look at on this machine (no local folder, no git)
 *
 * The decision is `skillShareStatus`, over an injected git runner, so it is tested on a
 * temp repository; `gitRunner` is the one the handler gives it.
 */

export type { SkillShareResult, SkillShareStatus } from '../types'

/** Runs `git <args>`: ok is a zero exit, stdout trimmed. Never throws. */
export type GitRunner = (args: string[]) => Promise<{ ok: boolean; stdout: string }>

/** git through execFile (no shell), in `cwd`, killed after `timeoutMs`. */
export function gitRunner(cwd: string, timeoutMs = 5000): GitRunner {
  return (args) => new Promise((resolve) => {
    execFile('git', args, { cwd, timeout: timeoutMs, windowsHide: true }, (error, stdout) => {
      resolve({ ok: !error, stdout: String(stdout ?? '').trim() })
    })
  })
}

/**
 * The remote development branch: the repository's configured one when origin has it,
 * else what `origin/HEAD` points at. undefined when neither resolves locally.
 */
async function remoteBranch(run: GitRunner, configured?: string): Promise<string | undefined> {
  if (configured && (await run(['rev-parse', '--verify', '--quiet', `refs/remotes/origin/${configured}^{commit}`])).ok) {
    return configured
  }
  const head = await run(['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD'])
  const match = head.ok ? head.stdout.match(/^refs\/remotes\/origin\/(.+)$/) : null
  return match ? match[1] : undefined
}

/**
 * The share status of `relPath` (the skill's folder or command file, relative to the
 * runner's cwd, with `/`), null when the repository does not have it at all.
 * `configuredBranch` is the repository's `branches.development`.
 */
export async function skillShareStatus(
  run: GitRunner,
  relPath: string | null,
  configuredBranch?: string,
): Promise<SkillShareResult> {
  if (!relPath) return { status: 'missing' }
  if (!(await run(['rev-parse', '--is-inside-work-tree'])).ok) return { status: 'unknown' }

  // Untracked altogether, a new file inside a tracked folder, or changes since HEAD
  // (staged or not). `--` keeps a path from being read as an option or a revision.
  if (!(await run(['ls-files', '--error-unmatch', '--', relPath])).ok) return { status: 'uncommitted' }
  const untracked = await run(['ls-files', '--others', '--exclude-standard', '--', relPath])
  if (untracked.ok && untracked.stdout !== '') return { status: 'uncommitted' }
  if (!(await run(['diff', '--quiet', 'HEAD', '--', relPath])).ok) return { status: 'uncommitted' }

  // Shared only when verified on the remote ref; anything short of that is not pushed.
  const branch = await remoteBranch(run, configuredBranch)
  if (!branch) return { status: 'unpushed' }
  // `./` makes the path relative to the cwd, which may be below the repository's root.
  const onRemote = await run(['cat-file', '-e', `refs/remotes/origin/${branch}:./${relPath}`])
  return onRemote.ok ? { status: 'shared', branch } : { status: 'unpushed', branch }
}
