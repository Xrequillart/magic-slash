import { ipcMain } from 'electron'
import type { AcceptInvitationResult } from '../cloud/org'
import type { Config, Invitation, Member, MembershipRole, Org } from '../../types'
import { getCurrentOrg, listMembers, listInvitations, createInvitation, acceptInvitation, applySharedConfig } from '../cloud/org'

interface InviteArgs { email: string; role?: MembershipRole }
interface AcceptArgs { token: string }

export function setupOrgHandlers(): void {
  ipcMain.handle('org:current', async (): Promise<Org | null> => getCurrentOrg())

  ipcMain.handle('org:members', async (): Promise<Member[]> => listMembers())

  ipcMain.handle('org:invitations', async (): Promise<Invitation[]> => listInvitations())

  ipcMain.handle('org:invite', async (_event, { email, role }: InviteArgs): Promise<Invitation> =>
    createInvitation(email, role ?? 'user'),
  )

  ipcMain.handle('org:accept', async (_event, { token }: AcceptArgs): Promise<AcceptInvitationResult> =>
    acceptInvitation(token),
  )

  ipcMain.handle('org:applyShared', async (): Promise<Config> => applySharedConfig())
}
