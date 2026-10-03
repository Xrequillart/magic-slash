import { Children, isValidElement, memo, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * WHAT CLAUDE WROTE, AS IT MEANT IT — headings, bold, lists, tables, links, inline code,
 * and fenced blocks in colour.
 *
 * GitHub-flavoured, because that is what Claude Code writes (tables and task lists
 * included). No raw HTML: `react-markdown` drops it by default, and a chat that rendered
 * the HTML a model typed would be rendering whatever the model had read.
 *
 * THE COLOUR IS THE CALLER'S. Highlighting is shiki, which runs in the desktop's main
 * process in the code theme the person chose, so this takes a function rather than
 * owning a highlighter: `highlight(code, lang)` answers the HTML, or null to draw the
 * block plain. Plain is also what shows until it answers, so a block never waits to be
 * read.
 */

export type ChatHighlighter = (code: string, lang: string | undefined) => Promise<string | null>

export interface ChatMarkdownProps {
  text: string
  highlight?: ChatHighlighter
}

// The typography, as descendant selectors: the markdown decides the tags, so this is the
// one place their look can be said.
const PROSE = `text-sm leading-relaxed text-ink
  [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
  [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2
  [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2
  [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5
  [&_p]:my-2
  [&_strong]:font-semibold [&_strong]:text-ink
  [&_em]:italic
  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
  [&_li]:my-0.5 [&_li>p]:my-0
  [&_a]:text-accent [&_a]:underline [&_a]:hover:text-accent-hover
  [&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:text-text-secondary
  [&_hr]:my-4 [&_hr]:border-line
  [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs
  [&_th]:border [&_th]:border-line [&_th]:bg-surface [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold
  [&_td]:border [&_td]:border-line [&_td]:px-2.5 [&_td]:py-1.5
  [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-surface-strong [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em]`

export const ChatMarkdown = memo(function ChatMarkdown({ text, highlight }: ChatMarkdownProps) {
  // Held across renders: a new `pre` each time would be a new component type, and every
  // block would remount and highlight again.
  const components = useMemo<Components>(() => ({
    // Fenced blocks arrive as <pre><code class="language-x">. The <pre> is taken over
    // whole, so the inline-code look above never reaches a block.
    pre: ({ children }) => {
      const code = Children.toArray(children).find(isValidElement) as ReactElement<{ className?: string; children?: ReactNode }> | undefined
      const lang = code?.props.className?.match(/language-([\w+#.-]+)/)?.[1]
      return <CodeBlock code={String(code?.props.children ?? '').replace(/\n$/, '')} lang={lang} highlight={highlight} />
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
    ),
  }), [highlight])
  return (
    <div className={PROSE}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{text}</ReactMarkdown>
    </div>
  )
})

/**
 * Shiki brings its own <pre> with the theme's ground painted on it; that ground is
 * dropped for this one's, so a block sits on the chat like every other surface here.
 */
const SHIKI_RESET = '[&_pre]:!bg-transparent [&_pre]:m-0 [&_pre]:whitespace-pre [&_code]:font-mono'

function CodeBlock({ code, lang, highlight }: { code: string; lang?: string; highlight?: ChatHighlighter }) {
  const [html, setHtml] = useState<string | null>(null)
  useEffect(() => {
    if (!highlight) return
    let live = true
    highlight(code, lang).then((result) => { if (live) setHtml(result) }).catch(() => {})
    return () => { live = false }
  }, [code, lang, highlight])

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-line-subtle bg-surface">
      {lang && (
        <div className="border-b border-line-subtle px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-text-secondary/70">{lang}</div>
      )}
      {html ? (
        // Shiki's output: the code escaped, wrapped in coloured spans.
        <div className={`overflow-x-auto px-3 py-2.5 text-[length:var(--chat-code-size,12px)] leading-relaxed ${SHIKI_RESET}`} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="m-0 overflow-x-auto px-3 py-2.5 font-mono text-[length:var(--chat-code-size,12px)] leading-relaxed text-ink">{code}</pre>
      )}
    </div>
  )
}
