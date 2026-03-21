import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Components } from 'react-markdown'

const remarkPlugins = [remarkGfm]
const rehypePlugins = [rehypeHighlight]

const components: Components = {
  // Code blocks and inline code
  code({ className, children, ...props }) {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <code className={`${className} block`} {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className="bg-white/10 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
        {children}
      </code>
    )
  },
  pre({ children }) {
    return (
      <pre className="bg-black/40 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto text-[13px] font-mono leading-relaxed">
        {children}
      </pre>
    )
  },
  // Headings
  h1({ children }) {
    return <h1 className="text-lg font-bold text-white mt-4 mb-2 first:mt-0">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="text-base font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold text-white mt-2.5 mb-1 first:mt-0">{children}</h3>
  },
  // Lists
  ul({ children }) {
    return <ul className="list-disc list-inside space-y-0.5 my-1.5">{children}</ul>
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside space-y-0.5 my-1.5">{children}</ol>
  },
  li({ children }) {
    return <li className="text-sm leading-relaxed">{children}</li>
  },
  // Links
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:text-accent-hover underline"
      >
        {children}
      </a>
    )
  },
  // Paragraphs
  p({ children }) {
    return <p className="my-1.5 leading-relaxed">{children}</p>
  },
  // Bold / italic
  strong({ children }) {
    return <strong className="font-semibold text-white">{children}</strong>
  },
  // Tables
  table({ children }) {
    return (
      <div className="overflow-x-auto my-2">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    )
  },
  th({ children }) {
    return (
      <th className="text-left text-white font-medium px-3 py-1.5 border-b border-white/10">
        {children}
      </th>
    )
  },
  td({ children }) {
    return (
      <td className="px-3 py-1.5 border-b border-white/5">
        {children}
      </td>
    )
  },
  // Blockquotes
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-accent/50 pl-3 my-2 text-text-secondary italic">
        {children}
      </blockquote>
    )
  },
  // Horizontal rule
  hr() {
    return <hr className="border-white/10 my-3" />
  },
}

interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="text-sm text-white/90 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
