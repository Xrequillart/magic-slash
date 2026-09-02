import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { getProjectScripts, findPackageDirs, detectPackageManager } from './project-scripts'

let root: string

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'project-scripts-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

/** Write a package.json at `relDir` (`''` for the root) with `scripts`. */
function writePackage(relDir: string, scripts: Record<string, string> | null): void {
  const dir = path.join(root, relDir)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(scripts ? { name: path.basename(dir), scripts } : { name: path.basename(dir) }),
  )
}

describe('findPackageDirs', () => {
  it('finds the packages of a monorepo that declares no workspaces', () => {
    writePackage('', { lint: 'eslint .' })
    writePackage('desktop', { dev: 'vite' })
    writePackage('webapp', { dev: 'next dev' })

    expect(findPackageDirs(root).sort()).toEqual(['', 'desktop', 'webapp'])
  })

  it('never walks into node_modules, build output, or hidden directories', () => {
    writePackage('', { lint: 'eslint .' })
    writePackage('node_modules/some-dep', { build: 'tsc' })
    writePackage('webapp/node_modules/other-dep', { build: 'tsc' })
    writePackage('dist', { start: 'node index.js' })
    writePackage('.next/standalone', { start: 'node server.js' })
    writePackage('webapp', { dev: 'next dev' })

    expect(findPackageDirs(root).sort()).toEqual(['', 'webapp'])
  })

  it('never descends into a nested checkout or worktree', () => {
    writePackage('', { lint: 'eslint .' })
    // A worktree parked inside the repository: its `.git` is a FILE.
    writePackage('poppins-pex-PER-5138', { dev: 'next dev' })
    fs.writeFileSync(path.join(root, 'poppins-pex-PER-5138', '.git'), 'gitdir: /elsewhere\n')
    // A vendored clone: its `.git` is a directory.
    writePackage('vendor-lib', { build: 'tsc' })
    fs.mkdirSync(path.join(root, 'vendor-lib', '.git'))

    expect(findPackageDirs(root)).toEqual([''])
  })

  it('reaches apps/* and packages/* but stops below three levels', () => {
    writePackage('apps/web', { dev: 'vite' })
    writePackage('packages/ui/nested/too-deep', { dev: 'vite' })

    const found = findPackageDirs(root)
    expect(found).toContain(path.join('apps', 'web'))
    expect(found).not.toContain(path.join('packages', 'ui', 'nested', 'too-deep'))
  })

  it('does not follow a symlinked directory out of the repository', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'project-scripts-outside-'))
    try {
      fs.writeFileSync(path.join(outside, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }))
      writePackage('', { lint: 'eslint .' })
      fs.symlinkSync(outside, path.join(root, 'linked'))

      expect(findPackageDirs(root)).toEqual([''])
    } finally {
      fs.rmSync(outside, { recursive: true, force: true })
    }
  })
})

describe('detectPackageManager', () => {
  it('answers with the lockfile at the repository root for a package that has none', () => {
    fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), '')
    fs.mkdirSync(path.join(root, 'webapp'))

    expect(detectPackageManager(path.join(root, 'webapp'), root)).toBe('pnpm')
  })

  it("prefers a package's own lockfile over the root's", () => {
    fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), '')
    fs.mkdirSync(path.join(root, 'webapp'))
    fs.writeFileSync(path.join(root, 'webapp', 'yarn.lock'), '')

    expect(detectPackageManager(path.join(root, 'webapp'), root)).toBe('yarn')
  })

  it('falls back to npm when nothing is locked, and never walks past the root', () => {
    fs.mkdirSync(path.join(root, 'webapp'))
    expect(detectPackageManager(path.join(root, 'webapp'), root)).toBe('npm')
  })
})

describe('getProjectScripts', () => {
  it('returns one group per package, the root first, labelled by directory', () => {
    writePackage('', { lint: 'eslint .' })
    writePackage('webapp', { dev: 'next dev' })
    writePackage('apps/api', { dev: 'nest start' })

    const { packages } = getProjectScripts(root)

    expect(packages.map(p => p.workspace)).toEqual(['', path.join('apps', 'api'), 'webapp'])
    expect(packages[0].label).toBe(path.basename(root))
    expect(packages.map(p => p.label).slice(1)).toEqual([path.join('apps', 'api'), 'webapp'])
  })

  it('leaves out a package with no scripts at all', () => {
    writePackage('', { lint: 'eslint .' })
    writePackage('packages/types', null)

    expect(getProjectScripts(root).packages.map(p => p.workspace)).toEqual([''])
  })

  it("orders a package's scripts by category, then by name", () => {
    writePackage('', { zeta: 'echo', build: 'tsc', dev: 'vite', alpha: 'echo', test: 'vitest', lint: 'eslint .' })

    expect(getProjectScripts(root).packages[0].scripts.map(s => s.name))
      .toEqual(['dev', 'build', 'test', 'lint', 'alpha', 'zeta'])
  })

  it('carries the package manager per package', () => {
    fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), '')
    writePackage('', { lint: 'eslint .' })
    writePackage('webapp', { dev: 'next dev' })

    expect(getProjectScripts(root).packages.map(p => p.packageManager)).toEqual(['pnpm', 'pnpm'])
  })

  it('lets a declared workspace override a stale lockfile inside a package', () => {
    // Seen in the wild: a pnpm workspace whose packages still carry the yarn.lock they
    // were migrated off. Read on its own, `apps/api` answers yarn — and `yarn dev` in a
    // pnpm workspace runs against a dependency tree that is not there.
    fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), '')
    fs.writeFileSync(path.join(root, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"\n')
    writePackage('', { build: 'turbo build' })
    writePackage('apps/api', { dev: 'nest start' })
    fs.writeFileSync(path.join(root, 'apps', 'api', 'yarn.lock'), '')

    expect(getProjectScripts(root).packages.map(p => p.packageManager)).toEqual(['pnpm', 'pnpm'])
  })

  it("keeps each sub-project's own manager when no workspace is declared", () => {
    writePackage('server', { dev: 'nest start' })
    fs.writeFileSync(path.join(root, 'server', 'yarn.lock'), '')
    writePackage('client', { dev: 'vite' })
    fs.writeFileSync(path.join(root, 'client', 'pnpm-lock.yaml'), '')

    const { packages } = getProjectScripts(root)
    expect(packages.map(p => [p.workspace, p.packageManager])).toEqual([['client', 'pnpm'], ['server', 'yarn']])
  })

  it('ignores a malformed package.json instead of emptying the whole list', () => {
    writePackage('webapp', { dev: 'next dev' })
    fs.mkdirSync(path.join(root, 'broken'))
    fs.writeFileSync(path.join(root, 'broken', 'package.json'), '{ not json')

    expect(getProjectScripts(root).packages.map(p => p.workspace)).toEqual(['webapp'])
  })

  it('skips a script whose command is not a string', () => {
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ scripts: { dev: 'vite', broken: { nested: true } } }),
    )

    expect(getProjectScripts(root).packages[0].scripts.map(s => s.name)).toEqual(['dev'])
  })

  it('has no packages at all for a repository without a package.json', () => {
    expect(getProjectScripts(root)).toEqual({ packages: [] })
  })
})
