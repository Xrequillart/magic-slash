import { useState } from 'react'
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
 * THE SELECTION IS LOCAL STATE, so the caller keys this by the question's token.
 */

export interface ChatQuestionData {
  kind: 'permission' | 'ask'
  prompt: string
  options: { label: string; description?: string }[]
  multiSelect?: boolean
  unsupported?: boolean
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
