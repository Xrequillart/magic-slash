/**
 * The eight commands, in CYCLE ORDER — the canonical list, and the only one.
 *
 * `plan` first because it runs before there is a ticket to start, then the seven that
 * carry one ticket from opening to closing. The order IS the content: the landing page
 * presents these as a cycle, and a list in alphabetical or historical order would show
 * `commit` before `start`.
 *
 * NOT `lib/skills.ts`. That file's `TRACKED_SKILLS` looks like the same eight names and
 * is a different thing entirely — it is the TELEMETRY vocabulary, read by
 * `app/admin/organizations/[orgId]/page.tsx` and `components/SkillStats.tsx` to bucket
 * recorded skill hours, and it imports `./supabase`. Importing it from a marketing page
 * would drag the auth SDK into the bundle of a page that authenticates nobody, so the
 * public site gets its own list and the two stay separate on purpose.
 *
 * ZERO IMPORTS, and that is a hard constraint rather than a preference: `commands.test.ts`
 * runs in the ROOT vitest suite, on the root `node_modules`, and CI never installs
 * `webapp/`'s dependencies (see the note in `vitest.config.ts`). Which is why `icon` is a
 * lucide icon NAME rather than a `LucideIcon` — typing it as the component would import
 * `lucide-react` here and break the rule. The consumer resolves the string through a map
 * of its own; that map lives beside the markup that renders it.
 *
 * THE TWO UNIONS BELOW ARE WHAT MAKES THAT SAFE. Both fields were once a bare `string`,
 * and a consumer keying a map by them got no help from `tsc`: a ninth command, or a typo
 * in one of these rows, left `DESCRIPTIONS[command.id]` undefined while still TYPED as a
 * `MessageKey` — `t()` has no per-key fallback, so the card rendered an empty paragraph.
 * A union costs nothing here (a union of string literals is not an import) and turns
 * every such gap into a compile error at the map that forgot the row.
 */

/** The eight, as a type — so a `Record` keyed by one is exhaustive. */
export type MagicCommandId =
  | 'plan'
  | 'start'
  | 'continue'
  | 'commit'
  | 'pr'
  | 'review'
  | 'resolve'
  | 'done'

/** The lucide names used below, for the same reason: a resolver map cannot miss one. */
export type MagicCommandIcon =
  | 'NotebookPen'
  | 'Rocket'
  | 'Play'
  | 'GitCommit'
  | 'GitPullRequest'
  | 'ScanSearch'
  | 'Wrench'
  | 'CheckCircle'

export type MagicCommand = {
  /** The bare name, and the key everything else is derived from. */
  id: MagicCommandId
  /**
   * What you actually type. A template-literal type rather than `string`, so the two
   * spellings cannot drift: `command: '/magic:pln'` is a compile error, where before it
   * was a command on the landing page that does not exist.
   */
  command: `/magic:${MagicCommandId}`
  /** A lucide icon name — resolved to a component by whoever renders it. */
  icon: MagicCommandIcon
}

export const MAGIC_COMMANDS: readonly MagicCommand[] = [
  { id: 'plan', command: '/magic:plan', icon: 'NotebookPen' },
  { id: 'start', command: '/magic:start', icon: 'Rocket' },
  { id: 'continue', command: '/magic:continue', icon: 'Play' },
  { id: 'commit', command: '/magic:commit', icon: 'GitCommit' },
  { id: 'pr', command: '/magic:pr', icon: 'GitPullRequest' },
  { id: 'review', command: '/magic:review', icon: 'ScanSearch' },
  { id: 'resolve', command: '/magic:resolve', icon: 'Wrench' },
  { id: 'done', command: '/magic:done', icon: 'CheckCircle' },
] as const
