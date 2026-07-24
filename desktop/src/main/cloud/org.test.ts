import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as os from 'os'
import * as path from 'path'
import type { Config } from '../../types'

// pickUpTask resolves a colleague's absolute repo paths to one of the current
// user's LOCALLY configured repos. It reads the repo list via readConfig, so we
// mock the config cache and drive readConfig per test. expandPath (from
// ../config/validation) stays real — it is a pure ~-expansion helper.
const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  repositories: {} as Record<string, any>,
}))

vi.mock(import('../config/config'), async (importOriginal) => ({
  ...(await importOriginal()),
  readConfig: vi.fn(() => ({ repositories: h.repositories }) as unknown as Config),
}))

import { pickUpTask } from './org'

// Build a repositories map keyed by name from a list of paths.
const repos = (...paths: string[]) =>
  Object.fromEntries(paths.map((p, i) => [`repo${i}`, { path: p }]))

beforeEach(() => {
  h.repositories = {}
})

describe('pickUpTask', () => {
  it('matches a colleague repo to a local one by basename (different parent dirs)', () => {
    h.repositories = repos('/Users/xavier/dev/poppins-pex')
    const result = pickUpTask('PROJ-42', ['/home/alice/work/poppins-pex'])
    expect(result).toEqual({
      cwd: '/Users/xavier/dev/poppins-pex',
      initialPrompt: '/magic:continue PROJ-42',
    })
  })

  it('matches by exact expanded path when a ~ path expands to the same place', () => {
    h.repositories = repos('~/dev/api')
    const expanded = path.join(os.homedir(), 'dev/api')
    const result = pickUpTask('T-7', [expanded])
    expect(result.cwd).toBe(expanded)
    expect(result.initialPrompt).toBe('/magic:continue T-7')
  })

  it('returns the expanded local path as cwd, not the raw ~ path', () => {
    h.repositories = repos('~/dev/web')
    const result = pickUpTask('T-8', ['/somewhere/else/web'])
    expect(result.cwd).toBe(path.join(os.homedir(), 'dev/web'))
  })

  it('ignores trailing slashes on the colleague repo when matching by basename', () => {
    h.repositories = repos('/Users/xavier/dev/service')
    const result = pickUpTask('T-9', ['/remote/service/'])
    expect(result.cwd).toBe('/Users/xavier/dev/service')
  })

  it('skips empty/non-string colleague entries and matches a later valid one', () => {
    h.repositories = repos('/Users/xavier/dev/keep')
    const result = pickUpTask('T-10', [
      '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      42 as any,
      '/remote/keep',
    ])
    expect(result.cwd).toBe('/Users/xavier/dev/keep')
  })

  it('throws a user-facing error when no local repo maps', () => {
    h.repositories = repos('/Users/xavier/dev/other')
    expect(() => pickUpTask('T-11', ['/remote/unknown-repo'])).toThrowError(
      /No matching local repository is configured/,
    )
  })

  it('throws when there are no configured repositories at all', () => {
    h.repositories = {}
    expect(() => pickUpTask('T-12', ['/remote/anything'])).toThrowError(
      /No matching local repository is configured/,
    )
  })

  it('rejects an empty ticketId before any repo resolution', () => {
    h.repositories = repos('/Users/xavier/dev/x')
    expect(() => pickUpTask('   ', ['/remote/x'])).toThrowError(/requires a ticketId/)
  })

  it('picks the first matching colleague repo when several would map', () => {
    h.repositories = repos('/Users/xavier/dev/first', '/Users/xavier/dev/second')
    const result = pickUpTask('T-13', ['/remote/first', '/remote/second'])
    expect(result.cwd).toBe('/Users/xavier/dev/first')
  })
})
