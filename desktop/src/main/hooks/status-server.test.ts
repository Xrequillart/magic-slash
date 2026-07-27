import * as http from 'http'
import { afterAll, beforeAll, beforeEach, describe, it, expect } from 'vitest'
import {
  parseStatusLinePayload,
  startStatusServer,
  stopStatusServer,
  getServerPort,
  setConfigProvider,
  setAgentProvider,
  setWorktreeFilesWriter,
  setSkillCallback,
} from './status-server'

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

describe('read-back endpoints', () => {
  const httpGet = (path: string): Promise<{ status: number; body: string }> =>
    new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${getServerPort()}${path}`, (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c: Buffer) => chunks.push(c))
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf-8') }))
        })
        .on('error', reject)
    })

  beforeAll(async () => {
    await startStatusServer()
  })

  afterAll(async () => {
    await stopStatusServer()
  })

  it('GET /config returns the provider config as JSON', async () => {
    setConfigProvider(() => ({ version: '1.0.0', repositories: { api: { path: '/tmp/api', keywords: ['api'] } } }))
    const { status, body } = await httpGet('/config')
    expect(status).toBe(200)
    expect(JSON.parse(body)).toEqual({ version: '1.0.0', repositories: { api: { path: '/tmp/api', keywords: ['api'] } } })
  })

  it('GET /config returns {} when no provider is set to a throwing value', async () => {
    setConfigProvider(() => {
      throw new Error('boom')
    })
    const { status, body } = await httpGet('/config')
    expect(status).toBe(200)
    expect(body).toBe('{}')
  })

  it('GET /agent returns the metadata for the given terminal id', async () => {
    setAgentProvider((id) => (id === 'term-1' ? { id, metadata: { ticketId: 'PROJ-9' } } : null))
    const found = await httpGet('/agent?id=term-1')
    expect(JSON.parse(found.body)).toEqual({ id: 'term-1', metadata: { ticketId: 'PROJ-9' } })
    const missing = await httpGet('/agent?id=nope')
    expect(missing.body).toBe('null')
  })

  describe('GET /config/worktree-files', () => {
    type Received = { files: string[]; path: string | null; repo: string | null }
    let received: Received | null = null

    beforeEach(() => {
      received = null
      setWorktreeFilesWriter((files, path, repo) => {
        received = { files, path, repo }
      })
    })

    const FILES = encodeURIComponent(JSON.stringify(['.env', '.npmrc', 42]))

    it('forwards the working directory, which identifies the repo unambiguously', async () => {
      const { status } = await httpGet(`/config/worktree-files?path=%2Fx%2Fapi-PER-1&files=${FILES}`)
      expect(status).toBe(200)
      // Non-string entries (42) are filtered out before reaching the writer.
      expect(received).toEqual({ files: ['.env', '.npmrc'], path: '/x/api-PER-1', repo: null })
    })

    it('still accepts a bare repo name, for skills that have not been updated', async () => {
      const { status } = await httpGet(`/config/worktree-files?repo=api&files=${FILES}`)
      expect(status).toBe(200)
      expect(received).toEqual({ files: ['.env', '.npmrc'], path: null, repo: 'api' })
    })

    it('does not call the writer when neither identifier is given', async () => {
      const { status } = await httpGet(`/config/worktree-files?files=${FILES}`)
      expect(status).toBe(200)
      expect(received).toBeNull()
    })
  })

  describe('GET /skill', () => {
    let calls: Array<{ id: string | undefined; skill: string }> = []

    beforeEach(() => {
      calls = []
      setSkillCallback((id, skill) => calls.push({ id, skill }))
    })

    it('forwards the terminal id and skill name to the callback', async () => {
      const { status } = await httpGet('/skill?id=term-1&name=magic-commit')
      expect(status).toBe(200)
      expect(calls).toEqual([{ id: 'term-1', skill: 'magic-commit' }])
    })

    it('records each invocation separately', async () => {
      await httpGet('/skill?id=term-1&name=magic-commit')
      await httpGet('/skill?id=term-1&name=magic-commit')
      expect(calls).toHaveLength(2)
    })

    it('decodes plugin-scoped skill names', async () => {
      await httpGet(`/skill?id=term-1&name=${encodeURIComponent('code-review:code-review')}`)
      expect(calls).toEqual([{ id: 'term-1', skill: 'code-review:code-review' }])
    })

    it('ignores sidebar terminals', async () => {
      const { status } = await httpGet('/skill?id=sidebar-1&name=magic-commit')
      expect(status).toBe(200)
      expect(calls).toHaveLength(0)
    })

    // Unlike every other route, /skill accepts a missing id: the PreToolUse hook
    // is installed user-globally and also fires in terminals the app did not
    // spawn, where MAGIC_SLASH_TERMINAL_ID is unset and no agent exists.
    it('accepts an invocation with no terminal id (session outside the app)', async () => {
      const { status } = await httpGet('/skill?name=magic-commit')
      expect(status).toBe(200)
      expect(calls).toEqual([{ id: undefined, skill: 'magic-commit' }])
    })

    it('treats an empty id as no agent rather than an agent named ""', async () => {
      await httpGet('/skill?id=&name=magic-commit')
      expect(calls).toEqual([{ id: undefined, skill: 'magic-commit' }])
    })

    it('answers 200 without invoking the callback when name is missing', async () => {
      const { status } = await httpGet('/skill?id=term-1')
      expect(status).toBe(200)
      expect(calls).toHaveLength(0)
    })
  })
})
