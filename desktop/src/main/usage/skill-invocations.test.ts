import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SkillInvocationInput } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'

// readConfig is mocked so we can flip the GDPR recording opt-in per test.
vi.mock('../config/config', () => ({ readConfig: vi.fn() }))
import { readConfig } from '../config/config'
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
  // Recording is ON by default; set it explicitly anyway so a test that expects a
  // write does not depend on the gate's polarity.
  vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: true })
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

  it('records when usageLogsEnabled is absent — the default is ON', async () => {
    // Absent means the user never touched the toggle, and the product records by
    // default: only an explicit false stops this, exactly as for usage and activity.
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {} })
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-plan' })
    expect(recorded).toEqual([{ agentId: 'claude-1', skill: 'magic-plan' }])
  })

  it('records nothing when usageLogsEnabled is false — same switch as usage and activity', async () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: false })
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-pr' })
    expect(recorded).toEqual([])
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
