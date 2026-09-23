/**
 * Editing a plan's spec one block at a time, the way Notion edits a page: the reader clicks
 * a paragraph, writes in it, and the markdown around it is left exactly as it was.
 *
 * Pure string work on the SOURCE, which is the only thing a save sends. The block's text is
 * written back from what the reader typed by `richTextToMarkdown`; what this file owns is
 * where it goes — the block's own place in the source, cut out by the offsets the parser
 * gave it — and the structural edits a rich editor makes: a block split in two by Enter,
 * merged into the one above by Backspace, turned from a paragraph into a heading or a list.
 */

/** One block of the source, opened for writing. */
export interface SpecBlock {
  /** Where the block sits in the document it was opened on, `[start, end)`. */
  start: number
  end: number
  /**
   * What the reader does not write in: a heading's `## `, a list item's `- ` (with its
   * checkbox), a code block's opening fence. The rendered block already says it is a
   * heading or an item, so the marker lives here and is put back around the text.
   */
  prefix: string
  /** The whitespace the block ended on — or a code block's closing fence — put back as it was. */
  suffix: string
  /** The block's markdown, between the two. */
  text: string
  /**
   * The block is a list item — written tight (`- a`, rendered `<li>a</li>`) or loose (items
   * a blank line apart, rendered `<li><p>a</p></li>`, where the line the reader writes in is
   * the paragraph and its marker sits BEFORE it on the line). Both are opened with the marker
   * as their prefix, so Enter, Backspace and a change of kind treat them as the item they are.
   */
  item?: 'tight' | 'loose'
}

/**
 * Where the caret goes after a structural edit: the keys the new block may render under.
 * More than one because an item renders as `li@…` in a tight list and as `p@…` in a loose one,
 * and which it is depends on the whole list, not on the edit.
 */
export interface SpecEdit {
  doc: string
  keys: string[]
}

/** The kinds of block a reader can turn a block into. */
export type SpecBlockType = 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'todo' | 'quote'

/**
 * What a block written down to nothing is while it is still being written in: a paragraph
 * with no text is no paragraph in markdown, so the new line Enter makes has to hold
 * something for the caret to go into. Removed again if the reader leaves it empty.
 */
export const EMPTY_BLOCK = '&nbsp;'

const HEADING = /^#{1,6}[ \t]+/
const LIST_ITEM = /^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/
/** A paragraph's line opening with a list marker: the paragraph is a loose item's. */
const LOOSE_ITEM = /^([ \t]*(?:>[ \t]?)*)((?:[-*+]|\d{1,9}[.)])[ \t]+(?:\[[ xX]\][ \t]+)?)$/
const FENCE_OPEN = /^[ \t]*(?:`{3,}|~{3,})[^\n]*\n/
const FENCE_CLOSE = /\n?[ \t]*(?:`{3,}|~{3,})[ \t]*\s*$/

const PREFIXES: Record<SpecBlockType, string> = {
  p: '', h1: '# ', h2: '## ', h3: '### ', ul: '- ', ol: '1. ', todo: '- [ ] ', quote: '> ',
}

/** Cut the block `[start, end)` of `doc` out for writing. */
export function openSpecBlock(doc: string, tag: string, source: { start: number; end: number }): SpecBlock {
  const raw = doc.slice(source.start, source.end)
  if (tag === 'pre') {
    const open = FENCE_OPEN.exec(raw)?.[0]
    if (open) {
      const rest = raw.slice(open.length)
      const close = FENCE_CLOSE.exec(rest)
      const body = close ? rest.slice(0, close.index) : rest
      return { start: source.start, end: source.end, prefix: open, suffix: rest.slice(body.length), text: body }
    }
  }
  if (tag === 'p') {
    const marker = LOOSE_ITEM.exec(linePrefixOf(doc, source.start))?.[2]
    if (marker) {
      const text = raw.trimEnd()
      return {
        start: source.start - marker.length, end: source.end, prefix: marker, suffix: raw.slice(text.length), text, item: 'loose',
      }
    }
  }
  const lead = /^h[1-6]$/.test(tag) ? HEADING : tag === 'li' ? LIST_ITEM : null
  const prefix = lead?.exec(raw)?.[0] ?? ''
  const body = raw.slice(prefix.length)
  const text = body.trimEnd()
  return {
    start: source.start, end: source.end, prefix, suffix: body.slice(text.length), text,
    ...(tag === 'li' ? { item: 'tight' as const } : {}),
  }
}

/**
 * `doc` with `block` rewritten to `text`.
 *
 * A BLOCK WRITTEN DOWN TO NOTHING IS REMOVED, marker and line with it. Put back as its bare
 * marker it would render as an empty heading or an empty bullet, which nobody writing
 * "delete this line" meant. `EMPTY_BLOCK` counts as nothing: it is only a place to type.
 */
export function applySpecBlock(doc: string, block: SpecBlock, text: string): string {
  if (text.trim() !== '' && text.trim() !== EMPTY_BLOCK) {
    return doc.slice(0, block.start) + block.prefix + text + block.suffix + doc.slice(block.end)
  }
  const lineStart = doc.lastIndexOf('\n', block.start - 1) + 1
  const from = doc.slice(lineStart, block.start).trim() === '' ? lineStart : block.start
  const to = doc[block.end] === '\n' ? block.end + 1 : block.end
  return doc.slice(0, from) + doc.slice(to)
}

/** What stands between the start of the block's line and the block: indentation, `> `. */
function linePrefixOf(doc: string, start: number): string {
  return doc.slice(doc.lastIndexOf('\n', start - 1) + 1, start)
}

/**
 * ENTER: `block` split at the caret, `before` staying where it was and `after` becoming a
 * block of its own below it — the next item in a list, a paragraph after anything else
 * (a heading does not beget headings). Returns the new document and the key the new block
 * will render under, which is where the caret goes next.
 *
 * The separator repeats what the block's line opens with, so a paragraph split inside a
 * quote stays inside the quote and an item split in a nested list stays nested.
 */
export function splitSpecBlock(
  doc: string,
  block: SpecBlock,
  before: string,
  after: string,
): SpecEdit {
  const lead = linePrefixOf(doc, block.start)
  const nextPrefix = block.item ? block.prefix.replace(/\[[xX]\]/, '[ ]') : ''
  // A loose list stays loose: its next item is a blank line down, like the ones around it.
  const separator = block.item === 'tight'
    ? `\n${lead}`
    : `\n${lead.replace(/[ \t]+$/, '')}\n${lead}`
  const first = before.trim() === '' ? EMPTY_BLOCK : before
  const second = after.trim() === '' ? EMPTY_BLOCK : after
  const head = doc.slice(0, block.start) + block.prefix + first + separator
  return {
    doc: head + nextPrefix + second + block.suffix + doc.slice(block.end),
    keys: block.item ? itemKeys(head.length, nextPrefix) : [`p@${head.length}`],
  }
}

/** The keys an item starting at `at` renders under: the `<li>`, or a loose item's `<p>`. */
function itemKeys(at: number, prefix: string): string[] {
  return [`li@${at}`, `p@${at + prefix.length}`]
}

/**
 * BACKSPACE AT THE START: `current` folded into `previous`, its text appended to theirs.
 * `previous` comes before `current` in the source, so removing `current` first leaves every
 * offset of `previous` where it was.
 */
export function mergeSpecBlocks(
  doc: string,
  previous: SpecBlock,
  current: SpecBlock,
  currentText: string,
): string {
  const without = applySpecBlock(doc, current, '')
  const joined = previous.text === EMPTY_BLOCK ? currentText : previous.text + currentText
  return applySpecBlock(without, previous, joined)
}

/**
 * `block` turned into another kind, its text kept. Returns the new document and the key
 * the block renders under once it has changed — `h2@…` for a heading, `li@…` for an item,
 * and for a quote the paragraph INSIDE it, which is the line the reader writes in.
 *
 * LEAVING OR ENTERING A LIST TAKES A BLANK LINE either side: a paragraph written on the
 * line after an item is that item's lazy continuation, not a paragraph, and an item written
 * straight under a paragraph would be read as one here and not by every renderer.
 *
 * A QUOTED BLOCK IS RETYPED FROM THE START OF ITS LINE, so turning it into anything else
 * takes its `> ` with it.
 */
export function retypeSpecBlock(
  doc: string,
  block: SpecBlock,
  text: string,
  type: SpecBlockType,
): SpecEdit {
  const linePrefix = linePrefixOf(doc, block.start)
  const quoted = linePrefix.includes('>')
  const base = quoted ? block.start - linePrefix.length : block.start
  const isList = type === 'ul' || type === 'ol' || type === 'todo'
  const body = text.trim() === '' ? EMPTY_BLOCK : text
  const prefix = PREFIXES[type]
  const before = joinBefore(doc.slice(0, base), !!block.item, isList)
  const after = joinAfter(block.suffix + doc.slice(block.end), !!block.item, isList)
  const next = before + prefix + body + after
  if (isList) return { doc: next, keys: itemKeys(before.length, prefix) }
  const tag = type === 'quote' ? 'p' : type
  return { doc: next, keys: [`${tag}@${before.length + (type === 'quote' ? prefix.length : 0)}`] }
}

const ITEM_LINE = /^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]/

/**
 * What goes between the text above and a block that changed kind.
 *
 * AN ITEM JOINS THE LIST ABOVE IT, tight: a paragraph turned into a bullet right under a list
 * is the next bullet of that list, not a second list a blank line down — which markdown would
 * read as ONE list, loose, and draw every item of it with a paragraph's margins.
 *
 * Anything else LEAVES a list with a blank line, or it would be read as the item's lazy
 * continuation; and between two blocks that are not items, what was there stays.
 */
function joinBefore(before: string, wasItem: boolean, isItem: boolean): string {
  if (before === '') return before
  const lastLine = before.replace(/\s+$/, '').split('\n').pop() ?? ''
  if (isItem && ITEM_LINE.test(lastLine)) return `${before.replace(/\s+$/, '')}\n`
  if ((wasItem || isItem) && !/\n[ \t]*\n$/.test(before)) return `${before.replace(/[ \t]*\n?$/, '')}\n\n`
  return before
}

/** What goes between a block that changed kind and the text below it. See `joinBefore`. */
function joinAfter(after: string, wasItem: boolean, isItem: boolean): string {
  if (after.trim() === '') return after
  const nextLine = after.replace(/^\s+/, '').split('\n')[0]
  if (isItem && ITEM_LINE.test(nextLine)) return `\n${after.replace(/^\s+/, '')}`
  if ((wasItem || isItem) && !/^[ \t]*\n[ \t]*\n/.test(after)) return `\n\n${after.replace(/^[ \t]*\n?/, '')}`
  return after
}

/** The kind a block currently is, as its tag and its marker say. */
export function specBlockTypeOf(doc: string, tag: string, block: SpecBlock): SpecBlockType {
  if (tag === 'h1' || tag === 'h2' || tag === 'h3') return tag
  if (block.item) return /\[[ xX]\]/.test(block.prefix) ? 'todo' : /\d/.test(block.prefix) ? 'ol' : 'ul'
  return linePrefixOf(doc, block.start).includes('>') ? 'quote' : 'p'
}

/**
 * Where the caret goes in `after` once a block's text went from `before` to `after` — an undo,
 * a redo: at the END OF WHAT CHANGED, the place an editor leaves it, found as the point where
 * the two texts stop sharing their ending.
 */
export function caretAfterChange(before: string, after: string): number {
  let shared = 0
  const room = Math.min(before.length, after.length)
  while (shared < room && before[before.length - 1 - shared] === after[after.length - 1 - shared]) shared++
  return after.length - shared
}
