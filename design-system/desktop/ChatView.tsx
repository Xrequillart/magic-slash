import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react'
import { ArrowUp, ChevronRight, CircleAlert, Check, FileText, Image as ImageIcon, Info, Paperclip, SquareTerminal, Wrench, X } from './icons'
import { Button } from './Button'
import { ButtonIcon } from './ButtonIcon'
import { Loader } from './Loader'
import { RAISED_PLATE } from './plate'
import { ChatMarkdown, type ChatHighlighter } from './ChatMarkdown'
import { ChatDiffCard, type ChatDiffData, type ChatLineHighlighter } from './ChatDiffCard'
import { ChatQuestion, type ChatQuestionData, type ChatQuestionLabels } from './ChatQuestion'
import { ChatCommandMenu } from './ChatCommandMenu'
import { matchCommands, type ChatCommand } from './chatCommandMatch'
import type { MenuBarAnswer } from './MenuBarQuestion'

/**
 * AN AGENT'S SESSION AS A CONVERSATION — the same `claude` process the terminal shows,
 * read back from its transcript instead of its screen.
 *
 * It owns no session: the entries come from the caller (who tails the transcript), and
 * what is typed here goes back out through `onSend`, which types it into the very TUI
 * the terminal view draws. So the two views can be swapped at any moment and neither
 * loses anything: they are two windows on one process.
 *
 * A QUESTION THE AGENT IS BLOCKED ON (an AskUserQuestion, a permission prompt) takes the
 * composer's place, answerable here (see `ChatQuestion`). Without one, `waiting` still
 * says the agent is blocked, and offers the terminal: something the hooks did not catch.
 *
 * `/` opens the commands Claude Code would offer (see `ChatCommandMenu`).
 *
 * Claude's text is rendered as the Markdown it is (see `ChatMarkdown`); what the user
 * typed is shown as typed.
 */

export type ChatViewEntry =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string }
  | { kind: 'notice'; id: string; text: string }
  | { kind: 'tool'; id: string; name: string; summary: string; status: 'running' | 'done' | 'error'; output?: string; diff?: ChatDiffData }

export interface ChatViewLabels {
  placeholder: string
  send: string
  empty: string
  working: string
  waiting: string
  showTerminal: string
  /** On a command that opens in the terminal, in the `/` menu. */
  interactiveCommand: string
  /** Under a diff card cut short. */
  diffTruncated: string
  attach: string
  removeAttachment: string
  dropFiles: string
  question: Omit<ChatQuestionLabels, 'showTerminal'>
}

export interface ChatViewProps {
  entries: ChatViewEntry[]
  /** The agent is at work: the composer stays open (Claude Code queues), a wave shows. */
  working?: boolean
  /** The agent is blocked on something only the terminal can answer. */
  waiting?: boolean
  /** `attachments` are file paths, in the order they were added. */
  onSend: (text: string, attachments: string[]) => void
  /** Escape while `working`: stops the turn, as Escape does in the terminal. */
  onInterrupt?: () => void
  /** Opens the system's file picker; answers the chosen paths. Absent: no paperclip. */
  onPickFiles?: () => Promise<string[]>
  /**
   * A dropped or pasted file, as a path `claude` can read: its own path when it has one,
   * a saved copy for a pasted image, null to refuse it. Absent: no drop, no paste.
   */
  resolveFile?: (file: File) => Promise<string | null>
  onShowTerminal: () => void
  labels: ChatViewLabels
  /** Focus the composer when the view is shown. */
  autoFocus?: boolean
  /** Colours the fenced blocks. Absent, they are drawn plain. See `ChatMarkdown`. */
  highlight?: ChatHighlighter
  /** Colours the diff cards, line by line. See `ChatDiffCard`. */
  highlightLines?: ChatLineHighlighter
  /** What the agent is blocked on, with a token that changes with each new question. */
  question?: (ChatQuestionData & { token: string }) | null
  onAnswer?: (answer: MenuBarAnswer) => void
  /** An answer is being typed into the terminal. */
  answering?: boolean
  /** What the `/` menu offers. */
  commands?: ChatCommand[]
}

/** What the textarea and its mirror share: anything that moves a glyph must be here. */
const FIELD_TEXT = 'py-1 text-sm leading-5 whitespace-pre-wrap break-words'

/** Between the thread's last line and the top of the floating composer. */
const DOCK_GAP_PX = 24

const IMAGE_FILE = /\.(png|jpe?g|gif|webp|heic|bmp|tiff?)$/i

interface ChatAttachment {
  path: string
  name: string
}

function hasFiles(e: DragEvent): boolean {
  return e.dataTransfer.types.includes('Files')
}

/** Within this many pixels of the bottom, new entries keep the view pinned there. */
const STICK_PX = 48

export function ChatView({
  entries, working, waiting, onSend, onInterrupt, onShowTerminal, labels, autoFocus, highlight,
  question, onAnswer, answering, commands = [], highlightLines, onPickFiles, resolveFile,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const [draft, setDraft] = useState('')

  // THE `/` MENU is open while the draft is a slash and a name with no space yet, the
  // way Claude Code's own is, and until Escape closes it for this draft.
  const [menuClosedFor, setMenuClosedFor] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState(0)
  const query = /^\/(\S*)$/.exec(draft)?.[1]
  const matches = useMemo(() => (query === undefined ? [] : matchCommands(commands, query)), [commands, query])
  const menuOpen = matches.length > 0 && menuClosedFor !== draft
  useEffect(() => setHighlighted(0), [query])

  // A `/name` the menu knows, at the very start: what the mirror colours.
  const typedName = /^\/(\S+)/.exec(draft)?.[1]
  const knownCommand = typedName && commands.some((c) => c.name === typedName) ? `/${typedName}` : null
  // The rest of the highlighted command's name, after what was typed, when it extends it.
  const chosen = menuOpen ? matches[highlighted] : undefined
  const ghost = chosen && query !== undefined && chosen.name.startsWith(query) ? chosen.name.slice(query.length) : ''
  // THE PROMPT HISTORY, as in the CLI: ↑ in an empty box brings back what was sent
  // before, newest first, ↓ walks back down to the empty box. Read off the conversation
  // itself, so it is this session's prompts whichever view they were typed in.
  const history = useMemo(() => {
    const out: string[] = []
    for (const e of entries) if (e.kind === 'user' && e.text !== out[out.length - 1]) out.push(e.text)
    return out
  }, [entries])
  // Steps back from the newest; null while not walking it.
  const [historyStep, setHistoryStep] = useState<number | null>(null)
  const recall = (step: number | null) => {
    setHistoryStep(step)
    setDraft(step === null ? '' : history[history.length - 1 - step])
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) el.selectionStart = el.selectionEnd = el.value.length
    })
  }

  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const ready = draft.trim().length > 0 || attachments.length > 0

  const addPaths = (paths: (string | null)[]) => {
    const fresh = paths.filter((p): p is string => Boolean(p))
    if (fresh.length === 0) return
    setAttachments((current) => [
      ...current,
      ...fresh.filter((p) => !current.some((a) => a.path === p)).map((p) => ({ path: p, name: p.slice(p.lastIndexOf('/') + 1) })),
    ])
    inputRef.current?.focus()
  }
  const removeAttachment = (path: string) => setAttachments((current) => current.filter((a) => a.path !== path))
  const pickFiles = () => { onPickFiles?.().then(addPaths).catch(() => {}) }
  const attachFiles = (files: File[]) => {
    if (!resolveFile || files.length === 0) return
    Promise.all(files.map((f) => resolveFile(f).catch(() => null))).then(addPaths)
  }

  // A pasted image (a screenshot) is attached rather than pasted as nothing; text pastes
  // as text.
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files)
    if (files.length === 0 || !resolveFile) return
    event.preventDefault()
    attachFiles(files)
  }

  // The drop target is the whole view, counted in and out because every child the
  // pointer crosses fires its own enter and leave.
  const [dragOver, setDragOver] = useState(false)
  const dragDepth = useRef(0)
  const onDragEnter = (e: DragEvent) => {
    if (!hasFiles(e) || !resolveFile) return
    e.preventDefault()
    dragDepth.current++
    setDragOver(true)
  }
  const onDragLeave = (e: DragEvent) => {
    if (!hasFiles(e)) return
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }
  const onDrop = (e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    attachFiles(Array.from(e.dataTransfer.files))
  }

  // The floating dock's height, which the thread is padded by so it scrolls clear of it.
  const dockRef = useRef<HTMLDivElement>(null)
  const [dockHeight, setDockHeight] = useState(0)
  useLayoutEffect(() => {
    const el = dockRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setDockHeight(el.offsetHeight))
    observer.observe(el)
    setDockHeight(el.offsetHeight)
    return () => observer.disconnect()
  }, [])

  const pick = (command: ChatCommand) => {
    setDraft(`/${command.name} `)
    inputRef.current?.focus()
  }

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [entries, working, waiting, question, dockHeight])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // The box grows with what is typed, up to a third of the view.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [draft])

  const send = () => {
    const text = draft.trim()
    if (!text && attachments.length === 0) return
    onSend(text, attachments.map((a) => a.path))
    setDraft('')
    setHistoryStep(null)
    setAttachments([])
    stickRef.current = true
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (menuOpen) {
      const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
      if (step) {
        event.preventDefault()
        setHighlighted((highlighted + step + matches.length) % matches.length)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuClosedFor(draft)
        return
      }
      // Tab always takes the row. Enter takes it too, unless the name is already typed
      // in full: then it is the Enter that runs it.
      if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey && chosen && draft !== `/${chosen.name}`)) {
        event.preventDefault()
        if (chosen) pick(chosen)
        return
      }
    }
    // Escape stops the agent at work, as in the terminal. Only once the menu has had
    // its Escape: the one that closes it must not also cut the turn short.
    if (event.key === 'Escape' && working && onInterrupt) {
      event.preventDefault()
      onInterrupt()
      return
    }
    // The history walks only from an empty box or from a prompt it brought back
    // untouched: an arrow in text being written moves the caret, as it should.
    const walking = historyStep !== null && draft === history[history.length - 1 - historyStep]
    if (event.key === 'ArrowUp' && (draft === '' || walking) && !event.shiftKey) {
      const next = historyStep === null ? 0 : historyStep + 1
      if (next < history.length) {
        event.preventDefault()
        recall(next)
      }
      return
    }
    if (event.key === 'ArrowDown' && walking && !event.shiftKey) {
      event.preventDefault()
      recall(historyStep === 0 ? null : historyStep - 1)
      return
    }
    // A Tab with no menu to take from stays in the box rather than walking the focus
    // out of it, as it would in the terminal.
    if (event.key === 'Tab' && draft.startsWith('/')) {
      event.preventDefault()
      return
    }
    // Enter sends and Shift+Enter is a new line, as in the terminal. Not while an IME
    // is composing: that Enter picks the candidate.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  // THE TERMINAL'S OWN GROUND, the same sunken veil over the window's ground: the
  // caller hides the terminal underneath (see the app's AgentPane), so nothing of it
  // shows through.
  //
  // THE COMPOSER FLOATS over the conversation rather than sitting under it: the thread
  // scrolls the full height of the pane, under the card, and is padded at the bottom by
  // the card's own measured height so its last line always clears it.
  return (
    <div
      className="relative h-full bg-surface-sunken"
      onDragEnter={onDragEnter}
      onDragOver={(e) => { if (hasFiles(e)) e.preventDefault() }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX
        }}
        className="h-full overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-6 pt-6 flex flex-col gap-3" style={{ paddingBottom: dockHeight + DOCK_GAP_PX }}>
          {entries.length === 0 && !working && (
            <p className="py-16 text-center text-sm text-text-secondary/60">{labels.empty}</p>
          )}
          {entries.map((entry) =>
            entry.kind === 'tool' && entry.diff ? (
              <ChatDiffCard key={entry.id} diff={entry.diff} highlightLines={highlightLines} truncatedLabel={labels.diffTruncated} />
            )
            : entry.kind === 'tool' ? <ToolLine key={entry.id} entry={entry} />
              : entry.kind === 'notice' ? <NoticeLine key={entry.id} text={entry.text} />
                : <MessageLine key={entry.id} entry={entry} highlight={highlight} />
          )}
          {question && onAnswer && (
            <ChatQuestion
              key={question.token}
              question={question}
              labels={{ ...labels.question, showTerminal: labels.showTerminal }}
              onAnswer={onAnswer}
              onShowTerminal={onShowTerminal}
              busy={answering}
            />
          )}
          {working && !waiting && !question && (
            <div className="flex items-center gap-2 py-1 text-xs text-text-secondary/70">
              <Loader variant="wave" size="sm" tone="accent" />
              <span>{labels.working}</span>
            </div>
          )}
        </div>
      </div>

      {/* The dock lets clicks through everywhere but on what it holds, so the thread under
          its empty margins stays scrollable and selectable. */}
      <div ref={dockRef} className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-5">
        <div className="pointer-events-auto relative mx-auto flex max-w-3xl flex-col gap-2">
          {waiting && !question && (
            <div className={`overflow-hidden rounded-xl ${RAISED_PLATE} animate-fade-in motion-reduce:animate-none`}>
              <div className="flex items-center gap-3 border border-orange/30 bg-orange/10 rounded-xl px-3 py-2">
                <CircleAlert className="w-4 h-4 flex-shrink-0 text-orange" />
                <span className="flex-1 text-xs text-ink">{labels.waiting}</span>
                <Button size="xs" tone="solid" icon={SquareTerminal} onClick={onShowTerminal}>{labels.showTerminal}</Button>
              </div>
            </div>
          )}

          <div className="relative">
            {menuOpen && (
              // Rises into place from the card it belongs to, on opening only: filtering
              // as the name is typed keeps it mounted, so it does not replay.
              <div className="absolute inset-x-0 bottom-full z-20 pb-2 animate-fade-in motion-reduce:animate-none">
                <ChatCommandMenu
                  commands={matches}
                  highlighted={highlighted}
                  onPick={pick}
                  onHover={setHighlighted}
                  interactiveHint={labels.interactiveCommand}
                />
              </div>
            )}
            {/* THE CARD IS THE FIELD: the textarea draws no outline of its own, and focus
                lights the card's border instead. Opaque and raised, because it floats
                over the thread; no shadow, the plate and the frost around it are enough. The attachments sit inside it, above the text. The
                two buttons sit in an 8px inset from the card's edges, and the textarea's
                padding is sized to their 28px so a single line sits centred between them. */}
            {/* WHAT SCROLLS UNDER THE CARD IS BLURRED as it nears it: a frost 10px wider than
                the card on every side and down to the pane's foot, fading in over its first
                10px so the thread goes soft rather than hitting an edge. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-2.5 -top-2.5 -bottom-5 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent,black_10px)]"
            />
            <div className={`relative rounded-2xl border border-line ${RAISED_PLATE} p-2 transition-colors focus-within:border-accent`}>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1 pb-2 pt-0.5">
                  {attachments.map((a) => (
                    <AttachmentChip key={a.path} attachment={a} removeLabel={labels.removeAttachment} onRemove={() => removeAttachment(a.path)} />
                  ))}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                {onPickFiles && (
                  <ButtonIcon icon={Paperclip} title={labels.attach} onClick={pickFiles} tone="ghost" size="md" round />
                )}
                {/* THE TEXT IS DRAWN BY THE MIRROR UNDER THE TEXTAREA, which is transparent
                    but for its caret: a textarea cannot colour part of its value, and a known
                    `/command` is drawn in the accent, with the rest of the highlighted
                    completion greyed after it for Tab to take. Both share every class that
                    decides where a glyph lands. */}
                <div className={`relative min-w-0 flex-1 ${onPickFiles ? '' : 'pl-2'}`}>
                  <div
                    ref={mirrorRef}
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 overflow-hidden ${FIELD_TEXT} text-ink`}
                  >
                    {knownCommand ? (
                      <>
                        <span className="text-accent">{knownCommand}</span>
                        {draft.slice(knownCommand.length)}
                      </>
                    ) : draft}
                    {ghost && <span className="text-text-secondary/40">{ghost}</span>}
                    {/* A trailing newline would collapse in the mirror and not in the textarea. */}
                    {draft.endsWith('\n') && '\u200b'}
                  </div>
                  <textarea
                    ref={inputRef}
                    value={draft}
                    rows={1}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                    onScroll={(e) => { if (mirrorRef.current) mirrorRef.current.scrollTop = e.currentTarget.scrollTop }}
                    placeholder={labels.placeholder}
                    spellCheck={!draft.startsWith('/')}
                    className={`relative block w-full resize-none bg-transparent ${FIELD_TEXT} text-transparent caret-ink outline-none focus:outline-none focus-visible:outline-none focus:ring-0 placeholder:text-text-secondary/50`}
                  />
                </div>
                <ButtonIcon icon={ArrowUp} title={labels.send} onClick={send} tone={ready ? 'accent' : 'solid'} size="md" disabled={!ready} round />
              </div>
            </div>
          </div>
        </div>
      </div>

      {dragOver && (
        <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent/60 bg-accent/5">
          <span className="rounded-lg bg-bg-tertiary px-3 py-1.5 text-sm font-medium text-ink shadow-lg">{labels.dropFiles}</span>
        </div>
      )}
    </div>
  )
}

/** A file waiting to go with the next message, inside the composer. */
function AttachmentChip({ attachment, removeLabel, onRemove }: { attachment: ChatAttachment; removeLabel: string; onRemove: () => void }) {
  const Mark = IMAGE_FILE.test(attachment.name) ? ImageIcon : FileText
  return (
    <span className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-lg border border-line bg-surface py-1 pl-2 pr-1 text-xs text-ink" title={attachment.path}>
      <Mark className="w-3.5 h-3.5 flex-shrink-0 text-icon" />
      <span className="min-w-0 truncate">{attachment.name}</span>
      <ButtonIcon icon={X} title={removeLabel} onClick={onRemove} tone="ghost" size="2xs" round />
    </span>
  )
}

/** A local command answering (`/cost`, `/model`): the CLI's voice, set apart from Claude's. */
function NoticeLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-ink/5 px-3 py-2">
      <Info className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 text-icon" />
      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-[11px] text-text-secondary">{text}</pre>
    </div>
  )
}

function MessageLine({ entry, highlight }: { entry: Extract<ChatViewEntry, { kind: 'user' | 'assistant' }>; highlight?: ChatHighlighter }) {
  if (entry.kind === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-accent/10 px-3.5 py-2 text-sm text-ink">
          {entry.text}
        </div>
      </div>
    )
  }
  return <div className="min-w-0 break-words"><ChatMarkdown text={entry.text} highlight={highlight} /></div>
}

/**
 * One tool call, on one line: what it was, the argument that says what it did, and how
 * it ended. The output is folded away — it is the terminal's business, and a chat that
 * printed every file it read would be a terminal with more padding.
 */
function ToolLine({ entry }: { entry: Extract<ChatViewEntry, { kind: 'tool' }> }) {
  const [open, setOpen] = useState(false)
  const canOpen = Boolean(entry.output)
  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => canOpen && setOpen(!open)}
        aria-expanded={canOpen ? open : undefined}
        className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-left text-text-secondary ${canOpen ? 'hover:bg-ink/5' : 'cursor-default'}`}
      >
        {entry.status === 'running' ? (
          <Loader variant="spin" size="xs" tone="muted" className="flex-shrink-0" />
        ) : entry.status === 'error' ? (
          <CircleAlert className="w-3.5 h-3.5 flex-shrink-0 text-red" />
        ) : (
          <Check className="w-3.5 h-3.5 flex-shrink-0 text-green" />
        )}
        <Wrench className="w-3 h-3 flex-shrink-0 text-icon" />
        <span className="flex-shrink-0 font-medium text-ink">{entry.name}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-text-secondary/70" title={entry.summary}>{entry.summary}</span>
        {canOpen && <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 text-icon transition-transform ${open ? 'rotate-90' : ''}`} />}
      </button>
      {open && entry.output && (
        <pre className="ml-7 mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-sunken px-3 py-2 font-mono text-[11px] text-text-secondary">
          {entry.output}
        </pre>
      )}
    </div>
  )
}
