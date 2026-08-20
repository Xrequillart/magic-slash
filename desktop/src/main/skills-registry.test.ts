import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// The shipped skill list is duplicated in eight places, and nothing used to hold them
// together. Adding the eighth skill meant editing all eight by hand; the ninth is how
// one of them gets forgotten, and the failure is quiet on every side — a skill absent
// from skills-updater is never downloaded, absent from setup/status never reported as
// missing, absent from skills-handlers renders as a user skill rather than a built-in,
// absent from either TRACKED_SKILLS array simply has no tile on a dashboard that looks
// complete, and absent from either COMMANDS row cannot be typed in the launcher or read
// on the landing page.
//
// The duplication itself is deliberate and stays: the desktop and the webapp are
// separate builds with no code path between them, and `install/uninstall.sh` runs
// with no toolchain at all. What was missing is not a shared module but a check.
//
// This test reads the sources as TEXT and never imports them. It cannot: `webapp/lib/
// skills.ts` imports `./supabase`, which does not resolve under the root-only
// node_modules the CI installs (see the comment in vitest.config.ts). Regexing the
// declaration is the price of covering the webapp copy at all.

const REPO_ROOT = join(__dirname, '..', '..', '..')

// The two dashboard rows, named once each: every test below wants one or both of them,
// and these files have moved before (`docs/` → `webapp/`). A rename fixed at one of
// three literals would leave the others asserting over a path that no longer exists.
const DESKTOP_TILES = 'desktop/src/renderer/pages/Dashboard/SkillStats.tsx'
const WEBAPP_TILES = 'webapp/lib/skills.ts'

// The two command rows: what a user can type in the launcher, and what the landing page
// lists. Neither could be imported here even from a collected path — one is a renderer TSX
// pulling in the i18n catalogue, the other a Next.js component — so both are read as text
// like everything else. Where the file lives has no bearing on whether its list can drift.
const LAUNCHER_COMMANDS = 'desktop/src/renderer/pages/QuickLaunch/index.tsx'
const LANDING_COMMANDS = 'webapp/components/site/home/HowSection.tsx'

// The three tile rows that spell their own column count out as a Tailwind literal. The
// number is the length of an array the row already maps over, so nothing connects the two:
// add a skill, forget the class, and the row silently wraps one tile onto a second line.
const TILE_GRIDS = [
  DESKTOP_TILES,
  'webapp/components/SkillStats.tsx',
  'webapp/app/admin/organizations/[orgId]/page.tsx',
]

/**
 * The source of truth: the skill folders that actually ship.
 *
 * Memoised, like `read` below. Nothing on disk can change mid-run, so every block that
 * re-derives the same handful of files is re-doing the same syscalls — cheap, but the
 * repetition is invisible and grows with every list this file learns to check.
 */
let shipped: string[] | undefined
function shippedSkills(): string[] {
  if (!shipped) {
    shipped = readdirSync(join(REPO_ROOT, 'skills'))
      .filter((entry) => entry.startsWith('magic-'))
      .filter((entry) => existsSync(join(REPO_ROOT, 'skills', entry, 'SKILL.md')))
      .sort()
  }
  return shipped
}

const sources = new Map<string, string>()
function read(relativePath: string): string {
  let source = sources.get(relativePath)
  if (source === undefined) {
    source = readFileSync(join(REPO_ROOT, relativePath), 'utf-8')
    sources.set(relativePath, source)
  }
  return source
}

/** A flat `const NAME = ['a', 'b']` declaration. */
function flatArray(source: string, name: string): string[] {
  const match = source.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]*)\\]`))
  if (!match) return []
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/**
 * A `TRACKED_SKILLS = [{ skill: 'x', label: 'y' }, ...]` declaration, as pairs.
 *
 * ONE parse feeds both the drift check and the label check. The declaration's shape is
 * pinned by these two regexes, and a second copy of them elsewhere in the file is the
 * very drift this file exists to catch, reintroduced inside the guard: reflow the
 * closing bracket in either source and one copy keeps matching while the other stops.
 * Reading the pair rather than the `skill` alone also puts the label half behind the
 * "parses a non-empty list" assertion below, where a stale regex fails loudly.
 */
function trackedPairs(relativePath: string): { skill: string; label: string }[] {
  const match = read(relativePath).match(/TRACKED_SKILLS[^=]*=\s*\[([\s\S]*?)\n\]/)
  if (!match) return []
  return [...match[1].matchAll(/skill:\s*'([^']+)',\s*label:\s*'([^']+)'/g)].map(
    ([, skill, label]) => ({ skill, label }),
  )
}

/** Just the skill names of a `TRACKED_SKILLS` row, in declaration order. */
function trackedSkills(relativePath: string): string[] {
  return trackedPairs(relativePath).map((pair) => pair.skill)
}

/** The `for skill in a b c; do` loop uninstall.sh removes the skills with. */
function uninstallLoop(source: string): string[] {
  const match = source.match(/for skill in ((?:magic-[\w-]+ ?)+);/)
  if (!match) return []
  return match[1].trim().split(/\s+/)
}

/**
 * A `COMMANDS = [{ name: … }, …]` row, as skill-folder names.
 *
 * Two surfaces keep one, and they spell the command differently: the launcher stores the
 * typed form (`/magic:plan`), the landing page the bare verb (`plan`). Normalising both to
 * the folder name is what lets them be compared against the same source of truth.
 */
function commandSkills(relativePath: string): string[] {
  const match = read(relativePath).match(/COMMANDS[^=]*=\s*\[([\s\S]*?)\n\]/)
  if (!match) return []
  return [...match[1].matchAll(/name:\s*'([^']+)'/g)].map(
    (m) => `magic-${m[1].replace(/^\/magic:/, '')}`,
  )
}

const LISTS: { where: string; read: () => string[] }[] = [
  {
    where: 'desktop/src/main/skills-updater.ts SKILLS',
    read: () => flatArray(read('desktop/src/main/skills-updater.ts'), 'SKILLS'),
  },
  {
    where: 'desktop/src/main/setup/status.ts SKILLS',
    read: () => flatArray(read('desktop/src/main/setup/status.ts'), 'SKILLS'),
  },
  {
    where: 'desktop/src/main/ipc/skills-handlers.ts BUILT_IN_SKILLS',
    read: () => flatArray(read('desktop/src/main/ipc/skills-handlers.ts'), 'BUILT_IN_SKILLS'),
  },
  {
    where: `${DESKTOP_TILES} TRACKED_SKILLS`,
    read: () => trackedSkills(DESKTOP_TILES),
  },
  {
    where: `${WEBAPP_TILES} TRACKED_SKILLS`,
    read: () => trackedSkills(WEBAPP_TILES),
  },
  {
    where: 'install/uninstall.sh removal loop',
    read: () => uninstallLoop(read('install/uninstall.sh')),
  },
  {
    where: `${LAUNCHER_COMMANDS} COMMANDS`,
    read: () => commandSkills(LAUNCHER_COMMANDS),
  },
  {
    where: `${LANDING_COMMANDS} COMMANDS`,
    read: () => commandSkills(LANDING_COMMANDS),
  },
]

describe('the shipped skill list, in the eight places that duplicate it', () => {
  it('finds the shipped skills, so an empty scan cannot pass silently', () => {
    // Without this, a broken path would make every comparison below [] === [].
    expect(shippedSkills().length).toBeGreaterThan(5)
    expect(shippedSkills()).toContain('magic-start')
  })

  it.each(LISTS)('parses a non-empty list out of $where', ({ read }) => {
    // A regex that stops matching is the way this test dies without failing: it would
    // report [] against [] for a list nobody has touched. Assert the parse first.
    expect(read().length).toBeGreaterThan(5)
  })

  it.each(LISTS)('$where lists exactly the skills that ship', ({ read }) => {
    expect([...read()].sort()).toEqual(shippedSkills())
  })

  it('excludes the evals folder, which is not a skill', () => {
    // `skills/evals/` holds eval_set.json and results.json, no SKILL.md. It must never
    // reach a list, so the source-of-truth filter is asserted rather than assumed.
    expect(shippedSkills()).not.toContain('evals')
    for (const { read } of LISTS) expect(read()).not.toContain('evals')
  })

  it('keeps the two dashboard rows in the same order, so the tiles match across surfaces', () => {
    // Both arrays are documented as "the order the development cycle runs them", and
    // the point of that ordering is that a user finds the same tile in the same place
    // whichever surface they opened. Sorted equality above cannot see a reordering.
    expect(trackedSkills(DESKTOP_TILES)).toEqual(trackedSkills(WEBAPP_TILES))
  })

  // The desktop row keeps bare labels and builds `/magic:${label}`; the webapp keeps
  // them pre-prefixed. Either way the label has to name its own skill, or a tile
  // reports one skill's hours under another's name.
  it.each([
    { file: DESKTOP_TILES, prefix: '' },
    { file: WEBAPP_TILES, prefix: '/magic:' },
  ])('labels every $file tile after the skill it reports', ({ file, prefix }) => {
    const pairs = trackedPairs(file)
    expect(pairs.length).toBe(shippedSkills().length)
    for (const { skill, label } of pairs) {
      expect(label).toBe(`${prefix}${skill.replace(/^magic-/, '')}`)
    }
  })

  it.each(TILE_GRIDS)('gives %s one grid column per shipped skill', (file) => {
    // Asserted as a literal rather than by parsing the class list: Tailwind only emits a
    // class it can see spelled out, so `grid-cols-${n}` built at runtime would not exist
    // in the CSS at all. The literal IS the contract, so the literal is what is checked.
    expect(read(file)).toContain(`grid-cols-${shippedSkills().length}`)
  })

  it('names every shipped skill in the uninstall.sh listing it prints to the user', () => {
    // The removal loop is checked above. This is the echo block above it: the two
    // drifted apart would mean uninstall silently deletes a folder it never announced.
    const source = read('install/uninstall.sh')
    const announced = [...source.matchAll(/echo "\s*• ~\/\.claude\/skills\/(magic-[\w-]+)\/"/g)].map(
      (m) => m[1],
    )
    expect([...announced].sort()).toEqual(shippedSkills())
  })
})
