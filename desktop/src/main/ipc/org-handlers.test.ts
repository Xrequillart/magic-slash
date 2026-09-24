import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The shape guard on `org:membersRead`, and nothing else: an orgId that is not a uuid is
 * refused here and never reaches the roster RPC. Who may read which roster is the RPC's
 * job (`list_org_members` raises unless the caller is a member).
 *
 * Mocked in the style of plans-handlers.test.ts: `ipcMain.handle` is captured so the
 * handler can be invoked directly, and the cloud modules are replaced because they import
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

const mockListMembersRead = vi.fn()
vi.mock('../cloud/org', () => ({
  listMembersRead: (...args: unknown[]) => mockListMembersRead(...args),
}))
vi.mock('../cloud/realtime', () => ({ getRealtimeStatus: vi.fn() }))

const ORG_ID = '11111111-1111-4111-8111-111111111111'

describe('org:membersRead', () => {
  beforeEach(async () => {
    handlers.clear()
    mockListMembersRead.mockReset()
    const { setupOrgHandlers } = await import('./org-handlers')
    setupOrgHandlers()
  })

  it('forwards a uuid orgId to the roster read', async () => {
    mockListMembersRead.mockResolvedValue({ members: [], ok: true })
    const result = await handlers.get('org:membersRead')!(null, { orgId: ORG_ID })
    expect(mockListMembersRead).toHaveBeenCalledWith(ORG_ID)
    expect(result).toEqual({ members: [], ok: true })
  })

  it.each([
    ['no args', undefined],
    ['no orgId', {}],
    ['an empty orgId', { orgId: '' }],
    ['a non-uuid string', { orgId: 'not-a-uuid' }],
    ['a number', { orgId: 42 }],
  ])('refuses %s without calling the RPC', async (_label, args) => {
    const result = await handlers.get('org:membersRead')!(null, args)
    expect(result).toEqual({ members: [], ok: false })
    expect(mockListMembersRead).not.toHaveBeenCalled()
  })
})
