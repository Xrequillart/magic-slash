import { getSupabase } from './supabase'

/**
 * Repositories, as far as the webapp still needs them: the onboarding checklist asks
 * whether the caller has bound one to a folder on their disk. Everything else about a
 * repository (its settings, its remote, its deletion) is edited in the desktop app.
 */

/**
 * How many repositories the caller has bound to a folder on their disk.
 *
 * The onboarding checklist needs the NUMBER and never the paths, so this asks for a
 * count and no rows. `repository_paths` is own-rows-only by RLS: a teammate's binding
 * cannot be counted here, and a repo shared with the whole org counts only once it is
 * this user who bound it — which is the honest question, since the binding is per
 * person (the table's key is `repo_id, user_id`) and an agent runs in the caller's
 * clone.
 *
 * 0 on failure, matching the other fetchers here: they resolve to an empty result and
 * leave `null` to mean "not fetched yet". A step that reads as not-done when the
 * request failed asks someone to do something they have already done; the reverse
 * would tick off a step that never happened and send them to /magic:start to find out.
 */
export async function countBoundRepositories(): Promise<number> {
  const { count, error } = await getSupabase()
    .from('repository_paths')
    .select('repo_id', { count: 'exact', head: true })
  if (error) return 0
  return count ?? 0
}
