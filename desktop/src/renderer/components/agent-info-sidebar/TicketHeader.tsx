import { Edit2, Check } from 'lucide-react'
import type { TerminalMetadata } from '../../../types'

interface TicketHeaderProps {
  metadata: TerminalMetadata | undefined
  ticketLink: string | null
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

export function TicketHeader({
  metadata,
  ticketLink,
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
}: TicketHeaderProps) {
  return (
    <div className="bg-bg-tertiary/50 rounded-lg p-4 border border-border/50">
      {/* Ticket ID + Status Badge */}
      <div className="flex items-center justify-between mb-3">
        {metadata?.ticketId ? (
          ticketLink ? (
            <button
              onClick={() => window.electronAPI.shell.openExternal(ticketLink)}
              className="text-white text-sm font-semibold hover:underline cursor-pointer bg-transparent border-none p-0"
            >
              {metadata.ticketId}
            </button>
          ) : (
            <span className="text-white text-sm font-semibold">{metadata.ticketId}</span>
          )
        ) : (
          <span className="text-text-secondary/40 text-base">No ticket</span>
        )}
        {metadata?.status && (
          <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${
            metadata.status === 'in progress' ? 'bg-yellow/20 text-yellow' :
            metadata.status === 'committed' ? 'bg-cyan-500/20 text-cyan-400' :
            metadata.status === 'ready for PR' ? 'bg-orange/20 text-orange' :
            metadata.status === 'PR created' ? 'bg-green/20 text-green' :
            metadata.status === 'PR sent' ? 'bg-purple/20 text-purple' :
            'bg-white/10 text-white'
          }`}>
            {metadata.status}
          </span>
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
            placeholder="Enter title..."
            className="flex-1 bg-bg-tertiary border border-accent rounded px-2 py-1 text-white font-semibold text-lg focus:outline-none"
          />
        </div>
      ) : (
        <div
          className="flex items-start gap-2 cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded transition-colors"
          onClick={startEditingTitle}
        >
          {metadata?.title ? (
            <h2 className="flex-1 text-white font-semibold text-lg leading-tight break-words">{metadata.title}</h2>
          ) : (
            <h2 className="flex-1 text-text-secondary/40 italic text-lg">Click to add title</h2>
          )}
          <Edit2 className="w-3.5 h-3.5 text-text-secondary/30 hover:text-text-secondary/60 transition-colors flex-shrink-0 mt-0.5" />
        </div>
      )}

      {/* Description - Editable */}
      <div className="mt-3 pt-3 border-t border-border/30">
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
              placeholder="Enter description..."
              rows={3}
              className="w-full bg-bg-tertiary border border-accent rounded px-2 py-1.5 text-sm text-white/70 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary/40">⌘Enter to save, Esc to cancel</span>
              <button
                onClick={saveDescription}
                className="flex items-center gap-1 px-2 py-1 text-xs text-green hover:bg-green/10 rounded transition-colors"
              >
                <Check className="w-3 h-3" />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            className="cursor-pointer hover:bg-white/5 -mx-2 px-2 py-1 rounded transition-colors"
            onClick={startEditingDescription}
          >
            <div className="flex items-start gap-2">
              {metadata?.description ? (
                <div className="flex-1 text-sm text-white/60 whitespace-pre-wrap break-words leading-relaxed">
                  {metadata.description}
                </div>
              ) : (
                <span className="flex-1 text-sm text-text-secondary/40 italic">Click to add description</span>
              )}
              <Edit2 className="w-3 h-3 text-text-secondary/30 hover:text-text-secondary/60 transition-colors flex-shrink-0 mt-0.5" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
