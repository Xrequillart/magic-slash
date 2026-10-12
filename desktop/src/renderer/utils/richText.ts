/**
 * A block of the spec, written back as MARKDOWN from the formatted text the reader typed in.
 *
 * The spec is edited as it is read — bold stays bold, a link stays a link — which means the
 * thing holding the reader's words is the rendered DOM, and the thing a save sends is
 * markdown. This is the one-way street between the two: the rendering came OUT of markdown
 * by `react-markdown`, and this walks what the reader has made of it back IN.
 *
 * INLINE ONLY. A block's own kind — heading, item, quote — is its marker in the source and
 * is kept there by `openSpecBlock`; what is walked here is what sits inside it.
 *
 * Written against a minimal node shape rather than the DOM's own types, so the suite can
 * build a tree by hand: it runs in Node, with no document to parse one in.
 */
export interface RichNode {
  nodeType: number
  nodeName: string
  textContent: string | null
  childNodes: ArrayLike<RichNode>
  getAttribute?: (name: string) => string | null
}

const TEXT_NODE = 3
const ELEMENT_NODE = 1

/**
 * The marks a browser's editing commands produce, and the ones the markdown renders, as one
 * vocabulary. `execCommand('bold')` writes `<b>`, the renderer writes `<strong>`; the source
 * gets `**` for either.
 *
 * UNDERLINE IS `<ins>`, because markdown has no underline and GitHub's sanitiser — the one
 * `MarkdownView` renders through — drops `<u>` and keeps `<ins>`, which every browser draws
 * underlined.
 */
const MARKS: Record<string, { key: string; open: string; close: string }> = {
  STRONG: { key: 'strong', open: '**', close: '**' },
  B: { key: 'strong', open: '**', close: '**' },
  EM: { key: 'em', open: '*', close: '*' },
  I: { key: 'em', open: '*', close: '*' },
  S: { key: 's', open: '~~', close: '~~' },
  DEL: { key: 's', open: '~~', close: '~~' },
  STRIKE: { key: 's', open: '~~', close: '~~' },
  U: { key: 'u', open: '<ins>', close: '</ins>' },
  INS: { key: 'u', open: '<ins>', close: '</ins>' },
}

/** Inline HTML the sanitiser lets through, written back as the HTML it came from. */
const PASSTHROUGH = new Set(['SUB', 'SUP', 'KBD', 'MARK', 'SMALL'])
/** What is drawn inside a line and is not its text: a task's checkbox, the comment mark. */
const SKIPPED = new Set(['INPUT', 'BUTTON', 'SCRIPT', 'STYLE', 'SVG'])

/** A browser's spaces as spaces, and without the zero-width marks shortcuts leave behind. */
function plain(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\u200b/g, '')
}

/** Every character that would otherwise be read as markup. */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_~[\]<]/g, '\\$&')
}

function markOf(node: RichNode) {
  return node.nodeType === ELEMENT_NODE ? MARKS[node.nodeName.toUpperCase()] : undefined
}

/**
 * A mark around `inner`, with the whitespace it caught moved outside: `** bold**` is not
 * emphasis in CommonMark, and a selection made by double-clicking a word routinely takes
 * the space after it.
 */
function wrap(mark: { open: string; close: string }, inner: string): string {
  const trimmed = inner.trim()
  if (trimmed === '') return inner
  const lead = inner.slice(0, inner.length - inner.trimStart().length)
  const trail = inner.slice(inner.trimEnd().length)
  return `${lead}${mark.open}${trimmed}${mark.close}${trail}`
}

function codeSpan(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
  const fence = '`'.repeat(longest + 1)
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : ''
  return `${fence}${pad}${text}${pad}${fence}`
}

/** A link or image target, bracketed when it holds what would end it early. */
function destination(url: string): string {
  return /[\s()<>]/.test(url) ? `<${url.replace(/[<>]/g, encodeURIComponent)}>` : url
}

/**
 * The children of `node`, with RUNS OF THE SAME MARK MERGED: bolding two words one at a
 * time leaves two adjacent `<b>`s, and `**a****b**` is not the bold `ab` it looks like.
 */
function children(node: RichNode): string {
  const kids = Array.from(node.childNodes)
  let out = ''
  for (let i = 0; i < kids.length; i++) {
    const mark = markOf(kids[i])
    if (!mark) {
      out += inline(kids[i], out)
      continue
    }
    let inner = children(kids[i])
    while (i + 1 < kids.length && markOf(kids[i + 1])?.key === mark.key) inner += children(kids[++i])
    out += wrap(mark, inner)
  }
  return out
}

function inline(node: RichNode, before: string): string {
  if (node.nodeType === TEXT_NODE) return escapeMarkdown(plain(node.textContent ?? ''))
  if (node.nodeType !== ELEMENT_NODE) return children(node)
  const name = node.nodeName.toUpperCase()
  if (SKIPPED.has(name) || node.getAttribute?.('data-comment-overlay') != null) return ''
  if (name === 'BR') return '\\\n'
  if (name === 'CODE') return codeSpan(plain(node.textContent ?? ''))
  if (name === 'A') return `[${children(node)}](${destination(node.getAttribute?.('href') ?? '')})`
  if (name === 'IMG') {
    return `![${escapeMarkdown(node.getAttribute?.('alt') ?? '')}](${destination(node.getAttribute?.('src') ?? '')})`
  }
  if (PASSTHROUGH.has(name)) return `<${name.toLowerCase()}>${children(node)}</${name.toLowerCase()}>`
  // A browser's own line break inside an editing host, whatever it chose to spell it with.
  if (name === 'DIV' || name === 'P') return `${before === '' ? '' : '\\\n'}${children(node)}`
  return children(node)
}

/**
 * The markdown for the inline content of `root`.
 *
 * A LINE THAT WOULD START A BLOCK IS ESCAPED: a paragraph the reader begins with `# `, `- `,
 * `1. ` or `> ` is a paragraph that says those characters, not a heading or a list — the kind
 * of block this is lives in its marker, and the marker is not written here.
 */
export function richTextToMarkdown(root: RichNode): string {
  return children(root)
    // A browser keeps a trailing `<br>` for the caret to stand on an empty last line; it is
    // no break in the text, and as markdown it would be a stray backslash.
    .replace(/(?:\\\n|\s)+$/, '')
    .trim()
    .replace(/(^|\n)(#{1,6}(?=\s|$)|>)/g, '$1\\$2')
    .replace(/(^|\n)([-+])(?=\s)/g, '$1\\$2')
    .replace(/(^|\n)(\d{1,9})([.)])(?=\s)/g, '$1$2\\$3')
}

/** A code block's body: its text as typed, markup and all. */
export function codeToMarkdown(root: RichNode): string {
  return plain(root.textContent ?? '').replace(/\n$/, '')
}
