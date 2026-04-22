import { useState, useCallback, useRef, useEffect } from 'react'
import { Clock, Trash2, ChevronRight } from 'lucide-react'
import { useActivityHistory } from '../../hooks/useActivityHistory'
import type { HistoryAction } from '../../../types'

const CARD_ANIM_MS = 150
const CARD_STAGGER_MS = 50

const ACTION_CONFIG: Record<HistoryAction, { label: string; color: string }> = {
  started: { label: 'Started', color: 'bg-green' },
  committed: { label: 'Committed', color: 'bg-yellow' },
  pr_created: { label: 'PR created', color: 'bg-blue' },
  review: { label: 'In review', color: 'bg-purple' },
  merged: { label: 'Merged', color: 'bg-green' },
  done: { label: 'Done', color: 'bg-teal' },
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function HistoryPage() {
  const { groups, loading, clear } = useActivityHistory()
  const [showConfirm, setShowConfirm] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [closingGroups, setClosingGroups] = useState<Set<string>>(new Set())
  const groupSizes = useRef<Map<string, number>>(new Map())
  const expandedRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const closingRef = useRef<Set<string>>(new Set())

  const collapseGroup = useCallback((groupId: string) => {
    if (closingRef.current.has(groupId)) return
    closingRef.current.add(groupId)
    setClosingGroups(c => new Set(c).add(groupId))
    const count = groupSizes.current.get(groupId) || 3
    const totalMs = CARD_ANIM_MS + (count - 1) * CARD_STAGGER_MS + 50
    setTimeout(() => {
      closingRef.current.delete(groupId)
      setClosingGroups(c => { const n = new Set(c); n.delete(groupId); return n })
      setExpandedGroups(p => { const n = new Set(p); n.delete(groupId); return n })
    }, totalMs)
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    if (expandedGroups.has(groupId)) {
      collapseGroup(groupId)
    } else {
      setExpandedGroups(prev => new Set(prev).add(groupId))
    }
  }, [expandedGroups, collapseGroup])

  useEffect(() => {
    if (expandedGroups.size === 0) return
    const handleClick = (e: MouseEvent) => {
      for (const groupId of expandedGroups) {
        const el = expandedRefs.current.get(groupId)
        if (el && !el.contains(e.target as Node)) {
          collapseGroup(groupId)
        }
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [expandedGroups, collapseGroup])

  const handleClear = useCallback(async () => {
    await clear()
    setShowConfirm(false)
  }, [clear])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-3 border-white/20 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          <Clock className="w-8 h-8 text-text-secondary/50" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-1">No history yet</h3>
          <p className="text-sm text-text-secondary">
            Actions will appear here as your agents work.
          </p>
        </div>
      </div>
    )
  }

  const hasExpanded = expandedGroups.size > 0

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-6">
    <div className="flex flex-col gap-10 animate-fade-in max-w-[62rem] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">History</h1>
          <p className="text-sm text-text-secondary mt-1">Track your agents' activity across all repositories.</p>
        </div>
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/[0.08] rounded-lg hover:bg-white/[0.04] hover:text-white transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/[0.08] rounded-lg hover:bg-white/[0.04] hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-all"
            >
              Confirm clear
            </button>
          </div>
        )}
      </div>

      {/* Day groups */}
      {groups.map(group => (
        <div key={group.date} className="flex flex-col gap-2">
          {/* Day header */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-text-secondary">
              {group.label}
            </h3>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Entries */}
          <div className="flex flex-col gap-1">
            {group.ticketGroups.map((tg, idx) => {
              const groupId = `${group.date}-${idx}`
              const isExpanded = expandedGroups.has(groupId)
              const isSingle = tg.entries.length === 1

              const isDimmed = hasExpanded && !isExpanded

              if (isSingle) {
                const entry = tg.entries[0]
                const config = ACTION_CONFIG[entry.action]
                return (
                  <div
                    key={groupId}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-all duration-200 ${isDimmed ? 'opacity-30 blur-sm' : ''}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.color}`} />
                    <span className="text-xs text-text-secondary/60 font-mono flex-shrink-0">
                      {formatTime(entry.timestamp)}
                    </span>
                    <span className="text-sm font-medium text-white truncate">
                      {entry.agentName}
                    </span>
                    {entry.ticketId && (
                      <span className="text-xs text-accent/80 bg-accent/10 px-2 py-0.5 rounded flex-shrink-0">
                        {entry.ticketId}
                      </span>
                    )}
                    <span className="text-xs text-text-secondary ml-auto flex-shrink-0">
                      {config.label}
                    </span>
                  </div>
                )
              }

              const lastConfig = ACTION_CONFIG[tg.lastAction]
              const firstTime = formatTime(tg.entries[tg.entries.length - 1].timestamp)
              const lastTime = formatTime(tg.entries[0].timestamp)
              return (
                <div
                  key={groupId}
                  className="flex flex-col gap-1"
                  ref={el => {
                    if (el) expandedRefs.current.set(groupId, el)
                    else expandedRefs.current.delete(groupId)
                  }}
                >
                  <div
                    className={`rounded-lg bg-white/[0.04] border border-white/[0.08] transition-all duration-200 ${isDimmed ? 'opacity-30 blur-sm' : ''}`}
                  >
                    <button
                      onClick={() => toggleGroup(groupId)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors rounded-lg text-left"
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${lastConfig.color}`} />
                      <span className="text-xs text-text-secondary/60 font-mono flex-shrink-0">
                        {firstTime} → {lastTime}
                      </span>
                      <span className="text-sm font-medium text-white truncate">
                        {tg.agentName}
                      </span>
                      {tg.ticketId && (
                        <span className="text-xs text-accent/80 bg-accent/10 px-2 py-0.5 rounded flex-shrink-0">
                          {tg.ticketId}
                        </span>
                      )}
                      <span className="text-xs text-text-secondary/50 flex-shrink-0">
                        {tg.entries.length} events
                      </span>
                      <span className="text-xs text-text-secondary ml-auto flex-shrink-0">
                        {lastConfig.label}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-text-secondary/40 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                  </div>
                  {isExpanded && (() => {
                    groupSizes.current.set(groupId, tg.entries.length)
                    const isClosing = closingGroups.has(groupId)
                    return tg.entries.map((entry, i) => {
                      const config = ACTION_CONFIG[entry.action]
                      const delay = isClosing
                        ? (tg.entries.length - 1 - i) * CARD_STAGGER_MS
                        : i * CARD_STAGGER_MS
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center gap-3 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] overflow-hidden"
                          style={{
                            animation: `${isClosing ? 'card-slide-in' : 'card-slide-out'} ${CARD_ANIM_MS}ms ease both`,
                            animationDelay: `${delay}ms`,
                          }}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.color}`} />
                          <span className="text-xs text-text-secondary/60 font-mono flex-shrink-0">
                            {formatTime(entry.timestamp)}
                          </span>
                          <span className="text-sm font-medium text-white truncate">
                            {entry.agentName}
                          </span>
                          {entry.ticketId && (
                            <span className="text-xs text-accent/80 bg-accent/10 px-2 py-0.5 rounded flex-shrink-0">
                              {entry.ticketId}
                            </span>
                          )}
                          <span className="text-xs text-text-secondary ml-auto flex-shrink-0">
                            {config.label}
                          </span>
                        </div>
                      )
                    })
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
      </div>
    </div>
  )
}
