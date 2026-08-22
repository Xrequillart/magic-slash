import { Edit2, Check } from 'lucide-react'
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

/** Click-to-edit agent title. Enter saves, Escape cancels, blur saves. */
export function AgentTitleField({ identity }: { identity: AgentIdentity }) {
  const t = useT()

  if (identity.isEditingTitle) {
    return (
      <div className="flex items-center gap-2">
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
          className="flex-1 bg-surface border border-accent rounded px-2 py-1 text-ink font-semibold text-sm focus:outline-none"
        />
      </div>
    )
  }

  return (
    <div
      className="flex items-start gap-2 cursor-pointer hover:bg-surface -mx-2 px-2 py-1 rounded transition-colors"
      onClick={identity.startEditingTitle}
    >
      {identity.title ? (
        <h2 className="flex-1 text-ink font-semibold text-sm leading-tight break-words">{identity.title}</h2>
      ) : (
        <h2 className="flex-1 text-text-secondary/40 italic text-sm">{t('agentInfo.addTitle')}</h2>
      )}
      <Edit2 className="w-3.5 h-3.5 text-text-secondary/30 hover:text-text-secondary/60 transition-colors flex-shrink-0 mt-0.5" />
    </div>
  )
}

/** Click-to-edit agent description. ⌘Enter saves, Escape cancels. */
export function AgentDescriptionField({ identity }: { identity: AgentIdentity }) {
  const t = useT()

  if (identity.isEditingDescription) {
    return (
      <div className="space-y-2">
        <textarea
          ref={identity.descriptionInputRef}
          value={identity.editDescription}
          onChange={(e) => identity.setEditDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') identity.setIsEditingDescription(false)
            if (e.key === 'Enter' && e.metaKey) identity.saveDescription()
          }}
          placeholder={t('agentInfo.descriptionPlaceholder')}
          rows={3}
          className="w-full bg-surface border border-accent rounded px-2 py-1.5 text-xs text-ink/70 focus:outline-none resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary/40">⌘Enter to save, Esc to cancel</span>
          <button
            onClick={identity.saveDescription}
            className="flex items-center gap-1 px-2 py-1 text-xs text-green hover:bg-green/10 rounded transition-colors"
          >
            <Check className="w-3 h-3" />
            {t('common.save')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="cursor-pointer hover:bg-surface -mx-2 px-2 py-1 rounded transition-colors"
      onClick={identity.startEditingDescription}
    >
      <div className="flex items-start gap-2">
        {identity.description ? (
          <div className="flex-1 text-xs text-ink/60 whitespace-pre-wrap break-words leading-relaxed">
            {identity.description}
          </div>
        ) : (
          <span className="flex-1 text-xs text-text-secondary/40 italic">{t('agentInfo.addDescription')}</span>
        )}
        <Edit2 className="w-3 h-3 text-text-secondary/30 hover:text-text-secondary/60 transition-colors flex-shrink-0 mt-0.5" />
      </div>
    </div>
  )
}
