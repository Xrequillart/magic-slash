import { Edit2 } from 'lucide-react'
import { useT } from '../../i18n'

/**
 * The agent's title and description, and everything needed to edit them in place.
 *
 * Bundled into one object rather than spread over a dozen props because two
 * components now render these fields — TicketHeader for an implementation agent,
 * SpecPanel for a planning one, which has no ticket card to carry them. Passing
 * them individually meant fourteen props at each call site, and the second caller
 * would have doubled that.
 *
 * The editing state lives in AgentInfoSidebar rather than here: a field can be
 * open for editing while the agent is switched, and the sidebar is what resets it.
 */
export interface AgentIdentity {
  title?: string
  description?: string
  isEditingTitle: boolean
  isEditingDescription: boolean
  editTitle: string
  editDescription: string
  setEditTitle: (v: string) => void
  setEditDescription: (v: string) => void
  startEditingTitle: () => void
  startEditingDescription: () => void
  saveTitle: () => void
  saveDescription: () => void
  setIsEditingTitle: (v: boolean) => void
  setIsEditingDescription: (v: boolean) => void
  titleInputRef: React.RefObject<HTMLInputElement>
  descriptionInputRef: React.RefObject<HTMLTextAreaElement>
}

/**
 * THE GEOMETRY BOTH STATES SHARE — everything except the background, which is the only
 * thing allowed to differ between them.
 *
 * NO BORDER, in either state. These are not form fields sitting in a form; they are the
 * agent's own title and description, read far more often than they are written, and a
 * box drawn permanently around each of them turns a card into a settings panel. Editing
 * therefore announces itself with the ground alone — no outline, no accent rule — so
 * clicking never swaps one object for another.
 *
 * The ground appears ON HOVER and stays for the edit — the same one, so the field shows
 * up under the pointer and then simply stays put when the caret arrives.
 *
 * `surface` and not `surface-strong`: the surface tokens are TRANSLUCENT, so a field
 * wearing the card's own weight is not invisible against it, it composites to about half
 * a step above (0.07 over 0.07 on midnight, against the strong weight's 0.12). One notch
 * is all a hover wants here — the strong weight read as a lit-up block in the middle of
 * a card, which is loud for something whose job is to say "this is editable".
 *
 * The background is deliberately NOT set in this constant. Two background utilities in
 * one class string are settled by Tailwind's own ordering rather than by which was
 * written last, so each state states its own and there is nothing to override.
 */
const FIELD = 'w-full text-left border-none rounded-lg px-2 py-1.5 transition-colors'

/** Click-to-edit agent title. Enter saves, Escape cancels, blur saves. */
export function AgentTitleField({ identity }: { identity: AgentIdentity }) {
  const t = useT()

  if (identity.isEditingTitle) {
    return (
      <input
        ref={identity.titleInputRef}
        type="text"
        value={identity.editTitle}
        onChange={(e) => identity.setEditTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') identity.saveTitle()
          if (e.key === 'Escape') identity.setIsEditingTitle(false)
        }}
        onBlur={identity.saveTitle}
        placeholder={t('agentInfo.titlePlaceholder')}
        className={`${FIELD} bg-surface text-ink font-semibold text-sm leading-tight focus:outline-none`}
      />
    )
  }

  return (
    <div
      className={`${FIELD} hover:bg-surface cursor-pointer flex items-start gap-2`}
      onClick={identity.startEditingTitle}
    >
      {identity.title ? (
        <h2 className="flex-1 text-ink font-semibold text-sm leading-tight break-words">{identity.title}</h2>
      ) : (
        <h2 className="flex-1 text-text-secondary/40 italic text-sm">{t('agentInfo.addTitle')}</h2>
      )}
      <Edit2 className="w-3.5 h-3.5 text-icon-muted flex-shrink-0 mt-0.5" />
    </div>
  )
}

/**
 * Click-to-edit agent description. Enter saves, Shift+Enter is a newline, Escape
 * cancels, blur saves.
 *
 * ENTER RATHER THAN ⌘ENTER, and no Save button beside it. The button was the only way
 * out of this field that did not require knowing a shortcut, and it sat under a hint
 * that was hardcoded English — the one string in the sidebar the language switch never
 * reached. Enter is what the title field above has always done, and a description in
 * this card is a line or two, not a document: the multi-line case keeps Shift+Enter,
 * which is the convention every chat box in the app already trains.
 *
 * Blur saves too, which is what makes losing the button safe: clicking away from a
 * field with no button used to discard the edit.
 */
export function AgentDescriptionField({ identity }: { identity: AgentIdentity }) {
  const t = useT()

  if (identity.isEditingDescription) {
    return (
      <div className="space-y-1.5">
        <textarea
          ref={identity.descriptionInputRef}
          value={identity.editDescription}
          onChange={(e) => identity.setEditDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') identity.setIsEditingDescription(false)
            if (e.key === 'Enter' && !e.shiftKey) {
              // Or the newline lands in the value a moment before it is saved.
              e.preventDefault()
              identity.saveDescription()
            }
          }}
          onBlur={identity.saveDescription}
          placeholder={t('agentInfo.descriptionPlaceholder')}
          rows={3}
          className={`${FIELD} bg-surface text-xs text-ink/70 focus:outline-none resize-none leading-relaxed`}
        />
        <span className="block text-[10px] text-text-secondary/40">{t('agentInfo.descriptionHint')}</span>
      </div>
    )
  }

  return (
    <div
      className={`${FIELD} hover:bg-surface cursor-pointer flex items-start gap-2`}
      onClick={identity.startEditingDescription}
    >
      {identity.description ? (
        <div className="flex-1 text-xs text-ink/70 whitespace-pre-wrap break-words leading-relaxed">
          {identity.description}
        </div>
      ) : (
        <span className="flex-1 text-xs text-text-secondary/40 italic">{t('agentInfo.addDescription')}</span>
      )}
      <Edit2 className="w-3 h-3 text-icon-muted flex-shrink-0 mt-0.5" />
    </div>
  )
}
