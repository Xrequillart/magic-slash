import { getSupabase } from './supabase'

export interface UserStats {
  agents: number
  inReview: number
  monthCostUsd: number
}

export const EMPTY_STATS: UserStats = { agents: 0, inReview: 0, monthCostUsd: 0 }

/**
 * A PR whose review is still open. `approved` is deliberately excluded — the
 * work is no longer waiting on a reviewer. Mirrors AWAITING_REVIEW_STATUSES in
 * the desktop team dashboard.
 */
const AWAITING_REVIEW: ReadonlySet<string> = new Set(['pending', 'commented', 'changes-requested'])

interface RepositoryMetadata {
  prUrl?: string
  prReviewStatus?: string
  prMerged?: boolean
  prClosed?: boolean
}

interface AgentRow {
  id: string
  metadata: { repositoryMetadata?: Record<string, RepositoryMetadata> } | null
}

/** PRs on this agent still awaiting a review, across all of its repositories. */
function countAwaitingReview(row: AgentRow): number {
  const byRepo = row.metadata?.repositoryMetadata
  if (!byRepo) return 0

  let n = 0
  for (const meta of Object.values(byRepo)) {
    if (!meta) continue
    if (meta.prMerged || meta.prClosed) continue
    if (meta.prReviewStatus && AWAITING_REVIEW.has(meta.prReviewStatus)) n += 1
  }
  return n
}

/** PostgREST serialises `numeric` as a string — coerce before summing. */
function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function startOfMonthISO(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

/**
 * Headline numbers for the signed-in user's own work.
 *
 * `agents` and `usage_events` are org-scoped by RLS (any member reads the whole
 * org), so the explicit owner/user filters below are what narrow this to the
 * caller — not a redundancy.
 */
export async function fetchUserStats(): Promise<UserStats> {
  const supabase = getSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return EMPTY_STATS

  const [agentsRes, usageRes] = await Promise.all([
    supabase.from('agents').select('id, metadata').eq('owner_id', uid),
    supabase.from('usage_events').select('cost_usd').eq('user_id', uid).gte('occurred_at', startOfMonthISO()),
  ])

  const agentRows = (agentsRes.error ? [] : agentsRes.data ?? []) as AgentRow[]
  const usageRows = (usageRes.error ? [] : usageRes.data ?? []) as { cost_usd: unknown }[]

  return {
    agents: agentRows.length,
    inReview: agentRows.reduce((sum, row) => sum + countAwaitingReview(row), 0),
    monthCostUsd: usageRows.reduce((sum, row) => sum + toNumber(row.cost_usd), 0),
  }
}

/** Ported from the desktop's usageStats — keeps both surfaces reading alike. */
export function formatUsd(n: number): string {
  if (n > 0 && n < 0.01) return '<$0.01'
  if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`
  return `$${n.toFixed(2)}`
}
