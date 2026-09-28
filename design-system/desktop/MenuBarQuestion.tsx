import { useState } from 'react'
import { Check, ExternalLink, MessageCircleQuestion } from './icons'
import { Icon } from './Icon'
import { Text } from './Text'

/**
 * AN AGENT'S PENDING QUESTION, answerable from the menu bar panel without bringing the
 * app to the front.
 *
 * Moved here from the app's `TrayPopover/QuestionCard`, which drew it by hand. What it
 * shows is the question as the agent asked it: a permission prompt gets Allow / Deny and
 * a preview of the terminal's tail (the notification only says permission is needed,
 * never what for); an `AskUserQuestion` gets its own options and no refusal, since
 * Escape would interrupt the agent rather than answer it; a multiSelect one gets boxes
 * and a Send button, because a box that answered on click would send the first tick and
 * lose the rest.
 *
 * THE SELECTION IS LOCAL STATE, which is why the caller keys this by the question's
 * token: a new question on the same agent has to start from an empty selection.
 */

/** What the reader chose — the app's `TrayAnswerChoice`, spelled here so the design
    system does not reach into the app for a type. */
export type MenuBarAnswer =
  | { kind: 'option'; index: number }
  | { kind: 'options'; indexes: number[] }
  | { kind: 'deny' }

export interface MenuBarQuestionOption {
  label: string
  description?: string
}

export interface MenuBarQuestionLabels {
  allow: string
  deny: string
  send: string
  multiHint: string
  unsupported: string
  openAgent: string
  /** "2 more options in the agent". A function because only the caller can plural. */
  moreOptions: (count: number) => string
}

export interface MenuBarQuestionProps {
  kind: 'permission' | 'ask'
  prompt: string
  /** The terminal's tail, for a permission prompt. */
  preview?: string
  options: MenuBarQuestionOption[]
  multiSelect?: boolean
  /** A question the panel cannot answer: only "open the agent" is offered. */
  unsupported?: boolean
  labels: MenuBarQuestionLabels
  onAnswer: (answer: MenuBarAnswer) => void
  onOpenAgent: () => void
}

/**
 * How many options the panel renders as buttons. A layout limit, not a data one: the
 * panel is 320px wide, and a question with more branches is better answered where there
 * is room. "Open the agent" is always there for exactly that.
 */
const MAX_OPTIONS = 4

const OPTION = 'w-full text-left px-2 py-1.5 rounded-lg text-[12px] border transition-colors'

function OptionBody({ option }: { option: MenuBarQuestionOption }) {
  return (
    <span className="min-w-0">
      <span className="font-medium">{option.label}</span>
      {option.description && (
        <span className="block truncate text-[10px] text-text-secondary">{option.description}</span>
      )}
    </span>
  )
}

function MultiSelect({
  options,
  labels,
  onSubmit,
}: {
  options: MenuBarQuestionOption[]
  labels: MenuBarQuestionLabels
  onSubmit: (indexes: number[]) => void
}) {
  const [selected, setSelected] = useState<number[]>([])
  const toggle = (index: number) =>
    setSelected((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <Text size="2xs" tone="secondary" className="block">
        {labels.multiHint}
      </Text>
      {options.map((option, index) => {
        const isSelected = selected.includes(index)
        return (
          <button
            key={`${index}-${option.label}`}
            onClick={() => toggle(index)}
            title={option.description}
            aria-pressed={isSelected}
            className={`${OPTION} flex items-start gap-1.5 ${
              isSelected
                ? 'border-accent/40 bg-accent/15 text-ink'
                : 'border-line text-text-secondary hover:bg-surface hover:text-ink'
            }`}
          >
            {/* Drawn rather than an <input>: a native checkbox brings its own focus ring
                and sizing into a 320px panel for no gain. */}
            <span
              className={`mt-px flex h-3 w-3 shrink-0 items-center justify-center rounded border ${
                isSelected ? 'border-accent bg-accent text-on-brand' : 'border-line'
              }`}
            >
              {isSelected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            <OptionBody option={option} />
          </button>
        )
      })}
      {/* Disabled rather than hidden while nothing is ticked: the button is how the card
          says "your answer goes when you say so". */}
      <button
        onClick={() => onSubmit(selected)}
        disabled={selected.length === 0}
        className={`${OPTION} text-center font-medium ${
          selected.length === 0
            ? 'border-line text-text-secondary/50'
            : 'border-accent/40 bg-accent/15 text-ink hover:bg-accent/25'
        }`}
      >
        {labels.send}
        {selected.length > 0 && ` (${selected.length})`}
      </button>
    </div>
  )
}

export function MenuBarQuestion({
  kind,
  prompt,
  preview,
  options: allOptions,
  multiSelect = false,
  unsupported = false,
  labels,
  onAnswer,
  onOpenAgent,
}: MenuBarQuestionProps) {
  const isPermission = kind === 'permission'
  // A permission prompt with no options of its own gets the panel's Allow, which is the
  // row the TUI already has highlighted.
  const options = isPermission && allOptions.length === 0 ? [{ label: labels.allow }] : allOptions.slice(0, MAX_OPTIONS)
  // Said rather than swallowed: a list cut at four looks complete.
  const hidden = Math.max(0, allOptions.length - options.length)

  return (
    <div className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-2">
      <div className="flex items-start gap-1.5">
        <Icon glyph={MessageCircleQuestion} size="sm" tone="inherit" className="mt-0.5 shrink-0 text-accent" />
        <p className="flex-1 text-[12px] leading-snug text-ink">{prompt}</p>
      </div>

      {preview && (
        // `break-all`: a command line has no spaces to wrap on and would widen the panel.
        <pre className="mt-1.5 max-h-24 overflow-y-auto whitespace-pre-wrap break-all rounded-lg bg-surface-sunken px-2 py-1.5 font-mono text-[10px] leading-relaxed text-text-secondary">
          {preview}
        </pre>
      )}

      {unsupported ? (
        <Text size="2xs" tone="secondary" className="mt-1.5 block">
          {labels.unsupported}
        </Text>
      ) : multiSelect ? (
        <MultiSelect options={options} labels={labels} onSubmit={(indexes) => onAnswer({ kind: 'options', indexes })} />
      ) : (
        <div className="mt-1.5 flex flex-col gap-1">
          {options.map((option, index) => (
            <button
              key={`${index}-${option.label}`}
              onClick={() => onAnswer({ kind: 'option', index })}
              title={option.description}
              className={`${OPTION} border-accent/40 bg-accent/15 text-ink hover:bg-accent/25`}
            >
              <OptionBody option={option} />
            </button>
          ))}
          {/* Only a permission can be refused. */}
          {isPermission && (
            <button
              onClick={() => onAnswer({ kind: 'deny' })}
              className={`${OPTION} border-line text-text-secondary hover:bg-red/10 hover:text-red`}
            >
              <span className="font-medium">{labels.deny}</span>
            </button>
          )}
        </div>
      )}

      {!unsupported && hidden > 0 && (
        <Text size="2xs" tone="secondary" className="mt-1 block">
          {labels.moreOptions(hidden)}
        </Text>
      )}

      {/* The answer to everything the panel cannot do here. */}
      <button
        onClick={onOpenAgent}
        className="mt-1.5 flex items-center gap-1 text-[11px] text-text-secondary transition-colors hover:text-accent"
      >
        <ExternalLink className="h-3 w-3 shrink-0" />
        <span>{labels.openAgent}</span>
      </button>
    </div>
  )
}
