import * as fs from 'fs'
import * as path from 'path'
import type { PackageManager, ScriptCategory, PackageScript, ScriptPackage, ProjectScripts } from '../types'

/**
 * Finding every `package.json` a repository can run scripts from — not just the one at
 * its root.
 *
 * A repository is routinely several packages: `desktop/` next to `webapp/`, an
 * `apps/*` + `packages/*` layout, a plain `server/` and `client/` pair. Reading only
 * the root left the dropdown offering the root's own scripts and nothing else, which
 * on a monorepo is the half that matters least — the root has `lint` and `test`, the
 * packages have the dev servers.
 *
 * The search is a BOUNDED DIRECTORY SCAN rather than an expansion of the `workspaces`
 * field, because most monorepos are one by convention and not by declaration: this
 * repository has `desktop/` and `webapp/` and no `workspaces` key at all, so a
 * declaration-only reading would have found exactly nothing to add. The scan covers
 * the declared layouts too — `apps/web` and `packages/ui` are just directories — at
 * the cost of a `readdir` per level, with `node_modules` and the build outputs pruned
 * so it never walks into the expensive part of a tree.
 */

/**
 * How far below the repository root a `package.json` is still looked for.
 *
 * Three levels reaches `apps/web/package.json` and `packages/ui/package.json` — the
 * deepest an ordinary monorepo puts a package — without turning the scan into a
 * full-tree walk on a repository that nests source directories for other reasons.
 */
const MAX_DEPTH = 3

/**
 * Directories that never hold a package worth offering, pruned before descending.
 *
 * `node_modules` is the one that matters for speed — every dependency in it carries a
 * `package.json` with scripts, and none of them are this repository's — and the build
 * outputs are here because a copied or bundled `package.json` would show up as a
 * duplicate of a package already listed.
 */
const SKIPPED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', 'coverage', 'target', 'vendor',
  'tmp', 'temp', 'Pods', 'bower_components', '__pycache__', 'venv',
])

/**
 * A ceiling on how many packages are collected.
 *
 * A dropdown is not a file browser: past a few dozen groups the list has stopped being
 * something a person picks from, and the scan has stopped being free. Both are capped
 * by the same number.
 */
const MAX_PACKAGES = 40

/** Whether to descend into a directory at all. */
function isSkipped(name: string): boolean {
  // Hidden directories go with the explicit list: `.next`, `.turbo`, `.venv`, `.git`
  // and `.cache` are all of them build or tooling state, and none of them hold a
  // package a person means to run.
  return name.startsWith('.') || SKIPPED_DIRS.has(name)
}

/**
 * The package manager to drive `dir` with.
 *
 * Resolved by walking UP to `rootPath`, because a monorepo commits ONE lockfile at its
 * root and the packages under it carry none: reading only `dir` would answer "npm" for
 * every workspace of a pnpm repository, and `npm run dev` in a pnpm workspace fails on
 * the missing dependency tree rather than on anything the person could see.
 */
export function detectPackageManager(dir: string, rootPath: string = dir): PackageManager {
  let current = path.resolve(dir)
  const root = path.resolve(rootPath)

  for (;;) {
    if (fs.existsSync(path.join(current, 'bun.lockb')) || fs.existsSync(path.join(current, 'bun.lock'))) return 'bun'
    if (fs.existsSync(path.join(current, 'pnpm-lock.yaml'))) return 'pnpm'
    if (fs.existsSync(path.join(current, 'yarn.lock'))) return 'yarn'
    if (fs.existsSync(path.join(current, 'package-lock.json'))) return 'npm'

    if (current === root) break
    const parent = path.dirname(current)
    // Also the guard for a `dir` that is not under `rootPath` at all: the walk stops at
    // the filesystem root instead of looping.
    if (parent === current) break
    current = parent
  }

  return 'npm'
}

/**
 * Whether `rootPath` declares its packages as a WORKSPACE — pnpm, npm/yarn/bun, or
 * lerna.
 *
 * The question is which tool owns the packages underneath, and it settles a case seen
 * in the wild: a pnpm workspace whose `apps/api` and `apps/web` still carry a
 * `yarn.lock` from before the migration. Read on its own, each of those packages
 * answers "yarn" — and `yarn dev` in a pnpm workspace runs against a dependency tree
 * that is not there. A declared workspace overrides them all, because the declaration
 * is the repository saying who installs its packages.
 */
function declaresWorkspace(rootPath: string): boolean {
  if (fs.existsSync(path.join(rootPath, 'pnpm-workspace.yaml'))) return true
  if (fs.existsSync(path.join(rootPath, 'lerna.json'))) return true
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootPath, 'package.json'), 'utf-8'))
    return !!pkg?.workspaces
  } catch {
    return false
  }
}

function categorizeScript(name: string): ScriptCategory {
  if (/^(dev|start|serve|watch)/.test(name)) return 'dev'
  if (/^(build|compile)/.test(name)) return 'build'
  if (/^(test|spec|e2e)/.test(name)) return 'test'
  if (/^(lint|format|prettier|eslint)/.test(name)) return 'lint'
  return 'other'
}

const CATEGORY_ORDER: ScriptCategory[] = ['dev', 'build', 'test', 'lint', 'other']

/** The scripts of one `package.json`, ordered by category, or `[]` if it has none. */
function readScripts(dir: string): PackageScript[] {
  const pkgPath = path.join(dir, 'package.json')
  if (!fs.existsSync(pkgPath)) return []

  let raw: Record<string, unknown>
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    raw = (pkg?.scripts ?? {}) as Record<string, unknown>
  } catch {
    // A malformed or unreadable package.json is a package without scripts, not a
    // failed scan: one broken file in a monorepo must not empty the whole dropdown.
    return []
  }

  const scripts = Object.entries(raw)
    .filter(([, command]) => typeof command === 'string')
    .map(([name, command]) => ({ name, command: command as string, category: categorizeScript(name) }))

  // Ordered here rather than in the renderer: the dropdown lists a package's scripts
  // flat, so this order IS the grouping — dev servers first, the `other` bucket last.
  return scripts.sort((a, b) => {
    const byCategory = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name)
  })
}

/**
 * Every directory at or under `rootPath` holding a `package.json`, repo-relative, root
 * first and the rest by path.
 *
 * Exported for the tests: the pruning and the depth bound are the whole behaviour of
 * this module, and they are worth asserting without a `package.json` parse in the way.
 */
export function findPackageDirs(rootPath: string): string[] {
  const found: string[] = []
  // Breadth-first, so the cap keeps the packages CLOSEST to the root — `webapp/` before
  // some fixture package three levels down — rather than whichever branch was walked
  // into first.
  const queue: Array<{ dir: string; depth: number }> = [{ dir: rootPath, depth: 0 }]

  while (queue.length > 0 && found.length < MAX_PACKAGES) {
    const { dir, depth } = queue.shift()!

    if (fs.existsSync(path.join(dir, 'package.json'))) {
      found.push(path.relative(rootPath, dir))
    }
    if (depth >= MAX_DEPTH) continue

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      // An unreadable directory is skipped, not fatal.
      continue
    }

    for (const entry of entries) {
      // `isDirectory()` and not `isSymbolicLink()`: a symlinked directory is how a
      // linked local dependency appears, and following it walks out of the repository.
      if (!entry.isDirectory() || isSkipped(entry.name)) continue
      const child = path.join(dir, entry.name)
      // A nested `.git` is ANOTHER checkout — a vendored repository, or a git worktree
      // parked inside this one — and its packages are its own business. Without this, a
      // worktree held under the repository turns every package into two identical
      // entries. (A worktree's `.git` is a file, a clone's a directory; `existsSync`
      // covers both.)
      if (fs.existsSync(path.join(child, '.git'))) continue
      queue.push({ dir: child, depth: depth + 1 })
    }
  }

  // Sorted rather than left in walk order: `readdir` order is the filesystem's business,
  // and a dropdown whose groups reshuffle between two repositories that look the same is
  // a list a person cannot learn. The root's `''` sorts first on its own.
  return found.sort((a, b) => a.localeCompare(b))
}

/**
 * The runnable packages of a repository, in the order the dropdown lists them.
 *
 * A package with no scripts is left out entirely: it is a group header over an empty
 * list, and on a monorepo of typed sub-packages there are several of them.
 */
export function getProjectScripts(repoPath: string): ProjectScripts {
  const packages: ScriptPackage[] = []
  // Resolved once, and imposed on every package when the root declares a workspace —
  // see `declaresWorkspace`. Independent sub-projects (a `server/` and a `client/` that
  // install separately) keep their own answer, walking up only as far as the root.
  const workspaceManager = declaresWorkspace(repoPath) ? detectPackageManager(repoPath) : null

  for (const workspace of findPackageDirs(repoPath)) {
    const dir = path.join(repoPath, workspace)
    const scripts = readScripts(dir)
    if (scripts.length === 0) continue

    packages.push({
      workspace,
      // The DIRECTORY name, not the `name` field: `@magic-slash/webapp` is noise next
      // to `webapp`, and the directory is what the person would have typed to get
      // there. The root borrows the repository's own folder name.
      label: workspace || path.basename(repoPath),
      packageManager: workspaceManager ?? detectPackageManager(dir, repoPath),
      scripts,
    })
  }

  return { packages }
}
