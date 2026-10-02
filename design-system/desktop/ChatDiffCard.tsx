import { useEffect, useMemo, useState } from 'react'
import { DiffStat } from './DiffStat'

/**
 * A FILE THE AGENT CHANGED, as the change itself: the file's name on the left of the
 * header, what it gained and lost on the right, and under it the lines added and
 * removed, in the file's own syntax colours, with the context around them.
 *
 * The hunks are Claude Code's own (its `structuredPatch`), so the line numbers are the
 * file's. Between two hunks, a fold says lines were skipped.
 *
 * THE COLOUR IS THE CALLER'S, as in `ChatMarkdown`: `highlightLines(code, lang)` answers
 * one array of tokens per line of `code`. All the lines of the card are coloured in ONE
 * call, removed and added together, which is not quite either version of the file but
 * is what keeps a string opened on one line coloured as a string on the next. The lines
 * are drawn plain until it answers.
 */

export interface ChatDiffData {
  path: string
  added: number
  removed: number
  hunks: { oldStart: number; newStart: number; lines: string[] }[]
  truncated?: boolean
}

export interface ChatDiffToken {
  content: string
  color?: string
  /** Shiki's bit field: 1 italic, 2 bold, 4 underline. */
  fontStyle?: number
}

export type ChatLineHighlighter = (code: string, lang: string | undefined) => Promise<ChatDiffToken[][] | null>

export interface ChatDiffCardProps {
  diff: ChatDiffData
  highlightLines?: ChatLineHighlighter
  /** "Cut here: the rest is in the file." Translated. */
  truncatedLabel: string
}

type Row =
  | { kind: 'line'; sign: '+' | '-' | ' '; text: string; oldNo?: number; newNo?: number; index: number }
  | { kind: 'fold'; key: string }

const LINE_GROUND = { '+': 'bg-green/10', '-': 'bg-red/10', ' ': '' } as const
const SIGN_TONE = { '+': 'text-green', '-': 'text-red', ' ': 'text-text-secondary/40' } as const

export function ChatDiffCard({ diff, highlightLines, truncatedLabel }: ChatDiffCardProps) {
  const name = diff.path.slice(diff.path.lastIndexOf('/') + 1)
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : undefined

  // Every line of every hunk, numbered as the file numbers them, with a fold between hunks.
  const { rows, code } = useMemo(() => {
    const out: Row[] = []
    const texts: string[] = []
    diff.hunks.forEach((hunk, h) => {
      if (h > 0) out.push({ kind: 'fold', key: `fold-${h}` })
      let oldNo = hunk.oldStart
      let newNo = hunk.newStart
      for (const raw of hunk.lines) {
        // "\ No newline at end of file" is about the file, not a line of it.
        if (raw.startsWith('\\')) continue
        const sign = raw[0] === '+' || raw[0] === '-' ? raw[0] : ' '
        const text = sign === ' ' && raw[0] !== ' ' ? raw : raw.slice(1)
        out.push({
          kind: 'line', sign, text, index: texts.length,
          ...(sign !== '+' ? { oldNo: oldNo++ } : {}),
          ...(sign !== '-' ? { newNo: newNo++ } : {}),
        })
        texts.push(text)
      }
    })
    return { rows: out, code: texts.join('\n') }
  }, [diff.hunks])

  const [tokens, setTokens] = useState<ChatDiffToken[][] | null>(null)
  useEffect(() => {
    if (!highlightLines) return
    let live = true
    highlightLines(code, ext).then((t) => { if (live) setTokens(t) }).catch(() => {})
    return () => { live = false }
  }, [code, ext, highlightLines])

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-3 border-b border-line-subtle px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-ink" title={diff.path}>{name}</span>
        <DiffStat additions={diff.added} deletions={diff.removed} />
      </div>
      <div className="max-h-96 overflow-auto py-1 font-mono text-[11px] leading-[18px]">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((row) =>
              row.kind === 'fold' ? (
                <tr key={row.key}>
                  <td colSpan={3} className="select-none px-3 py-0.5 text-text-secondary/40">⋯</td>
                </tr>
              ) : (
                <tr key={row.index} className={LINE_GROUND[row.sign]}>
                  <td className="w-px select-none whitespace-nowrap pl-3 pr-2 text-right text-text-secondary/40">
                    {row.sign === '-' ? row.oldNo : row.newNo}
                  </td>
                  <td className={`w-px select-none pr-2 ${SIGN_TONE[row.sign]}`}>{row.sign === ' ' ? '' : row.sign}</td>
                  <td className="whitespace-pre pr-3 text-ink">
                    {tokens?.[row.index] ? <Tokens tokens={tokens[row.index]} /> : row.text || ' '}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {diff.truncated && <p className="px-3 py-1 text-text-secondary/60">{truncatedLabel}</p>}
      </div>
    </div>
  )
}

function Tokens({ tokens }: { tokens: ChatDiffToken[] }) {
  if (tokens.length === 0) return <>{' '}</>
  return (
    <>
      {tokens.map((t, i) => (
        <span
          key={i}
          style={{
            color: t.color,
            fontStyle: t.fontStyle && t.fontStyle & 1 ? 'italic' : undefined,
            fontWeight: t.fontStyle && t.fontStyle & 2 ? 600 : undefined,
          }}
        >
          {t.content}
        </span>
      ))}
    </>
  )
}
