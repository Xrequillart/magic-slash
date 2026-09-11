import { describe, it, expect } from 'vitest'
import { configKeyForRepoId, getProjectColor, getProjectColorMap, PROJECT_COLORS, REPO_COLOR_CHOICES, REPO_QUICK_COLORS } from './projectColors'

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

describe('configKeyForRepoId', () => {
  const repositories = {
    api: { id: 'r1' },
    'api (Acme)': { id: 'r2' },
    legacy: {},
  }

  it('answers the config key that carries the cloud id', () => {
    expect(configKeyForRepoId('r1', repositories)).toBe('api')
  })

  it('tells two repositories of the same name apart', () => {
    // The whole point: both are called `api` in their own organization, and only the
    // uuid says which of the two a row is about.
    expect(configKeyForRepoId('r2', repositories)).toBe('api (Acme)')
  })

  it('answers undefined for a repository this machine has no entry for', () => {
    // Routine on the Plans page: an organization's sessions include repositories the
    // reader has never cloned. The caller draws the neutral mark.
    expect(configKeyForRepoId('r9', repositories)).toBeUndefined()
  })

  it('answers undefined with no id, and with no config at all', () => {
    expect(configKeyForRepoId(undefined, repositories)).toBeUndefined()
    expect(configKeyForRepoId('r1', undefined)).toBeUndefined()
    // An entry predating the cloud id must not match a missing one.
    expect(configKeyForRepoId('', repositories)).toBeUndefined()
  })
})

describe('REPO_COLOR_CHOICES', () => {
  it('offers every fallback colour', () => {
    // The picker highlights the repo's CURRENT colour, and a repo that never chose
    // one is drawn in a PROJECT_COLORS entry. Drop one of those from the choices and
    // that repo opens a grid with nothing selected in it.
    for (const color of PROJECT_COLORS) {
      expect(REPO_COLOR_CHOICES).toContain(color)
    }
  })

  it('fills the grid exactly, with no colour twice', () => {
    expect(REPO_COLOR_CHOICES).toHaveLength(36)
    expect(new Set(REPO_COLOR_CHOICES).size).toBe(REPO_COLOR_CHOICES.length)
  })
})

describe('REPO_QUICK_COLORS', () => {
  it('is the head of the grid, in the grid order', () => {
    // The row is the modal's first line brought forward. Slice it apart and the
    // quick pick stops landing in the column it points at.
    expect(REPO_QUICK_COLORS).toEqual(REPO_COLOR_CHOICES.slice(0, 6))
  })

  it('holds one grid row', () => {
    expect(REPO_QUICK_COLORS).toHaveLength(6)
  })
})
