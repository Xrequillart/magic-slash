import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { DiffStat } from './DiffStat'
import { ChevronRight, Maximize2, X } from './icons'
import { Modal } from './Modal'

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
 *
 * THE CARD DOES NOT SCROLL. It shows the first `PREVIEW_LINES` lines and stops: a scroller
 * inside a scrolling chat catches the wheel halfway down the conversation, and a diff of
 * four hundred lines was a box you had to scroll past rather than read. Past the preview,
 * the card's foot offers the rest, and the card GROWS into a dialog from where it stood,
 * where the whole diff scrolls. Closing shrinks it back into place.
 */

/** How many lines of the diff the card shows before it offers the rest. */
export const PREVIEW_LINES = 30

/** How long the card takes to grow into its dialog, and to shrink back. */
const MORPH_MS = 300
const MORPH_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

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
  /** The card's foot when the diff is longer than the preview. `{count}` is its line count. Translated. */
  showAllLabel: string
  /** The dialog's close button. Translated. */
  closeLabel: string
  /**
   * HOW THE CARD OPENS IN THE THREAD. `preview` (the default) is the first
   * `PREVIEW_LINES` lines and the rest on request, as described above; `full` draws every
   * line in place, for a reader who wants the change without a click; `collapsed` is the
   * header alone, the file and its counts, and a press on it opens the preview. The
   * reader's choice, from the chat view's settings.
   */
  display?: ChatDiffDisplay
}

export type ChatDiffDisplay = 'preview' | 'full' | 'collapsed'

type Row =
  | { kind: 'line'; sign: '+' | '-' | ' '; text: string; oldNo?: number; newNo?: number; index: number }
  | { kind: 'fold'; key: string }

const LINE_GROUND = { '+': 'bg-green/10', '-': 'bg-red/10', ' ': '' } as const
const SIGN_TONE = { '+': 'text-green', '-': 'text-red', ' ': 'text-text-secondary/40' } as const

/**
 * closed → opening (the dialog stands exactly on the card, no transition yet) → open
 * (it moves to the middle of the window) → closing (back onto the card) → closed.
 */
type Phase = 'closed' | 'opening' | 'open' | 'closing'

interface Box { top: number; left: number; width: number; height: number }

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function ChatDiffCard({ diff, highlightLines, truncatedLabel, showAllLabel, closeLabel, display = 'preview' }: ChatDiffCardProps) {
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

  // The preview: the first PREVIEW_LINES lines, folds between them kept, never one last.
  const { preview, lineCount } = useMemo(() => {
    const out: Row[] = []
    let lines = 0
    let total = 0
    for (const row of rows) {
      if (row.kind === 'line') {
        total++
        if (lines < PREVIEW_LINES) { out.push(row); lines++ }
      } else if (lines < PREVIEW_LINES) {
        out.push(row)
      }
    }
    while (out.length > 0 && out[out.length - 1].kind === 'fold') out.pop()
    return { preview: out, lineCount: total }
  }, [rows])
  const full = display === 'full'
  const cut = !full && lineCount > PREVIEW_LINES
  // A collapsed card opened by its header shows the preview from then on.
  const [unfolded, setUnfolded] = useState(false)
  const folded = display === 'collapsed' && !unfolded

  const cardRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('closed')
  const [box, setBox] = useState<Box | null>(null)

  // Where the dialog lands: as wide as a diff wants, as tall as this one is, centred.
  // The height is the card's own row height times every row, so a diff just past the
  // preview opens a dialog just past the card rather than a window-tall one.
  const target = useCallback((): Box => {
    const card = cardRef.current
    const head = card?.firstElementChild?.getBoundingClientRect().height ?? 33
    const row = card?.querySelector('tr')?.getBoundingClientRect().height ?? 18
    const width = Math.min(960, window.innerWidth - 64)
    const content = head + rows.length * row + 8 + (diff.truncated ? 24 : 0)
    const height = Math.min(content, window.innerHeight - 96)
    return { top: (window.innerHeight - height) / 2, left: (window.innerWidth - width) / 2, width, height }
  }, [rows.length, diff.truncated])

  const here = (): Box | null => {
    const r = cardRef.current?.getBoundingClientRect()
    return r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null
  }

  const open = () => {
    const from = here()
    if (!from || reducedMotion()) {
      setBox(target())
      setPhase('open')
      return
    }
    setBox(from)
    setPhase('opening')
  }

  // Two frames: the first paints the dialog on the card, the second moves it, so the
  // browser has a start to transition from.
  useEffect(() => {
    if (phase !== 'opening') return
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setBox(target())
        setPhase('open')
      })
    })
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
  }, [phase, target])

  const close = useCallback(() => {
    const to = here()
    if (!to || reducedMotion()) {
      setPhase('closed')
      return
    }
    scrollerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    setBox(to)
    setPhase('closing')
  }, [])

  useEffect(() => {
    if (phase !== 'closing') return
    const timer = setTimeout(() => setPhase('closed'), MORPH_MS)
    return () => clearTimeout(timer)
  }, [phase])

  // While open: Escape closes, and goes no further, since the composer's Escape stops
  // the agent; a window resized re-centres the dialog.
  useEffect(() => {
    if (phase !== 'open') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    const onResize = () => setBox(target())
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onResize)
    }
  }, [phase, close, target])

  const panelStyle: CSSProperties | undefined = box ? {
    position: 'fixed',
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
    transition: phase === 'opening' ? 'none'
      : ['top', 'left', 'width', 'height'].map((p) => `${p} ${MORPH_MS}ms ${MORPH_EASE}`).join(', '),
  } : undefined

  const header = (
    <div className="flex items-center gap-3 border-b border-line-subtle px-3 py-2">
      <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-ink" title={diff.path}>{name}</span>
      <DiffStat additions={diff.added} deletions={diff.removed} />
    </div>
  )

  return (
    <>
      <div
        ref={cardRef}
        className="overflow-hidden rounded-xl border border-line bg-surface"
        // The dialog IS the card while it is out: two of it on screen would read as a copy.
        style={phase === 'closed' ? undefined : { visibility: 'hidden' }}
      >
        {display === 'collapsed' ? (
          <button
            type="button"
            onClick={() => setUnfolded(!unfolded)}
            aria-expanded={!folded}
            className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-ink/5 ${folded ? '' : 'border-b border-line-subtle'}`}
          >
            <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 text-icon transition-transform ${folded ? '' : 'rotate-90'}`} />
            <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-ink" title={diff.path}>{name}</span>
            <DiffStat additions={diff.added} deletions={diff.removed} />
          </button>
        ) : header}
        {!folded && (
          <div className="overflow-hidden py-1 font-mono text-[length:var(--chat-code-size,11px)] leading-[1.6]">
            <DiffRows rows={full ? rows : preview} tokens={tokens} />
            {diff.truncated && !cut && <p className="px-3 py-1 text-text-secondary/60">{truncatedLabel}</p>}
          </div>
        )}
        {cut && !folded && (
          <button
            type="button"
            onClick={open}
            className="flex w-full items-center justify-center gap-1.5 border-t border-line-subtle px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <Maximize2 className="h-3 w-3" />
            {showAllLabel.replace('{count}', String(lineCount))}
          </button>
        )}
      </div>

      {phase !== 'closed' && (
        <Modal
          onClose={close}
          backdropClassName={`transition-opacity duration-300 ${phase === 'open' ? 'opacity-100' : 'opacity-0'}`}
          className="flex flex-col overflow-hidden"
          style={panelStyle}
        >
          <div className="flex items-center gap-3 border-b border-line-subtle py-1.5 pl-3 pr-1.5">
            <span className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-ink" title={diff.path}>{diff.path}</span>
            <DiffStat additions={diff.added} deletions={diff.removed} />
            <ButtonIcon icon={X} title={closeLabel} onClick={close} tone="ghost" />
          </div>
          <div
            ref={scrollerRef}
            className={`min-h-0 flex-1 py-1 font-mono text-[length:var(--chat-code-size,11px)] leading-[1.6] ${
              phase === 'open' ? 'overflow-auto overscroll-contain' : 'overflow-hidden'
            }`}
          >
            <DiffRows rows={rows} tokens={tokens} />
            {diff.truncated && <p className="px-3 py-1 text-text-secondary/60">{truncatedLabel}</p>}
          </div>
        </Modal>
      )}
    </>
  )
}

function DiffRows({ rows, tokens }: { rows: Row[]; tokens: ChatDiffToken[][] | null }) {
  return (
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
