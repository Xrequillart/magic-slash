import { useState, useRef, useEffect } from 'react'
import { Edit2, Check, ChevronDown } from 'lucide-react'
import type { TerminalMetadata } from '../../../types'

const STATUS_OPTIONS = [
  { value: 'in progress',  bg: 'bg-yellow/20',    text: 'text-yellow' },
  { value: 'committed',    bg: 'bg-cyan-500/20',  text: 'text-cyan-400' },
  { value: 'ready for PR', bg: 'bg-orange/20',    text: 'text-orange' },
  { value: 'PR created',   bg: 'bg-green/20',     text: 'text-green' },
] as const

function getStatusColors(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) ?? { bg: 'bg-white/10', text: 'text-white' }
}

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
  onStatusChange?: (status: string) => void
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
  onStatusChange,
}: TicketHeaderProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isStatusOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsStatusOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isStatusOpen])

  return (
    <div className="bg-white/[0.06] rounded-xl p-4">
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
          <div ref={statusRef} className="relative">
            <button
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium cursor-pointer border-none ${getStatusColors(metadata.status).bg} ${getStatusColors(metadata.status).text}`}
            >
              {metadata.status}
              <ChevronDown className={`w-3 h-3 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
            </button>
            {isStatusOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-bg-tertiary border border-border/50 rounded-lg shadow-xl py-1 overflow-hidden">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onStatusChange?.(option.value)
                      setIsStatusOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-white/10 transition-colors border-none cursor-pointer ${
                      metadata.status === option.value ? 'bg-white/5' : ''
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${option.text}`} style={{ backgroundColor: 'currentColor' }} />
                    <span className={metadata.status === option.value ? 'text-white font-medium' : 'text-text-secondary'}>
                      {option.value}
                    </span>
                    {metadata.status === option.value && (
                      <Check className="w-3 h-3 text-white ml-auto" />
                    )}
                  </button>
                ))}
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
