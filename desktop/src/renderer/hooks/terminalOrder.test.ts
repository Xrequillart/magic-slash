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
  it('puts the newest agent first by default', () => {
    const ordered = orderTerminals(
      [terminal('old', 100), terminal('newest', 300), terminal('middle', 200)],
      null,
    )
    expect(ordered.map(t => t.id)).toEqual(['newest', 'middle', 'old'])
  })

  it('keeps the default order stable whatever the state or workflow status', () => {
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

  describe('by status', () => {
    it('leads with the agents blocked on the person, then the ones still moving', () => {
      const ordered = orderTerminals(
        [
          terminal('idle', 500),
          terminal('completed', 400, 'completed'),
          terminal('working', 300, 'working'),
          terminal('error', 200, 'error'),
          terminal('waiting', 100, 'waiting'),
        ],
        null,
        'status',
      )
      expect(ordered.map(t => t.id)).toEqual(['waiting', 'error', 'working', 'completed', 'idle'])
    })

    it('reads each status group newest first', () => {
      const ordered = orderTerminals(
        [
          terminal('old-waiting', 100, 'waiting'),
          terminal('new-waiting', 300, 'waiting'),
          terminal('newest-idle', 400),
        ],
        null,
        'status',
      )
      expect(ordered.map(t => t.id)).toEqual(['new-waiting', 'old-waiting', 'newest-idle'])
    })
  })

  describe('by repository', () => {
    const config = {
      repositories: {
        web: { path: '/code/web' },
        api: { path: '/code/api' },
      },
    } as never

    const inRepo = (id: string, tsCreate: number, path?: string): TerminalInfo => ({
      ...terminal(id, tsCreate),
      repositories: path ? [path] : [],
    })

    it('groups by project name, A to Z, newest first inside a group', () => {
      const ordered = orderTerminals(
        [
          inRepo('web-old', 100, '/code/web/src'),
          inRepo('api', 200, '/code/api'),
          inRepo('web-new', 300, '/code/web'),
        ],
        config,
        'repository',
      )
      expect(ordered.map(t => t.id)).toEqual(['api', 'web-new', 'web-old'])
    })

    it('sorts the agents that belong to no configured repository last', () => {
      // An empty name would otherwise sort above every letter and open the list with
      // the agents that have no group at all.
      const ordered = orderTerminals(
        [inRepo('loose', 900), inRepo('web', 100, '/code/web')],
        config,
        'repository',
      )
      expect(ordered.map(t => t.id)).toEqual(['web', 'loose'])
    })
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
