import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PlanCommentsRead } from '../../types'

/**
 * The SHAPE guards on the four comment channels, and nothing else.
 *
 * WHAT THIS FILE DELIBERATELY DOES NOT TEST is who may write on whose plan. That is RLS's
 * job and RLS's alone — `supabase/tests/plan_comments.test.sql` is where it is proved —
 * and a unit test asserting an authorization rule in this layer would be asserting the
 * existence of exactly the duplicated, weaker check the handlers are written not to have.
 *
 * What IS worth pinning is that a malformed argument never reaches the cloud module: these
 * are the first WRITE channels in this file, so an argument that slips past the guard is a
 * row in a table every member of the organization can read. Every assertion below therefore
 * checks the refusal AND that the cloud function was not called.
 *
 * Mocked in the style of the siblings: `ipcMain.handle` is captured so the handlers can be
 * invoked directly, and the cloud modules are replaced because they import
 * `@supabase/supabase-js`, which the ROOT node_modules this suite runs on does not hold.
 */
type IpcHandler = (event: unknown, args?: unknown) => Promise<unknown>
const handlers = new Map<string, IpcHandler>()
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      handlers.set(channel, handler)
    }),
  },
}))

const mockListSessions = vi.fn()
const mockListDetail = vi.fn()
const mockFindForTicket = vi.fn()
vi.mock('../cloud/plans', () => ({
  listPlanSessions: (...args: unknown[]) => mockListSessions(...args),
  listPlanDetail: (...args: unknown[]) => mockListDetail(...args),
  findPlanForTicket: (...args: unknown[]) => mockFindForTicket(...args),
}))

const mockListComments = vi.fn()
const mockCreateComment = vi.fn()
const mockUpdateComment = vi.fn()
const mockDeleteComment = vi.fn()
vi.mock('../cloud/planComments', () => ({
  listPlanComments: (...args: unknown[]) => mockListComments(...args),
  createPlanComment: (...args: unknown[]) => mockCreateComment(...args),
  updatePlanComment: (...args: unknown[]) => mockUpdateComment(...args),
  deletePlanComment: (...args: unknown[]) => mockDeleteComment(...args),
}))

import { setupPlansHandlers } from './plans-handlers'

/** A well-formed uuid, so a rejection can only ever be about the field under test. */
const SESSION_ID = '11111111-1111-4111-8111-111111111111'
const COMMENT_ID = '22222222-2222-4222-8222-222222222222'
const PARENT_ID = '33333333-3333-4333-8333-333333333333'

/** The one payload every creation test starts from, with the field under test replaced. */
function creation(overrides: Record<string, unknown> = {}) {
  return { sessionId: SESSION_ID, anchor: null, quote: 'the passage', body: 'a note', ...overrides }
}

function invoke(channel: string, args?: unknown): Promise<unknown> {
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`no handler registered for ${channel}`)
  return handler({}, args)
}

beforeEach(() => {
  handlers.clear()
  vi.clearAllMocks()
  mockListComments.mockResolvedValue({
    comments: [], emailByAuthor: {}, avatarByAuthor: {}, truncated: false, failed: false,
  } satisfies PlanCommentsRead)
  mockCreateComment.mockResolvedValue(true)
  mockUpdateComment.mockResolvedValue(true)
  mockDeleteComment.mockResolvedValue(true)
  setupPlansHandlers()
})

describe('plans:comments:list', () => {
  it('reads the comments of a well-formed session id', async () => {
    await invoke('plans:comments:list', SESSION_ID)
    expect(mockListComments).toHaveBeenCalledWith(SESSION_ID)
  })

  it.each([
    ['not a uuid', 'nope'],
    ['a number', 7],
    ['nothing at all', undefined],
    ['an object', { id: SESSION_ID }],
  ])('answers an UNFAILED nothing for %s, and reads nothing', async (_label, id) => {
    // Unfailed, not failed: the page's "no comment yet" is the honest reading of an
    // unknown plan, where an error block would offer a retry that cannot help.
    expect(await invoke('plans:comments:list', id)).toEqual({
      comments: [], emailByAuthor: {}, avatarByAuthor: {}, truncated: false, failed: false,
    })
    expect(mockListComments).not.toHaveBeenCalled()
  })
})

describe('plans:comments:create', () => {
  it('passes a well-formed thread head through', async () => {
    expect(await invoke('plans:comments:create', creation())).toBe(true)
    expect(mockCreateComment).toHaveBeenCalledWith({
      sessionId: SESSION_ID, parentId: undefined, anchor: null, quote: 'the passage', body: 'a note',
    })
  })

  it('passes a reply through with its parent', async () => {
    await invoke('plans:comments:create', creation({ parentId: PARENT_ID, quote: '' }))
    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: PARENT_ID }),
    )
  })

  it('reads a null parent as a thread head — what JSON makes of an absent field', async () => {
    await invoke('plans:comments:create', creation({ parentId: null }))
    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: undefined }),
    )
  })

  it('keeps a line anchor that is exactly a LineRange', async () => {
    const anchor = { side: 'new', startLine: 3, endLine: 9 }
    await invoke('plans:comments:create', creation({ anchor }))
    expect(mockCreateComment).toHaveBeenCalledWith(expect.objectContaining({ anchor }))
  })

  it.each([
    ['no payload at all', undefined],
    ['a string instead of a payload', 'nope'],
    ['a session id that is not a uuid', creation({ sessionId: 'nope' })],
    ['a missing session id', creation({ sessionId: undefined })],
    ['a parent id that is not a uuid', creation({ parentId: 'nope' })],
    ['an anchor that is not a LineRange', creation({ anchor: { side: 'sideways', startLine: 1, endLine: 2 } })],
    ['an anchor with a non-integer line', creation({ anchor: { side: 'new', startLine: 1.5, endLine: 2 } })],
    ['a quote that is not a string', creation({ quote: 12 })],
    ['a quote past the ceiling', creation({ quote: 'x'.repeat(4_001) })],
    ['a body that is not a string', creation({ body: null })],
    ['an empty body', creation({ body: '   ' })],
    ['a body past the ceiling', creation({ body: 'x'.repeat(16_001) })],
  ])('refuses %s, and writes nothing', async (_label, args) => {
    expect(await invoke('plans:comments:create', args)).toBe(false)
    expect(mockCreateComment).not.toHaveBeenCalled()
  })
})

describe('plans:comments:update', () => {
  it('passes a well-formed edit through', async () => {
    expect(await invoke('plans:comments:update', { id: COMMENT_ID, body: 'rewritten' })).toBe(true)
    expect(mockUpdateComment).toHaveBeenCalledWith(COMMENT_ID, 'rewritten')
  })

  it.each([
    ['no payload at all', undefined],
    ['an id that is not a uuid', { id: 'nope', body: 'rewritten' }],
    ['a missing id', { body: 'rewritten' }],
    ['a body that is not a string', { id: COMMENT_ID, body: 7 }],
    ['an empty body', { id: COMMENT_ID, body: '\n\t ' }],
    ['a body past the ceiling', { id: COMMENT_ID, body: 'x'.repeat(16_001) }],
  ])('refuses %s, and writes nothing', async (_label, args) => {
    expect(await invoke('plans:comments:update', args)).toBe(false)
    expect(mockUpdateComment).not.toHaveBeenCalled()
  })
})

describe('plans:comments:delete', () => {
  it('passes a well-formed id through', async () => {
    expect(await invoke('plans:comments:delete', COMMENT_ID)).toBe(true)
    expect(mockDeleteComment).toHaveBeenCalledWith(COMMENT_ID)
  })

  it.each([
    ['not a uuid', 'nope'],
    ['a number', 7],
    ['nothing at all', undefined],
    ['the id wrapped in an object', { id: COMMENT_ID }],
  ])('refuses %s, and deletes nothing', async (_label, id) => {
    expect(await invoke('plans:comments:delete', id)).toBe(false)
    expect(mockDeleteComment).not.toHaveBeenCalled()
  })
})

describe('the read channels this file already had', () => {
  it('still guards plans:detail on the shape of its id', async () => {
    expect(await invoke('plans:detail', 'nope')).toEqual({ session: null, tickets: [], failed: false })
    expect(mockListDetail).not.toHaveBeenCalled()
  })
})
