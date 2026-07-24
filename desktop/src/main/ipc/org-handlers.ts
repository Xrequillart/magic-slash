import { ipcMain } from 'electron'
import type { AcceptInvitationResult, PickUpTaskResult } from '../cloud/org'
import type { Config, Invitation, Member, MembershipRole, Org, OrgAgent, OrgSharedConfig, RealtimeStatus, UsageStats } from '../../types'
import { getRealtimeStatus } from '../cloud/realtime'
import {
  getCurrentOrg,
  listMembers,
  listInvitations,
  createInvitation,
  deleteInvitation,
  acceptInvitation,
  applySharedConfig,
  setOrgSharedConfig,
  listOrgs,
  listOrgAgents,
  listOrgUsageStats,
  pickUpTask,
  removeMember,
  leaveOrg,
  updateMemberRole,
  archiveOrg,
  switchOrg,
} from '../cloud/org'

interface InviteArgs { email: string; role?: MembershipRole }
interface AcceptArgs { token: string }
interface OrgIdArgs { orgId: string }
interface MemberArgs { orgId: string; userId: string }
interface RoleArgs { orgId: string; userId: string; role: MembershipRole }
interface SetSharedArgs { shared: OrgSharedConfig; orgId?: string }
interface PickUpArgs { ticketId: string; repositories: string[] }

export function setupOrgHandlers(): void {
  ipcMain.handle('org:current', async (): Promise<Org | null> => getCurrentOrg())

  ipcMain.handle('org:members', async (): Promise<Member[]> => listMembers())

  ipcMain.handle('org:list', async (): Promise<Org[]> => listOrgs())

  ipcMain.handle('org:listAgents', async (): Promise<OrgAgent[]> => listOrgAgents())

  ipcMain.handle('org:getUsageStats', async (): Promise<UsageStats> => listOrgUsageStats())

  // Pick up a colleague's task: resolve their repo(s) to a LOCAL configured path
  // and hand back the cwd + `/magic:continue` prompt (renderer launches). Throws a
  // user-facing error when nothing maps locally.
  ipcMain.handle('org:pickUpTask', async (_event, { ticketId, repositories }: PickUpArgs): Promise<PickUpTaskResult> => {
    if (!Array.isArray(repositories)) {
      throw new Error('org:pickUpTask requires repositories (string[])')
    }
    return pickUpTask(ticketId, repositories)
  })

  ipcMain.handle('org:realtimeStatus', async (): Promise<RealtimeStatus> => getRealtimeStatus())

  ipcMain.handle('org:invitations', async (): Promise<Invitation[]> => listInvitations())

  ipcMain.handle('org:invite', async (_event, { email, role }: InviteArgs): Promise<Invitation> =>
    createInvitation(email, role ?? 'user'),
  )

  ipcMain.handle('org:deleteInvitation', async (_event, { id }: { id: string }): Promise<void> =>
    deleteInvitation(id),
  )

  ipcMain.handle('org:accept', async (_event, { token }: AcceptArgs): Promise<AcceptInvitationResult> =>
    acceptInvitation(token),
  )

  ipcMain.handle('org:applyShared', async (): Promise<Config> => applySharedConfig())

  ipcMain.handle('org:setShared', async (_event, { shared, orgId }: SetSharedArgs): Promise<void> => {
    if (typeof shared !== 'object' || shared === null) {
      throw new Error('org:setShared: "shared" must be a non-null object')
    }
    return setOrgSharedConfig(shared, orgId)
  })

  ipcMain.handle('org:removeMember', async (_event, { orgId, userId }: MemberArgs): Promise<void> =>
    removeMember(orgId, userId),
  )

  ipcMain.handle('org:leave', async (_event, { orgId }: OrgIdArgs): Promise<void> => leaveOrg(orgId))

  ipcMain.handle('org:updateRole', async (_event, { orgId, userId, role }: RoleArgs): Promise<void> =>
    updateMemberRole(orgId, userId, role),
  )

  ipcMain.handle('org:archive', async (_event, { orgId }: OrgIdArgs): Promise<void> => archiveOrg(orgId))

  ipcMain.handle('org:switch', async (_event, { orgId }: OrgIdArgs): Promise<Config> => switchOrg(orgId))
}
