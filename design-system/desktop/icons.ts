/**
 * Every icon the apps may use, and the one place the library is named.
 *
 * `lucide-react` is a dependency of THIS folder now — see `package.json` — and not
 * of the apps that consume it. That inversion is the point: the desktop held
 * `^0.563.0` and the webapp `^1.26.0`, two different libraries wearing one name,
 * and a shared component could not import either. One version lives here, both
 * apps import through it, and the question cannot be reopened one `npm install` at
 * a time.
 *
 * A BARREL AND NOT A CATALOGUE. `export *` hands over all four thousand of them
 * rather than a curated list, which is the weaker position for a design system to
 * take and the honest one for a design system three files old: a list of 131 names
 * would be a gate with nobody behind it, and every new icon an errand. The
 * components' own defaults are opinionated (see `Banner`'s tone table) — the
 * catalogue is not, yet.
 *
 * Tree-shaken: the ESM build is `sideEffects: false`, so a bundle carries the
 * icons it names and nothing else. `desktop/dist` is the check — the renderer
 * bundle did not move when this replaced the app's own import.
 *
 * WHAT THIS COSTS. Bumping lucide here changes both apps at once, and Lucide
 * removes icons between majors — v1 dropped the brand marks, which is why the
 * desktop's GitHub glyph is `GithubMark` in `components/icons/TrackerIcons.tsx`
 * and not `Github` from here.
 */
export * from 'lucide-react'

/**
 * The five marks Lucide does not have, from the same import as the four thousand it
 * does: to a call site `Github` and `GitPullRequest` are the same kind of name.
 *
 * EXPLICIT re-exports and not a second `export *`. Two star exports that both carry
 * a name do not conflict loudly — ESM drops the name from the module entirely, and
 * the import fails somewhere else with no mention of the collision. An explicit
 * export wins over a star export by rule, so `Github` here is this folder's mark
 * whatever a future lucide version decides to call its own.
 */
export { ClaudeCode, Github, Jira, MagicSlash, VSCode } from './brand'
// The brand COLOURS travel with the marks: a call site painting Claude Code's robot
// coral and one painting its chip's ground read the same two values.
export { CLAUDE_CHIP_GROUND, CLAUDE_CORAL } from './brand'
