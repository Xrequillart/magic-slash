/**
 * Which extensions the preview treats as markdown, and the one function that asks.
 *
 * A module of its own rather than two lines inside FileContentRenderer, for the reason
 * every other pure helper under `utils/` is: the suite runs on the ROOT node_modules and
 * the desktop's own are never installed for it, so a test that reaches a module importing
 * `react` fails to RESOLVE. The renderer re-exports `isMarkdownPath`, so callers still
 * import it from the component that owns the rendering decision.
 */
const MARKDOWN_EXTS = new Set(['md', 'markdown'])

/**
 * The two readings of a markdown file: the raw document, diff intact, or the formatted
 * rendering. Named here rather than spelled inline at each of the four places that hold
 * one — the renderer's prop, the card's state, and the toggle's two — so adding a third
 * reading later is one edit rather than a hunt for four copies of a union.
 */
export type MarkdownMode = 'raw' | 'rendered'

/**
 * Whether a path names a markdown file, answered from the PATH alone.
 *
 * It exists because a caller has to know before the read resolves: a review card draws
 * its raw/rendered toggle in the header, which is on screen while the file is still a
 * skeleton. Waiting for the read's `mimeHint` would make the control appear a beat after
 * the card does.
 *
 * This is the ONLY spelling of the question: the header's toggle and the renderer's
 * markdown branch both call it, so they cannot answer differently.
 *
 * Deliberately `path.extname` semantics rather than the shorter `split('.').pop()`,
 * because the rest of the stack reads extensions that way and this has to agree with it:
 * the main process derives `mimeHint` — the shiki language input — as
 * `path.extname(filePath).toLowerCase()` minus the dot. A looser reading here would send
 * a file down the markdown branch that the highlighter had already called something else.
 * Two consequences of extname the short spelling gets wrong: a dot in a DIRECTORY name is
 * not an extension (`dir.md/file`), and a leading dot is a dotfile rather than an
 * extension — a file literally called `.md` has no extension at all.
 */
export function isMarkdownPath(filePath: string): boolean {
  const base = filePath.slice(filePath.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return false
  return MARKDOWN_EXTS.has(base.slice(dot + 1).toLowerCase())
}
