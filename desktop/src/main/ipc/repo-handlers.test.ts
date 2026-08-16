import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import type { Config, RepositoryConfig } from '../../types'

// Mock electron so ipcMain.handle works outside an Electron environment, and so
// the handlers can be captured and invoked directly.
const handlers = new Map<string, (event: unknown, payload: unknown) => unknown>()
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, payload: unknown) => unknown) => {
      handlers.set(channel, handler)
    },
  },
}))

const mockReadConfig: Mock<() => Config> = vi.fn()
const mockUpdateRepository: Mock<(name: string, updates: Partial<RepositoryConfig>) => unknown> = vi.fn()

const mockSetRemoteUrl: Mock<(name: string, url: string) => Promise<Config>> = vi.fn()

vi.mock('../config/config', () => ({
  readConfig: () => mockReadConfig(),
  updateRepository: (name: string, updates: Partial<RepositoryConfig>) => mockUpdateRepository(name, updates),
  setRepositoryRemoteUrl: (name: string, url: string) => mockSetRemoteUrl(name, url),
}))

// The destination file lives under CONFIG_DIR; the real module is exercised
// against a temp directory rather than mocked, so the default/remembering rules
// are tested as they actually behave on disk.
let configDir: string
vi.mock('../config/paths', () => ({
  get CONFIG_DIR() { return configDir },
}))

const mockWhich: Mock<(tool: string) => Promise<string | null>> = vi.fn()
vi.mock('../setup/shell-exec', () => ({
  which: (tool: string) => mockWhich(tool),
}))

const mockAuthStatus: Mock<() => { loggedIn: boolean; account?: string }> = vi.fn()
vi.mock('../github', () => ({
  getGitHubAuthStatus: () => mockAuthStatus(),
}))

// execFile is promisified by the module under test, so the mock has to honour
// the (…args, callback) contract util.promisify expects.
const mockClone: Mock<(args: string[]) => { stderr?: string } | Error> = vi.fn()
/** The options each clone was launched with, so the env can be asserted on. */
const cloneOptions: { env?: Record<string, string> }[] = []
vi.mock('child_process', () => ({
  execFile: (
    _file: string,
    args: string[],
    options: { env?: Record<string, string> },
    callback: (error: unknown, stdout: string, stderr: string) => void,
  ) => {
    cloneOptions.push(options)
    const result = mockClone(args)
    if (result instanceof Error) callback(result, '', '')
    else callback(null, '', result?.stderr ?? '')
  },
}))

import { cloneRepository, cloneFolderName, isCloneTargetFree, setupRepoHandlers } from './repo-handlers'
import { getCloneDestination, setCloneDestination, defaultCloneDestination } from '../config/clone-destination'

// ── helpers ───────────────────────────────────────────────────────────────────

let tmpDir: string

function config(repositories: Record<string, Partial<RepositoryConfig>>): Config {
  const repos: Record<string, RepositoryConfig> = {}
  for (const [key, repo] of Object.entries(repositories)) {
    repos[key] = { path: '', keywords: [], ...repo }
  }
  return { repositories: repos } as Config
}

/** A clone that succeeds by actually creating the folder git would have created. */
function successfulClone() {
  mockClone.mockImplementation((args: string[]) => {
    fs.mkdirSync(args[2], { recursive: true })
    fs.writeFileSync(path.join(args[2], 'README.md'), '# cloned')
    return {}
  })
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-handlers-test-'))
  configDir = path.join(tmpDir, 'config')
  handlers.clear()
  mockReadConfig.mockReset()
  mockUpdateRepository.mockReset()
  mockClone.mockReset()
  cloneOptions.length = 0
  mockWhich.mockReset().mockResolvedValue('/opt/homebrew/bin/gh')
  mockAuthStatus.mockReset().mockReturnValue({ loggedIn: true, account: 'octocat' })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('cloneFolderName', () => {
  it('names the folder after the repository, not after the config record key', () => {
    // The key can read `api (Acme)` when two orgs both have an `api`; no one
    // wants a folder called that.
    expect(cloneFolderName('https://github.com/acme/api')).toBe('api')
  })

  it('refuses anything that is not a plain https github.com/owner/repo address', () => {
    expect(cloneFolderName('git@github.com:acme/api.git')).toBeNull()
    expect(cloneFolderName('https://gitlab.com/acme/api')).toBeNull()
    expect(cloneFolderName('https://github.com/acme/api/../../etc')).toBeNull()
    // An argument smuggled into the URL would become a `git clone` flag.
    expect(cloneFolderName('https://github.com/acme/api --upload-pack=sh')).toBeNull()
  })

  it('refuses a repository segment that is a directory traversal rather than a name', () => {
    expect(cloneFolderName('https://github.com/acme/..')).toBeNull()
  })
})

describe('isCloneTargetFree', () => {
  it('accepts a path that does not exist, and an existing empty directory', () => {
    expect(isCloneTargetFree(path.join(tmpDir, 'nothing-here'))).toBe(true)
    const empty = path.join(tmpDir, 'empty')
    fs.mkdirSync(empty)
    expect(isCloneTargetFree(empty)).toBe(true)
  })

  it('refuses a directory that already has something in it', () => {
    const full = path.join(tmpDir, 'full')
    fs.mkdirSync(full)
    fs.writeFileSync(path.join(full, 'file.txt'), 'x')
    expect(isCloneTargetFree(full)).toBe(false)
  })
})

describe('clone destination', () => {
  it('defaults to ~/dev before anyone has chosen one', () => {
    expect(getCloneDestination()).toBe(defaultCloneDestination())
    expect(getCloneDestination()).toBe(path.join(os.homedir(), 'dev'))
  })

  it('remembers the folder chosen once, so later clones need no second choice', () => {
    setCloneDestination(path.join(tmpDir, 'code'))
    expect(getCloneDestination()).toBe(path.join(tmpDir, 'code'))
  })

  it('falls back to the default rather than failing on an unreadable file', () => {
    fs.mkdirSync(configDir, { recursive: true })
    fs.writeFileSync(path.join(configDir, 'clone-destination.json'), '{ not json')
    expect(getCloneDestination()).toBe(defaultCloneDestination())
  })
})

describe('cloneRepository', () => {
  it('refuses a repository the configuration does not have', async () => {
    mockReadConfig.mockReturnValue(config({}))
    await expect(cloneRepository('ghost')).rejects.toThrow('clone.error.unknownRepo')
  })

  it('refuses a repository with no clone address instead of guessing one', async () => {
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1' } }))
    await expect(cloneRepository('api')).rejects.toThrow('clone.error.noRemote')
    expect(mockClone).not.toHaveBeenCalled()
  })

  it('refuses a malformed address without handing it to git', async () => {
    // remote_url arrives from the cloud, so it is validated as untrusted input.
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://evil.example/acme/api' } }))
    await expect(cloneRepository('api', tmpDir)).rejects.toThrow('clone.error.invalidRemote')
    expect(mockClone).not.toHaveBeenCalled()
  })

  it('refuses to clone into a folder that already has something in it', async () => {
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    const existing = path.join(tmpDir, 'api')
    fs.mkdirSync(existing)
    fs.writeFileSync(path.join(existing, 'file.txt'), 'x')

    await expect(cloneRepository('api', tmpDir)).rejects.toThrow('clone.error.targetExists')
    expect(mockClone).not.toHaveBeenCalled()
  })

  // gh is an OPTIONAL prerequisite, and a public repository needs no credentials
  // at all: refusing before trying turned a working clone into a false negative.
  it('clones a repository that needs no credentials even though gh is absent', async () => {
    mockAuthStatus.mockReturnValue({ loggedIn: false })
    mockWhich.mockResolvedValue(null)
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    successfulClone()

    const result = await cloneRepository('api', tmpDir)

    expect(result.path).toBe(path.join(tmpDir, 'api'))
    expect(mockClone).toHaveBeenCalled()
  })

  // Same for someone with working ssh keys or their own credential helper: git
  // succeeds, and gh was never part of the question.
  it('clones with git credentials alone, without ever consulting gh', async () => {
    mockAuthStatus.mockReturnValue({ loggedIn: false })
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    successfulClone()

    await cloneRepository('api', tmpDir)

    expect(mockWhich).not.toHaveBeenCalled()
  })

  // Without gh there is no session either, so `gh auth status` reports the same
  // "not logged in" both times — telling the two apart is what `which` is for,
  // and the remedies differ: install it first, or merely log in.
  it('says gh is missing when the clone fails on credentials and gh is not installed', async () => {
    mockAuthStatus.mockReturnValue({ loggedIn: false })
    mockWhich.mockResolvedValue(null)
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    mockClone.mockImplementation(() =>
      Object.assign(new Error('exit 128'), { stderr: 'fatal: could not read Username for https://github.com' }),
    )

    await expect(cloneRepository('api', tmpDir)).rejects.toThrow('clone.error.ghMissing')
  })

  it('points at gh auth login when the clone fails on credentials and gh is installed', async () => {
    mockAuthStatus.mockReturnValue({ loggedIn: false })
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    mockClone.mockImplementation(() =>
      Object.assign(new Error('exit 128'), { stderr: 'git@github.com: Permission denied (publickey).' }),
    )

    await expect(cloneRepository('api', tmpDir)).rejects.toThrow('clone.error.notAuthenticated')
  })

  // The login shell `which` costs is not worth spending on the happy path, where
  // `gh auth status` has already answered the only question that matters.
  it('does not probe for gh at all when the session is already good', async () => {
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    successfulClone()

    await cloneRepository('api', tmpDir)

    expect(mockWhich).not.toHaveBeenCalled()
  })

  it('reads a credentials failure out of git’s stderr as the same actionable message', async () => {
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    mockClone.mockImplementation(() =>
      Object.assign(new Error('exit 128'), { stderr: 'remote: Repository not found.\nfatal: repository not found' }),
    )

    await expect(cloneRepository('api', tmpDir)).rejects.toThrow('clone.error.notAuthenticated')
  })

  it('passes a genuine git failure through, rather than replacing it with a generic message', async () => {
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    mockClone.mockImplementation(() =>
      Object.assign(new Error('exit 128'), { stderr: 'fatal: unable to access: SSL certificate problem' }),
    )

    await expect(cloneRepository('api', tmpDir)).rejects.toThrow('SSL certificate problem')
  })

  it('binds the cloned folder to the EXISTING repository, under its config record key', async () => {
    // The suffixed key is the point: the clone binds to the org's repo, and the
    // folder is named after the remote — never after the key.
    mockReadConfig.mockReturnValue(config({ 'api (Acme)': { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    successfulClone()

    const result = await cloneRepository('api (Acme)', tmpDir)

    expect(result.path).toBe(path.join(tmpDir, 'api'))
    expect(mockUpdateRepository).toHaveBeenCalledWith('api (Acme)', { path: path.join(tmpDir, 'api') })
  })

  it('runs git with prompts disabled, so a missing credential fails instead of hanging', async () => {
    // Load-bearing now that nothing refuses a credential-less clone up front: a
    // private repo with no usable login must fail fast rather than sit on a
    // prompt no one can answer.
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    successfulClone()

    await cloneRepository('api', tmpDir)

    expect(mockClone).toHaveBeenCalledWith(['clone', 'https://github.com/acme/api', path.join(tmpDir, 'api')])
    expect(cloneOptions[0].env?.GIT_TERMINAL_PROMPT).toBe('0')
    expect(cloneOptions[0].env?.GIT_SSH_COMMAND).toBe('ssh -o BatchMode=yes')
  })

  it('remembers the destination it was given, and reuses it on the next clone', async () => {
    mockReadConfig.mockReturnValue(config({
      api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' },
      web: { id: 'r2', remoteUrl: 'https://github.com/acme/web' },
    }))
    successfulClone()

    await cloneRepository('api', tmpDir)
    // No destination this time: it must land next to the first one anyway.
    const second = await cloneRepository('web')

    expect(second.destination).toBe(tmpDir)
    expect(second.path).toBe(path.join(tmpDir, 'web'))
  })
})

describe('setupRepoHandlers', () => {
  it('exposes the channels the renderer calls', () => {
    setupRepoHandlers()
    expect([...handlers.keys()].sort()).toEqual(
      ['repo:clone', 'repo:getCloneDestination', 'repo:setCloneDestination', 'repo:setRemoteUrl'],
    )
  })

  it('answers the renderer with the destination it stored', async () => {
    setupRepoHandlers()
    const set = handlers.get('repo:setCloneDestination')!
    const get = handlers.get('repo:getCloneDestination')!

    await set(null, { destination: path.join(tmpDir, 'src') })

    await expect(get(null, {})).resolves.toEqual({ destination: path.join(tmpDir, 'src') })
  })

  it('clones through the same path as the direct call, keyed by config record key', async () => {
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    successfulClone()
    setupRepoHandlers()

    const result = await handlers.get('repo:clone')!(null, { key: 'api', destination: tmpDir })

    expect(result).toEqual({ path: path.join(tmpDir, 'api'), destination: tmpDir })
  })

  it('routes a corrected clone address through the fill-or-correct path and returns the fresh config', async () => {
    // The correction exists because the capture's guards run on a member's own
    // machine: a wrong address can get in, and a rename or transfer makes a right
    // one go stale. Who may actually change it is the backend's call.
    const config = { version: '1.0.0', repositories: {} } as unknown as Config
    mockSetRemoteUrl.mockResolvedValue(config)
    setupRepoHandlers()

    const result = await handlers.get('repo:setRemoteUrl')!(null, {
      key: 'api',
      remoteUrl: 'https://github.com/acme/api',
    })

    expect(mockSetRemoteUrl).toHaveBeenCalledWith('api', 'https://github.com/acme/api')
    expect(result).toEqual({ config })
  })

  it('validates the corrected address payload before it reaches the config layer', async () => {
    setupRepoHandlers()
    const setRemote = handlers.get('repo:setRemoteUrl')!
    mockSetRemoteUrl.mockClear()

    await expect(setRemote(null, { key: 'api' })).rejects.toThrow(/"remoteUrl" must be a non-empty string/)
    await expect(setRemote(null, { remoteUrl: 'https://github.com/acme/api' }))
      .rejects.toThrow(/"key" must be a non-empty string/)
    expect(mockSetRemoteUrl).not.toHaveBeenCalled()
  })

  it('rejects a payload whose fields are missing or not strings, rather than failing deep inside', async () => {
    // The types on the handler signature are erased at runtime and the channel is
    // reachable from any renderer code, so an absent key would otherwise surface
    // as a TypeError from path.join — a stack trace where a refusal belongs.
    setupRepoHandlers()
    const clone = handlers.get('repo:clone')!
    const setDestination = handlers.get('repo:setCloneDestination')!

    await expect(clone(null, {})).rejects.toThrow(/"key" must be a non-empty string/)
    await expect(clone(null, { key: '   ' })).rejects.toThrow(/"key" must be a non-empty string/)
    await expect(clone(null, { key: 42 })).rejects.toThrow(/"key" must be a non-empty string/)
    await expect(setDestination(null, {})).rejects.toThrow(/"destination" must be a non-empty string/)
  })

  it('refuses a present-but-unusable destination instead of silently cloning elsewhere', async () => {
    // Omitting the destination legitimately means "use the remembered one";
    // sending null does not, and falling back would clone into a folder the
    // caller never asked for.
    mockReadConfig.mockReturnValue(config({ api: { id: 'r1', remoteUrl: 'https://github.com/acme/api' } }))
    successfulClone()
    setupRepoHandlers()

    await expect(
      handlers.get('repo:clone')!(null, { key: 'api', destination: null }),
    ).rejects.toThrow(/"destination" must be a non-empty string/)
  })
})
