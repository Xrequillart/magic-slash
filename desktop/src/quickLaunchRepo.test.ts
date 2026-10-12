import { describe, expect, it } from 'vitest'
import { quickLaunchRepo } from './quickLaunchRepo'
import type { RepositoryConfig } from './types'

const repo = (path: string, keywords: string[]) => ({ path, keywords }) as RepositoryConfig
const REPOS = {
  api: repo('/code/api', ['backend', 'graphql']),
  web: repo('/code/web', ['frontend', 'react', 'landing']),
  mobile: repo('/code/mobile', ['ios', 'react']),
}

describe('quickLaunchRepo', () => {
  it('opens in the first repository by default, as Quick Launch always did', () => {
    expect(quickLaunchRepo(REPOS, undefined, 'fix the landing')?.path).toBe('/code/api')
    expect(quickLaunchRepo(REPOS, 'first', 'fix the landing')?.path).toBe('/code/api')
  })

  it('opens in a named repository, and falls back when it is gone', () => {
    expect(quickLaunchRepo(REPOS, 'web', 'anything')?.path).toBe('/code/web')
    expect(quickLaunchRepo(REPOS, 'removed', 'anything')?.path).toBe('/code/api')
  })

  it('matches keywords and names as whole words, ignoring case', () => {
    expect(quickLaunchRepo(REPOS, 'match', 'Fix the Landing hero')?.path).toBe('/code/web')
    expect(quickLaunchRepo(REPOS, 'match', 'crash on iOS')?.path).toBe('/code/mobile')
    expect(quickLaunchRepo(REPOS, 'match', 'bump the web deps')?.path).toBe('/code/web')
    // "reactive" is not "react"
    expect(quickLaunchRepo(REPOS, 'match', 'a reactive store')?.path).toBe('/code/api')
  })

  it('prefers the most hits, then the first listed, then the first repository', () => {
    expect(quickLaunchRepo(REPOS, 'match', 'react frontend landing')?.path).toBe('/code/web')
    expect(quickLaunchRepo(REPOS, 'match', 'react')?.path).toBe('/code/web')
    expect(quickLaunchRepo(REPOS, 'match', 'nothing relevant')?.path).toBe('/code/api')
  })

  it('has nothing to open with no repositories', () => {
    expect(quickLaunchRepo({}, 'match', 'x')).toBeUndefined()
  })
})
