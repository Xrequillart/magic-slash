import { ipcMain } from 'electron'
import type { AcceptInvitationResult, PickUpTaskResult } from '../cloud/org'
import type { Config, Invitation, Member, MembershipRole, Org, OrgActivity, OrgAgent, OrgSharedConfig, RealtimeStatus, SkillCounts, UsageStats } from '../../types'
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
  createOrganization,
  listOrgAgents,
  listOrgActivity,
  listOrgSkillCounts,
  listPersonalSkillCounts,
  listOrgUsageStats,
  pickUpTask,
  removeMember,
  leaveOrg,
  updateMemberRole,
  archiveOrg,
} from '../cloud/org'

interface InviteArgs { email: string; role?: MembershipRole; orgId?: string }
interface OptionalOrgIdArgs { orgId?: string }
interface CreateOrgArgs { name: string }
interface AcceptArgs { token: string }
interface OrgIdArgs { orgId: string }
interface MemberArgs { orgId: string; userId: string }
interface RoleArgs { orgId: string; userId: string; role: MembershipRole }
interface SetSharedArgs { shared: OrgSharedConfig; orgId?: string }
interface PickUpArgs { ticketId: string; repositories: string[] }
interface ActivityArgs { sinceMs?: number }

export function setupOrgHandlers(): void {
  ipcMain.handle('org:current', async (): Promise<Org | null> => getCurrentOrg())

  // orgId is optional: omitted → the active org. The settings page passes it so
  // it can render every org the user belongs to, not just the active one.
  ipcMain.handle('org:members', async (_event, args?: OptionalOrgIdArgs): Promise<Member[]> =>
    listMembers(args?.orgId),
  )

  ipcMain.handle('org:list', async (): Promise<Org[]> => listOrgs())

  ipcMain.handle('org:listAgents', async (): Promise<OrgAgent[]> => listOrgAgents())

  ipcMain.handle('org:getUsageStats', async (): Promise<UsageStats> => listOrgUsageStats())

  // orgId is REQUIRED here, unlike org:members: the Team page has a tab per
  // organization, so defaulting to the active one would answer about an org other
  // than the one on screen. An absent id yields no counts rather than the wrong ones.
  ipcMain.handle('org:getSkillCounts', async (_event, args?: OptionalOrgIdArgs): Promise<SkillCounts> =>
    args?.orgId ? listOrgSkillCounts(args.orgId) : {},
  )

  // A channel of its own rather than org:getSkillCounts with no id: an absent orgId
  // above means "the renderer lost it", and answering that with one person's counts
  // would turn a bug into a plausible-looking wrong number.
  ipcMain.handle('org:getPersonalSkillCounts', async (): Promise<SkillCounts> =>
    listPersonalSkillCounts(),
  )

  // sinceMs is advisory: listOrgActivity clamps it to the 90-day window, so a
  // bogus or absent value degrades to the full window rather than throwing.
  ipcMain.handle('org:getActivity', async (_event, args?: ActivityArgs): Promise<OrgActivity> =>
    listOrgActivity(args?.sinceMs),
  )

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

  ipcMain.handle('org:invitations', async (_event, args?: OptionalOrgIdArgs): Promise<Invitation[]> =>
    listInvitations(args?.orgId),
  )

  ipcMain.handle('org:invite', async (_event, { email, role, orgId }: InviteArgs): Promise<Invitation> =>
    createInvitation(email, role ?? 'user', orgId),
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

  ipcMain.handle('org:create', async (_event, { name }: CreateOrgArgs): Promise<string> => {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('org:create requires a non-empty name')
    }
    return createOrganization(name)
  })

}
