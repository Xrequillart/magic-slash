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

import { mcpServerStatus, allMcpServerStatuses, ensureMcpServers, MCP_DEFINITIONS } from './mcp'
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
