import * as fs from 'fs'
import * as path from 'path'

/**
 * WHAT CLAUDE CODE PUTS IN ITS SKILL LISTING, read off the disk for the Skills page gauge.
 *
 * The page lists the skills you manage here: `~/.claude/skills` and each repository's
 * `.claude/skills` and `.claude/commands`. The listing Claude Code injects every turn is
 * wider than that, and the gauge used to read only the narrow half, so it looked
 * comfortable while plugins were eating the budget. This module walks every source the
 * listing draws from that exists as a file:
 *
 *   - user skills and commands (`~/.claude/skills/*`, `~/.claude/commands/*.md`)
 *   - repository skills and commands
 *   - plugins installed at user scope and enabled in `~/.claude/settings.json`
 *   - plugins and skills synced from a claude.ai organisation (`…/synced/<bucket>/`),
 *     a layout Claude Code does not document: read best-effort, silently skipped if
 *     it moves
 *
 * Skills bundled inside the Claude Code binary (`/loop`, `/simplify`…) have no file to
 * read and stay out; the page says so and points at `/doctor` for the exact figure.
 *
 * Each entry also says how it is listed, because not every skill costs the same:
 * `disable-model-invocation: true` and the `off` / `user-invocable-only` overrides remove
 * it from the listing, `name-only` keeps the name and drops the description.
 */

export type ListingSource = 'built-in' | 'custom' | 'repo' | 'plugin'
export type ListingMode = 'full' | 'name-only' | 'hidden'

export interface ListingEntry {
  name: string
  /** `description` and `when_to_use` joined, as the listing appends them. Uncapped. */
  text: string
  source: ListingSource
  mode: ListingMode
  /** The repository or plugin it comes from, when there is one. */
  origin?: string
}

export interface ListingSettings {
  /** `skillListingBudgetFraction`, when the user changed it. */
  budgetFraction?: number
  /** `skillListingMaxDescChars`, when the user changed it. */
  maxDescChars?: number
  /** `SLASH_COMMAND_TOOL_CHAR_BUDGET`, which replaces the whole computation. */
  fixedCharBudget?: number
}

export interface ListingResult {
  entries: ListingEntry[]
  settings: ListingSettings
}

export interface ListingInput {
  home: string
  repos: Array<{ name: string; path: string }>
  builtIn: readonly string[]
  env?: Record<string, string | undefined>
}

/**
 * The frontmatter fields this module needs, from a YAML subset: `key: value`, quoted
 * values, and `>` / `|` block scalars. Plugin skills write multi-line descriptions far
 * more often than ours do, and the line-based parser in skills-handlers.ts reads those as
 * a lone `>`, which would bill a 900-character description at one.
 */
export function parseFrontmatterFields(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const lines = match[1].split(/\r?\n/)
  const out: Record<string, string> = {}
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!m) continue
    const [, key, rawValue] = m
    let value = rawValue.trim()
    const continuation: string[] = []
    while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
      continuation.push(lines[i + 1].trim())
      i++
    }
    if (/^[>|][+-]?$/.test(value)) {
      const folded = value.startsWith('>')
      value = continuation.join(folded ? ' ' : '\n').replace(/\s+$/, '')
      if (folded) value = value.replace(/ {2,}/g, ' ')
    } else {
      if (continuation.length > 0) value = [value, ...continuation].join(' ').trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
    }
    out[key] = value
  }
  return out
}

function readJson(file: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined
  } catch {
    return undefined
  }
}

function listDirs(dir: string): string[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

function listMarkdown(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }
}

type Overrides = Record<string, string>

function overridesOf(settings: Record<string, unknown> | undefined): Overrides {
  const raw = settings?.skillOverrides
  return raw && typeof raw === 'object' ? raw as Overrides : {}
}

function modeFor(fm: Record<string, string>, name: string, overrides: Overrides): ListingMode {
  if (fm['disable-model-invocation'] === 'true') return 'hidden'
  const override = overrides[name]
  if (override === 'off' || override === 'user-invocable-only') return 'hidden'
  if (override === 'name-only') return 'name-only'
  return 'full'
}

function entryFrom(
  file: string,
  fallbackName: string,
  source: ListingSource,
  overrides: Overrides,
  origin?: string,
  prefix?: string,
): ListingEntry | undefined {
  let content: string
  try {
    content = fs.readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
  const fm = parseFrontmatterFields(content)
  const base = fm.name || fallbackName
  const name = prefix ? `${prefix}:${base}` : base
  const text = [fm.description, fm.when_to_use].filter((s) => s && s.length > 0).join(' ')
  return {
    name,
    text,
    source,
    // An override may name a plugin skill with or without its `plugin:` prefix.
    mode: overrides[name] === undefined ? modeFor(fm, base, overrides) : modeFor(fm, name, overrides),
    ...(origin ? { origin } : {}),
  }
}

/** Every `skills/<x>/SKILL.md` and `commands/<x>.md` under one root. */
function scanRoot(
  root: string,
  source: (dirName: string) => ListingSource,
  overrides: Overrides,
  origin?: string,
  prefix?: string,
): ListingEntry[] {
  const entries: ListingEntry[] = []
  const skillsDir = path.join(root, 'skills')
  for (const dir of listDirs(skillsDir)) {
    const e = entryFrom(path.join(skillsDir, dir, 'SKILL.md'), dir, source(dir), overrides, origin, prefix)
    if (e) entries.push(e)
  }
  const commandsDir = path.join(root, 'commands')
  for (const file of listMarkdown(commandsDir)) {
    const e = entryFrom(path.join(commandsDir, file), file.replace(/\.md$/, ''), source(file), overrides, origin, prefix)
    if (e) entries.push(e)
  }
  return entries
}

function positiveNumber(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined
}

export function collectListingEntries(input: ListingInput): ListingResult {
  const claudeDir = path.join(input.home, '.claude')
  const userSettings = readJson(path.join(claudeDir, 'settings.json'))
  const userOverrides = overridesOf(userSettings)
  const entries: ListingEntry[] = []

  // User skills and commands. `skills/synced` is the organisation bucket and has no
  // SKILL.md of its own, so it drops out here and is read further down.
  entries.push(...scanRoot(claudeDir, (dir) => (input.builtIn.includes(dir) ? 'built-in' : 'custom'), userOverrides))

  // Repository skills and commands. A repo's own settings only speak for that repo.
  for (const repo of input.repos) {
    const repoClaude = path.join(repo.path, '.claude')
    const overrides = {
      ...userOverrides,
      ...overridesOf(readJson(path.join(repoClaude, 'settings.json'))),
      ...overridesOf(readJson(path.join(repoClaude, 'settings.local.json'))),
    }
    entries.push(...scanRoot(repoClaude, () => 'repo', overrides, repo.name))
  }

  // Plugins installed at user scope and switched on.
  const enabled = (userSettings?.enabledPlugins ?? {}) as Record<string, unknown>
  const installed = readJson(path.join(claudeDir, 'plugins', 'installed_plugins.json'))
  const plugins = (installed?.plugins ?? {}) as Record<string, Array<{ scope?: string; installPath?: string }>>
  for (const [key, installs] of Object.entries(plugins)) {
    if (enabled[key] !== true || !Array.isArray(installs)) continue
    const install = installs.find((i) => i.scope === 'user' && typeof i.installPath === 'string')
    if (!install?.installPath) continue
    const pluginName = key.split('@')[0]
    entries.push(...scanRoot(install.installPath, () => 'plugin', userOverrides, pluginName, pluginName))
  }

  // Organisation-synced plugins: `plugins/synced/<bucket>/<name>~g<generation>/`, with the
  // generation read from the bucket's manifest, and synced skills under `skills/synced/`.
  for (const bucket of listDirs(path.join(claudeDir, 'plugins', 'synced'))) {
    const bucketDir = path.join(claudeDir, 'plugins', 'synced', bucket)
    const manifest = readJson(path.join(bucketDir, 'manifest.json'))
    const synced = Array.isArray(manifest?.plugins) ? manifest.plugins as Array<{ name?: string; generation?: number }> : []
    for (const plugin of synced) {
      if (!plugin.name) continue
      const candidates = plugin.generation ? [`${plugin.name}~g${plugin.generation}`, plugin.name] : [plugin.name]
      const dir = candidates.map((c) => path.join(bucketDir, c)).find((d) => fs.existsSync(d))
      if (dir) entries.push(...scanRoot(dir, () => 'plugin', userOverrides, plugin.name, plugin.name))
    }
  }
  // Synced skills are listed under `<source>-skills:` (`anthropic-skills:pdf`), the source
  // being each skill's `source` in the bucket manifest.
  for (const bucket of listDirs(path.join(claudeDir, 'skills', 'synced'))) {
    const bucketDir = path.join(claudeDir, 'skills', 'synced', bucket)
    const manifest = readJson(path.join(bucketDir, 'manifest.json'))
    const skills = Array.isArray(manifest?.skills) ? manifest.skills as Array<{ name?: string; source?: string }> : []
    for (const dir of listDirs(bucketDir)) {
      const source = skills.find((sk) => sk.name === dir)?.source
      const prefix = source ? `${source}-skills` : undefined
      const e = entryFrom(path.join(bucketDir, dir, 'SKILL.md'), dir, 'plugin', userOverrides, prefix, prefix)
      if (e) entries.push(e)
    }
  }

  const env = input.env ?? {}
  const settings: ListingSettings = {}
  const fraction = positiveNumber(userSettings?.skillListingBudgetFraction)
  if (fraction !== undefined) settings.budgetFraction = fraction
  const maxDesc = positiveNumber(userSettings?.skillListingMaxDescChars)
  if (maxDesc !== undefined) settings.maxDescChars = maxDesc
  const fixed = positiveNumber(env.SLASH_COMMAND_TOOL_CHAR_BUDGET)
  if (fixed !== undefined) settings.fixedCharBudget = fixed

  // One name, one listing entry: a skill defined at two levels is listed once. The first
  // read wins, which is the page's order (user, repos, plugins), not a claim about which
  // copy Claude Code keeps. Both cost the same to within their descriptions.
  const seen = new Set<string>()
  const unique = entries.filter((e) => (seen.has(e.name) ? false : (seen.add(e.name), true)))

  return { entries: unique, settings }
}
