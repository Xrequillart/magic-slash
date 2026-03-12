import { describe, it, expect } from 'vitest'
import { getProjectColor, getProjectColorMap, PROJECT_COLORS } from './projectColors'

describe('getProjectColor', () => {
  it('returns color at given index', () => {
    expect(getProjectColor(0)).toBe('#3B82F6')
    expect(getProjectColor(1)).toBe('#10B981')
  })

  it('wraps around when index exceeds palette length', () => {
    expect(getProjectColor(PROJECT_COLORS.length)).toBe(PROJECT_COLORS[0])
    expect(getProjectColor(PROJECT_COLORS.length + 1)).toBe(PROJECT_COLORS[1])
  })
})

describe('getProjectColorMap', () => {
  it('assigns colors by index', () => {
    const map = getProjectColorMap(['api', 'web'])
    expect(map).toEqual({
      api: '#3B82F6',
      web: '#10B981',
    })
  })

  it('uses configured colors when provided', () => {
    const map = getProjectColorMap(['api', 'web'], {
      api: { color: '#FFFFFF' },
    })
    expect(map.api).toBe('#FFFFFF')
    expect(map.web).toBe('#10B981')
  })

  it('falls back to palette when config has no color', () => {
    const map = getProjectColorMap(['api'], { api: {} })
    expect(map.api).toBe('#3B82F6')
  })
})
