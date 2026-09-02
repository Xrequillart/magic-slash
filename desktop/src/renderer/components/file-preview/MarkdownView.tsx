import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'

interface Props {
  content: string
  /**
   * `panel` is the file-preview sizing — a 70%-wide drawer read at a glance.
   * `document` is the same markdown given a page to itself: larger type, more
   * air, and no padding of its own (the page frame supplies it).
   */
  variant?: 'panel' | 'document'
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

export default function MarkdownView({ content, variant = 'panel' }: Props) {
  return (
    <div className={`${STRUCTURE} ${SCALE[variant]}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
        components={COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
