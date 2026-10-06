import { describe, expect, it } from 'vitest'
import { ChatTranscript, liveBackground, toolSummary, userText } from './transcript'

const line = (o: unknown) => JSON.stringify(o)

describe('ChatTranscript', () => {
  it('keeps user and assistant text, drops everything else', () => {
    const t = new ChatTranscript()
    t.push(line({ type: 'ai-title', title: 'x' }))
    t.push(line({ type: 'user', uuid: 'u1', message: { content: 'Bonjour' } }))
    t.push(line({ type: 'user', uuid: 'm', isMeta: true, message: { content: 'injected' } }))
    t.push(line({ type: 'assistant', uuid: 's', isSidechain: true, message: { content: [{ type: 'text', text: 'sub' }] } }))
    t.push(line({ type: 'assistant', uuid: 'a1', message: { content: [{ type: 'thinking', thinking: '…' }, { type: 'text', text: 'Salut' }] } }))
    t.push('not json')
    expect(t.entries).toEqual([
      { kind: 'user', id: 'u1:0', text: 'Bonjour' },
      { kind: 'assistant', id: 'a1:1', text: 'Salut' },
    ])
  })

  it('drops a prompt Claude Code wrote itself, keeps the one a human typed', () => {
    const t = new ChatTranscript()
    t.push(line({ type: 'user', uuid: 'h', origin: { kind: 'human' }, message: { content: 'Coucou' } }))
    t.push(line({ type: 'user', uuid: 'n', origin: { kind: 'task-notification' }, promptSource: 'system', message: { content: '<task-notification>\n<task-id>a1</task-id>\n</task-notification>' } }))
    t.push(line({ type: 'user', uuid: 'c', origin: { kind: 'coordinator' }, message: { content: 'next' } }))
    expect(t.entries).toEqual([{ kind: 'user', id: 'h:0', text: 'Coucou' }])
  })

  it('dates a prompt from its line, and skips a timestamp it cannot read', () => {
    const t = new ChatTranscript()
    t.push(line({ type: 'user', uuid: 'u1', timestamp: '2026-10-03T08:00:00.000Z', message: { content: 'Bonjour' } }))
    t.push(line({ type: 'user', uuid: 'u2', timestamp: 'never', message: { content: 'Encore' } }))
    expect(t.entries[0]).toMatchObject({ at: Date.parse('2026-10-03T08:00:00.000Z') })
    expect(t.entries[1]).not.toHaveProperty('at')
  })

  it('shows an interrupt as a notice and remembers the turn ended on it', () => {
    const t = new ChatTranscript()
    t.push(line({ type: 'user', uuid: 'u1', message: { content: 'Go' } }))
    t.push(line({ type: 'user', uuid: 'i', timestamp: '2026-10-03T08:00:00.000Z', message: { content: [{ type: 'text', text: '[Request interrupted by user for tool use]' }] } }))
    expect(t.entries[1]).toEqual({ kind: 'notice', id: 'i', text: 'Request interrupted by user for tool use' })
    expect(t.interruptedAt).toBe(Date.parse('2026-10-03T08:00:00.000Z'))
    t.push(line({ type: 'user', uuid: 'u2', message: { content: 'Again' } }))
    expect(t.interruptedAt).toBeNull()
  })

  it('hands back a prompt nothing has answered, and only that one', () => {
    const t = new ChatTranscript()
    t.push(line({ type: 'user', uuid: 'u1', message: { content: 'First' } }))
    t.push(line({ type: 'assistant', uuid: 'a1', message: { content: [{ type: 'text', text: 'Done' }] } }))
    expect(t.unanswered).toBeNull()
    t.push(line({ type: 'user', uuid: 'u2', message: { content: 'Write an essay' } }))
    t.push(line({ type: 'attachment', uuid: 'x', attachment: { type: 'environment' } }))
    expect(t.unanswered).toEqual({ ids: ['u2:0'], text: 'Write an essay' })
    expect(t.dropUnanswered()).toBe('Write an essay')
    expect(t.entries.map((e) => e.id)).toEqual(['u1:0', 'a1:0'])
    expect(t.dropUnanswered()).toBeNull()
  })

  it('has nothing to hand back once the turn has begun answering or was interrupted', () => {
    const thinking = new ChatTranscript()
    thinking.push(line({ type: 'user', uuid: 'u1', message: { content: 'Go' } }))
    thinking.push(line({ type: 'assistant', uuid: 'a1', message: { content: [{ type: 'thinking', thinking: '…' }] } }))
    expect(thinking.unanswered).toBeNull()

    const stopped = new ChatTranscript()
    stopped.push(line({ type: 'user', uuid: 'u1', message: { content: 'Go' } }))
    stopped.push(line({ type: 'user', uuid: 'i', message: { content: [{ type: 'text', text: '[Request interrupted by user]' }] } }))
    expect(stopped.unanswered).toBeNull()

    const local = new ChatTranscript()
    local.push(line({ type: 'user', uuid: 'c', message: { content: '<command-name>/cost</command-name>' } }))
    local.push(line({ type: 'system', uuid: 'o', content: '<local-command-stdout>$0.12</local-command-stdout>' }))
    expect(local.unanswered).toBeNull()
  })

  it('folds a tool result into its call', () => {
    const t = new ChatTranscript()
    t.push(line({ type: 'assistant', uuid: 'a', message: { content: [{ type: 'tool_use', id: 'tu1', name: 'Bash', input: { command: 'ls -la\necho' } }] } }))
    expect(t.entries[0]).toMatchObject({ kind: 'tool', name: 'Bash', summary: 'ls -la', status: 'running' })
    t.push(line({ type: 'user', uuid: 'r', message: { content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'a\nb', is_error: true }] } }))
    expect(t.entries).toHaveLength(1)
    expect(t.entries[0]).toMatchObject({ status: 'error', output: 'a\nb' })
  })
})

describe('local command output', () => {
  it('becomes a notice, whether written as a user or a system line', () => {
    const t = new ChatTranscript()
    t.push(line({ type: 'user', uuid: 'c', message: { content: '<command-name>/model</command-name>' } }))
    t.push(line({ type: 'user', uuid: 'o', message: { content: '<local-command-stdout>Set model to \u001b[1mOpus\u001b[22m</local-command-stdout>' } }))
    t.push(line({ type: 'system', uuid: 's', content: '<local-command-stdout>Resume cancelled</local-command-stdout>' }))
    t.push(line({ type: 'system', uuid: 'e', content: '<local-command-stdout></local-command-stdout>' }))
    expect(t.entries).toEqual([
      { kind: 'user', id: 'c:0', text: '/model' },
      { kind: 'notice', id: 'o', text: 'Set model to Opus' },
      { kind: 'notice', id: 's', text: 'Resume cancelled' },
    ])
  })
})

describe('userText', () => {
  it('shows a slash command as typed', () => {
    expect(userText('<command-name>/magic:start</command-name>\n<command-message>x</command-message>\n<command-args>PROJ-1</command-args>')).toBe('/magic:start PROJ-1')
  })
  it('drops local command output and reminders', () => {
    expect(userText('<local-command-stdout>ok</local-command-stdout>')).toBe('')
    expect(userText('hi <system-reminder>secret</system-reminder>')).toBe('hi')
  })
})

describe('toolSummary', () => {
  it('picks the telling argument', () => {
    expect(toolSummary({ file_path: '/a.ts', old_string: 'x' })).toBe('/a.ts')
    expect(toolSummary(undefined)).toBe('')
  })
})

describe('ChatTranscript queue', () => {
  const op = (operation: string, content?: string) => line({ type: 'queue-operation', operation, timestamp: '2026-10-03T08:00:00.000Z', ...(content ? { content } : {}) })

  it('replays the queue operations into what still waits', () => {
    const t = new ChatTranscript()
    expect(t.push(op('enqueue', 'first'))).toBe(true)
    t.push(op('enqueue', 'second'))
    t.push(op('enqueue', 'third'))
    expect(t.queue.map((q) => q.text)).toEqual(['first', 'second', 'third'])
    t.push(op('dequeue'))
    t.push(op('remove', 'third'))
    expect(t.queue).toEqual([{ id: 'q1', text: 'second', at: Date.parse('2026-10-03T08:00:00.000Z') }])
  })

  it('holds Claude Code\'s own items without showing them, so a dequeue takes them first', () => {
    const t = new ChatTranscript()
    expect(t.push(op('enqueue', '<task-notification>done</task-notification>'))).toBe(false)
    t.push(op('enqueue', 'mine'))
    t.push(op('dequeue'))
    expect(t.queue.map((q) => q.text)).toEqual(['mine'])
  })

  it('shows a prompt taken in mid-turn, and not the notifications taken the same way', () => {
    const t = new ChatTranscript()
    t.push(line({ type: 'attachment', uuid: 'a1', attachment: { type: 'queued_command', prompt: 'Plus grand ?', commandMode: 'prompt', origin: { kind: 'human' } } }))
    t.push(line({ type: 'attachment', uuid: 'a2', attachment: { type: 'queued_command', prompt: '<task-notification/>', commandMode: 'task-notification' } }))
    expect(t.entries).toEqual([{ kind: 'user', id: 'a1', text: 'Plus grand ?' }])
  })
})

describe('ChatTranscript background agents', () => {
  const launch = (id: string, description: string) => [
    line({ type: 'assistant', uuid: `a-${id}`, message: { content: [{ type: 'tool_use', id, name: 'Agent', input: { description, run_in_background: true } }] } }),
    line({ type: 'user', uuid: `r-${id}`, timestamp: '2026-10-06T08:00:00.000Z', toolUseResult: { isAsync: true, status: 'async_launched', description }, message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'Async agent launched successfully.' }] } }),
  ]
  const notification = (id: string, status: string) => `<task-notification>\n<task-id>x</task-id>\n<tool-use-id>${id}</tool-use-id>\n<status>${status}</status>\n</task-notification>`

  it('holds an agent from its launch until its notification', () => {
    const t = new ChatTranscript()
    for (const l of [...launch('t1', 'Watch CI'), ...launch('t2', 'Audit docs')]) t.push(l)
    expect(t.background).toEqual([
      { id: 't1', description: 'Watch CI', at: Date.parse('2026-10-06T08:00:00.000Z') },
      { id: 't2', description: 'Audit docs', at: Date.parse('2026-10-06T08:00:00.000Z') },
    ])
    expect(t.push(line({ type: 'queue-operation', operation: 'enqueue', content: notification('t1', 'completed') }))).toBe(true)
    expect(t.background.map((a) => a.id)).toEqual(['t2'])
    t.push(line({ type: 'user', uuid: 'n', origin: { kind: 'task-notification' }, message: { content: notification('t2', 'killed') } }))
    expect(t.background).toEqual([])
    expect(t.entries.every((e) => e.kind !== 'user')).toBe(true)
  })

  it('leaves a foreground agent and a notification that it still runs alone', () => {
    const t = new ChatTranscript()
    t.push(line({ type: 'assistant', uuid: 'a', message: { content: [{ type: 'tool_use', id: 'f', name: 'Agent', input: { description: 'Sync' } }] } }))
    t.push(line({ type: 'user', uuid: 'r', toolUseResult: { status: 'completed' }, message: { content: [{ type: 'tool_result', tool_use_id: 'f', content: 'done' }] } }))
    expect(t.background).toEqual([])
    for (const l of launch('t1', 'Watch CI')) t.push(l)
    t.push(line({ type: 'queue-operation', operation: 'enqueue', content: notification('t1', 'running') }))
    expect(t.background.map((a) => a.id)).toEqual(['t1'])
  })
})

describe('liveBackground', () => {
  const agents = [{ id: 'old', description: 'Before', at: 1000 }, { id: 'new', description: 'After', at: 3000 }, { id: 'undated', description: '?' }]

  it('keeps only what the current process launched', () => {
    expect(liveBackground(agents, 2000).map((a) => a.id)).toEqual(['new'])
  })

  it('keeps nothing once the process has exited', () => {
    expect(liveBackground(agents, null)).toEqual([])
  })

  it('takes the transcript at its word when the process is not known', () => {
    expect(liveBackground(agents, undefined)).toBe(agents)
  })
})
