import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  buildPreview,
  clearAllPendingQuestions,
  clearPendingQuestion,
  getPendingQuestion,
  ingestQuestionPayload,
  setFromAskQuestion,
  setFromNotification,
} from './pending-questions'

const askPayload = (questions: unknown) =>
  JSON.stringify({
    hook_event_name: 'PreToolUse',
    tool_name: 'AskUserQuestion',
    tool_input: { questions },
  })

const ONE_QUESTION = [
  {
    question: 'Which database should the API use?',
    header: 'Database',
    options: [
      { label: 'Postgres', description: 'Managed on RDS' },
      { label: 'SQLite', description: 'Local only' },
    ],
  },
]

beforeEach(() => {
  clearAllPendingQuestions()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('setFromAskQuestion', () => {
  it('extracts the prompt and its options', () => {
    const question = setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))
    expect(question).not.toBeNull()
    expect(question!.kind).toBe('ask')
    expect(question!.prompt).toBe('Which database should the API use?')
    expect(question!.options).toEqual([
      { label: 'Postgres', description: 'Managed on RDS' },
      { label: 'SQLite', description: 'Local only' },
    ])
    expect(question!.unsupported).toBeUndefined()
  })

  it('falls back to the header when the question text is missing', () => {
    const question = setFromAskQuestion('term-1', {
      tool_input: { questions: [{ header: 'Database', options: [{ label: 'Postgres' }] }] },
    })
    expect(question!.prompt).toBe('Database')
  })

  it('marks multi-question and multiSelect calls unsupported instead of dropping them', () => {
    const multi = setFromAskQuestion('term-1', {
      tool_input: { questions: [...ONE_QUESTION, { question: 'And the cache?', options: [{ label: 'Redis' }] }] },
    })
    expect(multi!.unsupported).toBe(true)
    expect(multi!.prompt).toBe('Which database should the API use?')

    const multiSelect = setFromAskQuestion('term-2', {
      tool_input: { questions: [{ ...ONE_QUESTION[0], multiSelect: true }] },
    })
    expect(multiSelect!.unsupported).toBe(true)
  })

  it('marks a question with no readable option unsupported', () => {
    const question = setFromAskQuestion('term-1', {
      tool_input: { questions: [{ question: 'Free text?', options: [{ description: 'no label' }] }] },
    })
    expect(question!.options).toEqual([])
    expect(question!.unsupported).toBe(true)
  })

  it('returns null for a payload with no question at all', () => {
    expect(setFromAskQuestion('term-1', { tool_input: { questions: [] } })).toBeNull()
    expect(setFromAskQuestion('term-1', { tool_input: {} })).toBeNull()
    expect(setFromAskQuestion('term-1', {})).toBeNull()
    expect(getPendingQuestion('term-1')).toBeUndefined()
  })
})

describe('setFromNotification', () => {
  it('stores a permission prompt with its preview, denial enabled', () => {
    const question = setFromNotification(
      'term-1',
      { message: 'Claude needs your permission to use Bash' },
      () => 'rm -rf build/',
    )
    expect(question!.kind).toBe('permission')
    expect(question!.prompt).toBe('Claude needs your permission to use Bash')
    expect(question!.preview).toBe('rm -rf build/')
    // The panel renders its own Allow / Deny for these.
    expect(question!.options).toEqual([])
    // Recognised as a permission request, so it may be answered from the panel.
    expect(question!.unsupported).toBeUndefined()
  })

  it('ignores the idle nudge, which is not a question', () => {
    expect(setFromNotification('term-1', { message: 'Claude is waiting for your input' })).toBeNull()
    expect(getPendingQuestion('term-1')).toBeUndefined()
  })

  it('shows an unrecognised notification but marks it unsupported, so nothing is written', () => {
    // Neither the idle nudge nor anything we can read as a permission request. Losing
    // it would cost the feature; offering an Allow button would send a bare Enter into
    // a terminal that may not be showing a prompt. It is shown, not driven.
    const question = setFromNotification('term-1', { message: 'Some future wording' }, () => 'tail')
    expect(question!.kind).toBe('permission')
    expect(question!.unsupported).toBe(true)
    expect(question!.preview).toBe('tail')
  })

  it('recognises a permission request whatever the surrounding wording', () => {
    for (const message of [
      'Claude needs your permission to use Bash',
      'Approve this edit?',
      'Allow Claude to run the command?',
      "Autoriser l'accès au fichier ?",
    ]) {
      expect(setFromNotification('term-1', { message })!.unsupported).toBeUndefined()
    }
  })

  it('returns null when there is no message', () => {
    expect(setFromNotification('term-1', {})).toBeNull()
    expect(setFromNotification('term-1', { message: '   ' })).toBeNull()
  })

  it('never replaces a pending ask, whatever the wording', () => {
    // The regression: Claude Code announces an AskUserQuestion with a permission
    // notification of its own, which used to overwrite the question and its options
    // with a bare Allow / Deny.
    const ask = setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))
    const notification = setFromNotification(
      'term-1',
      { message: 'Claude needs your permission to use AskUserQuestion' },
      () => 'tail',
    )
    expect(notification).toBeNull()
    expect(getPendingQuestion('term-1')).toEqual(ask)
  })

  it('does not read the terminal buffer for a notification it drops', () => {
    setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))
    const bufferProvider = vi.fn(() => 'tail')
    setFromNotification('term-1', { message: 'Claude needs your permission to use Bash' }, bufferProvider)
    expect(bufferProvider).not.toHaveBeenCalled()
  })

  it('takes the slot back once the ask is gone', () => {
    setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))
    clearPendingQuestion('term-1')
    const question = setFromNotification('term-1', { message: 'Claude needs your permission to use Bash' })
    expect(question!.kind).toBe('permission')
  })

  it('takes the slot back once the ask has expired', () => {
    vi.useFakeTimers()
    setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))
    vi.advanceTimersByTime(31 * 60 * 1000)
    const question = setFromNotification('term-1', { message: 'Claude needs your permission to use Bash' })
    expect(question!.kind).toBe('permission')
  })

  it("leaves another agent's permission prompt alone", () => {
    setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))
    const question = setFromNotification('term-2', { message: 'Claude needs your permission to use Bash' })
    expect(question!.kind).toBe('permission')
    expect(getPendingQuestion('term-1')!.kind).toBe('ask')
  })
})

describe('ingestQuestionPayload', () => {
  it('routes PreToolUse to the AskUserQuestion parser', () => {
    const question = ingestQuestionPayload('term-1', askPayload(ONE_QUESTION))
    expect(question!.kind).toBe('ask')
    expect(getPendingQuestion('term-1')).toEqual(question)
  })

  it('routes Notification to the permission parser and only then reads the buffer', () => {
    const bufferProvider = vi.fn(() => 'npm run deploy')
    const question = ingestQuestionPayload(
      'term-1',
      JSON.stringify({ hook_event_name: 'Notification', message: 'Claude needs your permission to use Bash' }),
      bufferProvider,
    )
    expect(question!.preview).toBe('npm run deploy')
    expect(bufferProvider).toHaveBeenCalledTimes(1)
  })

  // The buffer runs to ~100KB and this hook is on the critical path of a blocked
  // agent, so the idle nudge — the most frequent Notification of all — must not pay
  // for a preview that is thrown away.
  it('never touches the buffer for a notification it discards', () => {
    const bufferProvider = vi.fn(() => 'npm run deploy')
    expect(
      ingestQuestionPayload(
        'term-1',
        JSON.stringify({ hook_event_name: 'Notification', message: 'Claude is waiting for your input' }),
        bufferProvider,
      ),
    ).toBeNull()
    expect(bufferProvider).not.toHaveBeenCalled()
  })

  it('swallows an unparseable body without storing anything', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(ingestQuestionPayload('term-1', 'not json')).toBeNull()
    expect(getPendingQuestion('term-1')).toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('ignores an event it does not handle', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(ingestQuestionPayload('term-1', JSON.stringify({ hook_event_name: 'Stop' }))).toBeNull()
    expect(getPendingQuestion('term-1')).toBeUndefined()
    spy.mockRestore()
  })
})

describe('the store itself', () => {
  it('mints a distinct token per question', () => {
    const first = setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))!
    const second = setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))!
    expect(second.token).not.toBe(first.token)
  })

  // The one exception is a notification landing on a pending ask, which is dropped
  // rather than stored — see setFromNotification.
  it('keeps one question per agent, the newest winning', () => {
    setFromNotification('term-1', { message: 'Claude needs your permission to use Bash' })
    const second = setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))!
    expect(getPendingQuestion('term-1')).toEqual(second)
  })

  it('keeps agents independent', () => {
    const one = setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))!
    setFromAskQuestion('term-2', JSON.parse(askPayload(ONE_QUESTION)))
    clearPendingQuestion('term-2')
    expect(getPendingQuestion('term-1')).toEqual(one)
    expect(getPendingQuestion('term-2')).toBeUndefined()
  })

  it('expires a question after 30 minutes, on read', () => {
    vi.useFakeTimers()
    setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))
    vi.advanceTimersByTime(29 * 60 * 1000)
    expect(getPendingQuestion('term-1')).toBeDefined()
    vi.advanceTimersByTime(2 * 60 * 1000)
    expect(getPendingQuestion('term-1')).toBeUndefined()
  })

  it('clearAll empties every agent (app shutdown)', () => {
    setFromAskQuestion('term-1', JSON.parse(askPayload(ONE_QUESTION)))
    setFromAskQuestion('term-2', JSON.parse(askPayload(ONE_QUESTION)))
    clearAllPendingQuestions()
    expect(getPendingQuestion('term-1')).toBeUndefined()
    expect(getPendingQuestion('term-2')).toBeUndefined()
  })
})

describe('buildPreview', () => {
  it('strips ANSI, trims trailing blank lines and keeps the last 15', () => {
    const buffer = `\x1b[2J\x1b[H${Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n')}\n\n\n`
    const preview = buildPreview(buffer)!
    const lines = preview.split('\n')
    expect(lines).toHaveLength(15)
    expect(lines[0]).toBe('line 6')
    expect(lines[14]).toBe('line 20')
    expect(preview).not.toContain('\x1b')
  })

  it('returns undefined for nothing worth showing', () => {
    expect(buildPreview(null)).toBeUndefined()
    expect(buildPreview('')).toBeUndefined()
    expect(buildPreview('\n\n  \n')).toBeUndefined()
  })
})
