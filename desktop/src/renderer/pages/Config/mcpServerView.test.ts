import { describe, it, expect } from 'vitest'
import type { McpServerHealth, McpServerState, McpServerStatus } from '../../../types'
import { mcpServerView } from './mcpServerView'

const status = (state: McpServerStatus['state']): McpServerStatus => ({ id: 'slack', state, url: state === 'missing' ? null : 'https://mcp.slack.com/mcp' })
const health = (state: McpServerHealth['state'], source: McpServerHealth['source'] = 'claude-code', detail?: string): McpServerHealth =>
  ({ name: source === 'claude-ai' ? 'claude.ai Slack' : 'slack', source, target: 'https://mcp.slack.com/mcp', state, ...(detail ? { detail } : {}) })
const view = (s: McpServerStatus['state'], h: McpServerHealth | null = null) => mcpServerView({ id: 'slack', required: false, status: status(s), health: h } as McpServerState)

describe('mcpServerView', () => {
  it('offers Install when nothing serves it, and nothing more before a check', () => {
    expect(view('missing')).toEqual({ state: 'missing', action: 'install' })
    expect(view('configured')).toEqual({ state: 'installed', action: 'remove' })
  })

  it('offers nothing over a connected claude.ai connector', () => {
    expect(view('missing', health('connected', 'claude-ai'))).toEqual({ state: 'connected-claude-ai', action: null })
  })

  it('says a server of its own is connected, or still to sign in to', () => {
    expect(view('configured', health('connected'))).toEqual({ state: 'connected', action: 'remove' })
    expect(view('configured', health('needs-auth'))).toEqual({ state: 'needs-auth', action: 'remove' })
  })

  it('still offers Install over a claude.ai connector that is not signed in', () => {
    expect(view('missing', health('needs-auth', 'claude-ai'))).toEqual({ state: 'needs-auth', action: 'install', claudeAi: true })
  })

  it('carries a failure reason, and offers Reinstall over an entry of the user', () => {
    expect(view('configured', health('failed', 'claude-code', 'HTTP 406'))).toEqual({ state: 'failed', action: 'remove', detail: 'HTTP 406' })
    expect(view('legacy')).toEqual({ state: 'legacy', action: 'reinstall' })
  })

  it('never offers Remove on a server the skills need, but still Install and Reinstall', () => {
    const github = (s: McpServerStatus['state'], h: McpServerHealth | null = null) =>
      mcpServerView({ id: 'github', required: true, status: { id: 'github', state: s, url: null }, health: h })
    expect(github('configured')).toEqual({ state: 'installed', action: null })
    expect(github('configured', health('connected'))).toEqual({ state: 'connected', action: null })
    expect(github('configured', health('needs-auth'))).toEqual({ state: 'needs-auth', action: null })
    expect(github('missing')).toEqual({ state: 'missing', action: 'install' })
    expect(github('legacy')).toEqual({ state: 'legacy', action: 'reinstall' })
  })
})
