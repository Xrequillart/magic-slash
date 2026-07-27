import { useState, useCallback, useRef, useEffect } from 'react'
import { Clock, ChevronRight, ChevronLeft } from 'lucide-react'
import { useActivityHistory } from '../../hooks/useActivityHistory'
import { useHistoryAnalytics } from '../../hooks/useHistoryAnalytics'
import { ActivityHeatmap } from './ActivityHeatmap'
import type { HistoryAction, HistoryEntry } from '../../../types'
import { useLocale, useT, type MessageKey, type Translate } from '../../i18n'

const CARD_ANIM_MS = 150
const CARD_STAGGER_MS = 50

const ACTION_CONFIG: Record<HistoryAction, { labelKey: MessageKey; color: string; dot: string }> = {
  agent_created: { labelKey: 'history.action.agentCreated', color: 'bg-accent', dot: 'bg-accent' },
  started: { labelKey: 'history.action.started', color: 'bg-green', dot: 'bg-green' },
  waiting: { labelKey: 'history.action.waiting', color: 'bg-orange', dot: 'bg-orange' },
  completed: { labelKey: 'history.action.completed', color: 'bg-green', dot: 'bg-green' },
  committed: { labelKey: 'history.action.committed', color: 'bg-yellow', dot: 'bg-yellow' },
  pr_created: { labelKey: 'history.action.prCreated', color: 'bg-blue', dot: 'bg-blue' },
  review: { labelKey: 'history.action.review', color: 'bg-purple', dot: 'bg-purple' },
  review_approved: { labelKey: 'history.action.reviewApproved', color: 'bg-green', dot: 'bg-green' },
  review_changes_requested: { labelKey: 'history.action.reviewChangesRequested', color: 'bg-red', dot: 'bg-red' },
  merged: { labelKey: 'history.action.merged', color: 'bg-green', dot: 'bg-green' },
  done: { labelKey: 'history.action.done', color: 'bg-teal', dot: 'bg-teal' },
  agent_closed: { labelKey: 'history.action.agentClosed', color: 'bg-text-secondary', dot: 'bg-text-secondary' },
}

// hour12 stays false in every language: this is a dense activity log, and a
// 24-hour clock is what both locales read fastest here.
function formatTime(timestamp: number, locale: string): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(fromTs: number, toTs: number, t: Translate): string {
  const diffMs = Math.abs(toTs - fromTs)
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return t('duration.lessThanMinute')
  if (diffMin < 60) return t('duration.minutes', { count: diffMin })
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  return m > 0 ? t('duration.hoursMinutes', { hours: h, minutes: m }) : t('duration.hours', { count: h })
}

function RepoTag({ repo }: { repo: string }) {
  const name = repo.split('/').pop() ?? repo
  return (
    <span className="text-xs text-text-secondary/60 bg-surface-subtle border border-line-subtle px-1.5 py-0.5 rounded font-mono">
      {name}
    </span>
  )
}

function SingleEntryRow({ entry, isDimmed }: { entry: HistoryEntry; isDimmed: boolean }) {
  const locale = useLocale()
  const t = useT()
  const config = ACTION_CONFIG[entry.action]
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-subtle border border-line-field transition-all duration-200 min-w-0 ${isDimmed ? 'opacity-30 blur-sm' : ''}`}>
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} />
      <span className="text-xs text-text-secondary/60 font-mono flex-shrink-0">
        {formatTime(entry.timestamp, locale)}
      </span>
      <span className="text-sm font-medium text-ink truncate min-w-0 flex-1">
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
        {t(config.labelKey)}
      </span>
    </div>
  )
}

export function HistoryPage() {
  const locale = useLocale()
  const t = useT()
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
        <div className="w-8 h-8 border-3 border-line-strong border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="p-4 rounded-2xl bg-surface-subtle border border-line-field">
          <Clock className="w-8 h-8 text-text-secondary/50" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-ink mb-1">{t('history.emptyTitle')}</h3>
          <p className="text-sm text-text-secondary">
            {t('history.emptyHint')}
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
          {/* Analytics dashboard */}
          {hasEntries && <ActivityHeatmap heatmapData={heatmapData} />}

          {/* Day navigation */}
          {hasEntries && (
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevDay}
                disabled={isLastDay}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line-field rounded-lg hover:bg-surface-subtle hover:text-ink transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{t('history.older')}</span>
              </button>

              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-medium text-ink">{currentGroup.label}</span>
                <span className="text-xs text-text-secondary/50">
                  {t(currentGroup.entries.length === 1 ? 'history.events.one' : 'history.events.other', { count: currentGroup.entries.length })}
                  {groups.length > 1 && t('history.dayOf', { current: dayIndex + 1, total: groups.length })}
                </span>
              </div>

              <button
                onClick={goToNextDay}
                disabled={isFirstDay}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line-field rounded-lg hover:bg-surface-subtle hover:text-ink transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span>{t('history.newer')}</span>
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
                const firstTime = formatTime(oldestTs, locale)
                const lastTime = formatTime(newestTs, locale)
                const duration = formatDuration(oldestTs, newestTs, t)

                return (
                  <div
                    key={groupId}
                    className="flex flex-col gap-1"
                    ref={el => {
                      if (el) expandedRefs.current.set(groupId, el)
                      else expandedRefs.current.delete(groupId)
                    }}
                  >
                    <div className={`rounded-lg bg-surface-subtle border border-line-field transition-all duration-200 ${isDimmed ? 'opacity-30 blur-sm' : ''}`}>
                      <button
                        onClick={() => toggleGroup(groupId)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors rounded-lg text-left min-w-0"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${lastConfig.dot}`} />
                        <span className="text-xs text-text-secondary/60 font-mono flex-shrink-0">
                          {firstTime} → {lastTime}
                        </span>
                        <span className="text-sm font-medium text-ink truncate min-w-0 flex-1">
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
                          {t(tg.entries.length === 1 ? 'history.groupSummary.one' : 'history.groupSummary.other', { count: tg.entries.length, duration })}
                        </span>
                        <span className="text-xs text-text-secondary flex-shrink-0">
                          {t(lastConfig.labelKey)}
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
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface-subtle border border-line-subtle overflow-hidden min-w-0"
                            style={{
                              animation: `${isClosing ? 'card-slide-in' : 'card-slide-out'} ${CARD_ANIM_MS}ms ease both`,
                              animationDelay: `${delay}ms`,
                            }}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
                            <span className="text-xs text-text-secondary/60 font-mono flex-shrink-0">
                              {formatTime(entry.timestamp, locale)}
                            </span>
                            {entry.description && (
                              <span className="text-xs text-text-secondary/70 truncate min-w-0 flex-1">
                                {entry.description}
                              </span>
                            )}
                            <span className="text-xs text-text-secondary flex-shrink-0 ml-auto">
                              {t(config.labelKey)}
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
