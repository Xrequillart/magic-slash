import { describe, it, expect } from 'vitest'
import { parseVersion, hasBlockingIssue } from './prerequisites'
import type { PrerequisiteStatus } from '../../types'

/**
 * Version parsing is tested against the ACTUAL banners these tools print, because
 * that is the only thing that can be wrong here: each one answers `--version` in its
 * own format, and a parser tuned to one of them silently reports "no version" for the
 * rest — which the setup panel would then render as "not installed".
 */
describe('parseVersion', () => {
  it.each([
    ['v20.11.0', 20, '20.11.0'],
    ['git version 2.39.3 (Apple Git-146)', 2, '2.39.3'],
    ['jq-1.7.1', 1, '1.7.1'],
    ['gh version 2.40.1 (2024-01-08)', 2, '2.40.1'],
    ['2.0.14 (Claude Code)', 2, '2.0.14'],
    // Two-component versions exist in the wild; the major still has to come through.
    ['jq-1.6', 1, '1.6'],
  ])('reads %s as major %i', (output, major, version) => {
    expect(parseVersion(output)).toEqual({ major, version })
  })

  it('returns nulls when there is no version to find', () => {
    // What a missing tool's output looks like: the shell's error, not a banner.
    expect(parseVersion('command not found: jq')).toEqual({ major: null, version: null })
    expect(parseVersion('')).toEqual({ major: null, version: null })
  })
})

function status(overrides: Partial<PrerequisiteStatus>): PrerequisiteStatus {
  return {
    id: 'jq',
    installed: true,
    outdated: false,
    version: '1.7.1',
    minVersion: null,
    required: true,
    installCommand: 'brew install jq',
    installable: true,
    docsUrl: null,
    ...overrides,
  }
}

describe('hasBlockingIssue', () => {
  it('is false when every required tool is present and current', () => {
    expect(hasBlockingIssue([status({}), status({ id: 'git' })])).toBe(false)
  })

  it('blocks on a missing required tool', () => {
    expect(hasBlockingIssue([status({ installed: false })])).toBe(true)
  })

  it('blocks on a required tool that is present but too old', () => {
    // Node 18 with the skills written against 20: installed, and still unusable.
    expect(hasBlockingIssue([status({ id: 'node', outdated: true, version: '18.19.0', minVersion: '20' })])).toBe(true)
  })

  it('does NOT block on a missing optional tool', () => {
    // gh absent only costs /magic:resolve its threaded replies. Treating that as
    // blocking would gate the whole app on a fallback nobody notices.
    expect(hasBlockingIssue([status({ id: 'gh', required: false, installed: false })])).toBe(false)
  })
})
