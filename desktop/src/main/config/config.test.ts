import { describe, it, expect, beforeEach } from 'vitest'
import { setStore, NOOP_STORE } from '../store/Store'
import { readConfig, updateUsageLogsEnabled } from './config'

// updateUsageLogsEnabled toggles the GDPR opt-in on the in-memory config cache and
// writes through to the store (NOOP here). readConfig serves the cache back.
beforeEach(() => {
  setStore(NOOP_STORE)
})

describe('updateUsageLogsEnabled', () => {
  it('is off by default (never set on a fresh config)', () => {
    expect(readConfig().usageLogsEnabled).toBeUndefined()
  })

  it('enables the opt-in and reflects it in the returned + cached config', () => {
    const config = updateUsageLogsEnabled(true)
    expect(config.usageLogsEnabled).toBe(true)
    expect(readConfig().usageLogsEnabled).toBe(true)
  })

  it('disables the opt-in again', () => {
    updateUsageLogsEnabled(true)
    const config = updateUsageLogsEnabled(false)
    expect(config.usageLogsEnabled).toBe(false)
    expect(readConfig().usageLogsEnabled).toBe(false)
  })
})
