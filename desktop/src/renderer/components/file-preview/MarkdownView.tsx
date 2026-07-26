import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
}

export default function MarkdownView({ content }: Props) {
  return (
    <div className="px-5 py-4 text-sm text-ink/90 leading-relaxed
      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-ink [&_h1]:mb-3 [&_h1]:mt-5
      [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mb-2 [&_h2]:mt-4
      [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mb-2 [&_h3]:mt-3
      [&_p]:mb-3 [&_p]:text-ink/80
      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:text-ink/80
      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:text-ink/80
      [&_li]:mb-1
      [&_a]:text-accent [&_a]:underline [&_a]:hover:text-accent-hover
      [&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:text-ink/50 [&_blockquote]:italic [&_blockquote]:my-3
      [&_hr]:border-line [&_hr]:my-4
      [&_table]:w-full [&_table]:border-collapse [&_table]:mb-3
      [&_th]:border [&_th]:border-line [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-ink [&_th]:bg-surface
      [&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-ink/80
      [&_code]:bg-surface-strong [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:text-ink/90
      [&_pre]:bg-surface [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:mb-3 [&_pre]:overflow-auto
      [&_pre_code]:bg-transparent [&_pre_code]:p-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
