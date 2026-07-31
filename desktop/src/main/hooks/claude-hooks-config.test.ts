import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { execFileSync } from 'child_process'

// configureClaudeHooks resolves ~/.claude at import time, so the mock is hoisted and
// the path computed without touching the filesystem.
const { TMP_HOME } = vi.hoisted(() => ({
  TMP_HOME: `${process.env.TMPDIR ?? '/tmp'}/magic-slash-hooks-test-${process.pid}`,
}))

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, default: { ...actual, homedir: () => TMP_HOME }, homedir: () => TMP_HOME }
})

import { configureClaudeHooks } from './claude-hooks-config'

const SETTINGS = path.join(TMP_HOME, '.claude', 'settings.json')
const SPOOL = path.join(TMP_HOME, '.config', 'magic-slash', 'pending-skills.ndjson')

interface Hook { matcher?: string; hooks?: { command?: string }[] }

const readSettings = () => JSON.parse(fs.readFileSync(SETTINGS, 'utf-8'))
const skillHooks = (): Hook[] =>
  (readSettings().hooks.PreToolUse as Hook[]).filter((h) => h.matcher === 'Skill')

/** Run the generated hook the way Claude Code does: payload on stdin. */
function fireHook(payload: string, terminalId = 'claude-1'): void {
  const command = skillHooks()[0].hooks![0].command!
  execFileSync('/bin/sh', ['-c', command], {
    input: payload,
    env: { ...process.env, HOME: TMP_HOME, MAGIC_SLASH_TERMINAL_ID: terminalId },
  })
}

const spooled = (): Record<string, unknown>[] =>
  fs.existsSync(SPOOL)
    ? fs.readFileSync(SPOOL, 'utf-8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l))
    : []

afterAll(() => fs.rmSync(TMP_HOME, { recursive: true, force: true }))

beforeEach(() => {
  fs.rmSync(TMP_HOME, { recursive: true, force: true })
  fs.mkdirSync(TMP_HOME, { recursive: true })
})

describe('the skill telemetry hook', () => {
  it('is installed once, scoped to the Skill tool', () => {
    configureClaudeHooks()
    // PreToolUse fires on EVERY tool call; an unscoped matcher would spawn jq that
    // often for nothing.
    expect(skillHooks()).toHaveLength(1)
  })

  it('stays a single entry across repeated configuration', () => {
    configureClaudeHooks()
    configureClaudeHooks()
    configureClaudeHooks()
    expect(skillHooks()).toHaveLength(1)
  })

  it('preserves hooks the user configured themselves', () => {
    fs.mkdirSync(path.join(TMP_HOME, '.claude'), { recursive: true })
    fs.writeFileSync(SETTINGS, JSON.stringify({
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'mine.sh' }] }] },
    }))

    configureClaudeHooks()

    const commands = (readSettings().hooks.PreToolUse as Hook[]).flatMap((h) => h.hooks!.map((x) => x.command))
    expect(commands).toContain('mine.sh')
  })

  // The hook writes to a file rather than POSTing to the status server. The server
  // only exists while the app is open, so every run made with the app closed used to
  // be dropped — which the dashboards then showed as nobody using the product.
  it('records a run with no app listening', () => {
    configureClaudeHooks()
    fireHook('{"hook_event_name":"PreToolUse","tool_name":"Skill","tool_input":{"skill":"magic-commit"}}')

    expect(spooled()).toEqual([
      { type: 'start', skill: 'magic-commit', agentId: 'claude-1', occurredAt: expect.any(Number) },
    ])
  })

  it('records a run started outside the app, without an agent', () => {
    configureClaudeHooks()
    fireHook('{"tool_input":{"skill":"magic-start"}}', '')
    expect(spooled()[0]).toMatchObject({ skill: 'magic-start', agentId: '' })
  })

  it('recognises a plugin-prefixed skill as ours', () => {
    configureClaudeHooks()
    fireHook('{"tool_input":{"skill":"magic-slash:magic-pr"}}')
    // The prefix is folded to TEST the name, but kept in the record: the rollup RPCs
    // fold it again on read, and both install methods must count as one skill.
    expect(spooled()[0]).toMatchObject({ skill: 'magic-slash:magic-pr' })
  })

  // Not a tidiness rule. Unfiltered, this file would hold the names of every skill
  // the user runs — their own, their employer's private ones — in plain text, for a
  // product that only ever displays the magic ones.
  it('writes nothing at all for a skill that is not ours', () => {
    configureClaudeHooks()
    fireHook('{"tool_input":{"skill":"dataviz"}}')
    fireHook('{"tool_input":{"skill":"acme-corp:deploy-prod"}}')
    fireHook('{"tool_input":{"skill":"black-magic"}}')
    expect(spooled()).toEqual([])
  })

  it('survives a payload it cannot parse', () => {
    configureClaudeHooks()
    expect(() => fireHook('not json at all')).not.toThrow()
    expect(spooled()).toEqual([])
  })

  it('escapes a skill name containing a quote', () => {
    configureClaudeHooks()
    fireHook('{"tool_input":{"skill":"magic-x\\"y"}}')
    expect(spooled()[0]).toMatchObject({ skill: 'magic-x"y' })
  })
})
