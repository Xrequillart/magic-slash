import { ipcMain, type BrowserWindow } from 'electron'
import type { RemotePairing, RemoteState } from '../../types'
import {
  approveRemotePairing,
  cancelRemotePairing,
  declineRemotePairing,
  getRemoteState,
  initRemoteRelay,
  revokeRemoteDevice,
  setRemoteEmitters,
  setRemoteEnabled,
  startRemotePairing,
} from '../remote/relay'

/**
 * Remote access (#352): the settings page's half of the relay to paired iPhones.
 *
 * The renderer flips remote mode, drives a pairing and revokes devices; it never holds a
 * key, a token or the socket. What moves on its own — the relay's health, the device list,
 * a phone scanning the QR — is pushed back on `remote:state` and `remote:pairing`.
 *
 * Joining the channel is NOT started here: the connectivity gate does it on `ok`, like every
 * other realtime channel, because it needs the hydrated session.
 */
export function setupRemoteHandlers(getMainWindow: () => BrowserWindow | null): void {
  setRemoteEmitters({
    state: (state: RemoteState) => getMainWindow()?.webContents.send('remote:state', state),
    pairing: (pairing: RemotePairing | null) => getMainWindow()?.webContents.send('remote:pairing', pairing),
  })
  initRemoteRelay()

  ipcMain.handle('remote:getState', async (): Promise<RemoteState> => getRemoteState())

  ipcMain.handle('remote:setEnabled', async (_event, enabled: unknown): Promise<RemoteState> => {
    if (typeof enabled !== 'boolean') return getRemoteState()
    return setRemoteEnabled(enabled)
  })

  ipcMain.handle('remote:startPairing', async (): Promise<RemotePairing | null> => startRemotePairing())

  // With an attempt id, only that attempt closes: a late cleanup from the page for an older
  // `startPairing` must not close the pairing a newer one put up.
  ipcMain.handle('remote:cancelPairing', async (_event, attemptId: unknown): Promise<void> => {
    if (attemptId === undefined || attemptId === null) cancelRemotePairing()
    else if (typeof attemptId === 'string') cancelRemotePairing(attemptId)
  })

  // Rejects when the device cannot be stored (no keychain) or the phone cannot be told (relay
  // not live): the page must not show "paired" for a phone that is not paired on both ends.
  ipcMain.handle('remote:approvePairing', async (): Promise<void> => {
    await approveRemotePairing()
  })

  ipcMain.handle('remote:declinePairing', async (): Promise<void> => {
    declineRemotePairing()
  })

  ipcMain.handle('remote:revokeDevice', async (_event, phoneId: unknown): Promise<RemoteState> => {
    if (typeof phoneId !== 'string' || !phoneId) return getRemoteState()
    return revokeRemoteDevice(phoneId)
  })
}
