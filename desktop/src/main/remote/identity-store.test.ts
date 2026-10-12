import * as fs from 'fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { TEST_CONFIG_DIR, keychain } = vi.hoisted(() => ({
  // Built without `path`/`os`: vi.hoisted runs before the imports are initialised.
  TEST_CONFIG_DIR: `${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/magic-slash-remote-identity-test`,
  keychain: { available: true },
}))

// A reversible prefix rather than real encryption, as in jira/persistence.test.ts: the
// suite reads the file back to prove what landed.
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => keychain.available,
    encryptString: (plain: string) => Buffer.from(`enc:${plain}`, 'utf-8'),
    decryptString: (blob: Buffer) => blob.toString('utf-8').replace(/^enc:/, ''),
  },
}))

vi.mock('../config/paths', () => ({ CONFIG_DIR: TEST_CONFIG_DIR }))

import { addDevice, listDevices, loadIdentity, loadOrCreateIdentity, removeDevice, RemoteKeychainUnavailableError } from './identity-store'
import { isRemoteModeEnabled, setRemoteModeEnabled } from './remote-mode'

const ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const device = { phoneId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'iPhone', pub: 'BAAA', pairedAt: 1 }

beforeEach(() => {
  keychain.available = true
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
})

afterEach(() => {
  fs.rmSync(TEST_CONFIG_DIR, { recursive: true, force: true })
})

describe('identity store', () => {
  it('creates the identity lazily, encrypted, mode 0600, one file per account', () => {
    expect(loadIdentity(ALICE)).toBeNull()
    const identity = loadOrCreateIdentity(ALICE)
    expect(identity.macId).toMatch(/^[0-9a-f-]{36}$/)
    expect(identity.macPrivate).toMatch(/^[0-9a-f]{64}$/)
    const file = `${TEST_CONFIG_DIR}/remote-${ALICE}.enc`
    expect(fs.readFileSync(file, 'utf8').startsWith('enc:')).toBe(true)
    expect(fs.statSync(file).mode & 0o777).toBe(0o600)
    expect(loadOrCreateIdentity(ALICE)).toEqual(identity)
    expect(loadOrCreateIdentity(BOB).macId).not.toBe(identity.macId)
  })

  it('adds, lists and removes devices of one account only', () => {
    loadOrCreateIdentity(ALICE)
    loadOrCreateIdentity(BOB)
    addDevice(ALICE, device)
    expect(listDevices(ALICE)).toEqual([device])
    expect(listDevices(BOB)).toEqual([])
    removeDevice(ALICE, device.phoneId)
    expect(listDevices(ALICE)).toEqual([])
  })

  it('refuses to create or save without a keychain, and load never throws', () => {
    keychain.available = false
    expect(() => loadOrCreateIdentity(ALICE)).toThrow(RemoteKeychainUnavailableError)
    expect(loadIdentity(ALICE)).toBeNull()
    keychain.available = true
    fs.mkdirSync(TEST_CONFIG_DIR, { recursive: true })
    fs.writeFileSync(`${TEST_CONFIG_DIR}/remote-${ALICE}.enc`, 'enc:{not json')
    expect(loadIdentity(ALICE)).toBeNull()
  })

  it('refuses a user id that is not a uuid', () => {
    expect(loadIdentity('../../etc')).toBeNull()
    expect(() => loadOrCreateIdentity('../../etc')).toThrow()
  })
})

describe('remote mode', () => {
  it('is off by default, persists, and reads a corrupt file as off', () => {
    expect(isRemoteModeEnabled()).toBe(false)
    expect(setRemoteModeEnabled(true)).toBe(true)
    expect(isRemoteModeEnabled()).toBe(true)
    setRemoteModeEnabled(false)
    expect(isRemoteModeEnabled()).toBe(false)
    fs.writeFileSync(`${TEST_CONFIG_DIR}/remote-mode.json`, '{"enabled": "yes"')
    expect(isRemoteModeEnabled()).toBe(false)
  })
})
