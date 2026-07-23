import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Supabase client + session-store so the auth functions exercise only
// their own logic (no network, no keychain). vi.hoisted lets the vi.mock
// factories (hoisted above imports) share mutable state we tweak per test.
const h = vi.hoisted(() => {
  const mockAuth = {
    resetPasswordForEmail: vi.fn(),
    verifyOtp: vi.fn(),
    updateUser: vi.fn(),
    setSession: vi.fn(),
    signOut: vi.fn(),
  }
  const mockRpc = vi.fn()
  const state = {
    cloudEnabled: true as boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: { auth: mockAuth, rpc: mockRpc } as any,
    saveSession: vi.fn(),
    clearSession: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stored: null as any,
  }
  return { mockAuth, mockRpc, state }
})

vi.mock('./supabase-client', () => ({
  getSupabaseClient: () => h.state.client,
  isCloudEnabled: () => h.state.cloudEnabled,
}))

vi.mock('./session-store', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveSession: (...args: any[]) => h.state.saveSession(...args),
  loadSession: () => h.state.stored,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clearSession: (...args: any[]) => h.state.clearSession(...args),
}))

import {
  requestPasswordReset,
  confirmPasswordReset,
  updatePassword,
  requestEmailChange,
  confirmEmailChange,
  deleteAccount,
} from './auth'

const SESSION = {
  access_token: 'access-2',
  refresh_token: 'refresh-2',
  expires_at: 9999999999,
  user: { id: 'u1', email: 'user@example.com' },
}

beforeEach(() => {
  vi.clearAllMocks()
  h.state.cloudEnabled = true
  h.state.client = { auth: h.mockAuth, rpc: h.mockRpc }
  h.state.stored = { access_token: 'access-1', refresh_token: 'refresh-1', expires_at: 9999999999, user: { id: 'u1', email: 'user@example.com' } }
  // getAuthedClient() applies the stored session and expects a live session back.
  h.mockAuth.setSession.mockResolvedValue({ data: { session: SESSION }, error: null })
  h.mockAuth.signOut.mockResolvedValue({ error: null })
})

describe('requestPasswordReset', () => {
  it('sends a recovery email for the given address', async () => {
    h.mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null })
    await expect(requestPasswordReset('  user@example.com  ')).resolves.toBeUndefined()
    expect(h.mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com')
  })

  it('throws when cloud is disabled', async () => {
    h.state.client = null
    h.state.cloudEnabled = false
    await expect(requestPasswordReset('user@example.com')).rejects.toThrow('Cloud features are not available')
  })

  it('propagates a send error', async () => {
    h.mockAuth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'rate limited' } })
    await expect(requestPasswordReset('user@example.com')).rejects.toThrow('rate limited')
  })
})

describe('confirmPasswordReset', () => {
  it('verifies the recovery code, sets the new password, then clears the transient session', async () => {
    h.mockAuth.verifyOtp.mockResolvedValue({ data: { session: SESSION }, error: null })
    h.mockAuth.updateUser.mockResolvedValue({ data: {}, error: null })

    await expect(confirmPasswordReset('user@example.com', '123456', 'newpass')).resolves.toBeUndefined()
    expect(h.mockAuth.verifyOtp).toHaveBeenCalledWith({ email: 'user@example.com', token: '123456', type: 'recovery' })
    expect(h.mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newpass' })
    expect(h.state.clearSession).toHaveBeenCalled()
  })

  it('throws on an invalid code and does not update the password', async () => {
    h.mockAuth.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Token has expired or is invalid' } })
    await expect(confirmPasswordReset('user@example.com', '000000', 'newpass')).rejects.toThrow('Token has expired or is invalid')
    expect(h.mockAuth.updateUser).not.toHaveBeenCalled()
  })

  it('throws when cloud is disabled', async () => {
    h.state.client = null
    h.state.cloudEnabled = false
    await expect(confirmPasswordReset('user@example.com', '123456', 'newpass')).rejects.toThrow('Cloud features are not available')
  })
})

describe('updatePassword', () => {
  it('updates the password for the signed-in user', async () => {
    h.mockAuth.updateUser.mockResolvedValue({ data: {}, error: null })
    await expect(updatePassword('newpass')).resolves.toBeUndefined()
    expect(h.mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newpass' })
  })

  it('throws when there is no session (not signed in / cloud disabled)', async () => {
    h.state.stored = null
    await expect(updatePassword('newpass')).rejects.toThrow('You must be signed in to change your password')
  })

  it('propagates an update error', async () => {
    h.mockAuth.updateUser.mockResolvedValue({ data: {}, error: { message: 'weak password' } })
    await expect(updatePassword('x')).rejects.toThrow('weak password')
  })
})

describe('requestEmailChange', () => {
  it('requests an email change (triggers the OTP email)', async () => {
    h.mockAuth.updateUser.mockResolvedValue({ data: {}, error: null })
    await expect(requestEmailChange('  new@example.com ')).resolves.toBeUndefined()
    expect(h.mockAuth.updateUser).toHaveBeenCalledWith({ email: 'new@example.com' })
  })

  it('throws when not signed in', async () => {
    h.state.stored = null
    await expect(requestEmailChange('new@example.com')).rejects.toThrow('You must be signed in to change your email')
  })

  it('propagates a request error', async () => {
    h.mockAuth.updateUser.mockResolvedValue({ data: {}, error: { message: 'email already in use' } })
    await expect(requestEmailChange('new@example.com')).rejects.toThrow('email already in use')
  })
})

describe('confirmEmailChange', () => {
  it('verifies the code, persists the new session, and returns logged-in status', async () => {
    // A successful change returns a session whose user email is the new address.
    const updatedSession = { ...SESSION, user: { id: 'u1', email: 'new@example.com' } }
    h.mockAuth.verifyOtp.mockResolvedValue({ data: { session: updatedSession }, error: null })
    const status = await confirmEmailChange('new@example.com', '654321')
    expect(h.mockAuth.verifyOtp).toHaveBeenCalledWith({ email: 'new@example.com', token: '654321', type: 'email_change' })
    expect(h.state.saveSession).toHaveBeenCalled()
    expect(status).toEqual({ enabled: true, loggedIn: true, user: { id: 'u1', email: 'new@example.com' } })
  })

  it('throws "still pending" when the returned session email has not changed', async () => {
    // e.g. double_confirm_changes still on: verifying one code leaves the change
    // pending, so the email stays the old one. We must not report success.
    h.mockAuth.verifyOtp.mockResolvedValue({ data: { session: SESSION }, error: null })
    await expect(confirmEmailChange('new@example.com', '654321')).rejects.toThrow(/still pending/i)
    expect(h.state.saveSession).not.toHaveBeenCalled()
  })

  it('throws on an invalid code', async () => {
    h.mockAuth.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'invalid code' } })
    await expect(confirmEmailChange('new@example.com', '000000')).rejects.toThrow('invalid code')
  })

  it('throws when cloud is disabled', async () => {
    h.state.client = null
    h.state.cloudEnabled = false
    await expect(confirmEmailChange('new@example.com', '654321')).rejects.toThrow('Cloud features are not available')
  })
})

describe('deleteAccount', () => {
  it('calls the delete_account RPC, signs out, clears the session, and returns logged-out status', async () => {
    h.mockRpc.mockResolvedValue({ data: null, error: null })
    const status = await deleteAccount()
    expect(h.mockRpc).toHaveBeenCalledWith('delete_account')
    expect(h.mockAuth.signOut).toHaveBeenCalled()
    expect(h.state.clearSession).toHaveBeenCalled()
    expect(status).toEqual({ enabled: true, loggedIn: false })
  })

  it('throws when not signed in and does not call the RPC', async () => {
    h.state.stored = null
    await expect(deleteAccount()).rejects.toThrow('You must be signed in to delete your account')
    expect(h.mockRpc).not.toHaveBeenCalled()
  })

  it('propagates an RPC error and does not clear the session', async () => {
    h.mockRpc.mockResolvedValue({ data: null, error: { message: 'deletion failed' } })
    await expect(deleteAccount()).rejects.toThrow('deletion failed')
    expect(h.state.clearSession).not.toHaveBeenCalled()
  })
})
