import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ShieldQuestion, MessageCircleQuestion, FileText } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { StreamEvent, ControlRequest, AssistantEvent } from '../../types/streamEvents'

interface ConfirmDialogProps {
  terminalId: string | null
  events: StreamEvent[]
  alwaysAllowed?: Set<string>
  onActiveChange: (active: boolean) => void
  onPermissionResult?: (toolUseId: string, behavior: 'allow' | 'deny') => void
  onQuestionAnswered?: (toolUseId: string, answers: Record<string, string>) => void
  onAlwaysAllow?: (toolName: string) => void
}

interface QuestionOption {
  label: string
  description: string
}

interface QuestionData {
  question: string
  header: string
  options: QuestionOption[]
  multiSelect: boolean
}

interface PermissionRequest {
  requestId: string
  toolName: string
  toolUseId?: string
  input: Record<string, unknown>
  // AskUserQuestion fields
  questions?: QuestionData[]
}

// Only scan the last N events to detect permission requests — avoids O(n) growth
const SCAN_WINDOW = 20

// Detect when Claude Code is waiting for a permission decision from control_request events.
function detectPermissionRequest(events: StreamEvent[], alwaysAllowed?: Set<string>): PermissionRequest | null {
  const start = Math.max(0, events.length - SCAN_WINDOW)

  for (let i = events.length - 1; i >= start; i--) {
    const event = events[i]

    if (event.type === 'control_request') {
      const cr = event as ControlRequest
      if (cr.request.subtype === 'can_use_tool') {
        // Skip tools that are always-allowed (auto-respond handles them)
        if (alwaysAllowed?.has(cr.request.tool_name)) continue
        // Check if a control_response or result event follows (meaning it was already answered)
        let wasAnswered = false
        for (let j = i + 1; j < events.length; j++) {
          const e = events[j]
          if (e.type === 'result' || e.type === 'assistant') {
            wasAnswered = true
            break
          }
        }
        if (!wasAnswered) {
          const result: PermissionRequest = {
            requestId: cr.request_id,
            toolName: cr.request.tool_name,
            toolUseId: cr.request.tool_use_id,
            input: cr.request.input,
          }
          // Extract questions for AskUserQuestion tool
          if (cr.request.tool_name === 'AskUserQuestion' && Array.isArray(cr.request.input.questions)) {
            result.questions = (cr.request.input.questions as QuestionData[]).filter(q => q.question)
          }
          return result
        }
      }
    }
  }

  return null
}

/**
 * Search backwards through events to find the plan content
 * written by a Write tool call to a plans/ directory.
 */
function findPlanContent(events: StreamEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event.type !== 'assistant') continue
    const assistantEvent = event as AssistantEvent
    const blocks = assistantEvent.message.content
    for (let j = blocks.length - 1; j >= 0; j--) {
      const block = blocks[j]
      if (block.type === 'tool_use' && block.name === 'Write') {
        const input = block.input as Record<string, unknown> | undefined
        const filePath = (input?.file_path || '') as string
        const content = (input?.content || '') as string
        if (filePath.includes('/plans/') && content) {
          return content
        }
      }
    }
  }
  return null
}

function buildToolDescription(toolName: string, input: Record<string, unknown>): string {
  const filePath = (input.file_path || input.path || '') as string
  const fileName = filePath ? filePath.split('/').pop() || filePath : ''

  switch (toolName) {
    case 'Bash': {
      const cmd = (input.command as string) || ''
      return cmd.length > 80 ? `${cmd.slice(0, 80)}…` : cmd
    }
    case 'Edit': return fileName ? `Edit ${fileName}` : 'Edit a file'
    case 'Write': return fileName ? `Write ${fileName}` : 'Write a file'
    case 'Read': return fileName ? `Read ${fileName}` : 'Read a file'
    case 'MultiEdit': return fileName ? `Edit ${fileName}` : 'Edit files'
    default: return toolName
  }
}

// Number of buttons in the standard permission dialog (Allow, Always Allow, Deny)
const PERMISSION_BUTTON_COUNT = 3

export function ConfirmDialog({ terminalId, events, alwaysAllowed, onActiveChange, onPermissionResult, onQuestionAnswered, onAlwaysAllow }: ConfirmDialogProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [textAnswer, setTextAnswer] = useState('')
  const prevRequestRef = useRef<string | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const planScrollRef = useRef<HTMLDivElement>(null)

  const permissionRequest = useMemo(() => detectPermissionRequest(events, alwaysAllowed), [events, alwaysAllowed])

  const isQuestion = !!(permissionRequest?.questions && permissionRequest.questions.length > 0)
  const currentQuestion = isQuestion ? permissionRequest!.questions![currentQuestionIdx] : null
  const isPlanApproval = permissionRequest?.toolName === 'ExitPlanMode'

  // Find plan content when ExitPlanMode is detected
  const planContent = useMemo(
    () => isPlanApproval ? findPlanContent(events) : null,
    [isPlanApproval, events]
  )

  // Reset state when a new request appears
  useEffect(() => {
    if (permissionRequest && permissionRequest.requestId !== prevRequestRef.current) {
      prevRequestRef.current = permissionRequest.requestId
      setDismissed(false)
      setSelectedIndex(0)
      setCurrentQuestionIdx(0)
      setAnswers({})
      setTextAnswer('')
    }
  }, [permissionRequest])

  const isActive = permissionRequest !== null && !dismissed

  // Auto-focus text input for "Other" free-text mode
  useEffect(() => {
    if (isActive && isQuestion && textInputRef.current) {
      textInputRef.current.focus()
    }
  }, [isActive, isQuestion, currentQuestionIdx])

  // Notify parent of active state changes
  useEffect(() => {
    onActiveChange(isActive)
  }, [isActive, onActiveChange])

  // Submit all answers as updatedInput
  const submitAnswers = useCallback((finalAnswers: Record<string, string>) => {
    if (!terminalId || !permissionRequest) return
    const updatedInput = { ...permissionRequest.input, answers: finalAnswers }
    window.electronAPI.overlay.respond(terminalId, permissionRequest.requestId, 'allow', undefined, updatedInput)
    if (permissionRequest.toolUseId) {
      onPermissionResult?.(permissionRequest.toolUseId, 'allow')
      onQuestionAnswered?.(permissionRequest.toolUseId, finalAnswers)
    }
    setDismissed(true)
  }, [terminalId, permissionRequest, onPermissionResult, onQuestionAnswered])

  // Handle selecting an option for the current question
  const selectOption = useCallback((label: string) => {
    if (!permissionRequest?.questions) return
    const q = permissionRequest.questions[currentQuestionIdx]
    const newAnswers = { ...answers, [q.question]: label }

    // If single question or last question, submit immediately
    if (currentQuestionIdx >= permissionRequest.questions.length - 1) {
      submitAnswers(newAnswers)
    } else {
      setAnswers(newAnswers)
      setCurrentQuestionIdx(prev => prev + 1)
      setSelectedIndex(0)
      setTextAnswer('')
    }
  }, [permissionRequest, currentQuestionIdx, answers, submitAnswers])

  // Submit free-text "Other" answer
  const submitTextAnswer = useCallback((text: string) => {
    if (!text.trim()) return
    selectOption(text.trim())
  }, [selectOption])

  const respondPermission = useCallback((behavior: 'allow' | 'deny') => {
    if (!terminalId || !permissionRequest) return
    window.electronAPI.overlay.respond(terminalId, permissionRequest.requestId, behavior)
    if (permissionRequest.toolUseId && onPermissionResult) {
      onPermissionResult(permissionRequest.toolUseId, behavior)
    }
    setDismissed(true)
  }, [terminalId, permissionRequest, onPermissionResult])

  const respondAlwaysAllow = useCallback(() => {
    if (!permissionRequest) return
    onAlwaysAllow?.(permissionRequest.toolName)
    respondPermission('allow')
  }, [permissionRequest, onAlwaysAllow, respondPermission])

  const dismiss = useCallback(() => {
    if (!terminalId || !permissionRequest) return
    window.electronAPI.overlay.respond(terminalId, permissionRequest.requestId, 'deny', 'User skipped the question')
    if (permissionRequest.toolUseId && onPermissionResult) {
      onPermissionResult(permissionRequest.toolUseId, 'deny')
    }
    setDismissed(true)
  }, [terminalId, permissionRequest, onPermissionResult])

  // Keyboard navigation
  useEffect(() => {
    if (!isActive || !permissionRequest) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // --- Question with options ---
      if (isQuestion && currentQuestion) {
        const optCount = currentQuestion.options.length + 1 // +1 for "Other"

        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + optCount) % optCount)
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % optCount)
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          // If "Other" is selected (last index), submit text
          if (selectedIndex === currentQuestion.options.length) {
            submitTextAnswer(textAnswer)
          } else {
            selectOption(currentQuestion.options[selectedIndex].label)
          }
        }
        // Number shortcuts 1-9
        const num = parseInt(e.key)
        if (num >= 1 && num <= currentQuestion.options.length) {
          e.preventDefault()
          selectOption(currentQuestion.options[num - 1].label)
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          dismiss()
        }
        return
      }

      // --- Standard permission dialog (3 buttons: Allow=0, Always Allow=1, Deny=2) ---
      // --- Plan approval dialog (2 buttons: Accept=0, Reject=1) ---
      const buttonCount = isPlanApproval ? 2 : PERMISSION_BUTTON_COUNT

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + buttonCount) % buttonCount)
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % buttonCount)
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        if (isPlanApproval) {
          respondPermission(selectedIndex === 0 ? 'allow' : 'deny')
        } else {
          // 0=Allow, 1=Always Allow, 2=Deny
          if (selectedIndex === 0) respondPermission('allow')
          else if (selectedIndex === 1) respondAlwaysAllow()
          else respondPermission('deny')
        }
      }

      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        respondPermission('allow')
      }
      if (!isPlanApproval && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        respondAlwaysAllow()
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        respondPermission('deny')
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        respondPermission('deny')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, permissionRequest, isQuestion, isPlanApproval, currentQuestion, selectedIndex, textAnswer, respondPermission, respondAlwaysAllow, selectOption, submitTextAnswer, dismiss])

  if (!isActive || !permissionRequest) return null

  // --- Question UI ---
  if (isQuestion && currentQuestion) {
    const totalQuestions = permissionRequest.questions!.length
    const otherIndex = currentQuestion.options.length

    return (
      <div className="shrink-0 mx-2 mb-2 p-3 bg-white/5 border border-white/10 rounded-lg animate-fade-in">
        <div className="flex items-start gap-2.5">
          <MessageCircleQuestion className="w-4 h-4 text-blue shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {totalQuestions > 1 && (
              <p className="text-[10px] text-text-secondary/60 mb-1">
                {currentQuestionIdx + 1}/{totalQuestions}
              </p>
            )}
            <p className="text-sm text-white mb-2.5 whitespace-pre-wrap">
              {currentQuestion.question}
            </p>

            {/* Option buttons */}
            <div className="flex flex-col gap-1.5 mb-2">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => selectOption(opt.label)}
                  className={`
                    w-full text-left px-3 py-1.5 text-xs rounded-md transition-all
                    ${selectedIndex === idx
                      ? 'bg-blue/20 text-blue border border-blue/30'
                      : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
                    }
                  `}
                >
                  <span className="flex items-baseline gap-2">
                    <kbd className="text-[10px] opacity-50 shrink-0">{idx + 1}</kbd>
                    <span>
                      <span className="font-medium">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-[11px] opacity-60 mt-0.5">{opt.description}</span>
                      )}
                    </span>
                  </span>
                </button>
              ))}

              {/* "Other" free-text option */}
              <div
                className={`
                  w-full text-left px-3 py-1.5 text-xs rounded-md transition-all
                  ${selectedIndex === otherIndex
                    ? 'bg-blue/20 text-blue border border-blue/30'
                    : 'bg-white/5 text-text-secondary border border-white/10'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <input
                    ref={textInputRef}
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onFocus={() => setSelectedIndex(otherIndex)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && textAnswer.trim()) {
                        e.preventDefault()
                        e.stopPropagation()
                        submitTextAnswer(textAnswer)
                      }
                    }}
                    placeholder="Other..."
                    className="flex-1 bg-transparent text-white placeholder-text-secondary/50 text-xs outline-0 focus:outline-0"
                  />
                  {textAnswer.trim() && (
                    <button
                      onClick={() => submitTextAnswer(textAnswer)}
                      className="text-[10px] font-medium text-blue hover:text-blue/80 transition-colors"
                    >
                      Send
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={dismiss}
              className="text-[10px] text-text-secondary/60 hover:text-text-secondary transition-colors"
            >
              Skip <kbd className="ml-1 opacity-50">Esc</kbd>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Plan approval UI (ExitPlanMode) ---
  if (isPlanApproval) {
    return (
      <div className="shrink-0 mx-2 mb-2 bg-white/5 border border-purple/30 rounded-lg animate-fade-in overflow-hidden">
        <div className="px-3 pt-3 pb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple shrink-0" />
          <p className="text-sm font-medium text-white">Accept this plan?</p>
        </div>
        {planContent && (
          <div
            ref={planScrollRef}
            className="mx-3 mb-2 max-h-[300px] overflow-y-auto bg-black/30 border border-white/5 rounded-md px-3 py-2"
          >
            <MarkdownRenderer content={planContent} />
          </div>
        )}
        <div className="px-3 pb-3 flex items-center gap-2">
          <button
            onClick={() => respondPermission('allow')}
            className={`
              px-3 py-1 text-xs font-medium rounded-md transition-all
              ${selectedIndex === 0
                ? 'bg-green/20 text-green border border-green/30'
                : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
              }
            `}
          >
            Accept Plan
            <kbd className="ml-1.5 text-[10px] opacity-50">Y</kbd>
          </button>
          <button
            onClick={() => respondPermission('deny')}
            className={`
              px-3 py-1 text-xs font-medium rounded-md transition-all
              ${selectedIndex === 1
                ? 'bg-red/20 text-red border border-red/30'
                : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
              }
            `}
          >
            Reject
            <kbd className="ml-1.5 text-[10px] opacity-50">N</kbd>
          </button>
        </div>
      </div>
    )
  }

  // --- Standard permission UI ---
  const description = buildToolDescription(permissionRequest.toolName, permissionRequest.input)

  return (
    <div className="shrink-0 mx-2 mb-2 p-3 bg-white/5 border border-white/10 rounded-lg animate-fade-in">
      <div className="flex items-start gap-2.5">
        <ShieldQuestion className="w-4 h-4 text-yellow shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white mb-1">
            Allow <span className="font-medium text-yellow">{permissionRequest.toolName}</span>?
          </p>
          <p className="text-xs text-text-secondary mb-2.5 truncate" title={description}>
            {description}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => respondPermission('allow')}
              className={`
                px-3 py-1 text-xs font-medium rounded-md transition-all
                ${selectedIndex === 0
                  ? 'bg-green/20 text-green border border-green/30'
                  : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
                }
              `}
            >
              Allow
              <kbd className="ml-1.5 text-[10px] opacity-50">Y</kbd>
            </button>
            <button
              onClick={respondAlwaysAllow}
              className={`
                px-3 py-1 text-xs font-medium rounded-md transition-all
                ${selectedIndex === 1
                  ? 'bg-orange/20 text-orange border border-orange/30'
                  : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
                }
              `}
            >
              Always Allow
              <kbd className="ml-1.5 text-[10px] opacity-50">A</kbd>
            </button>
            <button
              onClick={() => respondPermission('deny')}
              className={`
                px-3 py-1 text-xs font-medium rounded-md transition-all
                ${selectedIndex === 2
                  ? 'bg-red/20 text-red border border-red/30'
                  : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
                }
              `}
            >
              Deny
              <kbd className="ml-1.5 text-[10px] opacity-50">N</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
