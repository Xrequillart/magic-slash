import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useStreamJsonParser } from '../hooks/useStreamJsonParser'
import type { StreamEvent, AssistantEvent } from '../types/streamEvents'
import { ChatInput } from './friendly/ChatInput'
import { ConfirmDialog } from './friendly/ConfirmDialog'
import { SessionHeader } from './friendly/SessionHeader'
import { UserMessage } from './friendly/UserMessage'
import { ClaudeMessage } from './friendly/ClaudeMessage'
import { ThinkingLoader } from './friendly/ThinkingLoader'
import { useStore } from '../store'

const FAKE_CONFIRM_EVENT: StreamEvent = {
  type: 'system',
  subtype: 'tool_use_permission',
  message: 'Claude wants to execute Bash(rm -rf node_modules). Allow?',
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

type ConversationEntry = UserEntry | AssistantEntry

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
      const textParts = assistantEvent.message.content
        .filter(block => block.type === 'text' && block.text)
        .map(block => block.text!)
      if (textParts.length > 0) {
        entries.push({ role: 'assistant', text: textParts.join('\n') })
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

// --- Main component ---

interface FriendlyOverlayProps {
  terminalId: string | null
}

export function FriendlyOverlay({ terminalId }: FriendlyOverlayProps) {
  const { events, isLoading, clearEvents } = useStreamJsonParser(terminalId)
  const terminals = useStore(s => s.terminals)
  const [isConfirmationActive, setIsConfirmationActive] = useState(false)
  const [debugConfirm, setDebugConfirm] = useState(false)
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

  // Reload user messages when terminal changes
  useEffect(() => {
    if (terminalId) {
      setUserMessages(loadUserMessages(terminalId))
    } else {
      setUserMessages([])
    }
  }, [terminalId])

  // Persist user messages on every update
  useEffect(() => {
    if (terminalId) {
      saveUserMessages(terminalId, userMessages)
    }
  }, [terminalId, userMessages])

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

  // Send message via overlay API (not PTY)
  const handleUserSend = useCallback((text: string) => {
    if (!terminalId) return

    // Handle /clear — reset conversation in overlay
    if (text.trim() === '/clear') {
      clearEvents()
      setUserMessages([])
      if (terminalId) saveUserMessages(terminalId, [])
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
            {entries.map((entry, i) =>
              entry.role === 'user' ? (
                <UserMessage key={i} text={entry.text} />
              ) : (
                <ClaudeMessage key={i} content={entry.text} />
              )
            )}
            {(isThinking || isLoading) && <ThinkingLoader />}
          </div>
        )}
      </div>

      {/* Confirmation dialog (above input) */}
      <ConfirmDialog
        terminalId={terminalId}
        events={confirmEvents}
        onActiveChange={handleConfirmActiveChange}
      />

      {/* Chat input bar — overlay mode: don't write to PTY, use overlay API */}
      <ChatInput
        terminalId={terminalId}
        disabled={isConfirmationActive || isLoading}
        onSend={handleUserSend}
        overlayMode
      />
    </div>
  )
}
