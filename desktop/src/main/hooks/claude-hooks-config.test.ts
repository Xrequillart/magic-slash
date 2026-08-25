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

import { configureClaudeHooks, configureStatusLine, removeClaudeHooks } from './claude-hooks-config'

const SETTINGS = path.join(TMP_HOME, '.claude', 'settings.json')
const SPOOL = path.join(TMP_HOME, '.config', 'magic-slash', 'pending-skills.ndjson')
const STATUSLINE_BACKUP = path.join(TMP_HOME, '.config', 'magic-slash', 'statusline-original.json')

interface Hook { matcher?: string; hooks?: { command?: string }[] }

const readSettings = () => JSON.parse(fs.readFileSync(SETTINGS, 'utf-8'))
const skillHooks = (): Hook[] =>
  (readSettings().hooks.PreToolUse as Hook[]).filter((h) => h.matcher === 'Skill')
/** The UserPromptSubmit entry that spools a start; the other one only pings status. */
const promptSkillHooks = (): Hook[] =>
  (readSettings().hooks.UserPromptSubmit as Hook[]).filter((h) =>
    h.hooks!.some((x) => x.command!.includes('pending-skills.ndjson')),
  )

/**
 * Run a generated hook the way Claude Code does: payload on stdin.
 *
 * stdin is a real file rather than a pipe: a hook whose guard short-circuits exits
 * without ever reading it, and a pipe would then race the parent's write into EPIPE
 * — a failure of the harness, not of the hook, which exited 0 as intended.
 */
function run(command: string, payload: string, terminalId: string): void {
  const stdinFile = path.join(TMP_HOME, 'hook-stdin')
  fs.writeFileSync(stdinFile, payload)
  const stdin = fs.openSync(stdinFile, 'r')
  try {
    execFileSync('/bin/sh', ['-c', command], {
      stdio: [stdin, 'pipe', 'pipe'],
      env: { ...process.env, HOME: TMP_HOME, MAGIC_SLASH_TERMINAL_ID: terminalId },
    })
  } finally {
    fs.closeSync(stdin)
  }
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

/**
 * The permission allowlist. This is what the install script's section 4b used to
 * write, and the reason it moved here is that a script cannot re-decide it later —
 * a user who switches to GitHub-only kept their Jira grants forever.
 */
describe('the permission allowlist', () => {
  const allow = (): string[] => readSettings().permissions.allow

  it('grants the skills read access to their own reference files and config', () => {
    // Without these, EVERY skill stops on a permission prompt at its first step: they
    // all read their messages/glossary files and the Magic Slash config.
    configureClaudeHooks()
    expect(allow()).toContain(`Read(${path.join(TMP_HOME, '.claude', 'skills', 'magic-*')})`)
    expect(allow()).toContain(`Read(${path.join(TMP_HOME, '.config', 'magic-slash', '*')})`)
  })

  it('grants the Jira tools when Atlassian is on', () => {
    configureClaudeHooks({ atlassian: true })
    expect(allow()).toContain('mcp__atlassian__getJiraIssue')
  })

  it("grants the dependency gate's two lookup tools", () => {
    // These were added to install.sh by the ticket-dependency work and reached the app
    // only when that branch was merged into the one that deleted the script. Nothing
    // would have failed loudly: /magic:start would just stop on a permission prompt
    // mid-gate, on someone else's machine. Named here so the app's allowlist is what
    // keeps them, now that it is the only thing that writes one.
    configureClaudeHooks({ atlassian: true })
    expect(allow()).toContain('mcp__atlassian__getIssueLinkTypes')
    expect(allow()).toContain('mcp__atlassian__searchJiraIssuesUsingJql')
  })

  it('withdraws the Jira tools when Atlassian is off', () => {
    configureClaudeHooks({ atlassian: true })
    configureClaudeHooks({ atlassian: false })
    expect(allow().some((p) => p.startsWith('mcp__atlassian__'))).toBe(false)
    // The rest of the allowlist survives the switch.
    expect(allow()).toContain('mcp__github__create_pull_request')
  })

  it('grants Atlassian on a first install, where nothing has been decided', () => {
    // Matches the config normalizer, which defaults integrations to Atlassian on.
    configureClaudeHooks()
    expect(allow()).toContain('mcp__atlassian__getJiraIssue')
  })

  it('does not re-grant Jira tools the user turned off, when called without a choice', () => {
    // The launch-path call runs BEFORE cloud hydration, so it passes no option. If it
    // fell back to the default it would silently undo a GitHub-only setup at every
    // single launch — the bug this signature exists to prevent.
    configureClaudeHooks({ atlassian: false })
    configureClaudeHooks()
    expect(allow().some((p) => p.startsWith('mcp__atlassian__'))).toBe(false)
  })

  it('leaves permissions the user granted themselves alone', () => {
    fs.mkdirSync(path.join(TMP_HOME, '.claude'), { recursive: true })
    fs.writeFileSync(SETTINGS, JSON.stringify({ permissions: { allow: ['Bash(terraform *)'] } }))
    configureClaudeHooks()
    expect(allow()).toContain('Bash(terraform *)')
  })

  it('does not duplicate its own entries across repeated configuration', () => {
    configureClaudeHooks()
    configureClaudeHooks()
    configureClaudeHooks()
    expect(new Set(allow()).size).toBe(allow().length)
  })
})

/**
 * The hooks that put an agent's pending question in the menu bar panel.
 *
 * Two of them capture (the AskUserQuestion tool call, and the Notification a
 * permission prompt raises) and three clear. All five are ADDITIONAL entries on
 * events that already carry the state-reporting hook, which is what most of these
 * tests are actually guarding.
 */
describe('the pending-question hooks', () => {
  const hooksFor = (event: string): Hook[] => (readSettings().hooks[event] as Hook[]) ?? []
  const matching = (event: string, fragment: string): Hook[] =>
    hooksFor(event).filter((h) => h.hooks!.some((x) => x.command!.includes(fragment)))
  const captures = (event: string) => matching(event, '/question?id=')
  const clears = (event: string) => matching(event, '/question/clear?id=')

  it('captures the AskUserQuestion tool call, scoped by matcher', () => {
    configureClaudeHooks()
    const hooks = captures('PreToolUse')
    expect(hooks).toHaveLength(1)
    // Unscoped, this would POST the payload of every single tool call.
    expect(hooks[0].matcher).toBe('AskUserQuestion')
  })

  it('captures Notification, which has no tool to match on', () => {
    configureClaudeHooks()
    const hooks = captures('Notification')
    expect(hooks).toHaveLength(1)
    expect(hooks[0].matcher).toBeUndefined()
  })

  it('POSTs the hook stdin as the request body', () => {
    configureClaudeHooks()
    const command = captures('Notification')[0].hooks![0].command!
    expect(command).toContain('-X POST')
    expect(command).toContain('--data-binary @-')
    // A blocked agent is waiting on this hook: it must not be able to hang.
    expect(command).toContain('--max-time 2')
  })

  it('clears on the question\'s own PostToolUse, a new prompt, and the end of the turn', () => {
    configureClaudeHooks()
    expect(clears('PostToolUse')).toHaveLength(1)
    expect(clears('PostToolUse')[0].matcher).toBe('AskUserQuestion')
    expect(clears('UserPromptSubmit')).toHaveLength(1)
    expect(clears('Stop')).toHaveLength(1)
  })

  // The clear is bound to events precisely so it never has to be bound to state:
  // the generic PreToolUse hook reports `working` at the same instant the capture
  // fires, so a state-driven clear would erase the question it just received.
  it('never clears on PreToolUse, whatever the matcher', () => {
    configureClaudeHooks()
    expect(clears('PreToolUse')).toHaveLength(0)
  })

  it('leaves the state reporting on every event it shares alone', () => {
    configureClaudeHooks()
    for (const [event, state] of [
      ['PreToolUse', 'working'],
      ['Notification', 'waiting'],
      ['PostToolUse', 'working'],
      ['UserPromptSubmit', 'working'],
      ['Stop', 'completed'],
    ]) {
      const commands = hooksFor(event).flatMap((h) => h.hooks!.map((x) => x.command!))
      expect(commands.some((c) => c.includes(`state=${state}`))).toBe(true)
    }
  })

  it('stays one entry per event across repeated configuration', () => {
    configureClaudeHooks()
    configureClaudeHooks()
    configureClaudeHooks()
    expect(captures('PreToolUse')).toHaveLength(1)
    expect(captures('Notification')).toHaveLength(1)
    expect(clears('PostToolUse')).toHaveLength(1)
    expect(clears('UserPromptSubmit')).toHaveLength(1)
    expect(clears('Stop')).toHaveLength(1)
  })

  it('is a silent no-op when the app is not listening', () => {
    // No MAGIC_SLASH_PORT: the guard short-circuits and the hook exits 0, so a
    // closed app can never make an agent's question hook fail.
    configureClaudeHooks()
    const command = captures('Notification')[0].hooks![0].command!
    expect(() => run(command, '{"hook_event_name":"Notification","message":"x"}', 'claude-1')).not.toThrow()
  })

  it('is removed by removeClaudeHooks, along with every other Magic Slash hook', () => {
    fs.mkdirSync(path.join(TMP_HOME, '.claude'), { recursive: true })
    fs.writeFileSync(SETTINGS, JSON.stringify({
      hooks: { Stop: [{ hooks: [{ type: 'command', command: 'mine.sh' }] }] },
    }))

    configureClaudeHooks()
    removeClaudeHooks()

    const settings = readSettings()
    const remaining = Object.values(settings.hooks ?? {})
      .flatMap((entries) => (entries as Hook[]).flatMap((h) => h.hooks!.map((x) => x.command!)))
    expect(remaining.some((c) => c.includes('magic-slash-desktop'))).toBe(false)
    expect(remaining.some((c) => c.includes('/question'))).toBe(false)
    // The user's own hook is untouched — the filter is by marker, not by event.
    expect(remaining).toContain('mine.sh')
  })
})

describe('the statusline', () => {
  const STATUSLINE_PAYLOAD = JSON.stringify({
    workspace: { current_dir: '/Users/someone/code/magic-slash' },
    model: { display_name: 'Opus 5' },
    context_window: { used_percentage: 12 },
    cost: { total_cost_usd: 0.42 },
  })

  /**
   * Render the configured statusLine the way Claude Code does — payload on stdin —
   * and return what the terminal would show, colours stripped.
   *
   * MAGIC_SLASH_PORT is left unset so the wrapper's capture branch short-circuits
   * instead of curling a server no test is running, and the two gateway variables are
   * cleared because the machine running the suite may have them set.
   */
  function render(): string {
    const command = (readSettings() as { statusLine: { command: string } }).statusLine.command
    const out = execFileSync('/bin/sh', ['-c', command], {
      input: STATUSLINE_PAYLOAD,
      env: {
        ...process.env,
        HOME: TMP_HOME,
        MAGIC_SLASH_PORT: '',
        MAGIC_SLASH_TERMINAL_ID: '',
        MAGIC_SLASH_INNER_STATUSLINE: '',
        CLAUDE_CODE_USE_BEDROCK: '',
        CLAUDE_CODE_USE_VERTEX: '',
        ANTHROPIC_API_KEY: '',
      },
    })
    return out.toString('utf-8').replace(/\x1b\[[0-9;]*m/g, '')
  }

  /** Claude Code stores the account's plan here; the auth segment reads it. */
  function withAccount(organizationType: string): void {
    fs.writeFileSync(path.join(TMP_HOME, '.claude.json'), JSON.stringify({ oauthAccount: { organizationType } }))
  }

  it('shows the directory, the model and how the session authenticates', () => {
    withAccount('claude_max')
    configureStatusLine()

    expect(render()).toBe(' pwd:magic-slash   Opus 5   auth:Max ')
  })

  // The wrapper is installed for the usage card, whose only data source is this
  // payload. Relaying nothing left anyone without a statusline of their own looking
  // at an empty one, which reads as the app having broken it.
  it('renders ours when the user has none of their own', () => {
    configureStatusLine()

    expect(readSettings().statusLine.command).toContain('magic-slash/statusline.sh')
    expect(fs.readFileSync(STATUSLINE_BACKUP, 'utf-8')).toBe('null')
    expect(render()).toContain('pwd:magic-slash')
  })

  it('relays the user\'s own statusline instead of ours, and backs it up', () => {
    fs.mkdirSync(path.join(TMP_HOME, '.claude'), { recursive: true })
    fs.writeFileSync(SETTINGS, JSON.stringify({
      statusLine: { type: 'command', command: 'printf mine' },
    }))

    configureStatusLine()

    expect(render()).toBe('mine')
    expect(JSON.parse(fs.readFileSync(STATUSLINE_BACKUP, 'utf-8'))).toEqual({ type: 'command', command: 'printf mine' })
  })

  it('keeps rendering the same thing across repeated launches', () => {
    withAccount('claude_max')
    configureStatusLine()
    const first = render()
    // The second launch finds its own wrapper in settings and must recover the inner
    // command from the backup — not bake the wrapper into itself, nesting it.
    configureStatusLine()
    configureStatusLine()

    expect(render()).toBe(first)
  })

  it('gives the statusline back on uninstall', () => {
    configureStatusLine()
    removeClaudeHooks()

    // Ours was the only one: the key goes away rather than leaving a dangling command
    // pointing into a directory the uninstaller has just deleted.
    expect(readSettings().statusLine).toBeUndefined()
  })

  it('gives the user their own statusline back on uninstall', () => {
    fs.mkdirSync(path.join(TMP_HOME, '.claude'), { recursive: true })
    fs.writeFileSync(SETTINGS, JSON.stringify({ statusLine: { type: 'command', command: 'printf mine' } }))

    configureStatusLine()
    removeClaudeHooks()

    expect(readSettings().statusLine).toEqual({ type: 'command', command: 'printf mine' })
  })
})
