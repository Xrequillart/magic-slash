import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SkillInvocationInput } from '../../types'
import type { Store } from '../store/Store'
import { setStore, NOOP_STORE } from '../store/Store'

// readConfig is mocked so we can flip the GDPR recording opt-in per test.
vi.mock('../config/config', () => ({ readConfig: vi.fn() }))
// The outbox is mocked here for two reasons: these tests are about the writer, not
// the queue (outbox.test.ts owns that), and a real enqueue would write to the
// developer's own ~/.config/magic-slash on every run.
vi.mock('../store/outbox', () => ({
  enqueue: vi.fn(),
  newClientEventId: () => 'event-id-1',
}))
import { readConfig } from '../config/config'
import { enqueue } from '../store/outbox'
import { recordSkillInvocation } from './skill-invocations'

/** occurredAt is stamped at emission, so assertions ignore its exact value. */
const stamped = (fields: Partial<SkillInvocationInput>) => ({
  ...fields,
  occurredAt: expect.any(Number),
  clientEventId: 'event-id-1',
})

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
  vi.mocked(enqueue).mockClear()
  // Recording is ON by default; set it explicitly anyway so a test that expects a
  // write does not depend on the gate's polarity.
  vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: true })
})

describe('recordSkillInvocation', () => {
  it('forwards the invocation to the store', async () => {
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-commit' })
    expect(recorded).toEqual([stamped({ agentId: 'claude-1', skill: 'magic-commit' })])
  })

  it('records repeat runs of the same skill as separate invocations', async () => {
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-commit' })
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-commit' })
    expect(recorded).toHaveLength(2)
  })

  it('forwards a run with no agent (session started outside the app)', async () => {
    await recordSkillInvocation({ skill: 'magic-commit' })
    expect(recorded).toEqual([stamped({ skill: 'magic-commit' })])
  })

  it('records when usageLogsEnabled is absent — the default is ON', async () => {
    // Absent means the user never touched the toggle, and the product records by
    // default: only an explicit false stops this, exactly as for usage and activity.
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {} })
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-plan' })
    expect(recorded).toEqual([stamped({ agentId: 'claude-1', skill: 'magic-plan' })])
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

  it('queues a failed run instead of dropping it, under the same event id', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setStore(fakeStore({
      recordSkillInvocation: async () => { throw new Error('network down') },
    }))

    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-pr' })

    expect(enqueue).toHaveBeenCalledWith({
      kind: 'skill',
      payload: stamped({ agentId: 'claude-1', skill: 'magic-pr' }),
    })
    spy.mockRestore()
  })
})

// The PreToolUse hook feeding this is installed user-globally and fires on EVERY
// skill Claude Code runs. Only the magic ones are ever displayed, so collecting the
// rest put third-party and employer-internal skill names into a table the user's org
// can read, for no product purpose. The filter is the fix, and these are its terms.
describe('skill filtering', () => {
  it('records nothing for a skill that is not ours', async () => {
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'dataviz' })
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'acme-internal:deploy-prod' })
    expect(recorded).toEqual([])
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('folds the plugin prefix, so both install methods count as one skill', async () => {
    // install.sh reports "magic-pr"; the plugin reports "magic-slash:magic-pr". The
    // rollup RPCs fold the prefix the same way, and the two must agree.
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-slash:magic-pr' })
    expect(recorded).toEqual([stamped({ agentId: 'claude-1', skill: 'magic-slash:magic-pr' })])
  })

  it('counts a magic skill that has no dashboard tile', async () => {
    // The rule is the prefix, not a list of the seven: a list would silently stop
    // counting the next skill this project ships.
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-release' })
    expect(recorded).toHaveLength(1)
  })

  it('does not match a skill that merely contains "magic"', async () => {
    await recordSkillInvocation({ agentId: 'claude-1', skill: 'black-magic' })
    expect(recorded).toEqual([])
  })
})
