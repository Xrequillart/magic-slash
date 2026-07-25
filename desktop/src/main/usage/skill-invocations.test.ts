import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SkillInvocationInput } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'
import { recordSkillInvocation } from './skill-invocations'

let recorded: SkillInvocationInput[] = []

function fakeStore(overrides: Partial<Store> = {}): Store {
  return {
    ...NOOP_STORE,
    recordSkillInvocation: async (i) => { recorded.push(structuredClone(i)) },
    ...overrides,
  }
}

beforeEach(() => {
  recorded = []
  setStore(fakeStore())
})

describe('recordSkillInvocation', () => {
  it('forwards the invocation to the store', async () => {
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-commit' })
    expect(recorded).toEqual([{ agentId: 'claude-1', skill: 'magic-commit' }])
  })

  it('records repeat runs of the same skill as separate invocations', async () => {
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-commit' })
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-commit' })
    expect(recorded).toHaveLength(2)
  })

  it('forwards a run with no agent (session started outside the app)', async () => {
    await recordSkillInvocation({ skill: 'magic-commit' })
    expect(recorded).toEqual([{ skill: 'magic-commit' }])
  })

  it('is not gated by usageLogsEnabled — only the skill name is collected', async () => {
    // No config mock here on purpose: unlike recordUsageSnapshot, this path must
    // never consult the GDPR opt-in.
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-plan' })
    expect(recorded).toHaveLength(1)
  })

  it('swallows a store failure — telemetry must never break the hook', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setStore(fakeStore({
      recordSkillInvocation: async () => { throw new Error('network down') },
    }))
    await expect(recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-pr' })).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
