import type { TerminalMetadata } from '../../types'

/**
 * Fold the git branch we just detected into an agent's metadata.
 *
 * `terminal.branchName` (what git reports, pushed to the renderer for display) and
 * `metadata.branchName` (what gets PERSISTED, and ends up in the `branch_name`
 * column) are two different things that used to never meet — so every agent was
 * stored with an empty branch while the sidebar showed the right one. This is the
 * join.
 *
 * A metadata branch already set WINS: a skill that knows which branch it is about
 * to create is a better source than the checkout the terminal happens to open in
 * (usually `main`). The check is on truthiness, not on `undefined`, because
 * createDefaultMetadata() writes '' for every unset field — treating that as
 * "already set" would keep the bug alive.
 *
 * It lives in its own module, with a TYPE-ONLY import and nothing else, for one
 * reason: CI installs only the root's dependencies. A test that reached it through
 * `terminal-manager` would pull `node-pty`, and one that reached it through
 * `config/agents` would pull `electron` — neither of which exists in that install,
 * so the suite would fail to resolve before running a single assertion. Same
 * constraint the webapp's `lib/admin.ts` documents for `@supabase/supabase-js`.
 */
export function withDetectedBranch(
  metadata: TerminalMetadata,
  detectedBranch: string | null,
): TerminalMetadata {
  if (!detectedBranch || metadata.branchName) return metadata
  return { ...metadata, branchName: detectedBranch }
}
