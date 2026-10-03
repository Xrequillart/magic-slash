import { useState, type KeyboardEvent } from 'react'
import { Check, MessageCircleQuestion, ShieldQuestion, SquareTerminal } from './icons'
import { Button } from './Button'
import type { MenuBarAnswer } from './MenuBarQuestion'

/**
 * WHAT THE AGENT IS BLOCKED ON, ANSWERED WHERE THE CONVERSATION IS.
 *
 * The question the menu bar panel shows (`MenuBarQuestion`), at the chat's scale: an
 * `AskUserQuestion` with every one of its options rather than four, a multiSelect one
 * with boxes and a Send, a permission prompt with Allow / Deny and the terminal's tail
 * that says what for. The answer is the same `MenuBarAnswer`, typed into the TUI by the
 * same keystrokes, so the chat and the panel can never answer differently.
 *
 * `unsupported` is a question the keystrokes cannot be guessed for (several questions
 * in one call, an answer already half-typed in the terminal): it is shown, and the only
 * way on is the terminal.
 *
 * `held` is the way round that: the app holds the agent's AskUserQuestion hook, so the
 * answer goes back as text rather than keystrokes, and every form is answerable. The
 * card is then a form (`QuestionForm`): each question with its options and a free-text
 * "other", answered together.
 *
 * THE SELECTION IS LOCAL STATE, so the caller keys this by the question's token.
 */

export interface ChatQuestionItem {
  prompt: string
  header?: string
  options: { label: string; description?: string }[]
  multiSelect?: boolean
}

export interface ChatQuestionData {
  kind: 'permission' | 'ask'
  prompt: string
  options: { label: string; description?: string }[]
  multiSelect?: boolean
  unsupported?: boolean
  /** Every question of an `ask`, the first included. */
  questions?: ChatQuestionItem[]
  /** Answered as text, through the hook the app holds: see the note above. */
  held?: boolean
  /** The terminal's tail, for a permission prompt. */
  preview?: string
}

export interface ChatQuestionLabels {
  allow: string
  deny: string
  send: string
  multiHint: string
  unsupported: string
  showTerminal: string
  /** The free-text answer's placeholder, on a held question. */
  other: string
}

export interface ChatQuestionProps {
  question: ChatQuestionData
  labels: ChatQuestionLabels
  onAnswer: (answer: MenuBarAnswer) => void
  onShowTerminal: () => void
  /** An answer is being typed: every control waits. */
  busy?: boolean
}

export function ChatQuestion({ question, labels, onAnswer, onShowTerminal, busy }: ChatQuestionProps) {
  const [picked, setPicked] = useState<number[]>([])
  const permission = question.kind === 'permission'
  const MarkIcon = permission ? ShieldQuestion : MessageCircleQuestion

  if (question.kind === 'ask' && question.held && !question.unsupported) {
    const items = question.questions ?? [{ prompt: question.prompt, options: question.options, multiSelect: question.multiSelect }]
    return (
      <div className="rounded-2xl border border-accent/40 bg-surface p-3" role="group" aria-label={question.prompt}>
        <QuestionForm items={items} labels={labels} onAnswer={onAnswer} busy={busy} />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-accent/40 bg-surface p-3" role="group" aria-label={question.prompt}>
      <div className="flex items-start gap-2.5">
        <MarkIcon className="mt-0.5 w-4 h-4 flex-shrink-0 text-accent" />
        <p className="flex-1 whitespace-pre-wrap text-sm font-medium text-ink">{question.prompt}</p>
      </div>

      {permission && question.preview && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-sunken px-3 py-2 font-mono text-[11px] text-text-secondary">
          {question.preview}
        </pre>
      )}

      {question.unsupported ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="flex-1 text-xs text-text-secondary">{labels.unsupported}</span>
          <Button size="xs" tone="solid" icon={SquareTerminal} onClick={onShowTerminal}>{labels.showTerminal}</Button>
        </div>
      ) : permission ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" tone="accent" icon={Check} onClick={() => onAnswer({ kind: 'option', index: 0 })} disabled={busy}>{labels.allow}</Button>
          <Button size="sm" tone="neutral" onClick={() => onAnswer({ kind: 'deny' })} disabled={busy}>{labels.deny}</Button>
        </div>
      ) : (
        <>
          {question.multiSelect && <p className="mt-2 text-xs text-text-secondary/70">{labels.multiHint}</p>}
          <div className="mt-2 flex flex-col gap-1.5">
            {question.options.map((option, index) => {
              const on = picked.includes(index)
              return (
                <button
                  key={index}
                  type="button"
                  disabled={busy}
                  aria-pressed={question.multiSelect ? on : undefined}
                  onClick={() =>
                    question.multiSelect
                      ? setPicked(on ? picked.filter((i) => i !== index) : [...picked, index].sort((a, b) => a - b))
                      : onAnswer({ kind: 'option', index })
                  }
                  className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                    on ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/40 hover:bg-ink/5'
                  }`}
                >
                  <span className={`mt-px flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${on ? 'bg-accent text-on-brand' : 'bg-ink/10 text-text-secondary'}`}>
                    {on ? <Check className="w-3 h-3" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{option.label}</span>
                    {option.description && <span className="block text-xs text-text-secondary">{option.description}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          {question.multiSelect && (
            <div className="mt-2.5 flex justify-end">
              <Button size="sm" tone="accent" onClick={() => onAnswer({ kind: 'options', indexes: picked })} disabled={busy || picked.length === 0}>{labels.send}</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** One question's answer as it is being given: options picked, and the free text. */
interface Draft {
  picked: number[]
  other: string
}

/**
 * Every question of a held ask, answered together and sent as text, one answer per
 * question: the label picked, or the labels joined by ", " for a multiSelect (Claude
 * Code's own spelling), or what was typed in "other", which stands in for the options
 * of a single-select and joins them on a multiSelect.
 *
 * A single single-select question keeps the panel's one click: picking an option is
 * the answer, and only the free text needs the Send.
 */
function QuestionForm({ items, labels, onAnswer, busy }: {
  items: ChatQuestionItem[]
  labels: ChatQuestionLabels
  onAnswer: (answer: MenuBarAnswer) => void
  busy?: boolean
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => items.map(() => ({ picked: [], other: '' })))
  const oneClick = items.length === 1 && !items[0].multiSelect

  const answerOf = (item: ChatQuestionItem, draft: Draft): string => {
    const other = draft.other.trim()
    if (!item.multiSelect) return other || (draft.picked.length ? item.options[draft.picked[0]].label : '')
    return [...draft.picked.map((i) => item.options[i].label), ...(other ? [other] : [])].join(', ')
  }
  const answers = items.map((item, i) => answerOf(item, drafts[i]))
  const complete = answers.every((a) => a !== '')
  const send = () => { if (complete && !busy) onAnswer({ kind: 'answers', answers }) }

  const update = (index: number, next: Partial<Draft>) =>
    setDrafts((current) => current.map((d, i) => (i === index ? { ...d, ...next } : d)))

  const pick = (index: number, option: number) => {
    const item = items[index]
    if (!item.multiSelect) {
      if (oneClick) { onAnswer({ kind: 'answers', answers: [item.options[option].label] }); return }
      update(index, { picked: [option], other: '' })
      return
    }
    const picked = drafts[index].picked
    update(index, { picked: picked.includes(option) ? picked.filter((p) => p !== option) : [...picked, option].sort((a, b) => a - b) })
  }

  const onOtherKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, index) => (
        <div key={index} role="group" aria-label={item.prompt}>
          <div className="flex items-start gap-2.5">
            <MessageCircleQuestion className="mt-0.5 w-4 h-4 flex-shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              {item.header && items.length > 1 && <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary/70">{item.header}</p>}
              <p className="whitespace-pre-wrap text-sm font-medium text-ink">{item.prompt}</p>
            </div>
          </div>
          {item.multiSelect && <p className="mt-2 text-xs text-text-secondary/70">{labels.multiHint}</p>}
          <div className="mt-2 flex flex-col gap-1.5">
            {item.options.map((option, o) => {
              // A single-select's typed answer replaces its options: none shows picked.
              const on = drafts[index].picked.includes(o) && (item.multiSelect || drafts[index].other.trim() === '')
              return (
                <button
                  key={o}
                  type="button"
                  disabled={busy}
                  aria-pressed={on}
                  onClick={() => pick(index, o)}
                  className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                    on ? 'border-accent bg-accent/10' : 'border-line hover:border-accent/40 hover:bg-ink/5'
                  }`}
                >
                  <span className={`mt-px flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-semibold ${on ? 'bg-accent text-on-brand' : 'bg-ink/10 text-text-secondary'}`}>
                    {on ? <Check className="w-3 h-3" /> : o + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{option.label}</span>
                    {option.description && <span className="block text-xs text-text-secondary">{option.description}</span>}
                  </span>
                </button>
              )
            })}
            <input
              type="text"
              value={drafts[index].other}
              disabled={busy}
              onChange={(e) => update(index, { other: e.target.value })}
              onKeyDown={onOtherKey}
              placeholder={labels.other}
              aria-label={labels.other}
              className={`w-full rounded-xl border bg-transparent px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-text-secondary/50 disabled:opacity-50 ${
                drafts[index].other.trim() ? 'border-accent bg-accent/10' : 'border-line focus:border-accent/60'
              }`}
            />
          </div>
        </div>
      ))}
      {!(oneClick && drafts[0].other.trim() === '') && (
        <div className="flex justify-end">
          <Button size="sm" tone="accent" onClick={send} disabled={busy || !complete}>{labels.send}</Button>
        </div>
      )}
    </div>
  )
}
