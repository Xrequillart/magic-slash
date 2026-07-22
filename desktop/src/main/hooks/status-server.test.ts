import { describe, it, expect } from 'vitest'
import { parseStatusLinePayload } from './status-server'

describe('parseStatusLinePayload', () => {
  const fullPayload = JSON.stringify({
    model: { id: 'claude-opus-4-8', display_name: 'Opus 4.8' },
    context_window: {
      total_input_tokens: 140000,
      total_output_tokens: 5000,
      context_window_size: 200000,
      used_percentage: 68,
    },
    cost: {
      total_cost_usd: 0.4237,
      total_duration_ms: 754321,
      total_lines_added: 120,
      total_lines_removed: 45,
    },
    rate_limits: {
      five_hour: { used_percentage: 23.5, resets_at: 1738425600 },
      seven_day: { used_percentage: 41.2, resets_at: 1738857600 },
    },
  })

  it('extracts cost, model, duration and lines', () => {
    const usage = parseStatusLinePayload(fullPayload)
    expect(usage.costUsd).toBe(0.4237)
    expect(usage.model).toBe('Opus 4.8')
    expect(usage.durationMs).toBe(754321)
    expect(usage.linesAdded).toBe(120)
    expect(usage.linesRemoved).toBe(45)
  })

  it('uses the exact total_input_tokens (not derived from the rounded percentage)', () => {
    const usage = parseStatusLinePayload(fullPayload)
    expect(usage.contextPercent).toBe(68)
    expect(usage.contextWindowSize).toBe(200000)
    // Exact count, not 68% of 200000 (= 136000)
    expect(usage.contextTokens).toBe(140000)
  })

  it('falls back to percentage x window size when exact tokens are absent', () => {
    const payload = JSON.stringify({
      context_window: { used_percentage: 50, context_window_size: 1_000_000 },
    })
    const usage = parseStatusLinePayload(payload)
    expect(usage.contextPercent).toBe(50)
    expect(usage.contextTokens).toBe(500_000)
  })

  it('extracts plan rate limits (5h / 7d) when present', () => {
    const usage = parseStatusLinePayload(fullPayload)
    expect(usage.fiveHourPercent).toBe(23.5)
    expect(usage.fiveHourResetsAt).toBe(1738425600)
    expect(usage.sevenDayPercent).toBe(41.2)
    expect(usage.sevenDayResetsAt).toBe(1738857600)
  })

  it('leaves rate-limit fields undefined for API users (no rate_limits block)', () => {
    const usage = parseStatusLinePayload('{"cost":{"total_cost_usd":1}}')
    expect(usage.costUsd).toBe(1)
    expect(usage.fiveHourPercent).toBeUndefined()
    expect(usage.fiveHourResetsAt).toBeUndefined()
    expect(usage.sevenDayPercent).toBeUndefined()
    expect(usage.sevenDayResetsAt).toBeUndefined()
  })

  it('returns undefined fields for a minimal/empty payload', () => {
    const usage = parseStatusLinePayload('{}')
    expect(usage.costUsd).toBeUndefined()
    expect(usage.contextPercent).toBeUndefined()
    expect(usage.contextTokens).toBeUndefined()
    expect(usage.model).toBeUndefined()
    expect(usage.fiveHourPercent).toBeUndefined()
    expect(usage.sevenDayPercent).toBeUndefined()
  })

  it('ignores fields with the wrong type', () => {
    const payload = JSON.stringify({
      model: { display_name: 42 },
      cost: { total_cost_usd: 'nope' },
      context_window: { used_percentage: null },
    })
    const usage = parseStatusLinePayload(payload)
    expect(usage.model).toBeUndefined()
    expect(usage.costUsd).toBeUndefined()
    expect(usage.contextPercent).toBeUndefined()
  })
})
