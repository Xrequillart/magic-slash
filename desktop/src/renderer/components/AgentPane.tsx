import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatView, type ChatCommand, type MenuBarAnswer } from '@ds/desktop'
import { DEFAULT_CODE_FONT_SIZE, type ChatSnapshot, type TerminalInfo, type TrayQuestion } from '../../types'
import { builtInCommands, mergeCommands, opensInTerminal, skillCommands } from './chatCommands'
import { useStore } from '../store'
import { useLocale, useT } from '../i18n'
import { TerminalView } from './TerminalView'
import { useCodeAppearance } from '../hooks/useCodeAppearance'
import { resolveDisplayMode } from '../utils/displayMode'
import { formatPaths } from '../utils/formatDroppedPaths'
import { showToast } from './Toast'

/**
 * One agent's pane: its terminal, and the chat view over it when that is the view chosen
 * (the switch is in the title bar, see TitleBar.tsx).
 *
 * THE TERMINAL STAYS MOUNTED UNDER THE CHAT, hidden. It is not a fallback: it is the
 * session. The chat types into it, and keeping it laid out means it keeps its size, so
 * the TUI the chat is driving never sees a resize when the view flips.
 */

interface AgentPaneProps {
  terminal: TerminalInfo
  isVisible: boolean
  isFocused: boolean
}

/** How long the second ⌃C has to follow the first, as in Claude Code's own TUI. */
const DOUBLE_CTRL_C_MS = 1_000

/** How long a resume may keep the chat behind its loader before it is shown anyway. */
const RESUME_TIMEOUT_MS = 20_000

/** Between the text and the Return that submits it, so the TUI takes the text as typed. */
const SUBMIT_DELAY_MS = 60

/**
 * What was being typed in each agent's chat, by terminal id. The chat unmounts when its
 * agent is left (or its view flipped to the terminal), and the draft has to outlive it.
 */
const drafts = new Map<string, string>()

export function AgentPane({ terminal, isVisible, isFocused }: AgentPaneProps) {
  const t = useT()
  const setDisplayMode = useStore((s) => s.setDisplayMode)
  const mode = useStore((s) => resolveDisplayMode(terminal, s.config))
  const { entries, queue, pushes } = useChat(terminal.id)
  const resuming = useResumeLoader(terminal, pushes)
  const question = usePendingQuestion(terminal.id)
  const [answering, setAnswering] = useState(false)
  const [restored, setRestored] = useState<string | null>(null)

  const send = useCallback((text: string, attachments: string[]) => {
    // A newline in the TUI's input box is a line feed (Shift+Enter in the terminal view
    // writes the same), and the carriage return after it is the Enter that sends. The
    // attachments go after the text as paths, the way a file dropped on the terminal
    // arrives, which is what makes Claude Code read them (and attach an image).
    const id = terminal.id
    const message = [text.replace(/\r\n?/g, '\n'), formatPaths(attachments)].filter(Boolean).join(' ')
    void window.electronAPI.terminal.write(id, message).then(() => {
      setTimeout(() => void window.electronAPI.terminal.write(id, '\r'), SUBMIT_DELAY_MS)
    })
    // `/mcp`, `/model`…: the answer is a dialog of the TUI, so that is what is shown.
    if (opensInTerminal(text)) setDisplayMode(id, 'terminal')
  }, [terminal.id, setDisplayMode])

  // The ESC byte, which is what the TUI reads as Escape: it interrupts the turn. Before
  // anything came back, Claude Code takes the prompt back instead, and so does the chat.
  const interrupt = useCallback(() => {
    window.electronAPI.terminal.interrupt(terminal.id)
      .then((text) => { if (text) setRestored(text) })
      .catch(() => {})
  }, [terminal.id])

  // The menu bar panel's own path: the same token check, the same paced keystrokes.
  const answer = useCallback((choice: MenuBarAnswer) => {
    if (!question) return
    setAnswering(true)
    window.electronAPI.tray.answerQuestion(terminal.id, question.token, choice)
      .catch(() => ({ ok: false }))
      .finally(() => setAnswering(false))
  }, [terminal.id, question])

  const commands = useChatCommands(t)

  // In the code theme the person chose, like every other block of code in the app.
  const { shikiTheme } = useCodeAppearance()
  // And in the size the person chose for code (Settings → Code & reviews).
  const codeFontSize = useStore((s) => s.config?.codeFontSize) ?? DEFAULT_CODE_FONT_SIZE
  // On unless turned off (Settings → New sessions).
  const stickyPrompt = useStore((s) => s.config?.chatStickyPrompt) !== false
  const highlight = useCallback(
    (code: string, lang: string | undefined) => window.electronAPI.terminal.highlightCode(code, lang, shikiTheme),
    [shikiTheme]
  )
  const highlightLines = useCallback(
    (code: string, lang: string | undefined) => window.electronAPI.terminal.highlightLines(code, lang, shikiTheme),
    [shikiTheme]
  )

  const showChat = mode === 'chat'
  useDoubleCtrlC(terminal.id, isVisible && isFocused && showChat)

  // When the conversation began: its first prompt's own time.
  const locale = useLocale()
  const startedAt = entries.find((e) => e.kind === 'user' && e.at !== undefined)
  const startedLabel = startedAt?.kind === 'user' && startedAt.at !== undefined
    ? t('chat.started', {
      date: new Date(startedAt.at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
      time: new Date(startedAt.at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    })
    : undefined

  const keepDraft = useCallback((draft: string) => {
    if (draft) drafts.set(terminal.id, draft)
    else drafts.delete(terminal.id)
  }, [terminal.id])

  return (
    <>
      {/* Hidden, not unmounted, under the chat: `visibility` keeps its box, so the TUI
          the chat types into never sees a resize, and the chat can wear the same
          translucent ground without the terminal's text showing through it. */}
      <div className={`absolute inset-0 ${showChat ? 'invisible' : ''}`}>
        <TerminalView terminal={terminal} isVisible={isVisible} isFocused={isFocused && !showChat} />
      </div>
      {isVisible && showChat && (
        <div className="absolute inset-0 z-[5]">
          <ChatView
            entries={entries}
            queue={queue}
            loading={resuming}
            working={terminal.state === 'working'}
            waiting={terminal.state === 'waiting'}
            onSend={send}
            onInterrupt={interrupt}
            onShowTerminal={() => setDisplayMode(terminal.id, 'terminal')}
            autoFocus={isFocused}
            highlight={highlight}
            highlightLines={highlightLines}
            onPickFiles={pickFiles}
            resolveFile={resolveFile}
            question={question}
            onAnswer={answer}
            answering={answering}
            commands={commands}
            initialDraft={drafts.get(terminal.id)}
            onDraftChange={keepDraft}
            restoredDraft={restored}
            onDraftRestored={() => setRestored(null)}
            stickyPrompt={stickyPrompt}
            codeFontSize={codeFontSize}
            claudeCodeVersion={terminal.metadata?.usage?.version}
            startedLabel={startedLabel}
            labels={{
              placeholder: t('chat.placeholder'),
              send: t('chat.send'),
              empty: t('chat.empty'),
              greeting: t('chat.greeting'),
              working: t('chat.working'),
              loading: t('chat.resuming'),
              waiting: t('chat.waiting'),
              showTerminal: t('chat.showTerminal'),
              interactiveCommand: t('chat.command.interactive'),
              diffTruncated: t('chat.diff.truncated'),
              diffShowAll: t('chat.diff.showAll'),
              diffClose: t('chat.diff.close'),
              attach: t('chat.attach'),
              removeAttachment: t('chat.attach.remove'),
              dropFiles: t('chat.attach.drop'),
              queue: {
                open: t('chat.queue.open'),
                title: t('chat.queue.title'),
                hint: t('chat.queue.hint'),
              },
              question: {
                allow: t('tray.question.allow'),
                deny: t('tray.question.deny'),
                send: t('tray.question.send'),
                multiHint: t('tray.question.multiHint'),
                unsupported: t('chat.question.unsupported'),
                other: t('chat.question.other'),
              },
            }}
          />
        </div>
      )}
    </>
  )
}

const EMPTY_CHAT: ChatSnapshot = { entries: [], queue: [] }

/**
 * ⌃C TWICE IN THE CHAT STARTS A NEW SESSION, what it does in the terminal view: there
 * Claude Code exits on the second one and the app starts it again. The chat has no TUI to
 * read the keys, so it asks for the new session itself, and says after the first press
 * what the second will do, as the TUI does.
 *
 * Not while text is selected: ⌃C is copy off the Mac, and a copy is not half a restart.
 */
function useDoubleCtrlC(terminalId: string, active: boolean): void {
  const t = useT()
  const firstAt = useRef(0)
  useEffect(() => {
    if (!active) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'c') return
      if (window.getSelection()?.toString()) return
      e.preventDefault()
      const now = Date.now()
      if (now - firstAt.current > DOUBLE_CTRL_C_MS) {
        firstAt.current = now
        showToast(t('chat.newSessionHint'), 'warning')
        return
      }
      firstAt.current = 0
      void window.electronAPI.terminal.newSession(terminalId).then((ok) => {
        if (!ok) showToast(t('sessions.newFailed'), 'error')
      })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [terminalId, active, t])
}

/**
 * Whether the chat is waiting on a resumed session (see `resumingSessions` in the store).
 *
 * THE SWAP IS OVER IN TWO STEPS, in this order: the statusLine names a transcript other
 * than the one being left (`usage.transcriptPath`, which also starts the main process
 * watching it), then that transcript's entries arrive as a chat push, a debounce later.
 * Clearing on the first alone would flash the old conversation for that debounce.
 */
function useResumeLoader(terminal: TerminalInfo, pushes: number): boolean {
  const resuming = useStore((s) => s.resumingSessions[terminal.id])
  const setResuming = useStore((s) => s.setResumingSession)
  const transcript = terminal.metadata?.usage?.transcriptPath
  const armedAt = useRef<number | null>(null)

  useEffect(() => {
    if (!resuming) {
      armedAt.current = null
      return
    }
    if (transcript === resuming.from) return
    if (armedAt.current === null) armedAt.current = pushes
    else if (pushes > armedAt.current) setResuming(terminal.id, null)
  }, [resuming, transcript, pushes, terminal.id, setResuming])

  // A session that never reports (Claude Code failed to start, say) must not leave the
  // chat behind a loader for good: the terminal under it says what happened.
  useEffect(() => {
    if (!resuming) return
    const timer = setTimeout(() => setResuming(terminal.id, null), RESUME_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [resuming, terminal.id, setResuming])

  return Boolean(resuming)
}

/**
 * The agent's chat entries and queued prompts: what the main process has read so far,
 * then every update. The main process sends the whole of both each time (they are
 * small, and a list that is replaced cannot drift from the one it came from).
 */
function useChat(terminalId: string): ChatSnapshot & { pushes: number } {
  const [chat, setChat] = useState<ChatSnapshot>(EMPTY_CHAT)
  // How many pushes have landed: the resume loader waits for one after the swap.
  const [pushes, setPushes] = useState(0)
  useEffect(() => {
    let live = true
    let pushed = false
    const unsubscribe = window.electronAPI.terminal.onChat(({ id, entries, queue }) => {
      if (id !== terminalId) return
      pushed = true
      setChat({ entries, queue })
      setPushes((n) => n + 1)
    })
    window.electronAPI.terminal.getChat(terminalId).then((initial) => {
      // A push that landed first is newer than this read.
      if (live && !pushed) setChat(initial)
    }).catch(() => {})
    return () => {
      live = false
      unsubscribe()
    }
  }, [terminalId])
  return { ...chat, pushes }
}

/** The question the agent is blocked on, kept current by `terminal:question`. */
function usePendingQuestion(terminalId: string): TrayQuestion | null {
  const [question, setQuestion] = useState<TrayQuestion | null>(null)
  useEffect(() => {
    let live = true
    let pushed = false
    const unsubscribe = window.electronAPI.terminal.onQuestion(({ id, question: next }) => {
      if (id !== terminalId) return
      pushed = true
      setQuestion(next)
    })
    window.electronAPI.terminal.getQuestion(terminalId).then((initial) => {
      // A push that landed first is newer than this read.
      if (live && !pushed) setQuestion(initial)
    }).catch(() => {})
    return () => {
      live = false
      unsubscribe()
    }
  }, [terminalId])
  return question
}

function useChatCommands(t: ReturnType<typeof useT>): ChatCommand[] {
  const builtIns = useMemo(() => builtInCommands((name) => t(`chat.command.${name}` as Parameters<typeof t>[0])), [t])
  const [skills, setSkills] = useState<ChatCommand[]>([])
  useEffect(() => {
    let live = true
    skillCommands().then((rows) => { if (live) setSkills(rows) })
    return () => { live = false }
  }, [])
  return useMemo(() => mergeCommands(builtIns, skills), [builtIns, skills])
}

const pickFiles = () => window.electronAPI.terminal.pickChatFiles()

/**
 * A dropped or pasted file as a path: its own when it has one (anything dropped from the
 * Finder), a saved copy for an image pasted from the clipboard, which has none.
 */
async function resolveFile(file: File): Promise<string | null> {
  const own = (file as File & { path?: string }).path
  if (own) return own
  if (!file.type.startsWith('image/')) return null
  return window.electronAPI.terminal.savePastedImage(new Uint8Array(await file.arrayBuffer()), file.type)
}
