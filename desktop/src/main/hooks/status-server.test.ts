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

  it('returns undefined fields for a minimal/empty payload', () => {
    const usage = parseStatusLinePayload('{}')
    expect(usage.costUsd).toBeUndefined()
    expect(usage.contextPercent).toBeUndefined()
    expect(usage.contextTokens).toBeUndefined()
    expect(usage.model).toBeUndefined()
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
