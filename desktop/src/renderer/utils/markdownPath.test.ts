import { describe, it, expect } from 'vitest'
import { isMarkdownPath } from './markdownPath'

describe('isMarkdownPath', () => {
  it('names the two extensions the preview renders as markdown', () => {
    expect(isMarkdownPath('README.md')).toBe(true)
    expect(isMarkdownPath('notes.markdown')).toBe(true)
  })

  it('reads the extension of the FILE, not of the path', () => {
    expect(isMarkdownPath('a/b.md')).toBe(true)
  })

  it('says no to anything else', () => {
    expect(isMarkdownPath('index.ts')).toBe(false)
  })

  it('says no to a dotfile called `.md`, exactly as extname does', () => {
    // `path.extname('.md')` is the empty string — a leading dot names the file, it does
    // not open an extension. The main process derives `mimeHint` from extname, so
    // answering true here would call markdown a file the highlighter gave no language.
    expect(isMarkdownPath('.md')).toBe(false)
  })

  it('does not read a dot in a DIRECTORY name as an extension', () => {
    // The case `filePath.split('.').pop()` gets wrong: it would answer `md/file`, and a
    // looser split on the last dot anywhere in the path would answer `md`.
    expect(isMarkdownPath('dir.md/file')).toBe(false)
  })

  it('ignores case, because `mimeHint` is lower-cased before it is matched', () => {
    expect(isMarkdownPath('README.MD')).toBe(true)
  })
})
