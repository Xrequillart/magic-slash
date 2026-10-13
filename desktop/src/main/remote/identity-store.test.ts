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

import {
  addDevice,
  listDevices,
  loadIdentity,
  loadOrCreateIdentity,
  removeDevice,
  RemoteKeychainUnavailableError,
  saveGeneration,
  saveIdentity,
} from './identity-store'
import { isRemoteModeEnabled, setRemoteModeEnabled } from './remote-mode'

const ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const device = {
  phoneId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  name: 'iPhone',
  pub: 'BAAA',
  pairedAt: 1,
  pairingId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
}

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

  it('starts at generation 0 and keeps the generation it is given, never going back', () => {
    expect(loadOrCreateIdentity(ALICE).generation).toBe(0)
    saveGeneration(ALICE, 3)
    expect(loadIdentity(ALICE)?.generation).toBe(3)
    // Adding a device keeps it.
    addDevice(ALICE, device)
    expect(loadIdentity(ALICE)?.generation).toBe(3)
    saveGeneration(ALICE, 2)
    expect(loadIdentity(ALICE)?.generation).toBe(3)
    expect(() => saveGeneration(BOB, 1)).toThrow()
  })

  it('drops a stored device without a pairing id, with a log line, and keeps the rest', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const identity = loadOrCreateIdentity(ALICE)
    const legacy = { phoneId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', name: 'Old iPhone', pub: 'BAAA', pairedAt: 1 }
    // Written as a dev build from before pairings were named would have.
    saveIdentity(ALICE, { ...identity, devices: [legacy as unknown as typeof device, device] })
    expect(listDevices(ALICE)).toEqual([device])
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('without a pairing id'))
    warn.mockRestore()
  })

  it('keeps a device\'s signing key, and reads a device without one as paired all the same', () => {
    loadOrCreateIdentity(ALICE)
    const signing = { ...device, phoneId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', signPub: 'BBBB' }
    addDevice(ALICE, device)
    addDevice(ALICE, signing)
    expect(listDevices(ALICE)).toEqual([device, signing])
    expect(listDevices(ALICE)[0]).not.toHaveProperty('signPub')
  })

  it('reads a signing key that is not a string as none, and keeps the device', () => {
    const identity = loadOrCreateIdentity(ALICE)
    saveIdentity(ALICE, { ...identity, devices: [{ ...device, signPub: 42 as unknown as string }] })
    expect(listDevices(ALICE)).toEqual([device])
  })

  it('reads an identity file without a generation as generation 0', () => {
    const identity = loadOrCreateIdentity(ALICE)
    const older: Partial<typeof identity> = { ...identity }
    delete older.generation
    fs.writeFileSync(`${TEST_CONFIG_DIR}/remote-${ALICE}.enc`, `enc:${JSON.stringify(older)}`)
    expect(loadIdentity(ALICE)).toEqual({ ...identity, generation: 0 })
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
