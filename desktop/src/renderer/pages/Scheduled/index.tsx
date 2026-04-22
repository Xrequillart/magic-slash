import { useState, useMemo } from 'react'
import { Plus, Clock, Play, Trash2, Pencil, Check, XCircle, AlertTriangle, ChevronDown } from 'lucide-react'
import { useScheduledAgents } from '../../hooks/useScheduledAgents'
import { useStore } from '../../store'
import { showToast } from '../../components/Toast'
import type { Schedule, ScheduleFrequency, Agent } from '../../../types'

const FREQUENCY_OPTIONS: { value: ScheduleFrequency; label: string }[] = [
  { value: 'once', label: 'One time' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getNextExecution(schedule: Schedule): { label: string; date: Date | null } {
  if (!schedule.enabled) return { label: 'Disabled', date: null }

  const now = new Date()
  const [hours, minutes] = schedule.time.split(':').map(Number)

  const getNextDate = (): Date | null => {
    switch (schedule.frequency) {
      case 'once': {
        if (!schedule.date) return null
        const [y, m, d] = schedule.date.split('-').map(Number)
        const target = new Date(y, m - 1, d, hours, minutes)
        return target > now ? target : null
      }
      case 'daily': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
        if (today > now) return today
        today.setDate(today.getDate() + 1)
        return today
      }
      case 'weekdays': {
        const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
        for (let i = 0; i < 8; i++) {
          const day = candidate.getDay()
          if (day >= 1 && day <= 5 && candidate > now) return new Date(candidate)
          candidate.setDate(candidate.getDate() + 1)
        }
        return null
      }
      case 'weekly': {
        if (schedule.dayOfWeek === null) return null
        const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)
        for (let i = 0; i < 8; i++) {
          if (candidate.getDay() === schedule.dayOfWeek && candidate > now) return new Date(candidate)
          candidate.setDate(candidate.getDate() + 1)
        }
        return null
      }
      case 'monthly': {
        if (schedule.dayOfMonth === null) return null
        const candidate = new Date(now.getFullYear(), now.getMonth(), schedule.dayOfMonth, hours, minutes)
        if (candidate > now) return candidate
        candidate.setMonth(candidate.getMonth() + 1)
        return candidate
      }
      default:
        return null
    }
  }

  const next = getNextDate()
  if (!next) return { label: 'No upcoming execution', date: null }

  const diff = next.getTime() - now.getTime()
  const diffMinutes = Math.floor(diff / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  let countdown: string
  if (diffDays > 0) {
    countdown = `in ${diffDays}d ${diffHours % 24}h`
  } else if (diffHours > 0) {
    countdown = `in ${diffHours}h ${diffMinutes % 60}m`
  } else {
    countdown = `in ${diffMinutes}m`
  }

  const timeStr = next.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return { label: `${countdown} (${timeStr})`, date: next }
}

function getFrequencyLabel(schedule: Schedule): string {
  switch (schedule.frequency) {
    case 'once':
      return schedule.date ? `Once on ${schedule.date}` : 'Once'
    case 'daily':
      return `Daily at ${schedule.time}`
    case 'weekdays':
      return `Weekdays at ${schedule.time}`
    case 'weekly':
      return schedule.dayOfWeek !== null
        ? `Every ${DAY_NAMES[schedule.dayOfWeek]} at ${schedule.time}`
        : `Weekly at ${schedule.time}`
    case 'monthly':
      return schedule.dayOfMonth !== null
        ? `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`
        : `Monthly at ${schedule.time}`
    default:
      return schedule.frequency
  }
}

function ScheduleForm({
  initialSchedule,
  initialName,
  initialRepo,
  repos,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initialSchedule?: Schedule
  initialName?: string
  initialRepo?: string
  repos: [string, { path: string }][]
  onSubmit: (name: string, repo: string, schedule: Schedule) => void
  onCancel: () => void
  submitLabel: string
}) {
  const [name, setName] = useState(initialName || '')
  const [repo, setRepo] = useState(initialRepo || (repos[0]?.[1]?.path || ''))
  const [command, setCommand] = useState(initialSchedule?.command || '')
  const [frequency, setFrequency] = useState<ScheduleFrequency>(initialSchedule?.frequency || 'once')
  const [time, setTime] = useState(initialSchedule?.time || '09:00')
  const [date, setDate] = useState(initialSchedule?.date || '')
  const [dayOfWeek, setDayOfWeek] = useState<number>(initialSchedule?.dayOfWeek ?? 1)
  const [dayOfMonth, setDayOfMonth] = useState<number>(initialSchedule?.dayOfMonth ?? 1)

  const handleSubmit = () => {
    if (!name.trim() || !command.trim() || !repo) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    const schedule: Schedule = {
      enabled: true,
      command: command.trim(),
      frequency,
      time,
      date: frequency === 'once' ? (date || null) : null,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
      dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
      lastRunAt: initialSchedule?.lastRunAt || null,
      lastRunStatus: initialSchedule?.lastRunStatus || null,
    }

    onSubmit(name.trim(), repo, schedule)
  }

  return (
    <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-5 space-y-4 animate-fade-in">
      {/* Name */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5">Agent name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Daily test runner"
          className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Repository */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5">Repository</label>
        <div className="relative">
          <select
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
          >
            {repos.map(([repoName, repoConfig]) => (
              <option key={repoName} value={repoConfig.path}>{repoName}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
        </div>
      </div>

      {/* Command / Prompt */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5">Prompt</label>
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="e.g., Run all tests and fix any failures"
          rows={3}
          className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors resize-none"
        />
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5">Frequency</label>
        <div className="relative">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
            className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
        </div>
      </div>

      {/* Date picker for once */}
      {frequency === 'once' && (
        <div>
          <label className="block text-xs text-text-secondary mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      )}

      {/* Day of week for weekly */}
      {frequency === 'weekly' && (
        <div>
          <label className="block text-xs text-text-secondary mb-1.5">Day of week</label>
          <div className="relative">
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
            >
              {DAY_NAMES.map((dayName, idx) => (
                <option key={idx} value={idx}>{dayName}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Day of month for monthly */}
      {frequency === 'monthly' && (
        <div>
          <label className="block text-xs text-text-secondary mb-1.5">Day of month</label>
          <div className="relative">
            <select
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Time */}
      <div>
        <label className="block text-xs text-text-secondary mb-1.5">Time</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Security warning */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-yellow/10 border border-yellow/20 rounded-lg">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow flex-shrink-0 mt-0.5" />
        <span className="text-xs text-yellow">
          Scheduled agents run with full permissions -- they can read, write, and execute anything in the repository without asking.
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 px-3 py-2 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

function ScheduleCard({
  agent,
  onEdit,
  onDelete,
  onRunNow,
  terminals,
}: {
  agent: Agent
  onEdit: () => void
  onDelete: () => void
  onRunNow: () => void
  terminals: { id: string; state: string }[]
}) {
  const schedule = agent.schedule!
  const nextExec = getNextExecution(schedule)
  const freqLabel = getFrequencyLabel(schedule)
  const isRunning = terminals.some(t => t.id === agent.id)

  return (
    <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 transition-all hover:bg-white/[0.08]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`p-2 rounded-lg flex-shrink-0 ${schedule.enabled ? 'bg-accent/10' : 'bg-white/5'}`}>
            <Clock className={`w-4 h-4 ${schedule.enabled ? 'text-accent' : 'text-text-secondary/50'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{agent.name}</span>
              {isRunning && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 text-accent text-[10px] font-medium rounded">
                  <span className="loader-spinner-sm flex-shrink-0" />
                  Running
                </span>
              )}
              {!schedule.enabled && (
                <span className="px-1.5 py-0.5 bg-white/5 text-text-secondary/50 text-[10px] font-medium rounded">
                  Disabled
                </span>
              )}
            </div>
            <div className="text-xs text-text-secondary/70 mt-1 truncate" title={schedule.command}>
              {schedule.command}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary/50">
              <span>{freqLabel}</span>
              {schedule.enabled && (
                <>
                  <span className="opacity-30">&bull;</span>
                  <span>{nextExec.label}</span>
                </>
              )}
            </div>
            {schedule.lastRunAt && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                {schedule.lastRunStatus === 'success' ? (
                  <Check className="w-3 h-3 text-green" />
                ) : (
                  <XCircle className="w-3 h-3 text-red" />
                )}
                <span className={schedule.lastRunStatus === 'success' ? 'text-green/70' : 'text-red/70'}>
                  Last run {new Date(schedule.lastRunAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onRunNow}
            disabled={isRunning}
            className="p-1.5 rounded-lg text-text-secondary/50 hover:text-accent hover:bg-accent/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Run now"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-text-secondary/50 hover:text-white hover:bg-white/10 transition-all"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-text-secondary/50 hover:text-red hover:bg-red/10 transition-all"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScheduledPage() {
  const { config, terminals } = useStore()
  const { scheduledAgents, createSchedule, updateSchedule, deleteSchedule, executeNow, loading } = useScheduledAgents()
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)

  const repos = useMemo(() => {
    return Object.entries(config?.repositories || {}).map(([name, repo]) => [name, repo] as [string, { path: string }])
  }, [config?.repositories])

  const handleCreate = async (name: string, repo: string, schedule: Schedule) => {
    try {
      await createSchedule(name, [repo], schedule)
      setShowForm(false)
      showToast('Schedule created', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create schedule', 'error')
    }
  }

  const handleUpdate = async (name: string, repo: string, schedule: Schedule) => {
    if (!editingAgent) return
    try {
      await updateSchedule(editingAgent.id, schedule, name, [repo])
      setEditingAgent(null)
      showToast('Schedule updated', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update schedule', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id)
      showToast('Schedule deleted', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete schedule', 'error')
    }
  }

  const handleRunNow = async (id: string) => {
    try {
      await executeNow(id)
      showToast('Agent launched', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to launch agent', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-6">
    <div className="flex flex-col gap-8 animate-fade-in max-w-[62rem] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Scheduled Agents</h1>
          <p className="text-text-secondary text-sm">
            Schedule agents to run automatically at defined times
          </p>
        </div>
        {!showForm && !editingAgent && (
          <button
            onClick={() => setShowForm(true)}
            disabled={repos.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/[0.08] rounded-lg hover:bg-white/[0.04] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New scheduled agent</span>
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <ScheduleForm
          repos={repos}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          submitLabel="Schedule"
        />
      )}

      {/* Edit form */}
      {editingAgent && (
        <ScheduleForm
          initialSchedule={editingAgent.schedule}
          initialName={editingAgent.name}
          initialRepo={editingAgent.repositories[0]}
          repos={repos}
          onSubmit={handleUpdate}
          onCancel={() => setEditingAgent(null)}
          submitLabel="Update schedule"
        />
      )}

      {/* List */}
      {scheduledAgents.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="w-10 h-10 text-text-secondary/20 mb-4" />
          <div className="text-sm text-text-secondary/50 mb-1">No scheduled agents</div>
          <div className="text-xs text-text-secondary/30">
            {repos.length > 0
              ? 'Click "New scheduled agent" to create your first schedule'
              : 'Add a repository in Settings first'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {scheduledAgents.map(agent => (
            <ScheduleCard
              key={agent.id}
              agent={agent}
              terminals={terminals}
              onEdit={() => {
                setShowForm(false)
                setEditingAgent(agent)
              }}
              onDelete={() => handleDelete(agent.id)}
              onRunNow={() => handleRunNow(agent.id)}
            />
          ))}
        </div>
      )}
    </div>
      </div>
    </div>
  )
}
