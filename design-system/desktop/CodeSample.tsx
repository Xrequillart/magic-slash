import { CODE_STYLES } from './codeChrome'

/**
 * A FEW LINES OF HIGHLIGHTED CODE, READ AND NOT TOUCHED: shiki's HTML under the same
 * gutter and diff rails the app's file preview draws, with none of its commenting.
 *
 * Written for Settings → Code & reviews, where a palette and a size are previewed on a
 * sample diff. The file preview itself is the app's `CodeView`, which does everything
 * this does plus the gutter picks and the comment cards, and it draws with the same
 * stylesheet (`codeChrome.ts`) so the two cannot come to look different.
 *
 * The HTML is TRUSTED: it comes from the app's own highlighter in the main process,
 * never from a user. Absent (shiki failed), the raw text is drawn instead, unhighlighted
 * but still readable.
 */
export interface CodeSampleProps {
  /** Shiki's output, already numbered and diff-annotated. Null to draw `content` plain. */
  html: string | null
  /** The raw text, for when there is no HTML. */
  content: string
  /** The appearance the HTML was highlighted in; the gutter and rails follow it. */
  appearance: 'light' | 'dark'
  /** In pixels. */
  fontSize: number
  /**
   * Drop the palette's own background so the code sits on the surface under it. True in
   * the app: a palette family always has a variant of the interface's own appearance.
   */
  blend?: boolean
}

export function CodeSample({ html, content, appearance, fontSize, blend = true }: CodeSampleProps) {
  if (html === null) {
    return (
      <pre className="p-4 font-mono leading-relaxed text-ink/80 whitespace-pre-wrap break-all" style={{ fontSize }}>
        {content}
      </pre>
    )
  }
  return (
    <>
      <style>{CODE_STYLES[appearance]}</style>
      <div
        /* `!bg-transparent` beats the background shiki writes as an INLINE style on its own
           `<pre>`; nothing but `!important` can. */
        className={`[&>pre]:p-4 [&>pre]:font-mono [&>pre]:leading-relaxed [&>pre]:overflow-auto ${blend ? '[&>pre]:!bg-transparent' : ''}`}
        style={{ fontSize }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  )
}
