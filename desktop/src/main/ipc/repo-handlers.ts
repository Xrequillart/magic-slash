import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { CloneErrorCode } from '../../types'
import { readConfig, setRepositoryRemoteUrl, updateRepository } from '../config/config'
import { getCloneDestination, setCloneDestination } from '../config/clone-destination'
import { GITHUB_REMOTE_URL_PATTERN, getExtendedPath } from '../config/validation'
import { getGitHubAuthStatus } from '../github'
import { which } from '../setup/shell-exec'

const execFileAsync = promisify(execFile)

/**
 * Every refusal this handler can explain, as a catalogue key the renderer
 * translates. Typed, so a mistyped key is a compile error here rather than a raw
 * `clone.error.…` string shown to the user. See CLONE_ERROR_CODES.
 */
const cloneError = (code: CloneErrorCode) => new Error(code)

/**
 * Ten minutes. A monorepo on a hotel wifi is a real thing, and a clone killed
 * halfway leaves a partial directory the next attempt then refuses to write into
 * — so the timeout has to be generous enough that hitting it means something is
 * genuinely wrong rather than merely slow.
 */
const CLONE_TIMEOUT_MS = 10 * 60 * 1000

/** git stderr fragments that all mean the same thing: the login is the problem. */
const AUTH_FAILURE_MARKERS = [
  'Authentication failed',
  'could not read Username',
  'Permission denied (publickey)',
  // A private repo you cannot see is indistinguishable from one that is not
  // there, and GitHub says the latter on purpose. For someone cloning a repo
  // their team just shared, the login is overwhelmingly the likelier cause.
  'Repository not found',
]

/**
 * The folder name a clone gets: the `repo` half of `owner/repo`.
 *
 * From the URL, never from the config record key — the key can carry an org
 * suffix (`api (Acme)`), and a folder called "api (Acme)" is not what anyone
 * asked for. Returns null for a URL this module would refuse anyway.
 *
 * `remote_url` is shared state that arrives from the cloud and ends up as an
 * argument to a subprocess, so it is re-validated as UNTRUSTED input rather than
 * merely parsed — against GITHUB_REMOTE_URL_PATTERN, the very pattern that minted
 * it, so a value rejected here is a value the app never wrote.
 */
export function cloneFolderName(remoteUrl: string): string | null {
  if (!GITHUB_REMOTE_URL_PATTERN.test(remoteUrl)) return null
  const name = remoteUrl.split('/').pop() ?? ''
  // `[\w.-]+` happily matches `.` and `..`; joined onto the destination those
  // are a directory traversal rather than a repository.
  if (name === '' || name === '.' || name === '..') return null
  return name
}

/** Whether a path is free to clone into: absent, or an empty directory. */
export function isCloneTargetFree(target: string): boolean {
  if (!fs.existsSync(target)) return true
  try {
    return fs.readdirSync(target).length === 0
  } catch {
    // Unreadable is not free — refusing is the safe answer.
    return false
  }
}

export interface CloneResult {
  path: string
  destination: string
}

/**
 * The actionable message for a clone git refused on credentials.
 *
 * git knows the login failed; it has no idea the fix is `gh auth login`. That
 * guidance is the whole reason these two keys exist, and they stay distinct
 * because the remedies differ: install gh first, or just log in.
 *
 * Asked only on the failing branch. `gh` is an OPTIONAL prerequisite
 * (setup/prerequisites.ts) — a public repo needs no credentials at all, and a
 * user with working ssh keys or their own credential helper clones private repos
 * without ever having installed it — so its absence is a hint about what to
 * suggest, never a reason to refuse. That also keeps the login shell `which`
 * costs off every successful clone.
 */
async function authFailureError(): Promise<Error> {
  // `gh auth status` reports "not logged in" when gh is missing entirely, so the
  // probe is what tells "no gh" from "gh, but logged out".
  if (getGitHubAuthStatus().loggedIn) return cloneError('clone.error.notAuthenticated')
  return cloneError((await which('gh')) ? 'clone.error.notAuthenticated' : 'clone.error.ghMissing')
}

/**
 * Clone an organization repository and bind the result to it.
 *
 * `key` is the CONFIG RECORD KEY, because that is what `updateRepository` takes;
 * the clone folder comes from the remote instead (see cloneFolderName). The path
 * is bound to the EXISTING repository, which is the whole point: an invitee ends
 * up sharing the org's repo, not owning a private copy of it.
 */
export async function cloneRepository(key: string, destination?: string): Promise<CloneResult> {
  const repo = readConfig().repositories?.[key]
  if (!repo) throw cloneError('clone.error.unknownRepo')

  const remoteUrl = repo.remoteUrl?.trim()
  if (!remoteUrl) throw cloneError('clone.error.noRemote')

  const folderName = cloneFolderName(remoteUrl)
  if (!folderName) throw cloneError('clone.error.invalidRemote')

  const parent = destination?.trim() ? setCloneDestination(destination) : getCloneDestination()
  const target = path.join(parent, folderName)
  if (!isCloneTargetFree(target)) throw cloneError('clone.error.targetExists')

  fs.mkdirSync(parent, { recursive: true })

  try {
    // execFile, not a shell: the URL is validated but never quoted, and there is
    // nothing here for a shell to reinterpret. Deliberately NOT runInLoginShell —
    // it retries the whole command interactively on failure, which would make a
    // failed ten-minute clone cost twenty and land the retry on the directory the
    // first attempt already created.
    await execFileAsync('git', ['clone', remoteUrl, target], {
      env: {
        ...process.env,
        // GUI apps on macOS inherit launchd's PATH, where neither git nor ssh may live.
        PATH: getExtendedPath(),
        // Never ask for a username/password on the terminal we don't have.
        GIT_TERMINAL_PROMPT: '0',
        // Same rule for ssh: fail instead of prompting for a passphrase or a
        // host-key confirmation nobody can answer.
        GIT_SSH_COMMAND: 'ssh -o BatchMode=yes',
      },
      timeout: CLONE_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    })
  } catch (error) {
    const stderr = String((error as { stderr?: unknown })?.stderr ?? '')
    if (AUTH_FAILURE_MARKERS.some((marker) => stderr.includes(marker))) {
      throw await authFailureError()
    }
    const message = stderr.trim() || (error instanceof Error ? error.message : String(error))
    throw new Error(message)
  }

  // Bind the freshly cloned folder to the repository that was already there.
  updateRepository(key, { path: target })

  return { path: target, destination: parent }
}

/**
 * A payload field that must be a non-blank string.
 *
 * The types on an `ipcMain.handle` signature describe what the renderer is
 * SUPPOSED to send; they are erased at runtime and the channel is reachable from
 * any renderer code. Without this, `undefined` reaches `path.join` or the config
 * lookup and surfaces as a raw `TypeError` — an unactionable message for the
 * user and a stack trace in the log instead of a refusal. A missing argument is
 * a caller bug, so it throws rather than returning a CloneErrorCode: those are
 * the catalogue of things the USER can act on.
 */
function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`repo handler: "${field}" must be a non-empty string`)
  }
  return value
}

export function setupRepoHandlers(): void {
  ipcMain.handle('repo:getCloneDestination', async () => {
    return { destination: getCloneDestination() }
  })

  ipcMain.handle('repo:setCloneDestination', async (_event, payload: { destination?: unknown } = {}) => {
    return { destination: setCloneDestination(requireString(payload?.destination, 'destination')) }
  })

  ipcMain.handle('repo:setRemoteUrl', async (_event, payload: { key?: unknown; remoteUrl?: unknown } = {}) => {
    const config = await setRepositoryRemoteUrl(
      requireString(payload?.key, 'key'),
      requireString(payload?.remoteUrl, 'remoteUrl'),
    )
    return { config }
  })

  ipcMain.handle(
    'repo:clone',
    async (_event, payload: { key?: unknown; destination?: unknown } = {}) => {
      const key = requireString(payload?.key, 'key')
      // Optional: omitted means "use the remembered destination". Present but
      // not a usable string is a caller bug, not a silent fallback — falling
      // back would clone into a folder the caller did not ask for.
      const destination =
        payload?.destination === undefined
          ? undefined
          : requireString(payload.destination, 'destination')
      return cloneRepository(key, destination)
    },
  )
}
