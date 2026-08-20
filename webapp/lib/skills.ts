import { getSupabase } from './supabase'
import { toSkillHours, type SkillHours, type SkillHoursRow } from './skillHours'

/**
 * Skill-run telemetry: which /magic:* skills a team has actually run, and how often.
 *
 * Shared by the back-office org record and the user-space Organizations page, which
 * is why the list below lives here rather than in either page. Same rule as
 * `lib/settings.ts` and its THEME_OPTIONS: the console shares DATA with the user
 * space and never components, so two surfaces showing the same eight tiles read
 * them from one array instead of keeping two that drift.
 */

/**
 * The skills the stats cards report, in the order the development cycle runs them —
 * plan, start, pick back up, commit, ship, review, fix the review, close.
 *
 * A FIXED list, though the RPCs return every skill an org has ever run. The point is
 * that the same eight tiles sit in the same eight places on every org, so two teams
 * can be compared at a glance and a hole in the cycle ("plenty of commits, no PRs")
 * is visible as a shape. Sorting by count, or rendering whatever came back, would
 * make every card a different card.
 *
 * `skill` is what the desktop's PreToolUse hook logs, `label` is what a human calls
 * it. They differ because the log records the SKILL name Claude Code reports while a
 * reader recognises the slash command.
 */
export const TRACKED_SKILLS: { skill: string; label: string }[] = [
  { skill: 'magic-plan', label: '/magic:plan' },
  { skill: 'magic-start', label: '/magic:start' },
  { skill: 'magic-continue', label: '/magic:continue' },
  { skill: 'magic-commit', label: '/magic:commit' },
  { skill: 'magic-pr', label: '/magic:pr' },
  { skill: 'magic-review', label: '/magic:review' },
  { skill: 'magic-resolve', label: '/magic:resolve' },
  { skill: 'magic-done', label: '/magic:done' },
]

interface SkillCountRow {
  /** Plugin prefix already folded away by the RPC — "magic-pr", never "x:magic-pr". */
  skill: string
  /** `count(*)`, a bigint PostgREST serialises as a JSON number. */
  total: number
}

/** Sums the runs of the skills the cards display. */
export function totalTrackedRuns(counts: Map<string, number>): number {
  return TRACKED_SKILLS.reduce((sum, { skill }) => sum + (counts.get(skill) ?? 0), 0)
}

/**
 * How many times one org has run each skill, all time, for a MEMBER of that org.
 *
 * `org_skill_counts` is SECURITY INVOKER, so the scoping is the skill_invocations
 * RLS policy: a non-member gets an empty result rather than an error, and there is
 * no privilege here to misuse. The back-office reads the same rollup through
 * `admin_org_skill_counts`, which is gated on platform admin instead — one gate per
 * entry point, deliberately not one function with two.
 *
 * Counts only runs attributed to the org through their agent, which is to say the
 * TEAM's work: a run on a member's personal repo carries no org and is counted for
 * nobody.
 *
 * Returned as a Map because every caller looks a skill up by name to draw its tile.
 * A skill never run is ABSENT rather than zero — `?? 0` at the read site turns
 * absence into the number to print, and keeps "never ran it" available to any caller
 * that cares. Insertion order is the RPC's (commonest first).
 */
export async function fetchOrgSkillCounts(orgId: string): Promise<Map<string, number>> {
  const { data, error } = await getSupabase().rpc('org_skill_counts', { p_org_id: orgId })
  if (error || !data) return new Map()
  return new Map((data as SkillCountRow[]).map((row) => [row.skill, row.total]))
}

/**
 * How many times the CALLER has run each skill outside any organization — their own
 * work on their own repositories, all time.
 *
 * A different function from the org rollup and not a null argument to it, because the
 * scope differs in kind: an org's counts are every member's work, these are one
 * person's. Nobody else can read them (the RLS policy's own-rows arm is the only one
 * that matches a null org), so there is no team view of this and there should not be.
 *
 * Same Map shape and same absent-means-never-run rule as `fetchOrgSkillCounts`.
 */
export async function fetchPersonalSkillCounts(): Promise<Map<string, number>> {
  const { data, error } = await getSupabase().rpc('personal_skill_counts')
  if (error || !data) return new Map()
  return new Map((data as SkillCountRow[]).map((row) => [row.skill, row.total]))
}

/**
 * The zone the user's week starts in — their own, as the browser reports it.
 *
 * Sent to the RPC rather than letting Postgres decide, because a PostgREST session is
 * UTC: `date_trunc('week', now())` there puts the Monday boundary at 00:00 UTC, so a
 * user in Paris would see their week begin on Sunday at 21:00 and every Sunday-evening
 * run counted into the week that had just ended. Falls back to UTC on the rare engine
 * that cannot name its zone, which is also what the RPC does with a name it does not
 * recognise.
 */
function weekTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * How long the CALLER has spent running skills — every scope, all time, plus the
 * current week — and the date their measured history starts.
 *
 * Every scope, unlike the two count rollups above, and that is the point rather than
 * an omission: this answers "how long have I spent on this", and a person's week is
 * not divided by which repository an agent happened to touch. It is also why there is
 * no org variant — an organization's hours would be a different question, and one this
 * function's `user_id = auth.uid()` scoping deliberately cannot be bent into.
 *
 * The total is a FLOOR. Only closed runs carry a duration, so an abandoned or
 * interrupted run weighs nothing, and no single run can contribute more than the four
 * hours `close_skill_run` will attach an end within. Copy on screen has to be able to
 * survive that being pointed out.
 *
 * `null` is a FAILED read, distinct from a successful read of an empty history (a row
 * of zeros with a null date). The banner hides itself in the first case and explains
 * itself in the second, which are different things to show.
 */
export async function fetchSkillHours(): Promise<SkillHours | null> {
  const { data, error } = await getSupabase().rpc('skill_hours', { p_tz: weekTimeZone() })
  // Always one row, never zero — the RPC aggregates without a GROUP BY precisely so a
  // user with no runs still has something to read.
  const row = (data as SkillHoursRow[] | null)?.[0]
  if (error || !row) return null
  return toSkillHours(row)
}
