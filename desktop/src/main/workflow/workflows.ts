import { getStore, type StoredWorkflow } from '../store/Store'
import { DEFAULT_WORKFLOW } from '../../workflow/defaultFlow'
import type { ResolvedWorkflow, Workflow } from '../../workflow/model'
import type { WorkflowOverlay } from '../../workflow/overlay'
import { EMPTY_OVERLAY, resolveOverlay, sameOverlay } from '../../workflow/overlay'

/**
 * The repositories' custom workflows, held in memory like the config they belong to.
 *
 * Loaded from the store next to the config — on first hydration, on a forced
 * rehydrate, on every remote config reload and on every realtime change to
 * `repository_workflows` (store/hydrate.ts, config/remote-sync.ts) — and served to
 * the skills over `GET /workflow`. Never mirrored to disk, for the reason the config
 * is not.
 *
 * What is stored is an overlay (workflow/overlay.ts): the steps and links an admin added
 * to the default flow. It is judged once, when it lands in the cache — loaded or saved,
 * both through `accept` — so a definition this build does not understand costs a warning
 * and its repository follows the default flow, instead of breaking a skill.
 */

interface CachedWorkflow {
  /** The stored overlay, as the editor edits it. */
  overlay: WorkflowOverlay
  /** It composed onto the default flow. */
  workflow: Workflow
}

let workflows: Record<string, CachedWorkflow> = {}
/**
 * repo id → the revision of its row (Store.StoredWorkflow), for EVERY row, usable or
 * not: a repository whose stored definition this build refuses still has a row, and
 * the editor's save has to say which version of it it replaces. Absent is "no row".
 */
let revisions: Record<string, string> = {}
/** Bumped on reset, so a load that started before a sign-out cannot land after it. */
let generation = 0
/**
 * repo id → how many times this app has written its flow (setWorkflow). A load
 * compares it with the count it started at: a repository written meanwhile keeps what
 * the write put in the cache, because the load may have read the row before the write.
 */
let writes: Record<string, number> = {}

/**
 * A stored definition as the cache keeps it, or null (with a warning) when it cannot
 * be used. The one judge of a definition: hydration and saves both go through it, so
 * what an editor saves is served exactly as a later load would serve it.
 */
function accept(repoId: string, definition: unknown): CachedWorkflow | null {
  if (definition === undefined || definition === null) return null
  const resolved = resolveOverlay(definition)
  if ('error' in resolved) {
    console.warn(`[workflow] repository ${repoId} has an unusable stored workflow (${resolved.error}), serving the default`)
    return null
  }
  return { overlay: resolved.overlay, workflow: resolved.workflow }
}

/**
 * The repo ids whose flow differs between two caches: added, removed, edited, or only
 * re-saved (a new revision of the same flow). The last is not a change to what the
 * skills get, but an editor holding the old revision has to learn the new one, or
 * its next save would be refused as a conflict nobody caused.
 */
function changedRepos(
  prev: { workflows: Record<string, CachedWorkflow>; revisions: Record<string, string> },
  next: { workflows: Record<string, CachedWorkflow>; revisions: Record<string, string> },
): string[] {
  const ids = new Set([
    ...Object.keys(prev.workflows), ...Object.keys(next.workflows),
    ...Object.keys(prev.revisions), ...Object.keys(next.revisions),
  ])
  return [...ids].filter((id) => {
    if (prev.revisions[id] !== next.revisions[id]) return true
    const a = prev.workflows[id]?.overlay
    const b = next.workflows[id]?.overlay
    return !a || !b ? a !== b : !sameOverlay(a, b)
  })
}

/** One read of the store, landed on the cache. See hydrateWorkflows. */
async function loadOnce(): Promise<string[]> {
  const started = generation
  const writesAtStart = { ...writes }
  let loaded: Record<string, StoredWorkflow> | null
  try {
    loaded = await getStore().loadRepositoryWorkflows()
  } catch (error) {
    // The Store contract says it never rejects; hydration must not depend on that.
    console.error('Error hydrating repository workflows:', error)
    return []
  }
  if (generation !== started) return []
  // A failed read (null) keeps the last valid cache: an outage is not "no custom flow".
  if (loaded === null) return []
  const nextWorkflows: Record<string, CachedWorkflow> = {}
  const nextRevisions: Record<string, string> = {}
  // Each unusable definition warns once, here.
  for (const [repoId, row] of Object.entries(loaded)) {
    nextRevisions[repoId] = row.revision
    const cached = accept(repoId, row.definition)
    if (cached) nextWorkflows[repoId] = cached
  }
  // A repository written since this load started keeps its cached flow: the read may
  // predate the write, and putting the older row back would undo a save. The next
  // load, which the write's own Realtime echo asks for, confirms it.
  for (const repoId of new Set([...Object.keys(writes), ...Object.keys(writesAtStart)])) {
    if ((writes[repoId] ?? 0) === (writesAtStart[repoId] ?? 0)) continue
    if (workflows[repoId]) nextWorkflows[repoId] = workflows[repoId]
    else delete nextWorkflows[repoId]
    if (revisions[repoId] !== undefined) nextRevisions[repoId] = revisions[repoId]
    else delete nextRevisions[repoId]
  }
  const prev = { workflows, revisions }
  workflows = nextWorkflows
  revisions = nextRevisions
  return changedRepos(prev, { workflows, revisions })
}

// The loader is serialized: one load at a time, and at most one waiting behind it.
let loading: Promise<string[]> | null = null
let queued: Promise<string[]> | null = null

function startLoad(): Promise<string[]> {
  const load = loadOnce().finally(() => {
    if (loading === load) loading = null
  })
  loading = load
  return load
}

/**
 * Reload every flow from the store. Resolves to the repo ids whose flow changed, so a
 * caller can tell the interface which ones to read again; empty when nothing moved,
 * the read failed, or the load was overtaken by a sign-out. Never rejects.
 *
 * SERIALIZED. Every path that reloads the flows (hydration, the remote config reload,
 * a Realtime change to the table) comes through here, and two loads never run at once:
 * run side by side, a slower older one could land last and put stale rows back. A
 * request made while a load is in flight joins the ONE follow-up load that starts once
 * it settles, so the answer it waits for is a read begun after it asked; requests
 * arriving together share that follow-up, and its changed ids.
 */
export function hydrateWorkflows(): Promise<string[]> {
  if (!loading) return startLoad()
  if (!queued) {
    const next: Promise<string[]> = loading.then(() => {
      if (queued === next) queued = null
      return startLoad()
    })
    queued = next
  }
  return queued
}

/**
 * Put a just-saved definition in the cache, without waiting for the realtime echo.
 * null is "back to the default flow" (the row was deleted). `revision` is the row's
 * new one, as the save returned it (null with no row). Counted as a write, so a load
 * already in flight does not overwrite it (see loadOnce).
 */
export function setWorkflow(repoId: string, overlay: WorkflowOverlay | null, revision: string | null): void {
  const cached = accept(repoId, overlay)
  const next = { ...workflows }
  if (cached) next[repoId] = cached
  else delete next[repoId]
  workflows = next
  const nextRevisions = { ...revisions }
  if (revision !== null) nextRevisions[repoId] = revision
  else delete nextRevisions[repoId]
  revisions = nextRevisions
  writes = { ...writes, [repoId]: (writes[repoId] ?? 0) + 1 }
}

/** Drop the cache (on sign-out), so another user never gets these flows. */
export function resetWorkflowsCache(): void {
  workflows = {}
  revisions = {}
  writes = {}
  generation++
}

/**
 * The flow a repository's skills follow: its own when it has a usable one,
 * otherwise the default. `repoId` null (a path matching no configured repo) is the
 * default too.
 */
export function workflowForRepo(repoId: string | null): ResolvedWorkflow {
  const own = repoId ? workflows[repoId] : undefined
  return own ? { workflow: own.workflow, source: 'repository' } : { workflow: DEFAULT_WORKFLOW, source: 'default' }
}

/** The overlay the editor starts from: the repository's usable one, or the empty one. */
export function overlayForRepo(repoId: string): WorkflowOverlay {
  return workflows[repoId]?.overlay ?? EMPTY_OVERLAY
}

/**
 * The revision of the repository's row, or null when it has none (the default flow).
 * What the editor hands back on save, so a flow changed since it was read is not
 * overwritten (Store.saveRepositoryWorkflow).
 */
export function revisionForRepo(repoId: string): string | null {
  return revisions[repoId] ?? null
}
