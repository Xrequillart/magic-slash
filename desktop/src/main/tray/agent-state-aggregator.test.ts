import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentStateAggregator } from './agent-state-aggregator'

// terminal-manager reaches node-pty (native) and pending-questions carries the whole
// hook-payload parser. Neither is under test here: what is, is the single priority
// ladder in update(), so both are reduced to the two facts it reads.
const mocks = vi.hoisted(() => ({
  terminals: [] as { id: string; state: string }[],
  withQuestion: new Set<string>(),
}))

vi.mock('../pty/terminal-manager', () => ({
  getAllTerminals: () => mocks.terminals,
}))

vi.mock('../questions/pending-questions', () => ({
  getPendingQuestion: (id: string) =>
    mocks.withQuestion.has(id) ? { token: `token-${id}`, kind: 'ask' } : undefined,
}))

function given(terminals: { id: string; state: string }[], questions: string[] = []): string {
  mocks.terminals = terminals
  mocks.withQuestion = new Set(questions)
  const aggregator = new AgentStateAggregator()
  aggregator.update()
  return aggregator.getState()
}

beforeEach(() => {
  mocks.terminals = []
  mocks.withQuestion.clear()
})

describe('AgentStateAggregator.update', () => {
  it('reports no state without agents', () => {
    expect(given([])).toBe('none')
  })

  it('ranks working over idle, and waiting over both', () => {
    expect(given([{ id: 'a', state: 'idle' }])).toBe('idle')
    expect(given([{ id: 'a', state: 'idle' }, { id: 'b', state: 'working' }])).toBe('running')
    expect(given([
      { id: 'a', state: 'idle' },
      { id: 'b', state: 'working' },
      { id: 'c', state: 'waiting' },
    ])).toBe('waiting')
  })

  // The point of the state: an agent blocked on a question is ALREADY `waiting`, so
  // ordering it after `waiting` would mean it never surfaced at all — the menu bar
  // would show the same icon for "nobody is needed" and "you are being asked".
  it('ranks a pending question over the waiting it always coincides with', () => {
    expect(given([{ id: 'a', state: 'waiting' }], ['a'])).toBe('question')
  })

  it('surfaces a question raised on one agent among several', () => {
    expect(given([
      { id: 'a', state: 'working' },
      { id: 'b', state: 'waiting' },
      { id: 'c', state: 'idle' },
    ], ['b'])).toBe('question')
  })

  it('falls back to the underlying state once the question is answered', () => {
    expect(given([{ id: 'a', state: 'waiting' }], ['a'])).toBe('question')
    expect(given([{ id: 'a', state: 'waiting' }], [])).toBe('waiting')
  })

  // Same exclusion the rest of update() applies: these are the app's own shells, not
  // agents, and one of them holding a prompt is not something to alert anyone about.
  it('ignores script and sidebar terminals', () => {
    expect(given([
      { id: 'script-1', state: 'waiting' },
      { id: 'sidebar-1', state: 'waiting' },
    ], ['script-1', 'sidebar-1'])).toBe('none')
  })
})

// The menu bar prints this number, so "at least one" is not enough to know.
describe('AgentStateAggregator.getQuestionCount', () => {
  function count(terminals: { id: string; state: string }[], questions: string[] = []) {
    mocks.terminals = terminals
    mocks.withQuestion = new Set(questions)
    const aggregator = new AgentStateAggregator()
    aggregator.update()
    return { active: aggregator.getActiveCount(), asking: aggregator.getQuestionCount() }
  }

  it('counts the agents that are asking, not the agents that are up', () => {
    expect(count([
      { id: 'a', state: 'working' },
      { id: 'b', state: 'waiting' },
      { id: 'c', state: 'waiting' },
    ], ['b', 'c'])).toEqual({ active: 3, asking: 2 })
  })

  it('reports none while nobody is asking', () => {
    expect(count([{ id: 'a', state: 'working' }])).toEqual({ active: 1, asking: 0 })
  })

  // Same exclusion update() applies to the state: a script shell holding a prompt is
  // not an agent asking a question, and must not be counted as one.
  it('excludes script and sidebar shells', () => {
    expect(count([
      { id: 'a', state: 'waiting' },
      { id: 'script-1', state: 'waiting' },
      { id: 'sidebar-1', state: 'waiting' },
    ], ['a', 'script-1', 'sidebar-1'])).toEqual({ active: 1, asking: 1 })
  })
})

describe('AgentStateAggregator change events', () => {
  it('emits when a question arrives on an agent that was already waiting', () => {
    mocks.terminals = [{ id: 'a', state: 'waiting' }]
    const aggregator = new AgentStateAggregator()
    const seen: string[] = []
    aggregator.on('change', ({ state }: { state: string }) => seen.push(state))

    aggregator.update()
    aggregator.update() // nothing moved: no second event
    mocks.withQuestion.add('a')
    aggregator.update()

    expect(seen).toEqual(['waiting', 'question'])
  })

  // A second agent asking moves no state — it is already `question` — but it does move
  // the number the menu bar prints, so the event has to carry it.
  it('emits again when a second agent starts asking', () => {
    mocks.terminals = [{ id: 'a', state: 'waiting' }, { id: 'b', state: 'waiting' }]
    mocks.withQuestion = new Set(['a'])
    const aggregator = new AgentStateAggregator()
    const seen: number[] = []
    aggregator.on('change', ({ questions }: { questions: number }) => seen.push(questions))

    aggregator.update()
    mocks.withQuestion.add('b')
    aggregator.update()

    expect(seen).toEqual([1, 2])
  })
})
