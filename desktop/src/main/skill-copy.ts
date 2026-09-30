import * as fs from 'fs'
import * as path from 'path'
import { parseFrontmatterFields } from './skills-listing'

/**
 * Where a skill lives, and copying a personal one into a repository, for the workflow
 * editor: a custom step names a skill, and a skill only in `~/.claude` runs on this
 * machine alone. Copying it into `<repo>/.claude` is what lets the repository's other
 * members run the step too, once it is committed.
 *
 * A step names a skill the way the listing does (skills-listing.ts): the frontmatter
 * `name`, else the folder or file name. So a skill is found by that name, as a folder
 * (`.claude/skills/<dir>/SKILL.md`) or as a command (`.claude/commands/<rel>.md`), and
 * never by building a path out of the name: `Check_2`, `a.b` or a folder whose
 * frontmatter says otherwise are all skills a step can run.
 *
 * Pure (fs and path only, no Electron, no config), so it is tested on a temp dir. The
 * handlers in ipc/skills-handlers.ts resolve the home and the repository's local path.
 */

/**
 * Whether `name` can be looked up at all: one path segment, not hidden, no `:` (a
 * `plugin:x` skill comes with its plugin, never from a folder of ours).
 */
export function isSafeSegment(name: unknown): name is string {
  return typeof name === 'string'
    && name.length > 0
    && !/[/\\:\0]/.test(name)
    && !name.startsWith('.')
}

/** The longest repository key or skill name a request from the renderer may carry. */
const MAX_REQUEST_FIELD = 256

/**
 * The `keys` of a renderer payload, checked at the IPC boundary: null unless `payload`
 * is an object whose every one of them is a non-empty string of at most
 * MAX_REQUEST_FIELD characters. Only those keys are returned.
 */
export function stringFieldsOf<K extends string>(payload: unknown, keys: readonly K[]): Record<K, string> | null {
  if (!payload || typeof payload !== 'object') return null
  const out = {} as Record<K, string>
  for (const key of keys) {
    const value = (payload as Record<string, unknown>)[key]
    if (typeof value !== 'string' || value.length === 0 || value.length > MAX_REQUEST_FIELD) return null
    out[key] = value
  }
  return out
}

/** A skill found under a root's `.claude`, the root being a home directory or a repository. */
export type SkillSource =
  /** `.claude/skills/<dir>`, a folder with a SKILL.md. */
  | { kind: 'skill'; dir: string; path: string }
  /** `.claude/commands/<rel>`, a markdown file, `rel` with `/` between folders. */
  | { kind: 'command'; rel: string; path: string }

/** The source's path relative to its root, with `/`: what git is asked about. */
export function relativePathOf(source: SkillSource): string {
  return source.kind === 'skill' ? `.claude/skills/${source.dir}` : `.claude/commands/${source.rel}`
}

function isDirectory(p: string): boolean {
  try { return fs.statSync(p).isDirectory() } catch { return false }
}

function isFile(p: string): boolean {
  try { return fs.statSync(p).isFile() } catch { return false }
}

function frontmatterName(file: string): string | undefined {
  try {
    return parseFrontmatterFields(fs.readFileSync(file, 'utf8')).name || undefined
  } catch {
    return undefined
  }
}

/** Every command file under `dir`, nested folders included; symlinked folders are not followed. */
function commandFiles(dir: string, rel = '', depth = 0): string[] {
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return [] }
  const out: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const relPath = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (depth < 8) out.push(...commandFiles(path.join(dir, entry.name), relPath, depth + 1))
    } else if (entry.name.endsWith('.md') && isFile(path.join(dir, entry.name))) {
      out.push(relPath)
    }
  }
  return out
}

/** Every skill and command under `<root>/.claude`, with the name its frontmatter gives. */
function candidatesIn(root: string): Array<{ source: SkillSource; fileName: string; fmName?: string }> {
  const claude = path.join(root, '.claude')
  const out: Array<{ source: SkillSource; fileName: string; fmName?: string }> = []
  const skillsDir = path.join(claude, 'skills')
  let dirs: string[] = []
  try { dirs = fs.readdirSync(skillsDir) } catch { /* none */ }
  for (const dir of dirs) {
    if (dir.startsWith('.')) continue
    const skillPath = path.join(skillsDir, dir)
    // stat, not the dirent: a skill installed from a checkout is a symlinked folder.
    if (!isDirectory(skillPath) || !isFile(path.join(skillPath, 'SKILL.md'))) continue
    out.push({ source: { kind: 'skill', dir, path: skillPath }, fileName: dir, fmName: frontmatterName(path.join(skillPath, 'SKILL.md')) })
  }
  const commandsDir = path.join(claude, 'commands')
  for (const rel of commandFiles(commandsDir)) {
    const file = path.join(commandsDir, ...rel.split('/'))
    out.push({
      source: { kind: 'command', rel, path: file },
      fileName: path.posix.basename(rel, '.md'),
      fmName: frontmatterName(file),
    })
  }
  return out
}

/**
 * The skill or command a step naming `name` runs, under `<root>/.claude`: the one whose
 * frontmatter `name` it is, else the one whose folder or file name it is. A folder wins
 * over a command at the same rank, as it comes first in the listing. null when there is
 * none, or for a name no skill of ours can have.
 */
export function findSkillSource(root: string, name: unknown): SkillSource | null {
  if (!isSafeSegment(name)) return null
  const candidates = candidatesIn(root)
  return candidates.find((c) => c.fmName === name)?.source
    ?? candidates.find((c) => c.fileName === name)?.source
    ?? null
}

/** Whether `<root>/.claude` has a skill or a command named `name`. */
export function hasSkillIn(root: string, name: unknown): boolean {
  return findSkillSource(root, name) !== null
}

/** Where a copy of `source` lands in `repoPath`: the same folder or file name. */
function destinationOf(repoPath: string, source: SkillSource): SkillSource {
  return source.kind === 'skill'
    ? { kind: 'skill', dir: source.dir, path: path.join(repoPath, '.claude', 'skills', source.dir) }
    : { kind: 'command', rel: source.rel, path: path.join(repoPath, '.claude', 'commands', ...source.rel.split('/')) }
}

function taken(p: string): boolean {
  // lstat, not exists: a dangling symlink there is still something not to overwrite.
  try { fs.lstatSync(p); return true } catch { return false }
}

/**
 * The repository's own copy of the skill `name`: found by that name in either form, or,
 * failing that, at the place a copy of the home one would land (a folder named the same
 * with a SKILL.md, a command at the same relative path), which is where a copy stops.
 */
export function skillInRepo(home: string, repoPath: string, name: unknown): SkillSource | null {
  const own = findSkillSource(repoPath, name)
  if (own) return own
  const mine = findSkillSource(home, name)
  if (!mine) return null
  const dest = destinationOf(repoPath, mine)
  const present = dest.kind === 'skill' ? isFile(path.join(dest.path, 'SKILL.md')) : isFile(dest.path)
  return present ? dest : null
}

/** Whether `child` is `parent` or inside it. Both absolute and resolved. */
function isWithin(parent: string, child: string): boolean {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/**
 * Create `dir` (a folder below `repoPath`) one level at a time, and make sure each level,
 * existing or just made, resolves inside the repository: a `.claude`, `.claude/skills`
 * or command folder that is a symlink leading out of the checkout would have the copy
 * written outside it. A level is checked before the next one is made, so a refusal
 * leaves nothing outside. A symlink staying inside the repository is fine.
 */
function ensureDirInside(repoPath: string, dir: string): void {
  const realRoot = fs.realpathSync(repoPath)
  let current = repoPath
  for (const segment of path.relative(repoPath, dir).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment)
    if (!taken(current)) {
      try { fs.mkdirSync(current) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      }
    }
    const shown = path.relative(repoPath, current).split(path.sep).join('/')
    let real: string
    try {
      real = fs.realpathSync(current)
    } catch {
      throw new Error(`"${shown}" in the repository is a broken symlink`)
    }
    if (!isWithin(realRoot, real)) throw new Error(`"${shown}" in the repository links outside it`)
    if (!isDirectory(real)) throw new Error(`"${shown}" in the repository is not a folder`)
  }
}

/**
 * Copy `<from>` into `<to>`, `to` not existing yet. `root` is the real path of the
 * skill being copied: a symlink resolving inside it is recreated as the same relative
 * link (so the copy is self-contained), one resolving outside it is refused, since it
 * would carry a file the user never meant to put in the repository. Anything that is
 * neither a file, a directory nor a symlink (a socket, a fifo) is skipped.
 */
function copyTree(from: string, to: string, root: string): void {
  fs.mkdirSync(to)
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name)
    const dest = path.join(to, entry.name)
    if (entry.isSymbolicLink()) {
      let target: string
      try {
        target = fs.realpathSync(src)
      } catch {
        throw new Error(`"${path.relative(root, src)}" is a broken symlink`)
      }
      if (!isWithin(root, target)) throw new Error(`"${path.relative(root, src)}" links outside the skill`)
      // `from` is under the real root, so the link's own place is real too.
      fs.symlinkSync(path.relative(from, target) || '.', dest)
    } else if (entry.isDirectory()) {
      copyTree(src, dest, root)
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dest)
    }
  }
}

/**
 * Copy the personal skill or command `name` (found in `~/.claude`, `home` being `~`)
 * into `<repoPath>/.claude`, under its own folder or file name: a folder into
 * `.claude/skills/<dir>`, a command into `.claude/commands/<same relative path>`.
 * Throws, with a message fit for the interface, when the name cannot be a skill of
 * ours, the skill is not there, the repository is not on disk, the repository already
 * has it (never overwritten: it may be a colleague's version), the skill links
 * outside itself, or the repository's `.claude` folders lead outside the repository.
 * Returns where the copy landed.
 *
 * All or nothing: the copy is assembled next to the destination and moved into place,
 * so a refusal halfway leaves nothing behind.
 */
export function copySkillToRepo(home: string, repoPath: string, name: string): SkillSource {
  if (!isSafeSegment(name)) throw new Error(`Invalid skill name "${String(name)}"`)
  const source = findSkillSource(home, name)
  if (!source) throw new Error(`Skill "${name}" not found`)
  if (!isDirectory(repoPath)) throw new Error(`Repository folder "${repoPath}" not found`)
  if (skillInRepo(home, repoPath, name)) throw new Error(`The repository already has a skill "${name}"`)

  const dest = destinationOf(repoPath, source)
  if (taken(dest.path)) throw new Error(`The repository already has a skill "${name}"`)

  // The skill folder or command file itself may be a symlink (installed from a
  // checkout): what it resolves to is the skill, and the bound its own links stay within.
  const real = fs.realpathSync(source.path)
  ensureDirInside(repoPath, path.dirname(dest.path))
  const staging = `${dest.path}.copying-${process.pid}-${Date.now()}`
  try {
    if (source.kind === 'skill') {
      copyTree(real, staging, real)
      fs.renameSync(staging, dest.path)
    } else {
      fs.copyFileSync(real, staging)
      // link, not rename: it fails on a file that appeared meanwhile instead of replacing it.
      fs.linkSync(staging, dest.path)
      fs.rmSync(staging, { force: true })
    }
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true })
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`The repository already has a skill "${name}"`)
    throw error
  }
  return dest
}
