import { describe, expect, it } from 'vitest'
import { ChatTranscript, toolSummary, userText } from './transcript'

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
