import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { ClaudeAccount, SpendSummary, SpendBucket } from '../../types'

// Reads Claude Code's local data (~/.claude) to surface the signed-in account and
// an *estimated* spend/token summary. These are not billed dollars — Claude.ai
// subscribers have no per-request cost — so the cost figure is an API-equivalent
// estimate computed from token counts × public API pricing (ccusage-style).

const CLAUDE_JSON = path.join(os.homedir(), '.claude.json')
const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export function getClaudeAccount(): ClaudeAccount | null {
  try {
    const raw = fs.readFileSync(CLAUDE_JSON, 'utf-8')
    const data = JSON.parse(raw)
    const oa = data?.oauthAccount
    if (!oa || typeof oa !== 'object') return null
    return {
      displayName: typeof oa.displayName === 'string' ? oa.displayName : undefined,
      emailAddress: typeof oa.emailAddress === 'string' ? oa.emailAddress : undefined,
      organizationName: typeof oa.organizationName === 'string' ? oa.organizationName : undefined,
      seatTier: typeof oa.seatTier === 'string' ? oa.seatTier : undefined,
      billingType: typeof oa.billingType === 'string' ? oa.billingType : undefined,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Spend / tokens
// ---------------------------------------------------------------------------

// Public API pricing per 1M tokens (USD). Cache read ≈ 0.1× input, cache write
// (5m) ≈ 1.25× input, cache write (1h) ≈ 2× input. See the claude-api skill.
interface ModelPrice { input: number; output: number }
function priceFor(model: string): ModelPrice {
  const m = model.toLowerCase()
  if (m.includes('fable') || m.includes('mythos')) return { input: 10, output: 50 }
  if (m.includes('opus')) return { input: 5, output: 25 }
  if (m.includes('haiku')) return { input: 1, output: 5 }
  if (m.includes('sonnet')) return { input: 3, output: 15 }
  return { input: 3, output: 15 } // unknown model → Sonnet-tier default
}

function estimateCostUsd(model: string, u: {
  input: number; output: number; cacheRead: number; cache5m: number; cache1h: number
}): number {
  const p = priceFor(model)
  return (
    (u.input * p.input) +
    (u.output * p.output) +
    (u.cacheRead * p.input * 0.1) +
    (u.cache5m * p.input * 1.25) +
    (u.cache1h * p.input * 2)
  ) / 1_000_000
}

// Local YYYY-MM-DD for an ISO timestamp.
function localDateKey(iso: string): string | null {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

// Per-day aggregate, deduped globally across transcript files. Cached and only
// recomputed when the set of transcript files changes (mtime/size signature).
interface DayAgg { tokens: number; costUsd: number }
interface Cache { signature: string; byDate: Map<string, DayAgg> }
let cache: Cache | null = null

function listJsonlFiles(dir: string): string[] {
  const out: string[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...listJsonlFiles(full))
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full)
  }
  return out
}

function computeByDate(files: { path: string }[]): Map<string, DayAgg> {
  const byDate = new Map<string, DayAgg>()
  const seen = new Set<string>()

  for (const f of files) {
    let content: string
    try {
      content = fs.readFileSync(f.path, 'utf-8')
    } catch {
      continue
    }
    for (const line of content.split('\n')) {
      if (!line) continue
      let o: Record<string, unknown>
      try {
        o = JSON.parse(line)
      } catch {
        continue
      }
      const msg = o.message as Record<string, unknown> | undefined
      const usage = msg?.usage as Record<string, unknown> | undefined
      if (!msg || !usage || msg.role !== 'assistant') continue

      // Dedup: the same assistant message is copied across resumed/forked sessions.
      const msgId = typeof msg.id === 'string' ? msg.id : (typeof o.uuid === 'string' ? o.uuid : '')
      const reqId = typeof o.requestId === 'string' ? o.requestId : ''
      const key = `${msgId}:${reqId}`
      if (msgId && seen.has(key)) continue
      if (msgId) seen.add(key)

      const dateKey = typeof o.timestamp === 'string' ? localDateKey(o.timestamp) : null
      if (!dateKey) continue

      const num = (v: unknown): number => (typeof v === 'number' ? v : 0)
      const cacheCreation = usage.cache_creation as Record<string, unknown> | undefined
      const cache1h = num(cacheCreation?.ephemeral_1h_input_tokens)
      const cache5mBreakdown = num(cacheCreation?.ephemeral_5m_input_tokens)
      const cacheCreateTotal = num(usage.cache_creation_input_tokens)
      // Prefer the TTL breakdown; fall back to the flat total as 5m if absent.
      const cache5m = cacheCreation ? cache5mBreakdown : cacheCreateTotal
      const cache1hTokens = cacheCreation ? cache1h : 0

      const input = num(usage.input_tokens)
      const output = num(usage.output_tokens)
      const cacheRead = num(usage.cache_read_input_tokens)
      const model = typeof msg.model === 'string' ? msg.model : ''

      const tokens = input + output + cacheRead + cache5m + cache1hTokens
      const costUsd = estimateCostUsd(model, {
        input, output, cacheRead, cache5m, cache1h: cache1hTokens,
      })

      const cur = byDate.get(dateKey) ?? { tokens: 0, costUsd: 0 }
      cur.tokens += tokens
      cur.costUsd += costUsd
      byDate.set(dateKey, cur)
    }
  }
  return byDate
}

function getByDate(): Map<string, DayAgg> {
  const paths = listJsonlFiles(PROJECTS_DIR)
  const stated = paths.map((p) => {
    try {
      const s = fs.statSync(p)
      return { path: p, sig: `${p}:${s.mtimeMs}:${s.size}` }
    } catch {
      return { path: p, sig: `${p}:0:0` }
    }
  })
  const signature = stated.map((s) => s.sig).sort().join('|')
  if (cache && cache.signature === signature) return cache.byDate
  const byDate = computeByDate(stated)
  cache = { signature, byDate }
  return byDate
}

export function getSpendSummary(): SpendSummary {
  const byDate = getByDate()

  const now = new Date()
  const todayKey = localDateKey(now.toISOString())
  // Start of the current week (Monday, local).
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = (startOfWeek.getDay() + 6) % 7 // 0 = Monday
  startOfWeek.setDate(startOfWeek.getDate() - dow)

  const empty = (): SpendBucket => ({ tokens: 0, costUsd: 0 })
  const today = empty()
  const week = empty()
  const allTime = empty()

  for (const [dateKey, agg] of byDate) {
    allTime.tokens += agg.tokens
    allTime.costUsd += agg.costUsd

    const d = new Date(`${dateKey}T00:00:00`)
    if (!isNaN(d.getTime()) && d >= startOfWeek) {
      week.tokens += agg.tokens
      week.costUsd += agg.costUsd
    }
    if (dateKey === todayKey) {
      today.tokens += agg.tokens
      today.costUsd += agg.costUsd
    }
  }

  return { today, week, allTime, hasData: byDate.size > 0 }
}
