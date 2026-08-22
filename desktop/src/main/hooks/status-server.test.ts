import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest'

// Redirect the config dir at the temp dir: the port file lives there, and the real
// one belongs to the installed app. Without this the suite writes — and used to
// delete — the port file of a Magic Slash that is actually running.
// Built without `path`/`os`: vi.hoisted runs before the imports are initialized.
const { TEST_CONFIG_DIR } = vi.hoisted(() => ({
  TEST_CONFIG_DIR: `${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/magic-slash-status-server-test`,
}))
vi.mock('../config/paths', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config/paths')>()),
  CONFIG_DIR: TEST_CONFIG_DIR,
}))

const PORT_FILE = path.join(TEST_CONFIG_DIR, 'port')

import {
  parseStatusLinePayload,
  startStatusServer,
  stopStatusServer,
  getServerPort,
  setConfigProvider,
  setAgentProvider,
  setWorktreeFilesWriter,
  setSkillCallback,
  setQuestionCallback,
  setClearQuestionCallback,
  setMetadataCallback,
  setSpecPathCallback,
  setPlanSpecCallback,
  setPlanTicketsCallback,
  parsePlanTickets,
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
    expect(usage.modelId).toBe('claude-opus-4-8')
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
      model: { id: 7, display_name: 42 },
      cost: { total_cost_usd: 'nope' },
      context_window: { used_percentage: null },
    })
    const usage = parseStatusLinePayload(payload)
    expect(usage.model).toBeUndefined()
    expect(usage.modelId).toBeUndefined()
    expect(usage.costUsd).toBeUndefined()
    expect(usage.contextPercent).toBeUndefined()
  })
})

describe('the published port file', () => {
  afterEach(async () => {
    await stopStatusServer()
    fs.rmSync(PORT_FILE, { force: true })
  })

  it('publishes the listening port so processes outside the app can find the server', async () => {
    const port = await startStatusServer()
    expect(fs.readFileSync(PORT_FILE, 'utf-8')).toBe(String(port))
  })

  it('removes the file it published when the server stops', async () => {
    await startStatusServer()
    await stopStatusServer()
    expect(fs.existsSync(PORT_FILE)).toBe(false)
  })

  it('leaves a file another instance took over alone on stop', async () => {
    // The regression this guards: stopStatusServer() used to rmSync unconditionally,
    // so a process that no longer owns the file still deleted it — the instance named
    // inside kept serving on a port no out-of-app skill could discover any more.
    // `npm test` was doing exactly that to the installed app, via the real CONFIG_DIR.
    const port = await startStatusServer()
    expect(fs.readFileSync(PORT_FILE, 'utf-8')).toBe(String(port))

    // Another instance publishes over us while we are still up.
    fs.writeFileSync(PORT_FILE, '63789')
    await stopStatusServer()

    expect(fs.readFileSync(PORT_FILE, 'utf-8')).toBe('63789')
  })

  it('does not delete a file when it never published one', async () => {
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true })
    fs.writeFileSync(PORT_FILE, '63789')

    // No server was started: stopStatusServer() returns on the !server guard.
    await stopStatusServer()

    expect(fs.readFileSync(PORT_FILE, 'utf-8')).toBe('63789')
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

  const httpPost = (path: string, body: string): Promise<{ status: number; body: string }> =>
    new Promise((resolve, reject) => {
      const req = http.request(
        `http://127.0.0.1:${getServerPort()}${path}`,
        { method: 'POST' },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c: Buffer) => chunks.push(c))
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf-8') }))
        },
      )
      req.on('error', reject)
      req.end(body)
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

  describe('GET /metadata', () => {
    type Received = { id: string; metadata: Record<string, unknown> }
    let received: Received[] = []

    beforeEach(() => {
      received = []
      setMetadataCallback((id, metadata) => received.push({ id, metadata }))
    })

    // The path is announced BEFORE the spec is written: a planning agent says where
    // its output will land, so an existence check here would drop the one message
    // that tells the app a plan is in flight. This one test covers both "specPath is
    // forwarded" and "no filesystem check happens" — a separate happy-path test would
    // just repeat the same assertion against a different string.
    it('forwards specPath to the metadata callback even when the file does not exist yet', async () => {
      const spec = path.join(TEST_CONFIG_DIR, '.magic', 'spec-does-not-exist.md')
      expect(fs.existsSync(spec)).toBe(false)

      const { status } = await httpGet(`/metadata?id=term-1&specPath=${encodeURIComponent(spec)}`)
      expect(status).toBe(200)
      expect(received).toEqual([{ id: 'term-1', metadata: { specPath: spec } }])
    })

    // The route is a loopback server any local process can call, and the renderer
    // resolves a spec by splitting it into its own dirname plus basename — which makes
    // config:readFile's containment check pass for ANY path. So this lexical guard is
    // the only thing standing between "a local process named /etc/passwd" and that
    // file being rendered in the spec panel. It must reject, and it must reject
    // WITHOUT clearing a legitimate path announced earlier.
    it('drops a specPath that is not shaped like a spec', async () => {
      const legit = path.join(TEST_CONFIG_DIR, '.magic', 'spec-real-20260822-090000.md')
      await httpGet(`/metadata?id=term-guard&specPath=${encodeURIComponent(legit)}`)

      for (const hostile of [
        '/etc/passwd',
        path.join(TEST_CONFIG_DIR, 'notes.md'),                    // absolute, but not in .magic
        path.join(TEST_CONFIG_DIR, '.magic', 'id_rsa'),            // in .magic, but not spec-*.md
        path.join(TEST_CONFIG_DIR, '.magic', 'spec-.md'),          // spec-*.md shaped, but empty slug
        '.magic/spec-relative.md',                                 // relative
      ]) {
        received.length = 0
        const { status } = await httpGet(`/metadata?id=term-guard&specPath=${encodeURIComponent(hostile)}&title=Still%20applied`)
        expect(status).toBe(200)
        // The rest of the write still lands: a bad specPath is dropped, not fatal.
        expect(received, hostile).toEqual([{ id: 'term-guard', metadata: { title: 'Still applied' } }])
      }
    })

    it('leaves specPath out entirely when the caller sends none', async () => {
      const { status } = await httpGet('/metadata?id=term-1&title=Hello')
      expect(status).toBe(200)
      expect(received).toEqual([{ id: 'term-1', metadata: { title: 'Hello' } }])
    })

    describe('the spec path callback', () => {
      let announced: Array<{ id: string; specPath: string }> = []

      beforeEach(() => {
        announced = []
        setSpecPathCallback((id, specPath) => announced.push({ id, specPath }))
      })

      it('fires ONCE per path, however often the same one is re-announced', async () => {
        // This is what records the planning session, so it runs on the skill's FIRST
        // metadata write. `/magic:plan` re-sends its title (with the same specPath)
        // at several later steps, and each of those is not news.
        const spec = '/repo/.magic/spec-an-idea-20260821-101500.md'
        await httpGet(`/metadata?id=term-spec-1&specPath=${encodeURIComponent(spec)}`)
        await httpGet(`/metadata?id=term-spec-1&title=Renamed&specPath=${encodeURIComponent(spec)}`)
        expect(announced).toEqual([{ id: 'term-spec-1', specPath: spec }])

        // A different spec on the same terminal is a new session, and does fire.
        const second = '/repo/.magic/spec-another-idea-20260821-113000.md'
        await httpGet(`/metadata?id=term-spec-1&specPath=${encodeURIComponent(second)}`)
        expect(announced).toHaveLength(2)
      })

      it('does not fire on a metadata write that carries no spec path', async () => {
        await httpGet('/metadata?id=term-spec-2&title=Hello')
        expect(announced).toEqual([])
      })
    })
  })

  describe('GET /plan/spec', () => {
    let pinged: string[] = []

    beforeEach(() => {
      pinged = []
      setPlanSpecCallback((id) => pinged.push(id))
    })

    it('forwards the agent id and nothing else — the app already knows the path', async () => {
      // No markdown and no path on the wire: the spec's text never travels through a
      // shell, which is the whole reason this is a ping rather than an upload.
      const { status } = await httpGet('/plan/spec?id=term-1')
      expect(status).toBe(200)
      expect(pinged).toEqual(['term-1'])
    })

    it('ignores sidebar terminals', async () => {
      const { status } = await httpGet('/plan/spec?id=sidebar-1')
      expect(status).toBe(200)
      expect(pinged).toEqual([])
    })

    it('answers 200 with no id, and never an error the skill has to handle', async () => {
      const { status, body } = await httpGet('/plan/spec')
      expect(status).toBe(200)
      expect(body).toBe('OK')
      expect(pinged).toEqual([])
    })

    it('answers 200 even when the callback throws', async () => {
      setPlanSpecCallback(() => {
        throw new Error('boom')
      })
      const { status } = await httpGet('/plan/spec?id=term-1')
      expect(status).toBe(200)
    })
  })

  describe('GET /plan/tickets', () => {
    type Received = { id: string; tickets: unknown[] }
    let received: Received[] = []

    beforeEach(() => {
      received = []
      setPlanTicketsCallback((id, tickets) => received.push({ id, tickets }))
    })

    const encode = (tickets: unknown) => encodeURIComponent(JSON.stringify(tickets))

    it('parses the URI-encoded JSON array the skill sends', async () => {
      // snake_case `parent_key`, and nulls where a field does not apply — the shape
      // documented in skills/magic-plan/references/api.md.
      const wire = [
        { key: '#412', url: 'https://x/412', title: 'The epic', kind: 'epic', parent_key: null },
        { key: '#413', url: 'https://x/413', title: 'A story', kind: 'story', parent_key: '#412' },
      ]
      const { status } = await httpGet(`/plan/tickets?id=term-1&tickets=${encode(wire)}`)
      expect(status).toBe(200)
      expect(received).toEqual([{
        id: 'term-1',
        tickets: [
          { key: '#412', url: 'https://x/412', title: 'The epic', kind: 'epic' },
          { key: '#413', url: 'https://x/413', title: 'A story', kind: 'story', parentKey: '#412' },
        ],
      }])
    })

    it('also accepts a camelCase parentKey, so neither side has to be right', async () => {
      await httpGet(`/plan/tickets?id=term-1&tickets=${encode([
        { key: '#413', url: 'https://x/413', kind: 'story', parentKey: '#412' },
      ])}`)
      expect(received).toEqual([{
        id: 'term-1',
        tickets: [{ key: '#413', url: 'https://x/413', kind: 'story', parentKey: '#412' }],
      }])
    })

    it('drops the entries that are not well formed, and keeps the rest', async () => {
      const { status } = await httpGet(
        `/plan/tickets?id=term-1&tickets=${encode([
          { key: 'PROJ-1', url: 'https://x/1', kind: 'story' },
          { key: 'PROJ-2', url: 'https://x/2', kind: 'chore' },
          { key: '', url: 'https://x/3', kind: 'story' },
          { url: 'https://x/4', kind: 'story' },
          42,
        ])}`,
      )
      expect(status).toBe(200)
      expect(received).toEqual([{ id: 'term-1', tickets: [{ key: 'PROJ-1', url: 'https://x/1', kind: 'story' }] }])
    })

    it('answers 200 on malformed JSON, an empty list, a missing parameter or a sidebar id', async () => {
      expect((await httpGet('/plan/tickets?id=term-1&tickets=not-json')).status).toBe(200)
      expect((await httpGet(`/plan/tickets?id=term-1&tickets=${encode([])}`)).status).toBe(200)
      expect((await httpGet('/plan/tickets?id=term-1')).status).toBe(200)
      expect((await httpGet(`/plan/tickets?id=sidebar-1&tickets=${encode([{ key: 'A', url: 'u', kind: 'story' }])}`)).status).toBe(200)
      expect(received).toEqual([])
    })
  })

  describe('the question routes', () => {
    let received: Array<{ id: string; body: string }> = []
    let cleared: string[] = []

    beforeEach(() => {
      received = []
      cleared = []
      setQuestionCallback((id, body) => received.push({ id, body }))
      setClearQuestionCallback((id) => cleared.push(id))
    })

    it('POST /question forwards the raw hook payload, unparsed', async () => {
      const payload = JSON.stringify({
        hook_event_name: 'PreToolUse',
        tool_name: 'AskUserQuestion',
        tool_input: { questions: [{ question: 'Which one?', options: [{ label: 'A' }] }] },
      })
      const { status } = await httpPost('/question?id=term-1', payload)
      expect(status).toBe(200)
      expect(received).toEqual([{ id: 'term-1', body: payload }])
    })

    // A hook must never stall the agent it reports on, so an unusable body is
    // still a 200 — the callback decides what to do with it.
    it('POST /question answers 200 for a body that is not JSON', async () => {
      const { status } = await httpPost('/question?id=term-1', 'not json at all')
      expect(status).toBe(200)
      expect(received).toEqual([{ id: 'term-1', body: 'not json at all' }])
    })

    it('POST /question answers 200 and skips the callback for an empty body', async () => {
      const { status } = await httpPost('/question?id=term-1', '')
      expect(status).toBe(200)
      expect(received).toHaveLength(0)
    })

    it('POST /question ignores sidebar terminals', async () => {
      const { status } = await httpPost('/question?id=sidebar-1', '{"hook_event_name":"Notification"}')
      expect(status).toBe(200)
      expect(received).toHaveLength(0)
    })

    it('GET /question/clear forwards the terminal id', async () => {
      const { status } = await httpGet('/question/clear?id=term-1')
      expect(status).toBe(200)
      expect(cleared).toEqual(['term-1'])
    })

    it('GET /question/clear ignores sidebar terminals', async () => {
      await httpGet('/question/clear?id=sidebar-1')
      expect(cleared).toHaveLength(0)
    })
  })
})

describe('parsePlanTickets', () => {
  const EPIC = 'https://github.com/o/r/issues/412'
  const STORY = 'https://github.com/o/r/issues/413'

  it('keeps a title and a parent only when they carry something', () => {
    expect(parsePlanTickets(JSON.stringify([
      { key: 'A', url: EPIC, kind: 'epic', title: '', parent_key: '' },
      { key: 'B', url: STORY, kind: 'story', title: null, parent_key: null },
    ]))).toEqual([
      { key: 'A', url: EPIC, kind: 'epic' },
      { key: 'B', url: STORY, kind: 'story' },
    ])
  })

  it('returns nothing for a payload that is not an array', () => {
    expect(parsePlanTickets('{"key":"A"}')).toEqual([])
  })

  it('drops a ticket whose url is not an http(s) link', () => {
    // This value is stored verbatim and later becomes an `href` on a page other
    // members of the organization open, so a scheme that executes instead of
    // navigating is refused at ingest — not left for the renderer to catch.
    expect(parsePlanTickets(JSON.stringify([
      { key: 'A', url: 'javascript:alert(1)', kind: 'epic' },
      { key: 'B', url: 'data:text/html,<script>alert(1)</script>', kind: 'story' },
      { key: 'C', url: 'file:///etc/passwd', kind: 'story' },
      { key: 'D', url: '/browse/PROJ-1', kind: 'story' },
      { key: 'E', url: '', kind: 'story' },
      { key: 'F', url: EPIC, kind: 'epic' },
    ]))).toEqual([{ key: 'F', url: EPIC, kind: 'epic' }])
  })

  it('is not fooled by case or leading whitespace in the scheme', () => {
    expect(parsePlanTickets(JSON.stringify([
      { key: 'A', url: ' JavaScript:alert(1)', kind: 'story' },
    ]))).toEqual([])
  })
})
