import { ExternalLink, MessageCircleQuestion } from 'lucide-react'
import type { Translate } from '../../i18n'
import type { TrayAnswerChoice, TrayQuestion } from '../../../types'

/**
 * How many options the panel is willing to render as buttons.
 *
 * Not a data limit — the store keeps every option, so indexes stay truthful — but a
 * layout one: the panel is 300-odd pixels wide inside a menu bar dropdown, and a
 * question with more branches than this is better answered where there is room for
 * it. "Open the agent" is always there for exactly that.
 */
const MAX_OPTIONS = 4

/** Shared by every option button, so only the accent treatment differs. */
const OPTION_BUTTON =
  'w-full text-left px-2 py-1.5 rounded-lg text-[12px] border transition-colors'

/**
 * An agent's pending question, answerable in place.
 *
 * The whole reason this exists is that the panel is a non-activating NSPanel: a
 * click here answers the agent WITHOUT bringing Magic Slash to the front, which is
 * the entire point of the ticket. Nothing in here may focus a window.
 *
 * A permission prompt gets Allow / Deny plus a monospace preview of the terminal
 * tail — the notification itself only says permission is needed, never what for.
 * An `AskUserQuestion` gets its own options and no refusal: Escape would interrupt
 * the agent rather than answer it.
 */
export function QuestionCard({
  question,
  onAnswer,
  onOpenAgent,
  t,
}: {
  question: TrayQuestion
  onAnswer: (choice: TrayAnswerChoice) => void
  onOpenAgent: () => void
  t: Translate
}) {
  const isPermission = question.kind === 'permission'
  // A permission prompt carries no options of its own: the panel offers its own
  // Allow, which is the row the TUI already has highlighted.
  const options = isPermission && question.options.length === 0
    ? [{ label: t('tray.question.allow') }]
    : question.options.slice(0, MAX_OPTIONS)

  return (
    // No horizontal margin: the list already insets its children (px-2) and spaces
    // them (gap-1), so the card lines up with the agent rows on its own.
    <div className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-2">
      <div className="flex items-start gap-1.5">
        <MessageCircleQuestion className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
        <p className="flex-1 text-[12px] leading-snug text-ink">{question.prompt}</p>
      </div>

      {question.preview && (
        // The real prompt, as the terminal is showing it. `break-all` because a
        // command line has no spaces to wrap on and would otherwise widen the panel.
        <pre className="mt-1.5 max-h-24 overflow-y-auto rounded-lg bg-surface-sunken px-2 py-1.5 font-mono text-[10px] leading-relaxed text-text-secondary whitespace-pre-wrap break-all">
          {question.preview}
        </pre>
      )}

      {question.unsupported ? (
        <p className="mt-1.5 text-[11px] text-text-secondary">{t('tray.question.unsupported')}</p>
      ) : (
        <div className="mt-1.5 flex flex-col gap-1">
          {options.map((option, index) => (
            <button
              key={`${index}-${option.label}`}
              onClick={() => onAnswer({ kind: 'option', index })}
              title={option.description}
              className={`${OPTION_BUTTON} border-accent/40 bg-accent/15 text-ink hover:bg-accent/25`}
            >
              <span className="font-medium">{option.label}</span>
              {option.description && (
                <span className="block truncate text-[10px] text-text-secondary">
                  {option.description}
                </span>
              )}
            </button>
          ))}

          {/* Only a permission can be refused: Escape on an AskUserQuestion
              would interrupt the agent instead of answering it. */}
          {isPermission && (
            <button
              onClick={() => onAnswer({ kind: 'deny' })}
              className={`${OPTION_BUTTON} border-line text-text-secondary hover:bg-red/10 hover:text-red`}
            >
              <span className="font-medium">{t('tray.question.deny')}</span>
            </button>
          )}
        </div>
      )}

      {/* Always available: it is the answer to everything v1 cannot do here —
          several questions at once, multiSelect, "Other", a fifth option. */}
      <button
        onClick={onOpenAgent}
        className="mt-1.5 flex items-center gap-1 text-[11px] text-text-secondary hover:text-accent transition-colors"
      >
        <ExternalLink className="w-3 h-3 shrink-0" />
        <span>{t('tray.question.openAgent')}</span>
      </button>
    </div>
  )
}
