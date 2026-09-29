import { getStore } from '../store/Store'
import { DEFAULT_WORKFLOW } from '../../workflow/defaultFlow'
import type { ResolvedWorkflow, Workflow } from '../../workflow/model'
import { isWorkflow, validateWorkflow } from '../../workflow/model'

/**
 * The repositories' custom workflows, held in memory like the config they belong to.
 *
 * Loaded from the store next to the config — on first hydration, on a forced
 * rehydrate and on every remote config reload (store/hydrate.ts,
 * config/remote-sync.ts) — and served to the skills over `GET /workflow`. Never
 * mirrored to disk, for the reason the config is not.
 *
 * Stored definitions are judged once, when loaded: a definition this build does not
 * understand costs a warning and its repository follows the default flow, so a bad
 * row degrades to today's behaviour instead of breaking a skill.
 */

let workflows: Record<string, Workflow> = {}
/** Bumped on reset, so a load that started before a sign-out cannot land after it. */
let generation = 0

/** The stored definitions this build can use, by repo id. Each unusable one warns once, here. */
function usableWorkflows(stored: Record<string, unknown>): Record<string, Workflow> {
  const usable: Record<string, Workflow> = {}
  for (const [repoId, definition] of Object.entries(stored)) {
    if (definition === undefined || definition === null) continue
    if (!isWorkflow(definition)) {
      console.warn(`[workflow] repository ${repoId} has a stored workflow of an unknown shape, serving the default`)
      continue
    }
    const errors = validateWorkflow(definition)
    if (errors.length > 0) {
      console.warn(`[workflow] repository ${repoId} has an invalid workflow, serving the default:`, errors)
      continue
    }
    usable[repoId] = definition
  }
  return usable
}

export async function hydrateWorkflows(): Promise<void> {
  const started = generation
  let loaded: Record<string, unknown>
  try {
    loaded = await getStore().loadRepositoryWorkflows()
  } catch (error) {
    // The Store contract says it never rejects; hydration must not depend on that.
    console.error('Error hydrating repository workflows:', error)
    return
  }
  if (generation !== started) return
  workflows = usableWorkflows(loaded)
}

/** Drop the cache (on sign-out), so another user never gets these flows. */
export function resetWorkflowsCache(): void {
  workflows = {}
  generation++
}

/**
 * The flow a repository's skills follow: its own when it has a usable one,
 * otherwise the default. `repoId` null (a path matching no configured repo) is the
 * default too.
 */
export function workflowForRepo(repoId: string | null): ResolvedWorkflow {
  const own = repoId ? workflows[repoId] : undefined
  return own ? { workflow: own, source: 'repository' } : { workflow: DEFAULT_WORKFLOW, source: 'default' }
}
