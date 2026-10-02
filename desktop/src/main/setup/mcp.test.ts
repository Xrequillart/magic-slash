import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// mcpServerStatus reads ~/.claude.json, resolved at import time — so the homedir mock
// is hoisted, same as claude-hooks-config.test.ts.
const { TMP_HOME } = vi.hoisted(() => ({
  TMP_HOME: `${process.env.TMPDIR ?? '/tmp'}/magic-slash-mcp-test-${process.pid}`,
}))

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, default: { ...actual, homedir: () => TMP_HOME }, homedir: () => TMP_HOME }
})

// No test here may shell out: provisionMcpServer runs `claude mcp add`, and a suite
// that mutated the developer's own MCP registry would be a very unpleasant surprise.
vi.mock('./shell-exec', () => ({
  runInLoginShell: vi.fn(async () => ({ ok: true, stdout: '', stderr: '' })),
  runInLoginShellSync: vi.fn(() => ({ ok: true, stdout: '', stderr: '' })),
  which: vi.fn(async () => '/usr/local/bin/claude'),
  resolveShell: () => '/bin/sh',
}))

import { mcpServerStatus, allMcpServerStatuses, ensureMcpServers, MCP_DEFINITIONS, checkMcpHealth, healthFor, lastMcpHealth, mcpServerStates, parseMcpList, provisionMcpServer } from './mcp'
import { runInLoginShell, which } from './shell-exec'

const CLAUDE_JSON = path.join(TMP_HOME, '.claude.json')
const GITHUB_URL = MCP_DEFINITIONS.find((d) => d.id === 'github')!.url
const ATLASSIAN_URL = MCP_DEFINITIONS.find((d) => d.id === 'atlassian')!.url

function writeClaudeJson(content: unknown): void {
  fs.mkdirSync(TMP_HOME, { recursive: true })
  fs.writeFileSync(CLAUDE_JSON, typeof content === 'string' ? content : JSON.stringify(content))
}

beforeEach(() => {
  fs.rmSync(TMP_HOME, { recursive: true, force: true })
  fs.mkdirSync(TMP_HOME, { recursive: true })
  vi.mocked(runInLoginShell).mockClear()
  vi.mocked(which).mockResolvedValue('/usr/local/bin/claude')
})

afterAll(() => {
  fs.rmSync(TMP_HOME, { recursive: true, force: true })
})

describe('mcpServerStatus', () => {
  it('reports missing when there is no ~/.claude.json at all', () => {
    expect(mcpServerStatus('github')).toEqual({ id: 'github', state: 'missing', url: null })
  })

  it('reports missing when the file exists but has no such server', () => {
    writeClaudeJson({ mcpServers: { atlassian: { type: 'http', url: ATLASSIAN_URL } } })
    expect(mcpServerStatus('github').state).toBe('missing')
    expect(mcpServerStatus('atlassian').state).toBe('configured')
  })

  it('reports configured only at the URL this version provisions', () => {
    writeClaudeJson({ mcpServers: { github: { type: 'http', url: GITHUB_URL } } })
    expect(mcpServerStatus('github')).toEqual({ id: 'github', state: 'configured', url: GITHUB_URL })
  })

  it('reports the deprecated stdio GitHub server as legacy, not as configured', () => {
    // What every machine installed by install.sh looks like. Calling this
    // `configured` would leave the PAT-based server in place forever; calling it
    // `missing` would silently replace a working setup. It is neither.
    writeClaudeJson({
      mcpServers: {
        github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] },
      },
    })
    const status = mcpServerStatus('github')
    expect(status.state).toBe('legacy')
    expect(status.command).toBe('npx')
    expect(status.url).toBeNull()
  })

  it('reports a user-chosen URL as legacy rather than overwriting it', () => {
    writeClaudeJson({ mcpServers: { github: { type: 'http', url: 'https://github.example.com/mcp' } } })
    expect(mcpServerStatus('github')).toMatchObject({ state: 'legacy', url: 'https://github.example.com/mcp' })
  })

  it('treats a malformed ~/.claude.json as nothing configured', () => {
    writeClaudeJson('{ this is not json')
    expect(allMcpServerStatuses().every((s) => s.state === 'missing')).toBe(true)
  })
})

describe('ensureMcpServers', () => {
  it('provisions both servers on a fresh machine', async () => {
    const { provisioned, errors } = await ensureMcpServers({ github: true, atlassian: true })
    expect(provisioned).toEqual(['atlassian', 'github'])
    expect(errors).toEqual([])
    const commands = vi.mocked(runInLoginShell).mock.calls.map(([cmd]) => cmd)
    expect(commands).toContain(`claude mcp add atlassian --scope user --transport http ${ATLASSIAN_URL}`)
    expect(commands).toContain(`claude mcp add github --scope user --transport http ${GITHUB_URL}`)
  })

  it('skips Atlassian when the integration is off', async () => {
    const { provisioned } = await ensureMcpServers({ github: true, atlassian: false })
    expect(provisioned).toEqual(['github'])
    const commands = vi.mocked(runInLoginShell).mock.calls.map(([cmd]) => cmd)
    expect(commands.some((c) => c.includes('atlassian'))).toBe(false)
  })

  it('writes nothing on a machine that is already configured', async () => {
    // The common case, at every launch. It has to cost zero writes, or the app would
    // be re-registering servers behind the user's back forever.
    writeClaudeJson({
      mcpServers: {
        atlassian: { type: 'http', url: ATLASSIAN_URL },
        github: { type: 'http', url: GITHUB_URL },
      },
    })
    const { provisioned, errors } = await ensureMcpServers({ github: true, atlassian: true })
    expect(provisioned).toEqual([])
    expect(errors).toEqual([])
    expect(runInLoginShell).not.toHaveBeenCalled()
  })

  it('leaves a legacy server alone', async () => {
    // The migration is the user's call — see the note at the top of mcp.ts.
    writeClaudeJson({ mcpServers: { github: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] } } })
    const { provisioned } = await ensureMcpServers({ github: true, atlassian: false })
    expect(provisioned).toEqual([])
    expect(runInLoginShell).not.toHaveBeenCalled()
  })

  it('gives up quietly when the claude CLI is absent', async () => {
    // The prerequisites check already reports this; one error per server on top of it
    // would be noise, and there is nothing the user could do differently.
    vi.mocked(which).mockResolvedValue(null)
    const { provisioned, errors } = await ensureMcpServers({ github: true, atlassian: true })
    expect(provisioned).toEqual([])
    expect(errors).toEqual([])
  })
})


// Lines as Claude Code 2.x prints them, copied from a real `claude mcp list` (2026-10-02).
const MCP_LIST = [
  'Checking MCP server health…',
  '',
  'claude.ai Claude Docs: https://api.anthropic.com/v1/pages/mcp - ✔ Connected',
  'claude.ai Atlassian MCP: https://mcp.atlassian.com/v2/mcp - ! Needs authentication',
  'claude.ai Snowflake: https://pt66918.eu-west-3.aws.snowflakecomputing.com - ✘ Failed to connect — HTTP 406: Error POSTing to endpoint',
  'claude.ai Slack: https://mcp.slack.com/mcp - ✔ Connected',
  'strava-mcp: https://mcp.strava.com/mcp (HTTP) - ✔ Connected',
  'atlassian: https://mcp.atlassian.com/v1/mcp (HTTP) - ✔ Connected',
  'github: https://api.githubcopilot.com/mcp/ (HTTP) - ✘ Failed to connect — Incompatible auth server: does not support dynamic client registration',
  'slack: https://mcp.slack.com/mcp (HTTP) - ! Needs authentication',
  'local: npx -y some-server --flag - x (stdio) - ✔ Connected',
].join('\n')

describe('parseMcpList', () => {
  const servers = parseMcpList(MCP_LIST)

  it('reads every server line and nothing else', () => {
    expect(servers.map((s) => s.name)).toEqual([
      'claude.ai Claude Docs', 'claude.ai Atlassian MCP', 'claude.ai Snowflake', 'claude.ai Slack', 'strava-mcp', 'atlassian', 'github', 'slack', 'local',
    ])
  })

  it('tells a claude.ai connector from a server of this machine, and drops the transport', () => {
    expect(servers.find((s) => s.name === 'claude.ai Slack')).toEqual({ name: 'claude.ai Slack', source: 'claude-ai', target: 'https://mcp.slack.com/mcp', state: 'connected' })
    expect(servers.find((s) => s.name === 'atlassian')).toEqual({ name: 'atlassian', source: 'claude-code', target: 'https://mcp.atlassian.com/v1/mcp', state: 'connected' })
  })

  it('reads a sign-in still to do and a failure with its reason', () => {
    expect(servers.find((s) => s.name === 'slack')).toMatchObject({ state: 'needs-auth' })
    expect(servers.find((s) => s.name === 'github')).toMatchObject({
      state: 'failed', detail: 'Incompatible auth server: does not support dynamic client registration',
    })
  })

  it('keeps a stdio command whole, dashes included', () => {
    expect(servers.find((s) => s.name === 'local')).toMatchObject({ target: 'npx -y some-server --flag - x', state: 'connected' })
  })
})

describe('healthFor', () => {
  const report = (lines: string) => ({ checkedAt: 0, ok: true, servers: parseMcpList(lines) })

  it('prefers the server registered under the id', () => {
    expect(healthFor('slack', report(MCP_LIST))).toMatchObject({ name: 'slack', state: 'needs-auth' })
  })

  it('falls back on a claude.ai connector to the same service', () => {
    const lines = MCP_LIST.split('\n').filter((line) => !line.startsWith('slack:')).join('\n')
    expect(healthFor('slack', report(lines))).toMatchObject({ name: 'claude.ai Slack', source: 'claude-ai', state: 'connected' })
  })

  it('is null before any check, and when nothing serves it', () => {
    expect(healthFor('slack', null)).toBeNull()
    expect(healthFor('slack', report('atlassian: https://mcp.atlassian.com/v1/mcp (HTTP) - ✔ Connected'))).toBeNull()
  })
})

describe('slack, the optional server', () => {
  it('is never provisioned at launch', async () => {
    await ensureMcpServers({ github: true, atlassian: true })
    const commands = vi.mocked(runInLoginShell).mock.calls.map(([command]) => command)
    expect(commands.some((command) => command.includes('slack'))).toBe(false)
    expect(allMcpServerStatuses().map((s) => s.id)).not.toContain('slack')
  })

  it('is added with the client Slack signs in, since it has no dynamic registration', async () => {
    await provisionMcpServer('slack')
    expect(vi.mocked(runInLoginShell).mock.calls.map(([command]) => command)).toContain(
      'claude mcp add slack --scope user --transport http --client-id 1601185624273.8899143856786 --callback-port 3118 https://mcp.slack.com/mcp',
    )
  })

  it('reads as configured at its URL, whatever its oauth block', () => {
    writeClaudeJson({ mcpServers: { slack: { type: 'http', url: 'https://mcp.slack.com/mcp', oauth: { clientId: 'x', callbackPort: 3118 } } } })
    expect(mcpServerStates({ atlassian: false, github: false }, null)).toEqual([{ id: 'slack', required: false, status: { id: 'slack', state: 'configured', url: 'https://mcp.slack.com/mcp' }, health: null }])
  })

  it('keeps the last check for the next read', async () => {
    vi.mocked(runInLoginShell).mockResolvedValueOnce({ ok: true, stdout: MCP_LIST, stderr: '' })
    const report = await checkMcpHealth()
    expect(lastMcpHealth()).toBe(report)
    expect(mcpServerStates({ atlassian: false, github: false })[0].health).toMatchObject({ name: 'slack', state: 'needs-auth' })
  })

  it('lists the servers of the enabled integrations first, then the optional ones', () => {
    expect(mcpServerStates(undefined, null).map((s) => [s.id, s.required])).toEqual([['atlassian', true], ['github', true], ['slack', false]])
    expect(mcpServerStates({ atlassian: false }, null).map((s) => s.id)).toEqual(['github', 'slack'])
  })

  it('reports a check that could not run', async () => {
    vi.mocked(which).mockResolvedValueOnce(null)
    expect(await checkMcpHealth()).toMatchObject({ ok: false, servers: [] })
  })
})
