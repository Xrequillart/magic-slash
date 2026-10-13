import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TerminalState } from '../../types'
import { runRemotePrompt, runRemoteStop, type PromptEdges, type StopEdges } from './agent-control'

// The rules of a phone's `prompt` and `stop` (PROTOCOL.md §10) over fake edges. relay.test.ts
// drives the same functions end to end, through the gate and the relay.

let state: TerminalState | undefined
let question: boolean

function promptEdges(overrides: Partial<PromptEdges> = {}): PromptEdges {
  return {
    state: () => state,
    hasQuestion: () => question,
    submit: vi.fn(async () => true),
    ...overrides,
  }
}

function stopEdges(draft: string | null = null, delivered = true) {
  return {
    state: () => state,
    interrupt: vi.fn<StopEdges['interrupt']>(async () => (delivered ? { draft } : null)),
    clearQuestion: vi.fn<StopEdges['clearQuestion']>(),
    restoreDraft: vi.fn<StopEdges['restoreDraft']>(),
  }
}

beforeEach(() => {
  state = 'idle'
  question = false
})

describe('runRemotePrompt', () => {
  it('submits the text as the chat formats it, to an idle agent', async () => {
    const edges = promptEdges()
    expect(await runRemotePrompt('claude-1', 'one\ntwo', edges)).toEqual({ ok: true })
    expect(edges.submit).toHaveBeenCalledWith('claude-1', '\x1b[200~one\ntwo\x1b[201~', expect.any(Function))
  })

  it('submits to a working agent and says it was queued', async () => {
    state = 'working'
    expect(await runRemotePrompt('claude-1', 'next', promptEdges())).toEqual({ ok: true, queued: true })
  })

  it('treats a finished turn as idle', async () => {
    for (const s of ['completed', 'error'] as const) {
      state = s
      expect(await runRemotePrompt('claude-1', 'next', promptEdges())).toEqual({ ok: true })
    }
  })

  it('is busy while a question or a permission waits, and types nothing', async () => {
    const edges = promptEdges()
    state = 'waiting'
    expect(await runRemotePrompt('claude-1', 'next', edges)).toEqual({ ok: false, reason: 'busy' })
    state = 'working'
    question = true
    expect(await runRemotePrompt('claude-1', 'next', edges)).toEqual({ ok: false, reason: 'busy' })
    expect(edges.submit).not.toHaveBeenCalled()
  })

  it('refuses a shell line or a dialog command before reading anything', async () => {
    const edges = promptEdges({ state: vi.fn(() => state) })
    expect(await runRemotePrompt('claude-1', '!ls', edges)).toEqual({ ok: false, reason: 'unsupported' })
    expect(await runRemotePrompt('claude-1', '/permissions', edges)).toEqual({ ok: false, reason: 'unsupported' })
    expect(edges.state).not.toHaveBeenCalled()
    expect(edges.submit).not.toHaveBeenCalled()
  })

  it('is stale for a terminal that is gone, and write-failed for one that took nothing', async () => {
    state = undefined
    expect(await runRemotePrompt('claude-1', 'next', promptEdges())).toEqual({ ok: false, reason: 'stale' })
    state = 'idle'
    expect(await runRemotePrompt('claude-1', 'next', promptEdges({ submit: async () => false }))).toEqual({ ok: false, reason: 'write-failed' })
  })
})

describe('runRemotePrompt, once its turn to be typed comes', () => {
  it('is stale when step 9 no longer holds, and writes nothing', async () => {
    const edges = promptEdges({ submit: vi.fn(async (_id: string, _bytes: string, wanted: () => boolean) => wanted()) })
    expect(await runRemotePrompt('claude-1', 'hello', edges, () => false)).toEqual({ ok: false, reason: 'stale' })
  })
})

describe('runRemoteStop', () => {
  it('interrupts a working agent, and hands back what it took back', async () => {
    state = 'working'
    const edges = stopEdges('the prompt')
    expect(await runRemoteStop('claude-1', edges)).toEqual({ ok: true })
    expect(edges.interrupt).toHaveBeenCalledWith('claude-1')
    expect(edges.restoreDraft).toHaveBeenCalledWith('claude-1', 'the prompt')
    expect(edges.clearQuestion).not.toHaveBeenCalled()
  })

  it('interrupts a waiting agent and forgets its question', async () => {
    state = 'waiting'
    const edges = stopEdges()
    expect(await runRemoteStop('claude-1', edges)).toEqual({ ok: true })
    expect(edges.clearQuestion).toHaveBeenCalledWith('claude-1')
    expect(edges.restoreDraft).not.toHaveBeenCalled()
  })

  it('reports a stop whose Escape reached no terminal, and keeps the question', async () => {
    state = 'waiting'
    const edges = stopEdges(null, false)
    expect(await runRemoteStop('claude-1', edges)).toEqual({ ok: false, reason: 'write-failed' })
    expect(edges.clearQuestion).not.toHaveBeenCalled()
  })

  it('is stale on an agent with no turn to stop, or none at all, and sends no Escape', async () => {
    for (const s of ['idle', 'completed', 'error', undefined] as const) {
      state = s
      const edges = stopEdges()
      expect(await runRemoteStop('claude-1', edges)).toEqual({ ok: false, reason: 'stale' })
      expect(edges.interrupt).not.toHaveBeenCalled()
    }
  })
})
