import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execFileSync } from 'child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { gitRunner, skillShareStatus } from './skill-share-status'

// A real repository with a bare "origin", as the handler's runner would see it. Nothing
// here fetches: pushes update the remote-tracking refs, as they would for the user.

let base: string
let repo: string

function git(...args: string[]) {
  execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
    cwd: repo,
    stdio: 'pipe',
    env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
  })
}

function write(rel: string, content: string) {
  const file = join(repo, rel)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, content)
}

const SKILL = '.claude/skills/check'

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'skill-share-'))
  repo = join(base, 'repo')
  execFileSync('git', ['init', '--bare', '-q', '-b', 'main', join(base, 'origin.git')])
  mkdirSync(repo)
  git('init', '-q', '-b', 'main')
  git('remote', 'add', 'origin', join(base, 'origin.git'))
  write('README.md', 'x')
  git('add', '.')
  git('commit', '-q', '-m', 'init')
  git('push', '-q', '-u', 'origin', 'main')
})

afterEach(() => {
  rmSync(base, { recursive: true, force: true })
})

describe('skillShareStatus', () => {
  it('is missing when the repository has no such skill', async () => {
    expect(await skillShareStatus(gitRunner(repo), null)).toEqual({ status: 'missing' })
  })

  it('is uncommitted while untracked, and while a tracked skill has changes or new files', async () => {
    write(`${SKILL}/SKILL.md`, 'x')
    expect((await skillShareStatus(gitRunner(repo), SKILL)).status).toBe('uncommitted')
    git('add', '.')
    // Staged is not committed.
    expect((await skillShareStatus(gitRunner(repo), SKILL)).status).toBe('uncommitted')
    git('commit', '-q', '-m', 'skill')
    write(`${SKILL}/SKILL.md`, 'changed')
    expect((await skillShareStatus(gitRunner(repo), SKILL)).status).toBe('uncommitted')
    git('checkout', '-q', '--', SKILL)
    write(`${SKILL}/extra.md`, 'new')
    expect((await skillShareStatus(gitRunner(repo), SKILL)).status).toBe('uncommitted')
  })

  it('is unpushed once committed, shared once pushed, naming origin/HEAD\'s branch', async () => {
    git('remote', 'set-head', 'origin', 'main')
    write(`${SKILL}/SKILL.md`, 'x')
    git('add', '.')
    git('commit', '-q', '-m', 'skill')
    expect(await skillShareStatus(gitRunner(repo), SKILL)).toEqual({ status: 'unpushed', branch: 'main' })
    git('push', '-q')
    expect(await skillShareStatus(gitRunner(repo), SKILL)).toEqual({ status: 'shared', branch: 'main' })
  })

  it('looks at the configured development branch when origin has it', async () => {
    git('remote', 'set-head', 'origin', 'main')
    git('push', '-q', 'origin', 'main:develop')
    write('.claude/commands/deploy.md', 'x')
    git('add', '.')
    git('commit', '-q', '-m', 'command')
    git('push', '-q', 'origin', 'main')
    const path = '.claude/commands/deploy.md'
    expect(await skillShareStatus(gitRunner(repo), path, 'develop')).toEqual({ status: 'unpushed', branch: 'develop' })
    // A configured branch origin doesn't have falls back to origin/HEAD.
    expect(await skillShareStatus(gitRunner(repo), path, 'nope')).toEqual({ status: 'shared', branch: 'main' })
  })

  it('never claims shared without a remote ref to check against', async () => {
    write(`${SKILL}/SKILL.md`, 'x')
    git('add', '.')
    git('commit', '-q', '-m', 'skill')
    git('push', '-q')
    // No origin/HEAD and no configured branch: nothing verified.
    expect(await skillShareStatus(gitRunner(repo), SKILL)).toEqual({ status: 'unpushed' })
  })

  it('works from a folder below the repository root', async () => {
    git('remote', 'set-head', 'origin', 'main')
    write(`app/${SKILL}/SKILL.md`, 'x')
    git('add', '.')
    git('commit', '-q', '-m', 'skill')
    git('push', '-q')
    expect(await skillShareStatus(gitRunner(join(repo, 'app')), SKILL)).toEqual({ status: 'shared', branch: 'main' })
  })

  it('is unknown outside a git repository', async () => {
    const plain = join(base, 'plain')
    mkdirSync(join(plain, SKILL), { recursive: true })
    expect(await skillShareStatus(gitRunner(plain), SKILL)).toEqual({ status: 'unknown' })
  })

  it('answers with an injected runner, without git', async () => {
    const calls: string[][] = []
    const status = await skillShareStatus(async (args) => {
      calls.push(args)
      if (args[0] === 'symbolic-ref') return { ok: true, stdout: 'refs/remotes/origin/trunk' }
      if (args[0] === 'ls-files' && args[1] === '--others') return { ok: true, stdout: '' }
      if (args[0] === 'rev-parse' && args[1] === '--verify') return { ok: false, stdout: '' }
      return { ok: true, stdout: '' }
    }, SKILL, 'develop')
    expect(status).toEqual({ status: 'shared', branch: 'trunk' })
    expect(calls.some((args) => args[0] === 'fetch')).toBe(false)
    expect(calls.at(-1)).toEqual(['cat-file', '-e', `refs/remotes/origin/trunk:./${SKILL}`])
  })
})
