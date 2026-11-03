import { beforeEach, describe, expect, it, vi } from 'vitest'

const readFile = vi.fn()
vi.mock('fs', () => ({ promises: { readFile: (...args: unknown[]) => readFile(...args) } }))

const { isFolderTrusted } = await import('./folder-trust')

const claudeJson = (projects: Record<string, unknown>) => readFile.mockResolvedValue(JSON.stringify({ projects }))

describe('isFolderTrusted', () => {
  beforeEach(() => readFile.mockReset())

  it('trusts a folder Claude Code recorded as trusted', async () => {
    claudeJson({ '/work/app': { hasTrustDialogAccepted: true } })
    expect(await isFolderTrusted('/work/app')).toBe(true)
  })

  it('trusts a folder under a trusted one', async () => {
    claudeJson({ '/work': { hasTrustDialogAccepted: true } })
    expect(await isFolderTrusted('/work/app/packages/web')).toBe(true)
  })

  it('does not trust a folder recorded as untrusted, nor one never seen', async () => {
    claudeJson({ '/work/app': { hasTrustDialogAccepted: false } })
    expect(await isFolderTrusted('/work/app')).toBe(false)
    expect(await isFolderTrusted('/elsewhere')).toBe(false)
  })

  it('knows nothing when the file cannot be read or parsed', async () => {
    readFile.mockRejectedValue(new Error('ENOENT'))
    expect(await isFolderTrusted('/work/app')).toBeNull()
    readFile.mockResolvedValue('{ not json')
    expect(await isFolderTrusted('/work/app')).toBeNull()
  })
})
