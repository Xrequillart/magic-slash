import { describe, it, expect, vi, beforeEach } from 'vitest'

// fs.existsSync decides which attached paths are usable; drive it from a set.
const existing = new Set<string>()
vi.mock('fs', () => ({
  existsSync: (p: string) => existing.has(p),
}))

const config = vi.hoisted(() => ({ current: { repositories: {} } as { repositories: Record<string, { path: string }> } }))
vi.mock('../config/config', () => ({
  readConfig: () => config.current,
}))

import { resolveAgentCwd } from './agent-cwd'

const HOME = process.env.HOME

describe('resolveAgentCwd', () => {
  beforeEach(() => {
    existing.clear()
    config.current = { repositories: {} }
  })

  it('falls back when no repository is attached', () => {
    expect(resolveAgentCwd([], '/fallback')).toBe('/fallback')
    expect(resolveAgentCwd(undefined, '/fallback')).toBe('/fallback')
  })

  it('prefers a configured repository over the launch folder', () => {
    existing.add('/home/me/Documents')
    existing.add('/home/me/Documents/magic-slash')
    config.current = { repositories: { 'magic-slash': { path: '/home/me/Documents/magic-slash' } } }

    // ⌘N seeds repositories[0] with ~/Documents; the repo is appended afterwards.
    const cwd = resolveAgentCwd(['/home/me/Documents', '/home/me/Documents/magic-slash'], '/fallback')
    expect(cwd).toBe('/home/me/Documents/magic-slash')
  })

  it('keeps the first attached path when none is configured', () => {
    existing.add('/work/api')
    existing.add('/work/web')
    expect(resolveAgentCwd(['/work/api', '/work/web'], '/fallback')).toBe('/work/api')
  })

  it('skips paths that no longer exist', () => {
    existing.add('/work/web')
    expect(resolveAgentCwd(['/work/gone', '/work/web'], '/fallback')).toBe('/work/web')
    expect(resolveAgentCwd(['/work/gone'], '/fallback')).toBe('/fallback')
  })

  it('expands ~ in both attached and configured paths', () => {
    existing.add(`${HOME}/Documents`)
    existing.add(`${HOME}/code/api`)
    config.current = { repositories: { api: { path: '~/code/api' } } }

    expect(resolveAgentCwd(['~/Documents', '~/code/api'], '/fallback')).toBe(`${HOME}/code/api`)
  })
})
