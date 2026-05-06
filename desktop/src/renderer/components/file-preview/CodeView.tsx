interface Props {
  content: string
  highlightedHtml: string | null
}

const CODE_STYLES = `
  .shiki code { counter-reset: line; }

  .shiki code .line::before {
    counter-increment: line;
    content: "\\00a0" counter(line);
    display: inline-block;
    width: 3rem;
    margin-right: 1.25rem;
    padding-right: 0.75rem;
    text-align: right;
    color: rgba(255,255,255,0.18);
    border-right: 1px solid rgba(255,255,255,0.07);
    user-select: none;
    -webkit-user-select: none;
  }

  /* diff: added lines */
  .shiki code .line[data-diff="add"] {
    display: inline-block;
    min-width: 100%;
    background-color: rgba(46,160,67,0.15);
    border-left: 2px solid #2ea043;
    margin-left: -1px;
  }
  .shiki code .line[data-diff="add"]::before {
    counter-increment: line;
    content: "+" counter(line);
    color: #2ea043;
    border-right-color: rgba(46,160,67,0.3);
  }

  /* diff: removed lines */
  .shiki code .line[data-diff="remove"] {
    display: inline-block;
    min-width: 100%;
    background-color: rgba(248,81,73,0.15);
    border-left: 2px solid #f85149;
    margin-left: -1px;
  }
  .shiki code .line[data-diff="remove"]::before {
    counter-increment: line;
    content: "-" counter(line);
    color: #f85149;
    border-right-color: rgba(248,81,73,0.3);
  }
`

export default function CodeView({ content, highlightedHtml }: Props) {
  if (highlightedHtml) {
    return (
      <>
        <style>{CODE_STYLES}</style>
        <div
          className="text-sm [&>pre]:p-4 [&>pre]:min-h-full [&>pre]:font-mono [&>pre]:text-xs [&>pre]:leading-relaxed [&>pre]:overflow-auto"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </>
    )
  }

  return (
    <pre className="p-4 text-sm text-white/80 font-mono whitespace-pre-wrap break-all">
      {content}
    </pre>
  )
}
