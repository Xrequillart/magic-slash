import type { SpecBlockType } from './specEditing'

/**
 * MARKDOWN TYPED AS MARKDOWN BECOMES WHAT IT SAYS, the moment it is complete — Notion's
 * shortcuts. `` `npm test` `` turns into code as the closing backtick lands, `**done**` into
 * bold, `## ` at the start of a line into a heading. The reader who knows the syntax never
 * has to reach for the toolbar, and the one who does not never sees it.
 *
 * Pure: these read the text before the caret and say what it closes. Applying it to the DOM
 * is the page's, through the browser's editing commands, so Cmd+Z takes a shortcut back and
 * leaves the characters that were typed.
 */

/** A mark the text before the caret has just closed. */
export interface InlineShortcut {
  /** Where the opening delimiter starts, in the text given. */
  start: number
  tag: 'code' | 'strong' | 'em' | 's' | 'a'
  /** The text the mark goes around. */
  inner: string
  /** A link's target. */
  href?: string
}

/**
 * The patterns, tried in this order: bold before italic, because `**a**` also ends like `*a*`.
 * The inner text of every mark but code may not start or end with a space — CommonMark would
 * not read `** a **` as bold, and neither should a shortcut.
 */
const INLINE: { tag: InlineShortcut['tag']; pattern: RegExp }[] = [
  { tag: 'code', pattern: /`([^`\n]+)`$/ },
  { tag: 'strong', pattern: /\*\*([^*\s\n](?:[^*\n]*[^*\s\n])?)\*\*$/ },
  { tag: 'strong', pattern: /(?:^|[^\w_])__([^_\s\n](?:[^_\n]*[^_\s\n])?)__$/ },
  { tag: 's', pattern: /~~([^~\s\n](?:[^~\n]*[^~\s\n])?)~~$/ },
  { tag: 'em', pattern: /(?:^|[^*\\])\*([^*\s\n](?:[^*\n]*[^*\s\n])?)\*$/ },
  { tag: 'em', pattern: /(?:^|[^\w_\\])_([^_\s\n](?:[^_\n]*[^_\s\n])?)_$/ },
]

const LINK = /\[([^\]\n]+)\]\(([^()\s]+)\)$/

/** The mark `before` — the text up to the caret — has just closed, if any. */
export function inlineShortcut(before: string): InlineShortcut | null {
  const link = LINK.exec(before)
  if (link) return { start: link.index, tag: 'a', inner: link[1], href: link[2] }
  for (const { tag, pattern } of INLINE) {
    const match = pattern.exec(before)
    if (!match) continue
    const inner = match[1]
    // The pattern may have taken the character before the delimiter to check it: skip it.
    const delimiter = tag === 'code' ? 1 : tag === 'em' ? 1 : 2
    return { start: before.length - inner.length - delimiter * 2, tag, inner }
  }
  return null
}

/**
 * The kind of block a line becomes when it starts with `before` — the text from the start of
 * the block to the caret, the space just typed included. Only ever the WHOLE text before the
 * caret: `# ` in the middle of a sentence is a hash and a space.
 */
export function blockShortcut(before: string): SpecBlockType | null {
  switch (before.replace(/ /g, ' ')) {
    case '# ': return 'h1'
    case '## ': return 'h2'
    case '### ': return 'h3'
    case '- ':
    case '* ':
    case '+ ': return 'ul'
    case '1. ':
    case '1) ': return 'ol'
    case '[] ':
    case '[ ] ':
    case '- [ ] ': return 'todo'
    case '> ':
    case '" ': return 'quote'
    default: return null
  }
}
