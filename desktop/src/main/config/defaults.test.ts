import { describe, it, expect } from 'vitest'
import { isValidLaunchMode } from './defaults'

describe('isValidLaunchMode', () => {
  it('should return true for "plan"', () => {
    expect(isValidLaunchMode('plan')).toBe(true)
  })

  it('should return true for "default"', () => {
    expect(isValidLaunchMode('default')).toBe(true)
  })

  it('should return true for "acceptEdits"', () => {
    expect(isValidLaunchMode('acceptEdits')).toBe(true)
  })

  it('should return true for "auto"', () => {
    expect(isValidLaunchMode('auto')).toBe(true)
  })

  it('should return true for "bypassPermissions"', () => {
    expect(isValidLaunchMode('bypassPermissions')).toBe(true)
  })

  it('should return false for an invalid string', () => {
    expect(isValidLaunchMode('invalid')).toBe(false)
  })

  it('should return false for an empty string', () => {
    expect(isValidLaunchMode('')).toBe(false)
  })

  it('should return false for a number', () => {
    expect(isValidLaunchMode(42)).toBe(false)
  })

  it('should return false for null', () => {
    expect(isValidLaunchMode(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isValidLaunchMode(undefined)).toBe(false)
  })

  it('should return false for a boolean', () => {
    expect(isValidLaunchMode(true)).toBe(false)
  })

  it('should return false for an object', () => {
    expect(isValidLaunchMode({ mode: 'plan' })).toBe(false)
  })
})
