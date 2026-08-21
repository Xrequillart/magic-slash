'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Markdown, rendered in the webapp's own palette.
 *
 * Ported from `desktop/src/renderer/components/file-preview/MarkdownView.tsx` —
 * same structure, same two variants — with the colour classes translated from the
 * desktop's theme tokens (`surface`, `line`, …) to this project's Tailwind scale
 * (`ink`, `muted`, `canvas`, `accent`). The desktop's tokens do not exist here, so
 * copying that file verbatim would render an unstyled document.
 *
 * `remarkGfm` is not decoration: a `/magic:plan` spec is a table of framing
 * decisions and a checklist of acceptance criteria, and both are GFM extensions.
 * Without it the spec renders as pipes and brackets.
 *
 * RAW HTML STAYS OFF. There is deliberately no `rehype-raw` here and there must
 * never be one: the spec is user-authored content written on a developer's machine
 * and rendered to everyone else in their organization, so an `<img onerror>` in
 * somebody's brainstorm would be a stored XSS in every teammate's browser.
 * react-markdown escapes HTML by default, and that default is the security boundary.
 */

interface Props {
  content: string
  /**
   * `panel` is the compact sizing — a card or a drawer read at a glance.
   * `document` is the same markdown given a page to itself: larger type, more
   * air, and no padding of its own (the page frame supplies it).
   */
  variant?: 'panel' | 'document'
}

// Everything that does not change with the size: colours, borders, list markers.
const STRUCTURE = `text-ink/90
  [&_h1]:font-display [&_h1]:font-bold [&_h1]:text-ink
  [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-ink
  [&_h3]:font-display [&_h3]:font-bold [&_h3]:text-ink
  [&_p]:text-ink/80
  [&_ul]:list-disc [&_ul]:text-ink/80
  [&_ol]:list-decimal [&_ol]:text-ink/80
  [&_a]:text-accent [&_a]:underline [&_a]:hover:text-accent-hover
  [&_blockquote]:border-l-2 [&_blockquote]:border-black/15 [&_blockquote]:text-muted [&_blockquote]:italic
  [&_hr]:border-black/10
  [&_table]:w-full [&_table]:border-collapse
  [&_th]:border [&_th]:border-black/10 [&_th]:text-left [&_th]:text-ink [&_th]:bg-canvas
  [&_td]:border [&_td]:border-black/10 [&_td]:text-ink/80
  [&_code]:bg-black/[0.05] [&_code]:rounded [&_code]:font-mono [&_code]:text-ink/90
  [&_pre]:bg-canvas [&_pre]:rounded-lg [&_pre]:overflow-auto
  [&_pre_code]:bg-transparent [&_pre_code]:p-0
  [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0
  [&_.task-list-item_input]:mr-2 [&_.task-list-item_input]:align-middle [&_.task-list-item_input]:accent-brand`

// The type scale, per variant. Kept whole rather than merged with STRUCTURE at
// the call site: two Tailwind utilities from the same group (text-sm vs text-base)
// cannot override each other by class order, so only one may ever be emitted.
const SCALE: Record<NonNullable<Props['variant']>, string> = {
  panel: `text-sm leading-relaxed
    [&>*:first-child]:mt-0
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
    [&_h2]:text-lg [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-black/10
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

export function Markdown({ content, variant = 'document' }: Props) {
  return (
    <div className={`${STRUCTURE} ${SCALE[variant]}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
