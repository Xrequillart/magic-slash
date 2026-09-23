import { useMemo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

/**
 * One block of the rendered document, handed to a caller that wants to draw something
 * around it — a hover ground, a mark in a gutter, a place to hang a comment off.
 *
 * `tag` is the element the markdown asked for and MUST be what the caller renders: the
 * typography below is a sheet of descendant selectors, so a `<div>` standing in for an
 * `<li>` loses its marker, its indent and its margins in one go.
 */
export interface MarkdownLineProps {
  tag: string
  /**
   * A name for this block that is the same on every render of the same document, or
   * `undefined` when the parser could not give one.
   *
   * It is the block's OFFSET IN THE MARKDOWN SOURCE, which is the one identifier available
   * here that survives a re-render: the DOM is rebuilt from scratch on every pass, and a
   * counter incremented during render is a side effect that StrictMode's double invoke
   * makes a liar of. `rehype-raw` reparses embedded HTML and does not always carry a
   * position through it, hence `undefined` — a block with no key gets drawn plainly, which
   * is a block that cannot be commented on rather than a crash.
   */
  lineKey: string | undefined
  /**
   * Where this block's markdown sits in the source, `[start, end)` — present exactly when
   * `lineKey` is. What a caller editing the document in place replaces when the block is
   * rewritten: the rendered text has lost its markup, the source has not.
   *
   * A list item that carries a sublist ENDS WHERE THE SUBLIST STARTS: the sublist's items
   * are lines of their own, and handing them over with their parent would have them edited
   * twice, once in each.
   */
  source?: { start: number; end: number }
  className?: string
  children?: ReactNode
}

interface Props {
  content: string
  /**
   * `panel` is the file-preview sizing — a 70%-wide drawer read at a glance.
   * `document` is the same markdown given a page to itself: larger type, more
   * air, and no padding of its own (the page frame supplies it).
   */
  variant?: 'panel' | 'document'
  /**
   * Draw each block through this instead of as a bare tag — absent for every caller that
   * only wants the document read.
   *
   * WHAT IT DOES NOT DO is as much the point as what it does: the typography, the
   * sanitiser, the plugins and the two Tailwind strings are untouched, and a caller that
   * passes nothing gets exactly the component it had. The one thing that changes for a
   * caller that passes something is which function builds the element for a paragraph.
   */
  line?: (props: MarkdownLineProps) => ReactNode
}

// Everything that does not change with the size: colours, borders, list markers.
const STRUCTURE = `text-ink/90
  [&_h1]:font-bold [&_h1]:text-ink
  [&_h2]:font-semibold [&_h2]:text-ink
  [&_h3]:font-semibold [&_h3]:text-ink
  [&_p]:text-ink/80
  [&_ul]:list-disc [&_ul]:text-ink/80
  [&_ol]:list-decimal [&_ol]:text-ink/80
  [&_a]:text-accent [&_a]:underline [&_a]:hover:text-accent-hover
  [&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:text-ink/50 [&_blockquote]:italic
  [&_hr]:border-line
  [&_table]:w-full [&_table]:border-collapse
  [&_th]:border [&_th]:border-line [&_th]:text-left [&_th]:text-ink [&_th]:bg-surface
  [&_td]:border [&_td]:border-line [&_td]:text-ink/80
  [&_code]:bg-surface-strong [&_code]:rounded [&_code]:font-mono [&_code]:text-ink/90
  [&_pre]:bg-surface [&_pre]:rounded-lg [&_pre]:overflow-auto
  [&_pre_code]:bg-transparent [&_pre_code]:p-0
  [&_details]:rounded-lg [&_details]:border [&_details]:border-line [&_details]:bg-surface [&_details]:px-3 [&_details]:py-2 [&_details]:mb-3
  [&_details>summary]:cursor-pointer [&_details>summary]:font-medium [&_details>summary]:text-ink [&_details>summary]:select-none
  [&_details[open]>summary]:mb-2
  [&_img]:max-w-full [&_img]:rounded-md
  [&_sub]:text-ink/60 [&_sup]:text-ink/60
  [&_kbd]:font-mono [&_kbd]:text-xs [&_kbd]:px-1 [&_kbd]:py-0.5 [&_kbd]:rounded [&_kbd]:border [&_kbd]:border-line [&_kbd]:bg-surface-strong`

// The type scale, per variant. Kept whole rather than merged with STRUCTURE at
// the call site: two Tailwind utilities from the same group (text-sm vs text-base)
// cannot override each other by class order, so only one may ever be emitted.
const SCALE: Record<NonNullable<Props['variant']>, string> = {
  panel: `px-5 py-4 text-sm leading-relaxed
    [&_h1]:text-xl [&_h1]:mb-3 [&_h1]:mt-5
    [&_h2]:text-lg [&_h2]:mb-2 [&_h2]:mt-4
    [&_h3]:text-base [&_h3]:mb-2 [&_h3]:mt-3
    [&_p]:mb-3
    [&_ul]:pl-5 [&_ul]:mb-3
    [&_ol]:pl-5 [&_ol]:mb-3
    [&_li]:mb-1
    [&_blockquote]:pl-3 [&_blockquote]:my-3
    [&_hr]:my-4
    [&_table]:mb-3
    [&_th]:px-3 [&_th]:py-1.5
    [&_td]:px-3 [&_td]:py-1.5
    [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs
    [&_pre]:p-3 [&_pre]:mb-3`,
  document: `text-[0.9375rem] leading-7
    [&>*:first-child]:mt-0
    [&_h1]:text-2xl [&_h1]:mb-4 [&_h1]:mt-8
    [&_h2]:text-lg [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-line
    [&_h3]:text-base [&_h3]:mb-2 [&_h3]:mt-6
    [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-ink [&_h4]:mb-2 [&_h4]:mt-5
    [&_p]:mb-4
    [&_ul]:pl-6 [&_ul]:mb-4
    [&_ol]:pl-6 [&_ol]:mb-4
    [&_li]:mb-1.5
    [&_blockquote]:pl-4 [&_blockquote]:my-4
    [&_hr]:my-8
    [&_table]:mb-4 [&_table]:text-sm
    [&_th]:px-3 [&_th]:py-2
    [&_td]:px-3 [&_td]:py-2
    [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em]
    [&_pre]:p-4 [&_pre]:mb-4 [&_pre]:text-xs [&_pre]:leading-relaxed`,
}

/**
 * A table in a scroller of its own.
 *
 * `[&_table]:w-full` fits a table to the measure it is given, which is the right
 * answer until the table is wider than that — a Jira ticket routinely carries a
 * five-column grid, and in a panel that either overflowed the card or squeezed every
 * column to two characters. The wrapper takes the overflow instead, so the page
 * itself never scrolls sideways.
 *
 * A `components` override rather than a class, because the element needs a PARENT
 * that markdown has no way to express. The `[&_table]` rules above still apply —
 * they are descendant selectors, and the table is still a descendant.
 */
const COMPONENTS = {
  table: ({ node: _node, ...props }: { node?: unknown } & JSX.IntrinsicElements['table']) => (
    <div className="overflow-x-auto max-w-full">
      <table {...props} />
    </div>
  ),
}

/**
 * Raw HTML, let through and then scrubbed.
 *
 * `react-markdown` drops every HTML tag in the source by default, and a GitHub comment is
 * full of them: Greptile wraps its findings in `<details><summary>`, Claude Code writes
 * `<sub>` footers and `<br>`-separated tables, humans paste `<img>` screenshots. Dropped,
 * a `<details>` block takes its whole body with it — which is how a review comment came to
 * render as an empty card, or as a heading over nothing.
 *
 * `rehype-raw` parses the HTML back in; `rehype-sanitize` runs AFTER it, on the whole tree,
 * with GitHub's own schema (`defaultSchema` is the allow-list github.com applies to comment
 * bodies): no scripts, no event handlers, no `javascript:` URLs, no `style`. Order matters
 * and is fixed here — sanitising before `raw` would only ever see the markdown's own nodes
 * and wave the HTML through untouched. The bodies are written by anyone who can comment on
 * a pull request, which is why the scrub is not optional.
 *
 * `clobberPrefix` set to nothing: the default prefixes every `id` with `user-content-`,
 * which breaks the `#anchor` links Greptile writes to its own headings. Clobbering guards
 * a page against an `id` colliding with the host document's; this markdown renders inside
 * a panel with no ids of its own to protect.
 */
const SANITIZE_SCHEMA = { ...defaultSchema, clobberPrefix: '' }

/**
 * The blocks a caller may draw for itself — the LEAVES of the document, which is what a
 * reader calls a line.
 *
 * `ul`, `ol` and `table` are pointedly not here. They contain the blocks above rather than
 * text of their own, so a ground on one of them would light up a whole list under a cursor
 * that is on a single bullet, and a mark beside it would be a mark on eight lines at once.
 */
const LINE_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre'] as const

/** What react-markdown hands a component override, as much of it as this file reads. */
type Position = { start?: { offset?: number }; end?: { offset?: number } }
type NodeProps = {
  node?: {
    position?: Position
    children?: { type?: string; tagName?: string; value?: string; position?: Position }[]
  }
}

/** The block's `[start, end)` in the source, cut short at a nested list. See `source`. */
function sourceOf(node: NodeProps['node']): { start: number; end: number } | undefined {
  const start = node?.position?.start?.offset
  let end = node?.position?.end?.offset
  if (typeof start !== 'number' || typeof end !== 'number') return undefined
  const sublist = node?.children?.find((child) => child.tagName === 'ul' || child.tagName === 'ol')
  const cut = sublist?.position?.start?.offset
  if (typeof cut === 'number' && cut > start) end = cut
  return { start, end }
}

/**
 * Everything that holds other blocks rather than words of its own.
 *
 * Used by `isContainer` below and NOT the same list as `LINE_TAGS`: this one is about what a
 * node may CONTAIN, so it includes the wrappers that are never lines themselves.
 */
const BLOCK_CHILDREN = new Set([
  'p', 'div', 'pre', 'blockquote', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'section', 'article', 'aside', 'header', 'footer', 'figure', 'figcaption', 'details',
])

/**
 * Whether this block holds only other blocks — which makes it a CONTAINER and not a line.
 *
 * IT EXISTS BECAUSE MARKDOWN HAS TWO KINDS OF LIST. A tight item is `<li>text</li>`; a loose
 * one — an item with a blank line after it, which is most of the items anyone writes — is
 * `<li><p>text</p></li>`. Both are one line to a reader, and without this test both the `li`
 * and the `p` were drawn as lines: two marks, at the same height, in the same 56px box, one
 * of them lying on top of the other. The one underneath could not be clicked.
 *
 * So a block with no words of its own is not offered as a line: it gets no mark, no
 * attribute, and the blocks INSIDE it are the lines. An item that mixes text and a sublist —
 * `<li>text<ul>…</ul></li>` — keeps its own line, because it does have words of its own, and
 * its mark sits beside them rather than beside its sublist.
 *
 * Whitespace-only text is not content: the parser leaves newlines between block children,
 * and counting them would make every loose item a line again.
 */
function isContainer(node: NodeProps['node']): boolean {
  const children = node?.children
  if (!children || children.length === 0) return false
  // A block holding NO block is not a container, whatever its text: an item or a paragraph
  // holding only a non-breaking space is the empty line Enter just made, and it is a line.
  if (!children.some((child) => child.type === 'element' && BLOCK_CHILDREN.has(child.tagName ?? ''))) return false
  return children.every((child) => (
    child.type === 'element'
      ? BLOCK_CHILDREN.has(child.tagName ?? '')
      : /^[ \t\r\n]*$/.test(child.value ?? '')
  ))
}

export default function MarkdownView({ content, variant = 'panel', line }: Props) {
  /**
   * The overrides, built once per `line` — which is once, since its callers hold it in a
   * `useCallback`.
   *
   * It matters: `components` is read by react-markdown on every pass, and a fresh object
   * of ten fresh function components would make every block a NEW COMPONENT TYPE on every
   * render, so React would unmount and remount the entire document rather than update it.
   * A textarea inside a comment bubble anchored to one of those blocks would lose its
   * focus on every keystroke.
   */
  const components = useMemo(() => {
    if (!line) return COMPONENTS
    const overrides: Record<string, unknown> = { ...COMPONENTS }
    for (const tag of LINE_TAGS) {
      overrides[tag] = ({ node, children, className }: NodeProps & {
        children?: ReactNode
        className?: string
      }) => {
        // A container is drawn plainly: no key means no mark and no anchor — see
        // `isContainer`, and `CommentLine`, which draws the bare tag for a keyless block.
        const source = isContainer(node) ? undefined : sourceOf(node)
        return line({
          tag,
          lineKey: source ? `${tag}@${source.start}` : undefined,
          source,
          className,
          children,
        })
      }
    }
    return overrides
  }, [line])

  return (
    <div className={`${STRUCTURE} ${SCALE[variant]}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
