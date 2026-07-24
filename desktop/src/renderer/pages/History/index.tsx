import { useState, useCallback, useRef, useEffect } from 'react'
import { Clock, ChevronRight, ChevronLeft } from 'lucide-react'
import { useActivityHistory } from '../../hooks/useActivityHistory'
import { useHistoryAnalytics } from '../../hooks/useHistoryAnalytics'
import { ActivityHeatmap } from './ActivityHeatmap'
import type { HistoryAction, HistoryEntry } from '../../../types'

const CARD_ANIM_MS = 150
const CARD_STAGGER_MS = 50

const ACTION_CONFIG: Record<HistoryAction, { label: string; color: string; dot: string }> = {
  agent_created: { label: 'Agent created', color: 'bg-accent', dot: 'bg-accent' },
  started: { label: 'Started', color: 'bg-green', dot: 'bg-green' },
  waiting: { label: 'Waiting for input', color: 'bg-orange', dot: 'bg-orange' },
  completed: { label: 'Task completed', color: 'bg-green', dot: 'bg-green' },
  committed: { label: 'Committed', color: 'bg-yellow', dot: 'bg-yellow' },
  pr_created: { label: 'PR created', color: 'bg-blue', dot: 'bg-blue' },
  review: { label: 'In review', color: 'bg-purple', dot: 'bg-purple' },
  review_approved: { label: 'Review approved', color: 'bg-green', dot: 'bg-green' },
  review_changes_requested: { label: 'Changes requested', color: 'bg-red', dot: 'bg-red' },
  merged: { label: 'Merged', color: 'bg-green', dot: 'bg-green' },
  done: { label: 'Done', color: 'bg-teal', dot: 'bg-teal' },
  agent_closed: { label: 'Agent closed', color: 'bg-text-secondary', dot: 'bg-text-secondary' },
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(fromTs: number, toTs: number): string {
  const diffMs = Math.abs(toTs - fromTs)
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return '< 1 min'
  if (diffMin < 60) return `${diffMin} min`
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function RepoTag({ repo }: { repo: string }) {
  const name = repo.split('/').pop() ?? repo
  return (
    <span className="text-xs text-text-secondary/60 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded font-mono">
      {name}
    </span>
  )
}

function SingleEntryRow({ entry, isDimmed }: { entry: HistoryEntry; isDimmed: boolean }) {
  const config = ACTION_CONFIG[entry.action]
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08] transition-all duration-200 min-w-0 ${isDimmed ? 'opacity-30 blur-sm' : ''}`}>
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} />
      <span className="text-xs text-text-secondary/60 font-mono flex-shrink-0">
        {formatTime(entry.timestamp)}
      </span>
      <span className="text-sm font-medium text-white truncate min-w-0 flex-1">
        {entry.agentName}
      </span>
      {entry.ticketId && (
        <span className="text-xs text-accent/80 bg-accent/10 px-2 py-0.5 rounded flex-shrink-0">
          {entry.ticketId}
        </span>
      )}
      {entry.repositories[0] && <RepoTag repo={entry.repositories[0]} />}
      {entry.repositories.length > 1 && (
        <span className="text-xs text-text-secondary/40 flex-shrink-0">+{entry.repositories.length - 1}</span>
      )}
      <span className="text-xs text-text-secondary flex-shrink-0">
        {config.label}
      </span>
    </div>
  )
}

export function HistoryPage() {
  const { entries, groups, loading } = useActivityHistory()
  const { heatmapData } = useHistoryAnalytics(entries)
  const hasEntries = groups.some(g => g.entries.length > 0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [closingGroups, setClosingGroups] = useState<Set<string>>(new Set())
  const [dayIndex, setDayIndex] = useState(0)
  const groupSizes = useRef<Map<string, number>>(new Map())
  const expandedRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const closingRef = useRef<Set<string>>(new Set())

  // Reset day index when groups change (e.g. after clear)
  useEffect(() => {
    setDayIndex(0)
  }, [groups.length])

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

  const goToPrevDay = useCallback(() => {
    setDayIndex(i => Math.min(i + 1, groups.length - 1))
    setExpandedGroups(new Set())
  }, [groups.length])

  const goToNextDay = useCallback(() => {
    setDayIndex(i => Math.max(i - 1, 0))
    setExpandedGroups(new Set())
  }, [])

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
  const currentGroup = groups[dayIndex]
  const isFirstDay = dayIndex === 0
  const isLastDay = dayIndex === groups.length - 1

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-8 animate-fade-in max-w-[62rem] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold">History</h1>
              <p className="text-sm text-text-secondary mt-1">Track your agents' activity across all repositories.</p>
            </div>
          </div>

          {/* Analytics dashboard */}
          {hasEntries && <ActivityHeatmap heatmapData={heatmapData} />}

          {/* Day navigation */}
          {hasEntries && (
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevDay}
                disabled={isLastDay}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/[0.08] rounded-lg hover:bg-white/[0.04] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Older</span>
              </button>

              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-medium text-white">{currentGroup.label}</span>
                <span className="text-xs text-text-secondary/50">
                  {currentGroup.entries.length} {currentGroup.entries.length === 1 ? 'event' : 'events'}
                  {groups.length > 1 && ` · day ${dayIndex + 1} of ${groups.length}`}
                </span>
              </div>

              <button
                onClick={goToNextDay}
                disabled={isFirstDay}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/[0.08] rounded-lg hover:bg-white/[0.04] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>Newer</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Current day entries */}
          {currentGroup && (
            <div className="flex flex-col gap-1">
              {currentGroup.ticketGroups.map((tg, idx) => {
                const groupId = `${currentGroup.date}-${idx}`
                const isExpanded = expandedGroups.has(groupId)
                const isSingle = tg.entries.length === 1
                const isDimmed = hasExpanded && !isExpanded

                if (isSingle) {
                  return (
                    <SingleEntryRow key={groupId} entry={tg.entries[0]} isDimmed={isDimmed} />
                  )
                }

                const lastConfig = ACTION_CONFIG[tg.lastAction]
                // entries are sorted newest-first; oldest = last element
                const newestTs = tg.entries[0].timestamp
                const oldestTs = tg.entries[tg.entries.length - 1].timestamp
                const firstTime = formatTime(oldestTs)
                const lastTime = formatTime(newestTs)
                const duration = formatDuration(oldestTs, newestTs)

                return (
                  <div
                    key={groupId}
                    className="flex flex-col gap-1"
                    ref={el => {
                      if (el) expandedRefs.current.set(groupId, el)
                      else expandedRefs.current.delete(groupId)
                    }}
                  >
                    <div className={`rounded-lg bg-white/[0.04] border border-white/[0.08] transition-all duration-200 ${isDimmed ? 'opacity-30 blur-sm' : ''}`}>
                      <button
                        onClick={() => toggleGroup(groupId)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.06] transition-colors rounded-lg text-left min-w-0"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${lastConfig.dot}`} />
                        <span className="text-xs text-text-secondary/60 font-mono flex-shrink-0">
                          {firstTime} → {lastTime}
                        </span>
                        <span className="text-sm font-medium text-white truncate min-w-0 flex-1">
                          {tg.agentName}
                        </span>
                        {tg.ticketId && (
                          <span className="text-xs text-accent/80 bg-accent/10 px-2 py-0.5 rounded flex-shrink-0">
                            {tg.ticketId}
                          </span>
                        )}
                        {(() => {
                          const allRepos = [...new Set(tg.entries.flatMap(e => e.repositories))]
                          return allRepos[0] ? (
                            <>
                              <RepoTag repo={allRepos[0]} />
                              {allRepos.length > 1 && (
                                <span className="text-xs text-text-secondary/40 flex-shrink-0">+{allRepos.length - 1}</span>
                              )}
                            </>
                          ) : null
                        })()}
                        <span className="text-xs text-text-secondary/50 flex-shrink-0">
                          {tg.entries.length} events · {duration}
                        </span>
                        <span className="text-xs text-text-secondary flex-shrink-0">
                          {lastConfig.label}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-text-secondary/40 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
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
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] overflow-hidden min-w-0"
                            style={{
                              animation: `${isClosing ? 'card-slide-in' : 'card-slide-out'} ${CARD_ANIM_MS}ms ease both`,
                              animationDelay: `${delay}ms`,
                            }}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
                            <span className="text-xs text-text-secondary/60 font-mono flex-shrink-0">
                              {formatTime(entry.timestamp)}
                            </span>
                            {entry.description && (
                              <span className="text-xs text-text-secondary/70 truncate min-w-0 flex-1">
                                {entry.description}
                              </span>
                            )}
                            <span className="text-xs text-text-secondary flex-shrink-0 ml-auto">
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
          )}
        </div>
      </div>
    </div>
  )
}
