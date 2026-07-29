import { describe, it, expect } from 'vitest'
import { initialMetadataFor } from './terminal-manager'

/**
 * The branch an agent is created with.
 *
 * `terminal.branchName` (what git reports, shown in the UI) and
 * `metadata.branchName` (what gets persisted, and ends up in the `branch_name`
 * column) used to be two separate facts that never met — so every agent was stored
 * with an empty branch while the sidebar displayed the right one. This helper is
 * the join, and these are the three rules it has to get right.
 */
describe('initialMetadataFor', () => {
  it('folds the detected branch into the metadata that will be persisted', () => {
    expect(initialMetadataFor('feature/x').branchName).toBe('feature/x')
  })

  it('leaves the branch empty when git reports nothing', () => {
    // Detached HEAD, or a directory that is not a repository at all.
    expect(initialMetadataFor(null).branchName).toBe('')
  })

  it('lets a caller-supplied branch win over the checkout we opened in', () => {
    // A skill that already knows which branch it is about to create is a better
    // source than the branch the terminal happens to start on (usually `main`).
    expect(initialMetadataFor('main', { branchName: 'feature/from-skill' }).branchName).toBe(
      'feature/from-skill',
    )
  })

  it('uses the detected branch when the supplied metadata carries only the unset default', () => {
    // createDefaultMetadata() writes '' for every field, so callers routinely pass
    // an empty branchName. Treating that as "supplied" would keep the bug alive.
    expect(initialMetadataFor('feature/x', { branchName: '' }).branchName).toBe('feature/x')
  })

  it('keeps the rest of the supplied metadata untouched', () => {
    const meta = initialMetadataFor('feature/x', { ticketId: 'PROJ-1', title: 'T' })
    expect(meta.ticketId).toBe('PROJ-1')
    expect(meta.title).toBe('T')
  })

  it('still fills every default field, so no consumer sees an undefined', () => {
    const meta = initialMetadataFor(null)
    expect(meta.ticketId).toBe('')
    expect(meta.status).toBe('')
    expect(meta.relatedWorktrees).toEqual([])
  })
})
