import { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react'
import { useStreamJsonParser } from '../hooks/useStreamJsonParser'
import type { StreamEvent, AssistantEvent } from '../types/streamEvents'
import { ChatInput } from './friendly/ChatInput'
import { ConfirmDialog } from './friendly/ConfirmDialog'
import { SessionHeader } from './friendly/SessionHeader'
import { UserMessage } from './friendly/UserMessage'
import { ClaudeMessage } from './friendly/ClaudeMessage'
import { ThinkingLoader } from './friendly/ThinkingLoader'
import { StepCard } from './friendly/StepCard'
import { DiffViewer } from './friendly/DiffViewer'
import { BashOutput } from './friendly/BashOutput'
import { useStore } from '../store'

const FAKE_CONFIRM_EVENT: StreamEvent = {
  type: 'control_request',
  request_id: 'debug-test',
  request: {
    subtype: 'can_use_tool',
    tool_name: 'Bash',
    input: { command: 'rm -rf node_modules' },
  },
}

// --- Conversation model ---

interface UserEntry {
  role: 'user'
  text: string
}

interface AssistantEntry {
  role: 'assistant'
  text: string
}

export interface ToolEntry {
  role: 'tool'
  toolName: string
  toolId: string
  input: Record<string, unknown>
  summary: string
}

type ConversationEntry = UserEntry | AssistantEntry | ToolEntry

function buildToolSummary(toolName: string, input: Record<string, unknown>): string {
  const filePath = (input.file_path || input.path || '') as string
  const fileName = filePath ? filePath.split('/').pop() || filePath : ''

  switch (toolName) {
    case 'Read': return fileName ? `Reading ${fileName}` : 'Reading file'
    case 'Edit': return fileName ? `Editing ${fileName}` : 'Editing file'
    case 'Write': return fileName ? `Writing ${fileName}` : 'Writing file'
    case 'Bash': return (input.command as string)?.slice(0, 60) || 'Running command'
    case 'Grep': return `Searching for "${(input.pattern as string)?.slice(0, 30) || '...'}"`
    case 'Glob': return `Finding files: ${(input.pattern as string)?.slice(0, 30) || '...'}`
    case 'Agent': return (input.description as string)?.slice(0, 50) || 'Running agent'
    case 'AskUserQuestion': {
      const questions = input.questions as Array<{ question: string }> | undefined
      return questions?.[0]?.question?.slice(0, 60) || 'Asking a question'
    }
    default: return toolName
  }
}

/**
 * Build a conversation from Claude Code stream-json events + user messages.
 * Events use the Claude Code CLI format: system, assistant, result.
 * The assistant event contains the full message in message.content[].
 */
function buildConversation(
  events: StreamEvent[],
  userMessages: { text: string; afterEventIndex: number }[]
): { entries: ConversationEntry[]; isThinking: boolean } {
  const entries: ConversationEntry[] = []
  let isThinking = false
  let userMsgIdx = 0

  const flushUserMessages = (eventIndex: number) => {
    while (userMsgIdx < userMessages.length && userMessages[userMsgIdx].afterEventIndex <= eventIndex) {
      entries.push({ role: 'user', text: userMessages[userMsgIdx].text })
      userMsgIdx++
    }
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    flushUserMessages(i)

    if (event.type === 'assistant') {
      // Claude Code CLI format: assistant event with message.content[]
      const assistantEvent = event as AssistantEvent
      const blocks = assistantEvent.message.content
      let textAccum: string[] = []

      for (const block of blocks) {
        if (block.type === 'text' && block.text) {
          textAccum.push(block.text)
        } else if (block.type === 'tool_use' && block.name && block.id) {
          // Flush accumulated text before tool
          if (textAccum.length > 0) {
            entries.push({ role: 'assistant', text: textAccum.join('\n') })
            textAccum = []
          }
          const input = (block.input || {}) as Record<string, unknown>
          entries.push({
            role: 'tool',
            toolName: block.name,
            toolId: block.id,
            input,
            summary: buildToolSummary(block.name, input),
          })
        }
      }
      // Flush remaining text
      if (textAccum.length > 0) {
        entries.push({ role: 'assistant', text: textAccum.join('\n') })
      }
      isThinking = false
    }

    if (event.type === 'system' && event.subtype === 'init') {
      // Claude Code initialized — thinking starts after user sends message
      isThinking = false
    }

    if (event.type === 'result') {
      isThinking = false
    }
  }

  // Flush remaining user messages
  flushUserMessages(events.length)

  return { entries, isThinking }
}

// --- Auto-scroll hook ---

function useAutoScroll() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isUserScrolledUp = useRef(false)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    isUserScrolledUp.current = !atBottom
  }, [])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el || isUserScrolledUp.current) return
    el.scrollTop = el.scrollHeight
  }, [])

  return { scrollRef, handleScroll, scrollToBottom }
}

// --- User messages persistence ---

type UserMsg = { text: string; afterEventIndex: number }
const USER_MESSAGES_KEY = 'magic-slash-user-messages'

function loadUserMessages(terminalId: string): UserMsg[] {
  try {
    const raw = sessionStorage.getItem(USER_MESSAGES_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, UserMsg[]>
    return all[terminalId] || []
  } catch {
    return []
  }
}

function saveUserMessages(terminalId: string, messages: UserMsg[]) {
  try {
    const raw = sessionStorage.getItem(USER_MESSAGES_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[terminalId] = messages
    sessionStorage.setItem(USER_MESSAGES_KEY, JSON.stringify(all))
  } catch { /* ignore storage errors */ }
}

// --- Permission results persistence ---

const PERMISSION_RESULTS_KEY = 'magic-slash-permission-results'

function loadPermissionResults(terminalId: string): Map<string, 'allow' | 'deny'> {
  try {
    const raw = sessionStorage.getItem(PERMISSION_RESULTS_KEY)
    if (!raw) return new Map()
    const all = JSON.parse(raw) as Record<string, Record<string, 'allow' | 'deny'>>
    const data = all[terminalId]
    return data ? new Map(Object.entries(data)) : new Map()
  } catch {
    return new Map()
  }
}

function savePermissionResults(terminalId: string, results: Map<string, 'allow' | 'deny'>) {
  try {
    const raw = sessionStorage.getItem(PERMISSION_RESULTS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[terminalId] = Object.fromEntries(results)
    sessionStorage.setItem(PERMISSION_RESULTS_KEY, JSON.stringify(all))
  } catch { /* ignore storage errors */ }
}

// --- Question answers persistence ---

type AnswersMap = Record<string, Record<string, string>> // toolUseId -> { question: answer }
const QUESTION_ANSWERS_KEY = 'magic-slash-question-answers'

function loadQuestionAnswers(terminalId: string): Map<string, Record<string, string>> {
  try {
    const raw = sessionStorage.getItem(QUESTION_ANSWERS_KEY)
    if (!raw) return new Map()
    const all = JSON.parse(raw) as Record<string, AnswersMap>
    const data = all[terminalId]
    return data ? new Map(Object.entries(data)) : new Map()
  } catch {
    return new Map()
  }
}

function saveQuestionAnswers(terminalId: string, answers: Map<string, Record<string, string>>) {
  try {
    const raw = sessionStorage.getItem(QUESTION_ANSWERS_KEY)
    const all = raw ? JSON.parse(raw) : {}
    all[terminalId] = Object.fromEntries(answers)
    sessionStorage.setItem(QUESTION_ANSWERS_KEY, JSON.stringify(all))
  } catch { /* ignore storage errors */ }
}

// --- Tool step card renderer ---

import type { PermissionStatus } from './friendly/StepCard'

const ToolStepCard = memo(function ToolStepCard({ entry, permissionStatus, questionAnswers }: { entry: ToolEntry; permissionStatus?: PermissionStatus; questionAnswers?: Record<string, string> }) {
  const { toolName, input, summary } = entry

  // Edit tool — show diff
  if (toolName === 'Edit') {
    const oldStr = (input.old_string || '') as string
    const newStr = (input.new_string || '') as string
    const filePath = (input.file_path || '') as string
    return (
      <StepCard toolName={toolName} summary={summary} permissionStatus={permissionStatus}>
        {oldStr || newStr ? (
          <DiffViewer filePath={filePath} oldString={oldStr} newString={newStr} />
        ) : null}
      </StepCard>
    )
  }

  // Bash tool — show command + output
  if (toolName === 'Bash') {
    const command = (input.command || '') as string
    return (
      <StepCard toolName={toolName} summary={summary} permissionStatus={permissionStatus}>
        <BashOutput command={command} />
      </StepCard>
    )
  }

  // AskUserQuestion — show questions + answers (expandable)
  if (toolName === 'AskUserQuestion') {
    const questions = (input.questions || []) as Array<{ question: string; options: Array<{ label: string; description: string }> }>
    const hasAnswers = questionAnswers && Object.keys(questionAnswers).length > 0

    return (
      <StepCard toolName={toolName} summary={summary} permissionStatus={permissionStatus}>
        <div className="mt-2 space-y-2.5">
          {questions.map((q, i) => {
            const answer = questionAnswers?.[q.question]
            return (
              <div key={i} className="text-xs">
                <p className="text-text-secondary mb-0.5">{q.question}</p>
                {answer ? (
                  <p className="text-blue font-medium">{answer}</p>
                ) : hasAnswers ? (
                  <p className="text-text-secondary/40 italic">skipped</p>
                ) : null}
              </div>
            )
          })}
        </div>
      </StepCard>
    )
  }

  // Read/Write/Grep/Glob/Agent — simple step card
  return <StepCard toolName={toolName} summary={summary} permissionStatus={permissionStatus} />
})

// --- Main component ---

interface FriendlyOverlayProps {
  terminalId: string | null
}

export function FriendlyOverlay({ terminalId }: FriendlyOverlayProps) {
  const { events, isLoading, clearEvents } = useStreamJsonParser(terminalId)
  const terminals = useStore(s => s.terminals)
  const [isConfirmationActive, setIsConfirmationActive] = useState(false)
  const [debugConfirm, setDebugConfirm] = useState(false)
  const [permissionResults, setPermissionResults] = useState<Map<string, 'allow' | 'deny'>>(
    () => terminalId ? loadPermissionResults(terminalId) : new Map()
  )
  const [questionAnswers, setQuestionAnswers] = useState<Map<string, Record<string, string>>>(
    () => terminalId ? loadQuestionAnswers(terminalId) : new Map()
  )
  const [userMessages, setUserMessages] = useState<UserMsg[]>(
    () => terminalId ? loadUserMessages(terminalId) : []
  )
  const eventsLengthRef = useRef(0)
  eventsLengthRef.current = events.length

  // Get cwd for the active terminal (needed for overlay:sendMessage)
  const activeCwd = useMemo(() => {
    if (!terminalId) return '~/Documents'
    const terminal = terminals.find(t => t.id === terminalId)
    return terminal?.repositories?.[0] || '~/Documents'
  }, [terminalId, terminals])

  // Reload user messages and question answers when terminal changes
  useEffect(() => {
    if (terminalId) {
      setUserMessages(loadUserMessages(terminalId))
      setPermissionResults(loadPermissionResults(terminalId))
      setQuestionAnswers(loadQuestionAnswers(terminalId))
    } else {
      setUserMessages([])
      setPermissionResults(new Map())
      setQuestionAnswers(new Map())
    }
  }, [terminalId])

  // Persist user messages on every update
  useEffect(() => {
    if (terminalId) {
      saveUserMessages(terminalId, userMessages)
    }
  }, [terminalId, userMessages])

  // Persist permission results on every update
  useEffect(() => {
    if (terminalId) {
      savePermissionResults(terminalId, permissionResults)
    }
  }, [terminalId, permissionResults])

  // Persist question answers on every update
  useEffect(() => {
    if (terminalId) {
      saveQuestionAnswers(terminalId, questionAnswers)
    }
  }, [terminalId, questionAnswers])

  // Listen for debug trigger from UpdateOverlay debug menu
  useEffect(() => {
    const handler = () => setDebugConfirm(true)
    window.addEventListener('debug:confirm-dialog', handler)
    return () => window.removeEventListener('debug:confirm-dialog', handler)
  }, [])

  const confirmEvents = useMemo<StreamEvent[]>(
    () => (debugConfirm ? [...events, FAKE_CONFIRM_EVENT] : events),
    [events, debugConfirm],
  )

  const handleConfirmActiveChange = useCallback((active: boolean) => {
    setIsConfirmationActive(active)
    if (!active) setDebugConfirm(false)
  }, [])

  const handlePermissionResult = useCallback((toolUseId: string, behavior: 'allow' | 'deny') => {
    setPermissionResults(prev => {
      const next = new Map(prev)
      next.set(toolUseId, behavior)
      return next
    })
  }, [])

  const handleQuestionAnswered = useCallback((toolUseId: string, answers: Record<string, string>) => {
    setQuestionAnswers(prev => {
      const next = new Map(prev)
      next.set(toolUseId, answers)
      return next
    })
  }, [])

  // Send message via overlay API (not PTY)
  const handleUserSend = useCallback((text: string) => {
    if (!terminalId) return

    // Handle /clear — reset conversation and session in overlay
    if (text.trim() === '/clear') {
      clearEvents()
      setUserMessages([])
      setPermissionResults(new Map())
      setQuestionAnswers(new Map())
      if (terminalId) {
        saveUserMessages(terminalId, [])
        savePermissionResults(terminalId, new Map())
        saveQuestionAnswers(terminalId, new Map())
        window.electronAPI.overlay.resetSession(terminalId)
      }
      return
    }

    setUserMessages(prev => [...prev, { text, afterEventIndex: eventsLengthRef.current }])
    // Send via overlay channel (spawns claude -p --output-format stream-json --verbose)
    window.electronAPI.overlay.sendMessage(terminalId, text, activeCwd)
  }, [terminalId, activeCwd, clearEvents])

  // Build conversation model
  const { entries, isThinking } = useMemo(
    () => buildConversation(events, userMessages),
    [events, userMessages]
  )

  // Auto-scroll on new content
  const { scrollRef, handleScroll, scrollToBottom } = useAutoScroll()
  useEffect(scrollToBottom, [entries.length, isThinking, isLoading])

  return (
    <div className="h-full flex flex-col bg-black/30 backdrop-blur-md overflow-hidden">
      {/* Scrollable conversation area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        {entries.length === 0 && !isThinking && !isLoading ? (
          <div className="h-full flex items-center justify-center">
            <SessionHeader cwd={activeCwd} />
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => {
              if (entry.role === 'user') {
                return <UserMessage key={i} text={entry.text} />
              }
              if (entry.role === 'assistant') {
                return <ClaudeMessage key={i} content={entry.text} />
              }
              // Tool entry
              return <ToolStepCard key={i} entry={entry} permissionStatus={permissionResults.get(entry.toolId)} questionAnswers={questionAnswers.get(entry.toolId)} />
            })}
            {(isThinking || isLoading) && <ThinkingLoader />}
          </div>
        )}
      </div>

      {/* Confirmation dialog (above input) */}
      <ConfirmDialog
        terminalId={terminalId}
        events={confirmEvents}
        onActiveChange={handleConfirmActiveChange}
        onPermissionResult={handlePermissionResult}
        onQuestionAnswered={handleQuestionAnswered}
      />

      {/* Chat input bar — overlay mode: don't write to PTY, use overlay API */}
      <ChatInput
        terminalId={terminalId}
        disabled={isConfirmationActive || isLoading}
        onSend={handleUserSend}
      />
    </div>
  )
}
