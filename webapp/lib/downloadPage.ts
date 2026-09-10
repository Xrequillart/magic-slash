import type { MessageKey } from './i18n'

/**
 * Everything `/download` says that is NOT the button: the page's copy keys, the three
 * things a machine needs before the app will run, and the three things the first launch
 * does. `lib/desktopRelease.ts` owns the version and the file URL; `lib/changelog.ts`
 * owns the release notes the page closes on. This module is the words around them.
 *
 * ZERO RUNTIME IMPORTS BAR `./i18n` (as a TYPE, erased by esbuild), the same constraint
 * `lib/changelogPage.ts` and `lib/features.ts` are written under: `downloadPage.test.ts`
 * runs in the ROOT vitest suite, on the root `node_modules`, and CI never installs
 * `webapp/`'s dependencies. A `react`, `next/*` or `lucide-react` import at any depth
 * from here would not fail that test — it would fail to RESOLVE it.
 *
 * WHICH IS ALSO WHY THE ICONS ARE NAMES. `lib/siteNav.ts` states the rule at length for
 * its own glyphs: a component here would import `lucide-react` into a module the root
 * suite reads, so each entry names its glyph and `DownloadContent` holds the map to the
 * component, beside the markup that draws it.
 */

/**
 * The page's chrome, as catalogue keys.
 *
 * Named here rather than spelled out in the markup for the reason `changelogPage.ts`'s
 * `PAGE_CHROME` gives: `tsc` never runs on `webapp/` in CI, so a `MessageKey` union in
 * a component guarantees nothing, and `t()` has no per-key fallback — a key that does
 * not exist renders as an empty element rather than as an error. Keys named in THIS
 * module are keys the root suite looks up in both catalogues for real.
 */
export const PAGE_CHROME = {
  /** The page's `h1` — the same key the placeholder used, because the title did not change. */
  title: 'site.downloadPage.title',
  /** The one line under it. Rewritten: the placeholder's ended on "this page is being written". */
  lead: 'site.downloadPage.lead',
  /** The pill above the title: `{version}` and `{date}` are substituted. */
  versionBadge: 'site.downloadPage.versionBadge',
  /** The one primary button on the page. */
  button: 'site.downloadPage.button',
  /** The file's own name under the button — arch and format, so nobody is surprised by a .dmg. */
  fileHint: 'site.downloadPage.fileHint',
  /** The three facts under the button. `site.desktop.reassureFree` is the first of them. */
  reassureChip: 'site.downloadPage.reassureChip',
  reassureSigned: 'site.downloadPage.reassureSigned',
  /** The prerequisites band. */
  requirementsEyebrow: 'site.downloadPage.requirementsEyebrow',
  requirementsTitle: 'site.downloadPage.requirementsTitle',
  requirementsLead: 'site.downloadPage.requirementsLead',
  /** The large, bold, centred line under the three cards: they are not a to-do list. */
  requirementsReassure: 'site.downloadPage.requirementsReassure',
  /** The first-launch band. */
  launchEyebrow: 'site.downloadPage.launchEyebrow',
  launchTitle: 'site.downloadPage.launchTitle',
  launchLead: 'site.downloadPage.launchLead',
  /** The changelog band: what the release being downloaded actually changed. */
  changelogEyebrow: 'site.downloadPage.changelogEyebrow',
  changelogTitle: 'site.downloadPage.changelogTitle',
  changelogLead: 'site.downloadPage.changelogLead',
  /** The button out to `/changelog`, and the link out to the GitHub release. */
  fullChangelog: 'site.downloadPage.fullChangelog',
  releaseNotes: 'site.downloadPage.releaseNotes',
  /** The line at the very bottom for whoever needs a build that is not this one. */
  olderVersions: 'site.downloadPage.olderVersions',
  allReleases: 'site.downloadPage.allReleases',
} as const satisfies Record<string, MessageKey>

/** The glyphs this page draws, by lucide export name. `DownloadContent` maps them. */
export type DownloadIcon = 'Terminal' | 'Hexagon' | 'GitBranch' | 'ShieldCheck' | 'Sparkles' | 'Plug'

/** One card in the prerequisites band, or one step in the first-launch band. */
export type DownloadPoint = {
  id: string
  icon: DownloadIcon
  title: MessageKey
  body: MessageKey
}

/**
 * WHAT THE MACHINE NEEDS FIRST — the same three things `site.faq.prerequisites.a`
 * lists, in the same order, and kept to three on purpose: they are the three the first
 * launch actually checks (`desktop/src/main/setup/`). A fourth row here would be a
 * requirement the app does not enforce.
 *
 * Claude Code first, because it is the one a visitor may not have and cannot install
 * from a package manager in one line; Node and Git are the two most developers already
 * have and only need to be new enough.
 */
export const REQUIREMENTS: readonly DownloadPoint[] = [
  {
    id: 'claude',
    icon: 'Terminal',
    title: 'site.downloadPage.reqClaudeTitle',
    body: 'site.downloadPage.reqClaudeBody',
  },
  {
    id: 'node',
    icon: 'Hexagon',
    title: 'site.downloadPage.reqNodeTitle',
    body: 'site.downloadPage.reqNodeBody',
  },
  {
    id: 'git',
    icon: 'GitBranch',
    title: 'site.downloadPage.reqGitTitle',
    body: 'site.downloadPage.reqGitBody',
  },
]

/**
 * WHAT THE FIRST LAUNCH DOES, as three numbered steps — checks, installs, wires. The
 * order is the app's own (`desktop/src/main/setup/`), and it is what replaces the
 * install script the old site told people to `curl | bash`: there is nothing to run.
 */
export const FIRST_LAUNCH: readonly DownloadPoint[] = [
  {
    id: 'checks',
    icon: 'ShieldCheck',
    title: 'site.downloadPage.stepChecksTitle',
    body: 'site.downloadPage.stepChecksBody',
  },
  {
    id: 'skills',
    icon: 'Sparkles',
    title: 'site.downloadPage.stepSkillsTitle',
    body: 'site.downloadPage.stepSkillsBody',
  },
  {
    id: 'mcp',
    icon: 'Plug',
    title: 'site.downloadPage.stepMcpTitle',
    body: 'site.downloadPage.stepMcpBody',
  },
]

/** Every key the page reads, flat — what `downloadPage.test.ts` looks up in both catalogues. */
export const ALL_KEYS: readonly MessageKey[] = [
  ...Object.values(PAGE_CHROME),
  ...[...REQUIREMENTS, ...FIRST_LAUNCH].flatMap((point) => [point.title, point.body]),
]
