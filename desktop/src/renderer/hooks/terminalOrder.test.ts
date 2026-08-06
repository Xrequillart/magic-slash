import { describe, it, expect } from 'vitest'
import { orderTerminals } from './terminalOrder'
import type { TerminalInfo, TerminalState, TerminalMetadata } from '../../types'

const terminal = (
  id: string,
  tsCreate: number | undefined,
  state: TerminalState = 'idle',
  status?: TerminalMetadata['status'],
): TerminalInfo => ({
  id,
  name: id,
  state,
  repositories: [],
  tsCreate,
  metadata: status ? { status } : undefined,
})

describe('orderTerminals', () => {
  it('puts the newest agent first', () => {
    const ordered = orderTerminals(
      [terminal('old', 100), terminal('newest', 300), terminal('middle', 200)],
      null,
    )
    expect(ordered.map(t => t.id)).toEqual(['newest', 'middle', 'old'])
  })

  it('keeps the order stable whatever the state or workflow status', () => {
    const before = orderTerminals(
      [terminal('a', 100), terminal('b', 200, 'idle'), terminal('c', 300)],
      null,
    )
    const after = orderTerminals(
      [
        terminal('a', 100, 'idle', 'PR merged'),
        terminal('b', 200, 'waiting', 'in progress'),
        terminal('c', 300, 'error'),
      ],
      null,
    )
    expect(after.map(t => t.id)).toEqual(before.map(t => t.id))
  })

  it('sorts agents with no creation timestamp last, in their existing order', () => {
    const ordered = orderTerminals(
      [terminal('legacy-1', undefined), terminal('dated', 100), terminal('legacy-2', undefined)],
      null,
    )
    expect(ordered.map(t => t.id)).toEqual(['dated', 'legacy-1', 'legacy-2'])
  })

  it('tags each agent with the configured repositories it belongs to', () => {
    const config = {
      repositories: {
        api: { path: '/code/api' },
        web: { path: '/code/web' },
      },
    } as never

    const ordered = orderTerminals(
      [{ ...terminal('a', 100), repositories: ['/code/api/src'] }],
      config,
    )
    expect(ordered[0].matchingProjects).toEqual(['api'])
  })
})
