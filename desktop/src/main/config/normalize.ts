import type { Config } from '../../types'

// LEAF MODULE (imports types only, never ./config): every other module in
// config/ depends on config.ts one-way, and this normalization runs FROM the
// load path in config.ts — so it has to live below it, not beside migrate.ts
// which imports readConfig/writeConfig and would close the loop into a cycle.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Every `pullRequest` block DEFAULT_REPOSITORY_FIELDS ever stamped on the repos
 * it created, oldest first, until issue #161 removed the default outright:
 *
 *  1. `{ autoLinkTickets: true }` — from 9b66ab5 (2026-04-05, and the same shape
 *     in config.ts before defaults.ts existed) until 2026-07-27.
 *  2. `+ watchCI: true` — 934873b (2026-07-27) until 2026-07-31.
 *  3. `+ testAccounts / testAccountsSource` — e610bca (2026-07-31), shipped in
 *     0.62.0 and the only shape the app itself still writes today.
 *
 * All three are still out there: a repo's `repositories.pull_request` column is
 * only rewritten when the user edits that repo (persistRepoIdentity), so a repo
 * created under 1. and never touched since still holds 1. verbatim. Recognising
 * only the newest shape would leave most existing installs unable to inherit.
 *
 * FROZEN HISTORY — spelled out here on purpose and deliberately NOT derived from
 * DEFAULT_REPOSITORY_FIELDS, which no longer carries the block at all. This is
 * what installs PERSISTED, not what the app defaults to; re-deriving it would
 * make the strip below silently follow future default changes. Append to this
 * list, never edit an entry.
 */
const LEGACY_DEFAULT_PULL_REQUESTS: readonly Readonly<Record<string, unknown>>[] = Object.freeze([
  Object.freeze({ autoLinkTickets: true }),
  Object.freeze({ autoLinkTickets: true, watchCI: true }),
  Object.freeze({ autoLinkTickets: true, watchCI: true, testAccounts: 'off', testAccountsSource: '' }),
])

/** Same key set AND same values — a block that partially matches is not a match. */
function equalsBlock(value: Record<string, unknown>, legacy: Readonly<Record<string, unknown>>): boolean {
  const keys = Object.keys(legacy)
  if (Object.keys(value).length !== keys.length) return false
  return keys.every((key) => value[key] === legacy[key])
}

/**
 * Whether a repo's `pullRequest` block is EXACTLY one of the historical defaults,
 * i.e. a block the user demonstrably never touched.
 *
 * Whole-block equality, never per-key: a user's deliberate `watchCI: true` is
 * indistinguishable from the default one, so a per-key strip would hand a choice
 * they made to the organization. A block must equal one historical default in
 * full, or nothing happens to it.
 */
function isUntouchedLegacyPullRequest(value: unknown): boolean {
  if (!isPlainObject(value)) return false
  return LEGACY_DEFAULT_PULL_REQUESTS.some((legacy) => equalsBlock(value, legacy))
}

/**
 * Issue #161: strip the historical `pullRequest` default off every repo that
 * still carries it, IN MEMORY. Returns whether anything was removed.
 *
 * Why it has to exist at all: repos an existing install already created carry
 * that block in the `repositories` table, so it comes back as "already set" and
 * mergeOrgSharedConfig — which only fills keys that are undefined — can never
 * hand them the organization's conventions. Dropping the default from
 * DEFAULT_REPOSITORY_FIELDS only helps repos created from now on; this pass is
 * what unblocks the repos that already exist.
 *
 * WHERE IT RUNS: `withDefaults` in config.ts, i.e. on EVERY load into the cache —
 * the initial hydration, and equally the mid-session re-hydration that
 * remote-sync's runRefresh performs when a teammate edits a repo or a Realtime
 * channel resubscribes. That matters because migrateConfig is guarded by
 * `restoredOnce` (ipc/connectivity-handlers.ts) and runs ONCE per process: were
 * this applied there alone, the very next refresh would reload the legacy block
 * straight from the database and block inheritance again — and serve the stale
 * block over the /config HTTP endpoint (hooks/status-server.ts) the /magic:*
 * skills read — for the rest of the session. migrateConfig still calls it, so a
 * config that reached the cache by some other route is normalized too; by then
 * it is normally a no-op.
 *
 * IN-MEMORY ONLY, and the database row is deliberately left untouched. Repos do
 * not live in the config blob: writeConfig → CloudStore.saveConfig does
 * `delete data.repositories` and repos are persisted per-repo into the
 * `repositories` table, whose columns are only written by explicit repo edits
 * (persistRepoIdentity). So the strip never reaches storage and a user's stored
 * values are never destroyed — if the app ever stops stripping, their block is
 * still exactly where they left it.
 */
export function normalizeLegacyPullRequest(config: Config): boolean {
  if (!config.repositories) return false
  let changed = false
  for (const repo of Object.values(config.repositories)) {
    if (isUntouchedLegacyPullRequest(repo.pullRequest)) {
      delete repo.pullRequest
      changed = true
    }
  }
  return changed
}
