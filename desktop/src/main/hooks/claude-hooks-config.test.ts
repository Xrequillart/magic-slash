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
/** The UserPromptSubmit entry that spools a start; the other one only pings status. */
const promptSkillHooks = (): Hook[] =>
  (readSettings().hooks.UserPromptSubmit as Hook[]).filter((h) =>
    h.hooks!.some((x) => x.command!.includes('pending-skills.ndjson')),
  )

/** Run a generated hook the way Claude Code does: payload on stdin. */
function run(command: string, payload: string, terminalId: string): void {
  execFileSync('/bin/sh', ['-c', command], {
    input: payload,
    env: { ...process.env, HOME: TMP_HOME, MAGIC_SLASH_TERMINAL_ID: terminalId },
  })
}

function fireHook(payload: string, terminalId = 'claude-1'): void {
  run(skillHooks()[0].hooks![0].command!, payload, terminalId)
}

/** Fire the UserPromptSubmit hook with the text the user submitted. */
function firePrompt(prompt: string, terminalId = 'claude-1'): void {
  run(promptSkillHooks()[0].hooks![0].command!, JSON.stringify({
    hook_event_name: 'UserPromptSubmit',
    prompt,
  }), terminalId)
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
      {
        type: 'start',
        skill: 'magic-commit',
        agentId: 'claude-1',
        occurredAt: expect.any(Number),
        // Tagged so the drain can tell it apart from the same run seen by the
        // UserPromptSubmit hook — see usage/skill-spool.ts.
        source: 'tool',
      },
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

/**
 * Typing `/magic-commit` never reaches a tool call: Claude Code expands the command
 * itself and hands the model the instructions. The Skill-scoped PreToolUse hook above
 * therefore cannot see it, and every run started the documented way went uncounted.
 */
describe('the typed slash-command hook', () => {
  it('is installed once, on UserPromptSubmit', () => {
    configureClaudeHooks()
    expect(promptSkillHooks()).toHaveLength(1)
  })

  it('stays a single entry across repeated configuration', () => {
    configureClaudeHooks()
    configureClaudeHooks()
    expect(promptSkillHooks()).toHaveLength(1)
  })

  it('leaves the status ping on UserPromptSubmit alone', () => {
    // Two entries share the event: this one spools, the original reports "working".
    configureClaudeHooks()
    const commands = (readSettings().hooks.UserPromptSubmit as Hook[])
      .flatMap((h) => h.hooks!.map((x) => x.command!))
    expect(commands.some((c) => c.includes('state=working'))).toBe(true)
  })

  it('records a skill the user typed as a slash command', () => {
    configureClaudeHooks()
    firePrompt('/magic-start PROJ-123')

    expect(spooled()).toEqual([
      {
        type: 'start',
        skill: 'magic-start',
        agentId: 'claude-1',
        occurredAt: expect.any(Number),
        source: 'prompt',
      },
    ])
  })

  it('accepts the documented colon spelling', () => {
    // The README and the whole product say `/magic:start`; the skill is `magic-start`.
    configureClaudeHooks()
    firePrompt('/magic:start')
    expect(spooled()[0]).toMatchObject({ skill: 'magic-start' })
  })

  it('folds the plugin prefix, as the rollups do', () => {
    configureClaudeHooks()
    firePrompt('/magic-slash:magic-pr')
    expect(spooled()[0]).toMatchObject({ skill: 'magic-pr' })
  })

  it('records a run typed outside the app, without an agent', () => {
    configureClaudeHooks()
    firePrompt('/magic-commit', '')
    expect(spooled()[0]).toMatchObject({ skill: 'magic-commit', agentId: '' })
  })

  it('ignores a prompt that only mentions a skill', () => {
    // Discussing `/magic-start` is not running it. The command has to open the prompt.
    configureClaudeHooks()
    firePrompt('remind me what /magic-start does')
    expect(spooled()).toEqual([])
  })

  // Same privacy rule as the tool hook: a prompt is the user's own words, and only
  // the magic commands are ever written to disk.
  it('writes nothing for a command that is not ours', () => {
    configureClaudeHooks()
    firePrompt('/clear')
    firePrompt('/acme:deploy-prod')
    firePrompt('/black-magic')
    expect(spooled()).toEqual([])
  })

  it('writes nothing for an ordinary message', () => {
    configureClaudeHooks()
    firePrompt('commit my changes please')
    expect(spooled()).toEqual([])
  })

  it('survives a payload it cannot parse', () => {
    configureClaudeHooks()
    const command = promptSkillHooks()[0].hooks![0].command!
    expect(() => run(command, 'not json at all', 'claude-1')).not.toThrow()
    expect(() => run(command, '{"prompt":null}', 'claude-1')).not.toThrow()
    expect(spooled()).toEqual([])
  })
})
