import { useState, useRef, useCallback } from 'react'
import { Edit2, Check, ChevronDown } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { GithubMark, JiraMark } from '../icons/TrackerIcons'
import type { TerminalMetadata } from '../../../types'
import { useT, type MessageKey } from '../../i18n'

// Every colour here is a theme token. `committed` and `Review addressed` used to be
// `cyan-500`/`cyan-400` and `teal-500`/`teal-400` straight from Tailwind's palette —
// fixed values that do not follow the theme, so on any of the four light themes the
// pill was pale blue on white and unreadable. The tokens carry a per-theme value
// (desktop/src/themes.ts), dark on a light window and bright on a dark one.
const STATUS_OPTIONS = [
  { value: '',             labelKey: 'statusPill.none',    bg: 'bg-surface-strong',      text: 'text-text-secondary' },
  { value: 'in progress',  labelKey: 'statusPill.inProgress',  bg: 'bg-yellow/20',     text: 'text-yellow' },
  { value: 'committed',    labelKey: 'statusPill.committed',     bg: 'bg-cyan/20',       text: 'text-cyan' },
  { value: 'ready for PR', labelKey: 'statusPill.readyForPR',  bg: 'bg-orange/20',     text: 'text-orange' },
  { value: 'PR created',   labelKey: 'statusPill.prCreated',    bg: 'bg-green/20',      text: 'text-green' },
  // The palette was already spent on the eight statuses around it (see themes.ts),
  // so this one takes `accent` — the last role not spoken for here.
  { value: 'CI green',     labelKey: 'statusPill.ciGreen',      bg: 'bg-accent/20',     text: 'text-accent' },
  { value: 'in review',    labelKey: 'statusPill.inReview',     bg: 'bg-blue/20',       text: 'text-blue' },
  { value: 'changes requested', labelKey: 'statusPill.changesRequested', bg: 'bg-red/20', text: 'text-red' },
  { value: 'Review addressed', labelKey: 'statusPill.reviewAddressed', bg: 'bg-teal/20', text: 'text-teal' },
  { value: 'PR merged',    labelKey: 'statusPill.prMerged',     bg: 'bg-purple/20',     text: 'text-purple' },
] as const

// Neutral badge for a non-empty status that isn't in STATUS_OPTIONS (e.g. a newer
// skill/desktop version drift). Show the raw value rather than silently falling
// back to "no status", which would hide that the workflow actually progressed.
const UNKNOWN_STATUS_STYLE = { bg: 'bg-surface-strong', text: 'text-text-secondary' } as const

// `labelKey: null` marks the unknown case: there is no catalogue entry for a
// status this version does not know, so the raw value is carried through instead.
function getStatusOption(status: string): {
  value: string
  labelKey: MessageKey | null
  rawLabel?: string
  bg: string
  text: string
} {
  const match = STATUS_OPTIONS.find(s => s.value === status)
  if (match) return match
  if (status) return { value: status, labelKey: null, rawLabel: status, ...UNKNOWN_STATUS_STYLE }
  return STATUS_OPTIONS[0]
}

/**
 * Renders nothing for an ID that matches neither tracker — a hand-typed reference is
 * still a valid ticket ID here, and a wrong mark next to it would be worse than none.
 */
function TicketMark({ provider }: { provider: 'github' | 'jira' | null }) {
  if (provider === 'github') return <GithubMark className="w-3.5 h-3.5 flex-shrink-0" />
  if (provider === 'jira') return <JiraMark className="w-3.5 h-3.5 flex-shrink-0" />
  return null
}

interface TicketHeaderProps {
  metadata: TerminalMetadata | undefined
  ticketLink: string | null
  ticketProvider: 'github' | 'jira' | null
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
  onStatusChange?: (status: string) => void
}

export function TicketHeader({
  metadata,
  ticketLink,
  ticketProvider,
  isEditingTitle,
  isEditingDescription,
  editTitle,
  editDescription,
  setEditTitle,
  setEditDescription,
  startEditingTitle,
  startEditingDescription,
  saveTitle,
  saveDescription,
  setIsEditingTitle,
  setIsEditingDescription,
  titleInputRef,
  descriptionInputRef,
  onStatusChange,
}: TicketHeaderProps) {
  const t = useT()
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const closeStatus = useCallback(() => setIsStatusOpen(false), [])
  useClickOutside(statusRef, isStatusOpen, closeStatus)

  return (
    <div className="bg-surface rounded-xl p-4">
      {/* Ticket ID + Status Badge */}
      <div className="flex items-center justify-between mb-3">
        {metadata?.ticketId ? (
          // The mark hangs off the ticket ID, not off the link: it says which tracker
          // the ID belongs to, which is worth showing even when no URL could be built
          // for it. `group-hover:underline` sits on the label alone so the underline
          // stops at the text instead of running under the mark.
          ticketLink ? (
            <button
              onClick={() => window.electronAPI.shell.openExternal(ticketLink)}
              className="group flex items-center gap-1.5 text-ink text-xs font-semibold cursor-pointer bg-transparent border-none p-0"
            >
              <TicketMark provider={ticketProvider} />
              <span className="group-hover:underline">{metadata.ticketId}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-ink text-xs font-semibold">
              <TicketMark provider={ticketProvider} />
              {metadata.ticketId}
            </span>
          )
        ) : (
          <span className="text-text-secondary/40 text-xs">{t('agentInfo.noTicket')}</span>
        )}
        {metadata && (
          <div ref={statusRef} className="relative">
            {(() => {
              const statusOption = getStatusOption(metadata.status ?? '')
              return (
                <button
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border-none ${statusOption.bg} ${statusOption.text}`}
                >
                  {statusOption.labelKey ? t(statusOption.labelKey) : statusOption.rawLabel}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
                </button>
              )
            })()}
            {isStatusOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-bg-tertiary border border-border/50 rounded-lg shadow-xl py-1 overflow-hidden">
                {STATUS_OPTIONS.map((option) => {
                  const currentStatus = metadata.status ?? ''
                  const isSelected = currentStatus === option.value
                  return (
                    <button
                      key={option.value || '__no_status__'}
                      onClick={() => {
                        onStatusChange?.(option.value)
                        setIsStatusOpen(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-surface-strong transition-colors border-none cursor-pointer ${
                        isSelected ? 'bg-surface' : ''
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${option.text}`} style={{ backgroundColor: 'currentColor' }} />
                      <span className={isSelected ? 'text-ink font-medium' : 'text-text-secondary'}>
                        {t(option.labelKey)}
                      </span>
                      {isSelected && (
                        <Check className="w-3 h-3 text-ink ml-auto" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title - Editable */}
      {isEditingTitle ? (
        <div className="flex items-center gap-2">
          <input
            ref={titleInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle()
              if (e.key === 'Escape') setIsEditingTitle(false)
            }}
            onBlur={saveTitle}
            placeholder={t('agentInfo.titlePlaceholder')}
            className="flex-1 bg-surface border border-accent rounded px-2 py-1 text-ink font-semibold text-sm focus:outline-none"
          />
        </div>
      ) : (
        <div
          className="flex items-start gap-2 cursor-pointer hover:bg-surface -mx-2 px-2 py-1 rounded transition-colors"
          onClick={startEditingTitle}
        >
          {metadata?.title ? (
            <h2 className="flex-1 text-ink font-semibold text-sm leading-tight break-words">{metadata.title}</h2>
          ) : (
            <h2 className="flex-1 text-text-secondary/40 italic text-sm">{t('agentInfo.addTitle')}</h2>
          )}
          <Edit2 className="w-3.5 h-3.5 text-text-secondary/30 hover:text-text-secondary/60 transition-colors flex-shrink-0 mt-0.5" />
        </div>
      )}

      {/* Description - Editable */}
      <div className="mt-3">
        {isEditingDescription ? (
          <div className="space-y-2">
            <textarea
              ref={descriptionInputRef}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditingDescription(false)
                if (e.key === 'Enter' && e.metaKey) saveDescription()
              }}
              placeholder={t('agentInfo.descriptionPlaceholder')}
              rows={3}
              className="w-full bg-surface border border-accent rounded px-2 py-1.5 text-xs text-ink/70 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary/40">⌘Enter to save, Esc to cancel</span>
              <button
                onClick={saveDescription}
                className="flex items-center gap-1 px-2 py-1 text-xs text-green hover:bg-green/10 rounded transition-colors"
              >
                <Check className="w-3 h-3" />
                {t('common.save')}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="cursor-pointer hover:bg-surface -mx-2 px-2 py-1 rounded transition-colors"
            onClick={startEditingDescription}
          >
            <div className="flex items-start gap-2">
              {metadata?.description ? (
                <div className="flex-1 text-xs text-ink/60 whitespace-pre-wrap break-words leading-relaxed">
                  {metadata.description}
                </div>
              ) : (
                <span className="flex-1 text-xs text-text-secondary/40 italic">{t('agentInfo.addDescription')}</span>
              )}
              <Edit2 className="w-3 h-3 text-text-secondary/30 hover:text-text-secondary/60 transition-colors flex-shrink-0 mt-0.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
