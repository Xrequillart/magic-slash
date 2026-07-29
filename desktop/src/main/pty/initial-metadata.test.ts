import { describe, it, expect } from 'vitest'
import { withDetectedBranch } from './initial-metadata'
import type { TerminalMetadata } from '../../types'

/**
 * The branch an agent is stored with.
 *
 * `terminal.branchName` (git, displayed) and `metadata.branchName` (persisted, and
 * the source of the `branch_name` column) used to be two facts that never met, so
 * every agent was saved with an empty branch while the sidebar showed the right
 * one. These are the rules of the join.
 *
 * This file imports ONLY `./initial-metadata` and a type. Reaching the helper
 * through `terminal-manager` would pull `node-pty`, which CI does not install —
 * that is exactly how this suite failed on the 0.59.1 release commit.
 */

/** The shape createDefaultMetadata() produces: every field present, all empty. */
function defaults(overrides: Partial<TerminalMetadata> = {}): TerminalMetadata {
  return {
    title: '',
    branchName: '',
    ticketId: '',
    description: '',
    status: '',
    fullStackTaskId: '',
    relatedWorktrees: [],
    repositoryMetadata: {},
    ...overrides,
  }
}

describe('withDetectedBranch', () => {
  it('records the branch git reported', () => {
    expect(withDetectedBranch(defaults(), 'feature/x').branchName).toBe('feature/x')
  })

  it('leaves the branch empty when git reported nothing', () => {
    // Detached HEAD, or a directory that is not a repository at all.
    expect(withDetectedBranch(defaults(), null).branchName).toBe('')
  })

  it('does not overwrite a branch that is already set', () => {
    // A skill that knows which branch it is about to create beats the checkout we
    // happen to open in — usually `main`.
    expect(withDetectedBranch(defaults({ branchName: 'feature/from-skill' }), 'main').branchName).toBe(
      'feature/from-skill',
    )
  })

  it('treats the empty default as unset, not as a value', () => {
    // createDefaultMetadata() writes '' everywhere, so callers routinely pass an
    // empty branchName. Reading that as "already set" is what kept the bug alive.
    expect(withDetectedBranch(defaults({ branchName: '' }), 'feature/x').branchName).toBe('feature/x')
  })

  it('leaves every other field untouched', () => {
    const result = withDetectedBranch(defaults({ ticketId: 'PROJ-1', title: 'T' }), 'feature/x')
    expect(result.ticketId).toBe('PROJ-1')
    expect(result.title).toBe('T')
    expect(result.relatedWorktrees).toEqual([])
  })

  it('returns the input untouched rather than a copy when there is nothing to add', () => {
    // Cheap, and it keeps referential equality for the no-op case so a caller
    // cannot mistake "we filled the branch" for "we rebuilt the metadata".
    const input = defaults({ branchName: 'feature/kept' })
    expect(withDetectedBranch(input, 'main')).toBe(input)
    expect(withDetectedBranch(input, null)).toBe(input)
  })
})
