import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { AlertTriangle, ArrowLeft, CloudOff, FileWarning, NotebookPen, RotateCcw } from '@ds/desktop/icons'
import type { PlanComment, PlanDetail, PlanLocalSpec, PlanSpecUpdateResult, PlanTicketRead, PlanTicketStates } from '../../../types'
import { useT, type MessageKey } from '../../i18n'
import { BTN_PRIMARY } from '../../theme/controls'
import MarkdownView from '../../components/file-preview/MarkdownView'
import MarkdownCommentLayer, { type CommentSource } from '../../components/file-preview/MarkdownCommentLayer'
import {
  CommentLine, EditableLinesProvider, type EditableLine, type EditableLinesState,
} from '../../components/file-preview/CommentLines'
import { SpecSelectionToolbar } from '../../components/file-preview/SpecSelectionToolbar'
import {
  CommentBody, Quote,
  type CommentThread, type CommentTurn,
} from '../../components/file-preview/CommentCard'
import { RepoColorChip } from '../../components/agent-info-sidebar/RepoMark'
import { formatTimestamp } from '../../components/agent-info-sidebar/utils'
import { useStore, type FileComment } from '../../store'
import { useAuth } from '../../hooks/useAuth'
import { useAvatar } from '../../hooks/useAvatar'
import { usePlanComments } from '../../hooks/usePlanComments'
import { configKeyForRepoId } from '../../utils/projectColors'
import type { PlanCard, PlanTicketGroup } from '../../utils/planRows'
import { groupPlanTickets, planAuthor, planLabel } from '../../utils/planRows'
import type { PlanCommentThread } from '../../utils/planComments'
import {
  buildPlanCommentThreads, canEditPlanComment, isOrphanedPlanCommentThread,
} from '../../utils/planComments'
import { taskSelectionFor } from '../../utils/taskSelection'
import { planChangePrompt } from '../../utils/planChangePrompt'
import type { NewTerminalDetail } from '../Terminals'
import {
  EMPTY_BLOCK, applySpecBlock, caretAfterChange, mergeSpecBlocks, openSpecBlock, retypeSpecBlock, specBlockTypeOf, splitSpecBlock,
  type SpecBlock, type SpecBlockType,
} from '../../utils/specEditing'
import { codeToMarkdown, richTextToMarkdown, type RichNode } from '../../utils/richText'
import { blockShortcut, inlineShortcut } from '../../utils/markdownShortcuts'
import { detectTicketProvider } from '../../components/agent-info-sidebar/utils'
import {
  Banner, Button, CommentCard as TurnCard, Label, Status, StickyBar, Text, TrackerBadge, caretOffsetIn,
  type RichTextBlockProps,
} from '@ds/desktop'
import { JiraStatusPill, StateChip } from '../Tasks/parts'
import { STATUS_LOOK } from './PlanRow'
import { PlanIdBadge } from './PlanIdBadge'
import { PlanLinks } from './PlanLinks'

/**
 * One plan, given the whole page — the Plans page's second view, not a panel beside its
 * first. Structurally `Tasks/TaskDetailPage`: the same pinned bar taking over from the
 * list, the same sweep it arrives on, the same Escape that goes back.
 *
 * THE SPEC COMES OUT OF THE CLOUD ROW, NEVER OFF THIS MACHINE. `plan_sessions.spec` is
 * the copy every reader shares; the `.magic/spec-*.md` it was uploaded from exists only
 * on the author's disk, and most of the plans in this list were written by somebody
 * else. Reading the file would make a colleague's plan open on an empty page — which is
 * precisely what this view exists to stop.
 *
 * THE HEADER COMES FROM THE CARD, NOT FROM THE READ. The repository name, the author and
 * their photo are already resolved on the `PlanCard` of the row that was clicked, so
 * `plans:detail` fetches neither: doing so would cost an org roster and an avatar
 * download per open, to produce a header that at best agrees with the row underneath it
 * and at worst contradicts it. What the read brings is what the list deliberately does
 * not carry — the markdown, and the tickets rather than a count of them.
 *
 * TICKETS BEFORE THE SPEC, the order the webapp's `/plans/[id]` settled on: the spec is
 * the longer document, but the question that brings someone here is almost always "what
 * got filed?" — they arrive from a ticket, or they are about to pick one up. The spec
 * answers the second question, "why was it cut this way", and reads better once you know
 * what the tickets are.
 *
 * TWO THINGS HERE WRITE: comments on the spec, and the spec itself. Any member of the
 * plan's organization may edit it (issue #302), the author's own plan and a colleague's
 * alike; the database decides, and this page only offers. See `draft` below.
 * Status changes are still the webapp's.
 *
 * No scroll container of its own: the Plans page's pane is the one scrolling element,
 * which is what lets the sweep animate a page taller than the frame.
 */

/**
 * The height of the bar pinned at the top of the page, in pixels.
 *
 * A height and no vertical padding, so the row inside is centred by `items-center` and
 * the space above and below it is equal by construction. The bar IS the page's top inset
 * rather than something sitting on one, which is why the Plans pane carries its padding
 * on the sweep layers and not on itself: an opaque band stopping short of the pane's edge
 * would leave a strip of the spec sliding past above it.
 */
/**
 * The pinned bar's height, and therefore the page's top inset. Kept at the number
 * `TaskDetailPage` settled on: the two pages are the same shape opened from two lists,
 * and a reader moving between them would see the heading start at a different place.
 *
 * 48 rather than 56 for that page's reason — the bar holds one 30px control, so eight of
 * those pixels were slack sitting directly between the back link and the title.
 */
const TOP_BAR_H = 48

/**
 * How long the spec waits after the last keystroke before it saves itself. Long enough that
 * a reader writing a sentence saves it once rather than word by word — each save bumps the
 * row's `updated_at`, which is every colleague's conflict guard — and short enough that
 * closing the laptop a moment after stopping loses nothing.
 */
const AUTOSAVE_MS = 5000

/** The pause that ends one step of typing for Cmd+Z, and how many steps are kept. */
const HISTORY_GROUP_MS = 1000
const HISTORY_LIMIT = 200

/** The sentence a disabled "Rework the plan" button owes the reader, per reason. */
const CHANGE_BLOCKED_KEY: Record<Extract<PlanLocalSpec, { ok: false }>['reason'], MessageKey> = {
  not_owner: 'plans.detail.changeNotOwner',
  no_file: 'plans.detail.changeNoFile',
  failed: 'plans.detail.changeFailed',
}

/** The block holding the caret: its place in the source, and the markdown written in it. */
type OpenBlock = SpecBlock & {
  key: string
  tag: string
  caret: RichTextBlockProps['caret']
  draft: string
  dirty: boolean
}

/** The text of `host` from its start to the caret. */
function textBeforeCaret(host: HTMLElement): string {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return ''
  const range = document.createRange()
  range.selectNodeContents(host)
  range.setEnd(selection.getRangeAt(0).startContainer, selection.getRangeAt(0).startOffset)
  return range.toString()
}

/** Delete everything between the start of `host` and the caret — a block shortcut's marker. */
function deleteBeforeCaret(host: HTMLElement) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = document.createRange()
  range.selectNodeContents(host)
  range.setEnd(selection.getRangeAt(0).startContainer, selection.getRangeAt(0).startOffset)
  selection.removeAllRanges()
  selection.addRange(range)
  document.execCommand('delete')
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Turn the markdown just closed before the caret into the mark it spells, in place. Inside a
 * single text node, and never inside code, where a backtick is a backtick.
 *
 * The mark is followed by a zero-width space for the caret to stand on: placed right after an
 * inline element, the next character typed would otherwise land INSIDE it, and a reader who
 * closed a code span would find everything after it in code too. `richTextToMarkdown` drops it.
 */
function applyInlineShortcut() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return
  const { startContainer, startOffset: offset } = selection.getRangeAt(0)
  // `globalThis.Text`: this file's `Text` is the design system's typography component.
  if (!(startContainer instanceof globalThis.Text) || startContainer.parentElement?.closest('code')) return
  const node = startContainer
  const shortcut = inlineShortcut(node.data.slice(0, offset).replace(/\u00a0/g, ' '))
  if (!shortcut) return
  const range = document.createRange()
  range.setStart(node, shortcut.start)
  range.setEnd(node, offset)
  selection.removeAllRanges()
  selection.addRange(range)
  const inner = escapeHtml(shortcut.inner)
  const html = shortcut.tag === 'a'
    ? `<a href="${escapeHtml(shortcut.href ?? '')}">${inner}</a>`
    : `<${shortcut.tag}>${inner}</${shortcut.tag}>`
  document.execCommand('insertHTML', false, `${html}\u200b`)
}

/** A block's markdown, read back off what the reader typed: a code block keeps its text as is. */
function serializeBlock(tag: string, host: RichNode): string {
  return tag === 'pre' ? codeToMarkdown(host) : richTextToMarkdown(host)
}

/** One heading over one block, in the type the webapp's detail page uses for the same. */
function SectionHeading({ children, hint }: { children: string; hint?: string }) {
  if (!hint) return <h2 className="text-sm font-semibold text-ink mt-8 mb-3">{children}</h2>
  // A caption beside the heading, a step quieter than the heading's own grey: it says where
  // the section comes from, and is not a second title.
  return (
    <div className="mt-8 mb-3 flex items-baseline gap-2 min-w-0">
      <h2 className="shrink-0 text-sm font-semibold text-ink">{children}</h2>
      <span className="truncate text-xs text-text-secondary/60">{hint}</span>
    </div>
  )
}

/**
 * The spec itself, behind a memo boundary — the same one `pr-comments/PRThread` puts
 * around a comment body, and for the same reason: `MarkdownView` is `react-markdown`,
 * which memoises NOTHING. It builds a fresh unified processor and re-parses the whole
 * document on every render it is handed.
 *
 * It matters more here than anywhere else in the app. This page re-renders while the
 * reader SCROLLS — `condensed` flips as the title passes behind the pinned bar — and the
 * document being re-parsed is a spec, which the uploader admits up to `MAX_SPEC_BYTES`,
 * synchronously on the renderer's thread, at the one moment a frame budget exists.
 * `content` is a string, so the default shallow compare is exact and the scroll stops
 * here.
 */
/**
 * Everything the spec needs in order to be COMMENTABLE, as one object.
 *
 * Bundled rather than passed as four props for the memo boundary's sake: `SpecBody` is
 * memoised precisely because this page re-renders while the reader scrolls, and a prop
 * rebuilt every render would defeat that as thoroughly as not memoising at all. One object,
 * built in one `useMemo`, is one identity to keep stable.
 *
 * `null` while the comments have not come back, when the read failed, and when there is no
 * session to write against: the spec then renders exactly as it did before this story, with
 * no selection affordance. That is deliberate — offering to comment before the existing
 * comments have arrived invites writing a second note about a passage somebody has already
 * covered.
 */
interface SpecComments {
  source: CommentSource
  renderOrphans: (lost: readonly FileComment[]) => ReactNode
  /**
   * The threads that have no passage to look for at all — the layer cannot tell, so the
   * page names them. See `isOrphanedPlanCommentThread`.
   */
  anchorless: readonly FileComment[]
}

/**
 * The spec with no comment layer — comments not loaded, or unreadable. Still edited in
 * place, and still formatted from the toolbar over a selection; only "Comment" is missing.
 */
function PlainSpec({ content, editable }: { content: string; editable: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={rootRef}>
      <MarkdownView content={content} variant="document" line={editable ? CommentLine : undefined} />
      {editable && <SpecSelectionToolbar rootRef={rootRef} />}
    </div>
  )
}

const SpecBody = memo(function SpecBody({
  content,
  comments,
  editable,
}: {
  content: string
  comments: SpecComments | null
  /**
   * Whether the blocks take a caret. The layer draws its lines through `CommentLine`
   * already; the plain rendering needs one only to be edited, and gets the same one, which
   * without a `CommentLinesProvider` above it draws no mark and offers no comment.
   */
  editable: boolean
}) {
  /**
   * The spec as it was before this story: rendered, and not selectable for comment.
   *
   * Drawn for the three cases `specComments` answers `null` for — the read still in flight,
   * the read failed, no session to write against. WHO is reading is not one of them:
   * `specComments` never consults the viewer's id, so a reader with no account lands here
   * only by way of a read that could not be made, and never by a test on them.
   *
   * It is `MarkdownView` rather than the layer with an inert source, which would be the same
   * pixels and a different promise: selecting a passage would open a composer whose Save
   * went nowhere. Offering an affordance that cannot work is worse than not offering it.
   */
  if (!comments) return <PlainSpec content={content} editable={editable} />
  return (
    <MarkdownCommentLayer
      content={content}
      /**
       * A plan's spec has NO LOCAL FILE, which is what these three empty strings are
       * saying. They key the renderer's zustand comment map, and this layer does not use
       * it — `source` overrides the reads and the writes both — so what they key is an
       * entry nothing ever writes to. Empty rather than an invented `plan:<uuid>` path,
       * which would look like a location and be none.
       */
      repoPath=""
      filePath=""
      fingerprint=""
      /* Prose on a page of its own, not in a 70%-wide drawer: the same scale the spec was
         rendered at before it gained a comment layer. */
      variant="document"
      /* Prose, so the card gets its radius back and drops the echoed quote — the passage is
         highlighted a few lines above it. See `CommentCard`'s own `spec`. */
      spec
      /* A DOCUMENT DRAWN AS LINES, which is this page and no other. A spec is read from top
         to bottom by people deciding whether it is right, and every note left on it used to
         push the sentences it was about a screen further apart — the page grew by the size
         of its own conversation. Here the comments live in the gutter and open over the
         margin, so the plan reads at the length it was written whatever has been said about
         it. The review's own views keep their cards: a diff is read once, and there the
         notes are the point. */
      lines
      source={comments.source}
      renderOrphans={comments.renderOrphans}
      anchorless={comments.anchorless}
    />
  )
})

/**
 * One comment whose passage the spec no longer contains, drawn OUTSIDE the document.
 *
 * THE ONLY PLACE IT CAN BE. A comment on prose is drawn by portalling its card into a node
 * spliced in after the block its passage ends in; a comment whose passage has gone gets no
 * range, therefore no host, therefore nowhere in the flow to exist. So the orphans are
 * listed under the notice at the top, which is what `CommentAnchorNotice`'s disclosure is
 * for — and they are listed WHOLE, with their author, the passage they were left on and
 * what was said, because a comment reduced to a number in a sentence is a comment deleted
 * with extra steps.
 *
 * The passage is missing on one kind of orphan, and `Quote` already draws nothing for an
 * empty one: a reply promoted by its head being deleted never had a quote of its own — it
 * inherited the head's. What is left is still the author, the date and the words, which is
 * the whole of what there is to keep. See `isOrphanedPlanCommentThread`.
 *
 * Read-only, and that is not a shortcut. The actions a card offers are about a passage —
 * reply to this, rewrite what I said about this — and there is no this. What the reader
 * needs here is to be able to READ what was written and go and find where it went; editing
 * it in place would be the surest way to lose the context that makes it meaningful.
 */
function OrphanedThread({
  thread,
  turnOf,
}: {
  thread: PlanCommentThread
  turnOf: (comment: PlanComment) => CommentTurn
}) {
  return (
    <div className="rounded-lg bg-surface-subtle p-3 flex flex-col gap-2">
      {/* The passage it WAS left on, drawn by the same `Quote` the inline card uses. Printed
          here where that card deliberately does not print it (`spec` hides the echo, because
          the highlight is right there) — the whole point of an orphan is that there is no
          highlight to look at. */}
      <Quote quote={thread.head.quote} />
      {[thread.head, ...thread.replies].map(turnOf).map((turn) => (
        <TurnCard
          key={turn.id}
          ground="bare"
          avatar={{ src: turn.author.avatarUrl ?? null, alt: '', size: 'sm' }}
          author={turn.author.name}
          date={turn.date}
        >
          <CommentBody body={turn.body} />
        </TurnCard>
      ))}
    </div>
  )
}

/**
 * One ticket, as a row of the tree, and as ONE click target.
 *
 * THE ROW OPENS TASKS, AND NOTHING HERE OPENS THE TRACKER. It used to be a single button
 * onto `shell.openExternal`; when it learned to open the ticket in the app, the browser
 * kept a glyph at the end of the row for a while, and that glyph is now gone too. It was
 * paying for itself in the wrong currency: an outbound arrow on every row of every plan,
 * to reach a page this app already renders in full — body, labels, state, and the one
 * action that matters here, starting an agent on it. The tracker is still one click
 * further on, from the ticket's own page, where a reader who wants github.com is
 * actually asking for it.
 *
 * With the glyph went the second button, and with that the wrapper the two needed: a
 * button inside a button is invalid HTML, so they had to be siblings under a div that
 * carried the hover. One button carries its own hover again.
 *
 * `taskSelectionFor` CAN RETURN NULL, and that is not a dead click: a plan belonging to
 * a repository this machine has never configured — the ordinary case for a teammate's
 * plan — has no config key to open a board on, and a key of neither tracker's shape has
 * no tracker. Tasks then opens on the list narrowed to this ticket, which says "no open
 * ticket matches" on its own rather than dropping the reader on a generic backlog. The
 * query is `ticket.key` RAW, because that is already the form the list matches on:
 * `taskRows`' own `issueId` spells a GitHub issue `#194` and a Jira one `PROJ-12`,
 * exactly as this column does.
 *
 * The badge is drawn from the ticket's OWN `kind`, narrowed once in `main/cloud/plans.ts`,
 * and never from where the tree happens to place it: a row that knows what it is must not
 * have to be told by its caller, or the next surface to render one labels every ticket an
 * epic.
 */
function TicketRow({
  ticket,
  configKey,
  state,
}: {
  ticket: PlanTicketRead
  configKey?: string
  /** Off the tracker, live. Absent means "no answer" — see `PlanTicketStates`. */
  state?: PlanTicketStates[string]
}) {
  const t = useT()
  const openTasksModal = useStore((s) => s.openTasksModal)
  const label = ticket.title?.trim() || ticket.key
  /**
   * Which tracker filed this, off the KEY and off nothing else — `#412` is GitHub,
   * `PROJ-1234` is Jira. Not off the plan's repository, which can be tracked in both and
   * whose one `plan.tracker` setting would mislabel every ticket of a mixed plan; and
   * not off the url's host, which is absent on a ticket the tracker gave no browse link
   * for. `null` for a key of neither shape, which falls back to the plain mono id: a row
   * written by a future version must still be readable, just unlabelled.
   */
  const tracker = detectTicketProvider(ticket.key)

  return (
    <button
      type="button"
      onClick={() => openTasksModal({
        selection: taskSelectionFor(ticket.key, configKey),
        query: ticket.key,
      })}
      title={t('plans.detail.openInTasks')}
      className="w-full text-left flex items-center gap-2.5 px-3 py-1.5 rounded-lg min-w-0 transition-colors
        hover:bg-surface-strong focus:outline-none focus-visible:bg-surface-strong"
    >
      {/* The id and its tracker as ONE label, which is what `TrackerBadge` exists to
          say: Atlassian's blue behind a Jira key, our own grey behind a GitHub number.
          The board's cards and the ticket page's bar wear the same label for the same
          ticket, so a plan's tree is now recognisably a list of the same objects. */}
      {tracker
        ? <TrackerBadge tracker={tracker} ticketId={ticket.key} />
        : <span className="shrink-0 font-mono text-xs text-text-secondary">{ticket.key}</span>}
      <span className="min-w-0 text-sm text-ink truncate">{label}</span>
      {ticket.kind === 'epic' && (
        <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-accent/10 text-accent">
          {t('plans.kind.epic')}
        </span>
      )}
      {/* PINNED RIGHT and CENTRED ON THE ROW, drawn by the same two components the Tasks
          page draws it with: GitHub's open/closed chip, Jira's site-named pill coloured
          by category.

          The wrapper is a flex box of its own rather than a bare span, and that is what
          does the centring. `items-center` on the row aligns the wrapper, but a span with
          an inline-flex child inherits the row's `text-sm` line box and sits the pill a
          pixel or two proud of the middle; making the wrapper a flex container puts the
          pill on its own cross axis instead of on a line of text. `ml-auto` on the
          wrapper rather than a spacer, so a row still waiting on its answer has nothing
          there instead of a gap holding a place. */}
      {state && (
        <span className="ml-auto pl-2 flex items-center flex-shrink-0">
          {state.tracker === 'github'
            ? <StateChip state={state.state} t={t} />
            : <JiraStatusPill name={state.name} category={state.category} />}
        </span>
      )}
    </button>
  )
}

/**
 * The epic → story tree, in the order the tracker created it.
 *
 * The hierarchy is RENDERED, not flattened: an epic with five stories under it and five
 * loose issues are different plans, and a flat list says the same thing about both. The
 * trailing group with no epic is kept and labelled rather than silently promoted to top
 * level, because "the epic is missing" is exactly what a partial creation looks like —
 * see `groupPlanTickets`.
 */
function TicketTree({
  groups,
  configKey,
  states,
}: {
  groups: PlanTicketGroup[]
  configKey?: string
  states: PlanTicketStates
}) {
  const t = useT()
  return (
    <div className="rounded-xl bg-surface-subtle p-2 divide-y divide-line-subtle">
      {groups.map((group, index) => (
        <div key={group.epic?.key ?? `orphans-${index}`} className="py-1.5">
          {group.epic ? (
            <TicketRow ticket={group.epic} configKey={configKey} state={states[group.epic.key]} />
          ) : (
            <p className="px-3 py-2 text-[11px] uppercase tracking-wider text-text-secondary/60">
              {t('plans.detail.noEpic')}
            </p>
          )}
          <div className="ml-4 border-l border-line-subtle pl-2">
            {group.stories.map((story) => (
              <TicketRow
                key={story.key}
                ticket={story}
                configKey={configKey}
                state={states[story.key]}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** The block both of this page's two nothings are drawn in: a failed read, and no plan. */
function Notice({
  Icon,
  title,
  body,
  children,
}: {
  Icon: typeof AlertTriangle
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle rounded-xl">
      <Icon className="w-8 h-8 text-icon-muted" />
      <p>{title}</p>
      <p className="text-xs text-text-secondary/60 max-w-sm text-center">{body}</p>
      {children}
    </div>
  )
}

export function PlanDetailPage({
  card,
  now,
  paneRef,
  onBack,
}: {
  card: PlanCard
  /** The list's instant, not one of this page's own: see `Plans/index.tsx`. */
  now: number
  paneRef: RefObject<HTMLElement>
  onBack: () => void
}) {
  const t = useT()
  const repositories = useStore((s) => s.config?.repositories)

  // `null` = the read has not come back yet, which is a third state from a read that
  // came back with no session: the first is a line of text, the second an explanation.
  const [detail, setDetail] = useState<PlanDetail | null>(null)
  /** Bumped by Retry, for the reason `Plans/index.tsx` gives: one effect owns `detail`. */
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  /**
   * THE SPEC, AS THIS PAGE HOLDS IT: the row's markdown, plus whatever the reader has written
   * into it since. `null` until a read has brought one.
   *
   * Edited the way Notion edits a page — a click on a block puts a caret in it, and leaving
   * the block puts its text back into the document — and SAVED ON ITS OWN, `AUTOSAVE_MS`
   * after the last keystroke. There is no Edit button, no Save and no Cancel: the document is
   * the editor.
   */
  const [doc, setDoc] = useState<string | null>(null)
  const docRef = useRef(doc)
  docRef.current = doc
  /**
   * The block holding the caret, cut out of `doc` by `openSpecBlock`, and its markdown as
   * the reader has made it — read back off the formatted text by `richTextToMarkdown` on
   * every input. `dirty` until then: a block opened and left untouched is written back
   * exactly as it was, not as the serializer would have spelled it.
   *
   * `doc` is NOT rewritten on every keystroke, and that is what keeps the rest of the
   * document still: the markdown is parsed once per block edited rather than once per
   * character, and the DOM the reader is typing into is never re-rendered under them.
   */
  const [block, setBlock] = useState<OpenBlock | null>(null)
  const blockRef = useRef(block)
  blockRef.current = block
  /** The block Enter, Backspace or a change of kind produced, to open once it renders. */
  const [pending, setPending] = useState<{ keys: string[]; offset: number; was?: string } | null>(null)
  /** Set while the toolbar's link field has the focus, so the block it will link stays open. */
  const holdRef = useRef(false)
  /** Set while a markdown shortcut is being applied. See `onInput`. */
  const shortcutting = useRef(false)
  /**
   * THE SPEC'S OWN UNDO HISTORY: the document as it was before each change, and the ones
   * undone since.
   *
   * The browser's own undo cannot do this job. It knows the DOM of the one block being written
   * in, and forgets it the moment that block is re-rendered — which is what turning a line
   * into a quote, pressing Enter or merging with Backspace all do, and what leaving the block
   * does too. So Cmd+Z is taken over on the spec, and steps back through whole documents.
   *
   * Typing is GROUPED: a run of keystrokes with no pause longer than `HISTORY_GROUP_MS` is one
   * step, as in every editor — undoing a sentence one letter at a time is not undoing.
   * Everything else — a mark, a change of kind, Enter, Backspace across blocks — is a step
   * of its own.
   */
  const pastRef = useRef<string[]>([])
  const futureRef = useRef<string[]>([])
  const lastTypedAt = useRef(0)
  /** Keep the document as it is now, as the step Cmd+Z will go back to. */
  const remember = () => {
    const now = latestRef.current
    if (now === null || pastRef.current.at(-1) === now) return
    pastRef.current.push(now)
    if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift()
    futureRef.current = []
  }
  /**
   * The document as it would be saved NOW — `doc` with the open block's draft written in.
   * What the autosave sends, and the one spelling of it: two would be how the page saves
   * something other than what is on screen.
   */
  const composed = doc === null ? null : block?.dirty ? applySpecBlock(doc, block, block.draft) : doc
  /**
   * The three things a save reads at the moment it runs rather than when it was scheduled:
   * the text, the spec the row is known to hold, and the `updated_at` to guard with.
   *
   * `updatedAt` is the session's own raw string, as the read or the last save returned it,
   * and is sent back UNCHANGED: it is the conflict guard, and the raw string is the only form
   * of it that can match. Never through a `Date` — the row keeps microseconds, a `Date` keeps
   * milliseconds, and a truncated value would report a conflict on every save.
   */
  const latestRef = useRef<string | null>(null)
  latestRef.current = composed
  const savedRef = useRef<string | null>(null)
  const updatedAtRef = useRef<string | null>(null)
  const savingRef = useRef(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  /** Bumped when a save lands behind newer text, so the autosave arms again for it. */
  const [saveAgain, setSaveAgain] = useState(0)
  /**
   * Why the last save did not land. The text is kept under every one of them. `conflict`
   * and `denied` stop the autosave — writing again would be refused again — and `failed`
   * does not: the next keystroke tries again, and the banner offers to without one.
   */
  const [editError, setEditError] = useState<'conflict' | 'denied' | 'failed' | null>(null)
  /**
   * A save that reached the cloud and NOT this machine's spec file, for the two reasons
   * worth telling the reader. `not_owner` and `no_file` are the ordinary case for most
   * plans and say nothing the reader needs to act on.
   */
  const [fileNotice, setFileNotice] = useState<'diverged' | 'error' | null>(null)

  /**
   * The card this page is on NOW, for a save answering after the reader moved on: its
   * result belongs to the plan it was made on, and must not land on the next one.
   */
  const cardIdRef = useRef(card.id)
  cardIdRef.current = card.id

  /**
   * Whether the title has gone up behind the pinned bar, which is the one thing the bar
   * needs to know to draw its own bottom edge: a hairline under a band with the page
   * flush beneath it would be a rule across the page for no reason, and no hairline once
   * the spec slides underneath would leave the markdown dissolving into it.
   *
   * A sentinel and an observer rather than a scroll handler, the idiom `TaskDetailPage`
   * and the Tasks filter bar both use: this is one boolean that flips twice per visit,
   * where a `scroll` listener would remeasure a rectangle on every frame to answer it.
   * A plain ref, down to the effect body, because the heading it watches is OUTSIDE the
   * read's three branches — it is drawn from the card, before anything comes back — so
   * the node is there from the first commit and stays for the life of the page.
   *
   * `rootMargin` is the bar's own height: without it the title counts as visible while
   * it sits UNDER the band, which is the moment the rule is most needed.
   */
  const titleRef = useRef<HTMLDivElement>(null)
  const [condensed, setCondensed] = useState(false)

  useEffect(() => {
    const titleEl = titleRef.current
    const pane = paneRef.current
    if (!titleEl || !pane) return
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { root: pane, rootMargin: `-${TOP_BAR_H}px 0px 0px 0px` },
    )
    observer.observe(titleEl)
    return () => observer.disconnect()
  }, [paneRef])

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    window.electronAPI.plans.detail(card.id)
      .then((next) => {
        if (!cancelled) setDetail(next)
      })
      .catch(() => {
        // The BRIDGE failed, not the query: `listPlanDetail` answers whatever the
        // database does. Either way nothing was read, so it is reported as a failed
        // read rather than as a plan that does not exist.
        if (!cancelled) setDetail({ session: null, tickets: [], failed: true })
      })
    return () => { cancelled = true }
  }, [card.id, attempt])

  /**
   * ANOTHER PLAN IS ANOTHER DOCUMENT, and leaving this one must not lose what was typed in
   * the last few seconds. Leaving is Back, Escape, a click on another plan, closing the
   * modal — every one of them unmounts or re-keys this page before the autosave's timer
   * fires, so the cleanup sends what is still unsaved itself.
   *
   * Fire and forget, and deliberately so: the page it would report to is gone. A conflict
   * refused here is refused by the database exactly as it would have been a second later,
   * and nothing is overwritten.
   */
  useEffect(() => {
    const id = card.id
    return () => {
      const text = latestRef.current
      const expected = updatedAtRef.current
      if (text !== null && expected && text !== savedRef.current && text.trim() !== '' && !savingRef.current) {
        window.electronAPI.plans.updateSpec({ id, spec: text, expectedUpdatedAt: expected }).catch(() => {})
      }
      latestRef.current = null
      savedRef.current = null
      updatedAtRef.current = null
      savingRef.current = false
      pastRef.current = []
      futureRef.current = []
      setDoc(null)
      setBlock(null)
      setSaveState('idle')
      setEditError(null)
      setFileNotice(null)
    }
  }, [card.id])

  /**
   * Take the row's spec whenever a read brings one — UNLESS the reader has written something
   * that is not saved yet. A quiet re-read landing over unsaved text would take it back from
   * them mid-sentence; the text is the reader's until it is saved, and the conflict guard is
   * what tells them somebody else wrote in the meantime.
   */
  useEffect(() => {
    const session = detail?.session
    if (!session) return
    if (latestRef.current !== null && latestRef.current !== savedRef.current) return
    savedRef.current = session.spec ?? null
    updatedAtRef.current = session.updatedAt ?? null
    // A block holding the caret was cut out of `doc` by its offsets, and a `doc` swapped
    // under it would put its text back in the wrong place. Nothing is lost by waiting: the
    // read agreed with what is on screen, or it would have been refused above.
    if (!blockRef.current) {
      // A document that is not the one on screen — the first read, a reload after a
      // conflict — has no past on this page: undoing into the old one would resurrect it.
      if ((session.spec ?? null) !== docRef.current) {
        pastRef.current = []
        futureRef.current = []
      }
      setDoc(session.spec ?? null)
    }
  }, [detail])

  /**
   * This repository's key IN THE LOCAL CONFIG, resolved the way `PlanRow` resolves it:
   * from the cloud `repoId`, never from the name. Names are unique only within one
   * organization, and both things keyed by this are keyed by the LOCAL config's keys —
   * the colour map the `RepoMark` below draws from, and the board `TicketTree`'s rows
   * open on. Undefined for a repository this machine has never cloned, which is the
   * ordinary case for a teammate's plan: the mark falls back to the generic folder icon,
   * and a ticket click falls back to the list narrowed to its id.
   */
  const repoConfigKey = configKeyForRepoId(card.repoId, repositories)

  /**
   * Every ticket's state as its tracker reports it NOW — the pills on the right of the
   * tree. Empty until the read lands, and empty for good whenever there is no answer.
   *
   * A SECOND READ, deliberately after the first rather than beside it. `plans:detail` is
   * a cloud read that cannot fail slowly and is what the page is made of; this one goes
   * to github.com and to an Atlassian site, and is decoration. Sequenced on `detail`
   * because the keys come out of it, and that ordering is also what makes the tree
   * render at cloud speed and gain its pills a moment later rather than waiting on a
   * tracker to draw a list the cloud already answered.
   *
   * SKIPPED ENTIRELY for a plan on a repository this machine has not configured — the
   * ordinary case for a teammate's — because `tasks:ticketStatuses` would have nothing
   * to resolve the tracker coordinates against and could only answer `{}`. Asking is
   * then two IPC hops and a promise for a known answer.
   *
   * Never throws into the page: a rejected bridge call leaves the map empty, which is
   * the same thing an unreadable tracker leaves, and the same thing the rows already
   * draw. There is no error state here because there is nothing a reader would do with
   * one — see `PlanTicketStates`.
   */
  const [ticketStates, setTicketStates] = useState<PlanTicketStates>({})

  /**
   * THE COMMENTS ON THIS PLAN, and everything the spec needs to draw them.
   *
   * Keyed on the SESSION the read came back with, not on `card.id`: a plan that turned out
   * not to be visible has no session, and asking for its comments would be one more query
   * answering nothing. The hook treats `undefined` as "no plan", which is an answer rather
   * than a pending read.
   */
  const comments = usePlanComments(detail?.session?.id)
  const { status } = useAuth()
  const viewerId = status.user?.id
  /**
   * The reader themselves, for the box they write a comment in — their address and their
   * photo.
   *
   * THE PHOTO COMES FROM THE ACCOUNT STORE AND NOT FROM `avatarByAuthor`, which is the only
   * subtle thing here. That map is built by `fetchAuthors` from the authors of the comments
   * that EXIST, so on a plan the reader has never written on it does not contain them —
   * their own composer would be the one card on the page drawing a generic glyph. `useAvatar`
   * is the same photo the sidebar and the settings rail draw, already in hand, with no read.
   *
   * MEMOISED because it goes into `specComments`, which is memoised precisely so that the
   * spec is not re-parsed while the reader scrolls.
   */
  const viewerAvatar = useAvatar()
  const viewer = useMemo(
    () => (viewerId
      ? { name: status.user?.email ?? viewerId.slice(0, 8), avatarUrl: viewerAvatar ?? undefined }
      : undefined),
    [viewerId, status.user?.email, viewerAvatar],
  )

  /**
   * The threads, built once per read — MEMOISED BECAUSE THE LAYER DEPENDS ON THE IDENTITY.
   *
   * The relocation pass keys on the comments array it was handed: a fresh array per render
   * would re-walk the whole rendered document and re-search every quotation on every
   * render, including the ones this page does while the reader merely scrolls.
   */
  const threads = useMemo(
    () => buildPlanCommentThreads(comments.read?.comments ?? []),
    [comments.read],
  )

  /**
   * One turn, decorated: who, when, and whether this reader may touch it.
   *
   * THE ONE PLACE A COMMENT BECOMES SOMETHING DRAWABLE, which is why the orphan list takes
   * turns rather than comments: a second spelling of "whose photo, and how the timestamp
   * reads" would be two answers to keep in step for the same person on the same page.
   *
   * The author is resolved the way the plans list resolves the author of a plan, so a
   * colleague is one person across the two surfaces. `canEditPlanComment` is the
   * interface's half of AC4 and is deliberately the weaker half — `plan_comments`' policies
   * are what actually refuse a write on somebody else's comment. What this buys is that the
   * ordinary case looks ordinary.
   */
  const turnOf = useCallback((comment: PlanComment): CommentTurn => {
    const at = comment.createdAt ? new Date(comment.createdAt).getTime() : NaN
    return {
      id: comment.id,
      author: {
        name: planAuthor(comment.authorId, comments.read?.emailByAuthor ?? {}),
        avatarUrl: comments.read?.avatarByAuthor[comment.authorId],
      },
      date: Number.isFinite(at) ? formatTimestamp(at, now, t) : undefined,
      body: comment.body,
      canEdit: canEditPlanComment(comment, viewerId),
    }
  }, [comments.read, now, t, viewerId])

  /**
   * Everything the spec's comment layer runs on, or `null` for "not yet, or nowhere to
   * write".
   *
   * `null` COVERS THREE CASES AND THEY ARE ONE ANSWER: the read has not come back, the read
   * failed, or there is no session. In all three the page has no comments it can trust and
   * no id to write against, so it renders the spec as plain prose — see `SpecBody`.
   */
  const specComments: SpecComments | null = useMemo(() => {
    const sessionId = detail?.session?.id
    const read = comments.read
    if (!sessionId || !read || read.failed) return null

    const byId = new Map<string, PlanCommentThread>(threads.map((thread) => [thread.head.id, thread]))

    /**
     * The thread heads, in the shape the layer speaks — `FileComment`, which is the store's
     * type and the one the four other callers pass.
     *
     * ONLY THE HEADS are anchored. A reply carries no passage of its own: it belongs to the
     * conversation, and the conversation is anchored where its first comment was left. The
     * replies travel to the card through `thread` below.
     */
    const asFileComment = (thread: PlanCommentThread): FileComment => ({
      id: thread.head.id,
      anchor: null,
      quote: thread.head.quote,
      body: thread.head.body,
      createdAt: thread.head.createdAt ? new Date(thread.head.createdAt).getTime() : 0,
    })

    const heads: FileComment[] = threads.map(asFileComment)

    /**
     * The threads with no passage at all, named for the layer — which cannot work it out,
     * since an empty quote means a note on the whole file everywhere else in the app.
     *
     * A head gets here by being a reply whose own head was deleted: `on delete set null`
     * promotes it rather than taking it down with its parent, and a reply carries no quote
     * of its own. Left unsaid, it would be a comment in the database and on no screen —
     * see `isOrphanedPlanCommentThread`. It stays in `heads` above as well, where it is
     * inert: the layer marks only what carries a quote.
     */
    const anchorless: FileComment[] = threads.filter(isOrphanedPlanCommentThread).map(asFileComment)

    const thread = (id: string): CommentThread | undefined => {
      const found = byId.get(id)
      if (!found) return undefined
      const head = turnOf(found.head)
      return {
        author: head.author,
        date: head.date,
        canEdit: head.canEdit,
        replies: found.replies.map(turnOf),
        // A reply carries no quote: its anchor is the head's, and storing a second copy of
        // the passage would give the layer two comments to relocate onto one place.
        onReply: (body) => comments.create({ sessionId, parentId: id, anchor: null, quote: '', body }),
        onSaveReply: (replyId, body) => comments.update(replyId, body),
        onDeleteReply: (replyId) => comments.remove(replyId),
      }
    }

    /**
     * EVERY WRITE'S ANSWER IS HANDED ON, where each of these used to `void` it.
     *
     * The hook has always resolved to whether the row was written — it is the only thing
     * that knows, since the refusals happen in Postgres — and six `void`s threw that away
     * on the way to the card. What the reader saw was the card closing on a comment RLS
     * had refused, or a Delete quietly restoring its comment on the next refetch. The card
     * is what draws the failure; this only has to stop swallowing it.
     */
    const source: CommentSource = {
      comments: heads,
      viewer,
      add: (comment) => comments.create({
        sessionId, anchor: null, quote: comment.quote, body: comment.body,
      }),
      update: (id, body) => comments.update(id, body),
      remove: (id) => comments.remove(id),
      thread,
    }

    /**
     * The threads the layer could not place — AC5.
     *
     * Asked for by the layer, in its own render, with the heads it could not find: only it
     * knows which passages are still in the document, and only this page knows how to draw
     * a comment. The heads come back in the shape they were handed over in, so `byId` is
     * what turns each one back into its conversation.
     *
     * Both kinds arrive here — the quotations the rewritten spec no longer contains, and
     * the `anchorless` ones above, which never had a passage to look for. They are the same
     * thing to a reader, and `OrphanedThread` draws either: `Quote` renders nothing for an
     * empty passage, so a promoted reply comes out as its author, its date and its words.
     */
    const renderOrphans = (lost: readonly FileComment[]): ReactNode => lost.map((head) => {
      const found = byId.get(head.id)
      return found && <OrphanedThread key={head.id} thread={found} turnOf={turnOf} />
    })

    return { source, renderOrphans, anchorless }
  }, [detail?.session?.id, comments, threads, turnOf, viewer])

  useEffect(() => {
    setTicketStates({})
    const keys = detail?.tickets.map((ticket) => ticket.key) ?? []
    if (!repoConfigKey || keys.length === 0) return

    let cancelled = false
    window.electronAPI.tasks.ticketStatuses(repoConfigKey, keys)
      .then((next) => {
        if (!cancelled) setTicketStates(next)
      })
      .catch(() => {
        // Left empty rather than reported: see above.
      })
    return () => { cancelled = true }
  }, [detail, repoConfigKey])

  /**
   * Escape goes back to the LIST, not out of the whole page.
   *
   * PageModal listens for Escape on `window` too and closes the modal, so this has to
   * run first AND stop the other listener — which is what the capture phase plus
   * `stopImmediatePropagation` does. Plain `stopPropagation` would not help: both
   * listeners are on the same target, and only the "immediate" form stops the others
   * there. Mounted with this page, so Escape goes on closing the modal from the list.
   *
   * A COMMENT BUBBLE OWNS ITS OWN ESCAPE, and this has to stand aside for it. Capture on
   * `window` runs before anything the bubble could bind, so without the test below the key
   * that closes a half-written comment would close the plan instead — and take the comment
   * with it. `[data-comment-composer]` is the marker every box in this app that owns its
   * keystrokes carries, and the drawer's own listeners bail on exactly the same selector;
   * see `KEY_OWNING_SURFACES` in `FilePreviewPanel`.
   *
   * A BLOCK BEING WRITTEN IN OWNS ITS ESCAPE TOO, for the same reason and with the same
   * test: the key leaves the block — one level at a time, the way it already goes from the
   * page to the list and not out of the modal — and `RichTextBlock` stops it there, so
   * the modal behind never hears it. The text is kept: it is in the document, and the
   * autosave has it.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (e.target instanceof Element && e.target.closest('[data-comment-composer], [data-inline-editor]')) return
      e.preventDefault()
      e.stopImmediatePropagation()
      onBack()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onBack])

  const { tone, labelKey } = STATUS_LOOK[card.status]
  /**
   * The status, drawn ONCE and rendered in two places — the pinned bar while the reader
   * has scrolled past the heading, the heading itself before that. One expression rather
   * than two copies, because the two are the same fact and a pill that changed shape on
   * scroll would read as a second, different status.
   */
  const statusChip = <Status label={t(labelKey)} tone={tone} />
  const session = detail?.session
  // Zero for "no such timestamp", the sentinel `planRecency` and `PlanRow` already use
  // for one — an unparseable stamp lands there too, since `NaN > 0` is false.
  const syncedAt = session?.specSyncedAt ? new Date(session.specSyncedAt).getTime() || 0 : 0
  /**
   * The markdown this row actually holds, or `undefined` for "none to render".
   *
   * A whitespace-only spec is no spec: it is what a file created and not yet written to
   * uploads as, and rendering it would draw an empty panel where a sentence belongs. Held
   * here rather than re-tested in each branch below, because the oversize flag and the
   * presence of markdown are read TOGETHER and a second spelling of "has a spec" is how
   * the two fall out of step.
   */
  const spec = session?.spec?.trim() ? session.spec : undefined

  /**
   * Where `/magic:plan-change` could be run on this plan: the spec file on THIS machine and
   * the repository it lives in, or why there is none. `null` while it is being asked.
   *
   * ASKED OF MAIN, BY ID. The row carries a hash of the spec's path and never the path
   * itself (it is org-readable, and a path carries a home directory), so only the side
   * that can hash the files on this disk can answer. Keyed on the session the read came
   * back with, like the comments: no session is no plan to rework.
   */
  const [localSpec, setLocalSpec] = useState<PlanLocalSpec | null>(null)
  const sessionId = session?.id
  useEffect(() => {
    setLocalSpec(null)
    if (!sessionId) return
    let cancelled = false
    window.electronAPI.plans.localSpec(sessionId)
      .then((next) => { if (!cancelled) setLocalSpec(next) })
      .catch(() => { if (!cancelled) setLocalSpec({ ok: false, reason: 'failed' }) })
    return () => { cancelled = true }
  }, [sessionId])
  /** The sentence a disabled button owes the reader, once the answer is in. */
  const changeBlocked = localSpec && !localSpec.ok ? t(CHANGE_BLOCKED_KEY[localSpec.reason]) : undefined
  /**
   * Open a new agent on the spec, the command typed and NOT sent: the change request is
   * the reader's to write, so the draft stops at the path and leaves them the caret. Asked
   * for through `new-terminal`, as every surface does, so the agents page keeps every guard
   * on creating one. It opens in the repository root main resolved, which is what the
   * skill checks the spec against.
   */
  const reworkPlan = () => {
    if (!localSpec?.ok) return
    const detail: NewTerminalDetail = {
      cwd: localSpec.repoPath,
      initialPrompt: planChangePrompt(localSpec.path),
      promptMode: 'draft',
      metadata: { title: planLabel(card) },
    }
    window.dispatchEvent(new CustomEvent<NewTerminalDetail>('new-terminal', { detail }))
  }

  /**
   * Whether this spec can be opened in the editor at all.
   *
   * A SPEC TO EDIT: there is markdown on the row. A spec not written yet is the agent's
   * to write, and it will be uploading over the top of anything typed here in a moment.
   *
   * NOT OVERSIZE: the row's copy is then stale by definition — the real document grew past
   * the ceiling on its author's disk — and an edit of a stale copy is an edit of the wrong
   * document.
   *
   * AN `updatedAt` TO GUARD WITH: without one there is no way to know whether the save
   * would overwrite somebody, so the page does not offer it.
   *
   * WHO is reading is deliberately not a test: the author and any member of the plan's
   * organization may edit, and the database is the one that knows who that is. A reader it
   * refuses sees `denied`, with their draft intact.
   */
  const canEdit = !!session && !!spec && !session.specOversize && !!session.updatedAt

  /** Whether a click on the spec puts a caret in it. Refused saves stop offering it. */
  const editable = canEdit && editError !== 'conflict' && editError !== 'denied'

  /**
   * Send the document as it is NOW. Called by the autosave's timer, by the failure banner's
   * Retry, and by nothing else — leaving the page flushes through its own cleanup.
   *
   * One save at a time: a second call while one is on its way returns, and the first,
   * landing behind text written since, arms the autosave again for it.
   */
  const save = useCallback(async () => {
    const id = card.id
    const text = latestRef.current
    const expected = updatedAtRef.current
    if (savingRef.current || text === null || !expected || text === savedRef.current || text.trim() === '') return
    savingRef.current = true
    setSaveState('saving')
    let result: PlanSpecUpdateResult
    try {
      result = await window.electronAPI.plans.updateSpec({ id, spec: text, expectedUpdatedAt: expected })
    } catch {
      // The BRIDGE failed: nothing is known to have been written, and the text stays.
      result = { status: 'failed' }
    }
    if (cardIdRef.current !== id) return
    savingRef.current = false

    if (result.status !== 'saved') {
      setEditError(result.status)
      setSaveState('idle')
      return
    }

    savedRef.current = text
    updatedAtRef.current = result.updatedAt
    setEditError(null)
    setFileNotice(
      result.fileSkipReason === 'diverged' || result.fileSkipReason === 'error' ? result.fileSkipReason : null,
    )
    if (latestRef.current === text) setSaveState('saved')
    else setSaveAgain((n) => n + 1)

    // The row now holds the text, under a new `updated_at`, and is read again quietly —
    // `idea` may have changed with the spec, and the read is the only source of truth about
    // what the row holds. It cannot take back what the reader typed since: see the effect
    // that adopts a read.
    const updatedAt = result.updatedAt
    setDetail((prev) => prev?.session
      ? { ...prev, session: { ...prev.session, spec: text, updatedAt } }
      : prev)
    window.electronAPI.plans.detail(id)
      .then((next) => {
        // A failed quiet read keeps what is on screen, which is what was just saved.
        if (cardIdRef.current === id && !next.failed) setDetail(next)
      })
      .catch(() => {})
  }, [card.id])

  /**
   * THE AUTOSAVE: `AUTOSAVE_MS` after the document last changed, and not before. Every
   * keystroke re-arms it, so a reader writing a paragraph saves once, when they stop.
   *
   * Not while a refused save stands: a conflict would be refused again, a denial too, and
   * each attempt would bump nothing but the reader's doubt.
   */
  useEffect(() => {
    if (composed === null || composed === savedRef.current) return
    if (editError === 'conflict' || editError === 'denied') return
    const timer = window.setTimeout(() => { void save() }, AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [composed, editError, save, saveAgain])

  /**
   * THE DOCUMENT BEING WRITTEN IN, as `CommentLine` and the toolbar read it.
   *
   * Every callback reads the refs rather than the render's values, so the object is rebuilt
   * only when a block opens or closes or the document changes — never per keystroke. See
   * `EditableLinesState`.
   *
   * THE STRUCTURAL EDITS — Enter, Backspace at the start, a change of kind — rewrite `doc`
   * straight away and close the block, naming the block they produced in `pending`: its key
   * exists only in the new document, and the line that renders under it opens itself.
   */
  const lines = useMemo(() => new Map<string, EditableLine>(), [doc])
  const editing: EditableLinesState | null = useMemo(() => {
    if (!editable || doc === null) return null

    /** Write the open block back into the document, and close it. The document it leaves. */
    const closeBlock = (): string | null => {
      const open = blockRef.current
      const current = docRef.current
      if (!open || current === null) return current
      blockRef.current = null
      const next = applySpecBlock(current, open, open.dirty ? open.draft : open.text)
      // The last words of the spec deleted: a save would refuse it, so the block stays.
      const kept = next.trim() !== '' ? next : current
      docRef.current = kept
      setDoc(kept)
      setBlock(null)
      return kept
    }

    /**
     * Close whatever other block is open before acting on `line`, and say where `line` is
     * now: writing the open block back moves every block after it by however much it grew.
     */
    const settle = (line: EditableLine): EditableLine | null => {
      const open = blockRef.current
      const before = docRef.current
      if (!open || open.key === line.key) return line
      const after = closeBlock()
      if (before === null || after === null || line.source.start < open.end) return line
      const delta = after.length - before.length
      return { ...line, source: { start: line.source.start + delta, end: line.source.end + delta } }
    }

    /** A structural edit: the new document, and the block to open in it. */
    const restructure = (next: string, open: { keys: string[]; offset: number }) => {
      remember()
      lastTypedAt.current = 0
      blockRef.current = null
      docRef.current = next
      setDoc(next)
      setBlock(null)
      setPending(open)
    }

    const retype = (key: string, type: SpecBlockType, host: HTMLElement | null, offset: number) => {
      const found = lines.get(key)
      if (!found || found.tag === 'pre') return
      const line = settle(found)
      const current = docRef.current
      if (!line || current === null) return
      const open = blockRef.current?.key === key ? blockRef.current : null
      const target = open ?? openSpecBlock(current, line.tag, line.source)
      const text = host && open ? serializeBlock(line.tag, host) : target.text
      const next = retypeSpecBlock(current, target, text, type)
      restructure(next.doc, { keys: next.keys, offset })
    }

    return {
      editing: block?.key ?? null,
      caret: block?.caret,
      pending,
      lines,
      label: t('plans.edit.field'),
      onStart: (asked, caret) => {
        if (blockRef.current?.key === asked.key) return
        // Another block still open — the link field was left without a blur.
        const line = settle(asked)
        const before = docRef.current
        if (!line || before === null) return
        const opened = openSpecBlock(before, line.tag, line.source)
        // Reopened after an undo: at the end of what it changed, rather than where it was.
        const now = pending?.was !== undefined && pending.keys.includes(line.key)
          ? document.querySelector(`[data-rich-block="${CSS.escape(line.key)}"]`)?.textContent
          : undefined
        const at = now != null && pending?.was !== undefined ? { offset: caretAfterChange(pending.was, now) } : caret
        const next: OpenBlock = { ...opened, key: line.key, tag: line.tag, caret: at, draft: opened.text, dirty: false }
        blockRef.current = next
        setBlock(next)
        setPending(null)
        setSaveState((prev) => (prev === 'saved' ? 'idle' : prev))
      },
      onInput: (host, input) => {
        const open = blockRef.current
        if (!open) return
        // One step per run of typing, one per anything else: see `pastRef`.
        const typing = /^(insertText|insertCompositionText|deleteContent)/.test(input?.inputType ?? '')
        const at = Date.now()
        if (!typing || at - lastTypedAt.current > HISTORY_GROUP_MS) remember()
        lastTypedAt.current = typing ? at : 0
        // Markdown typed as markdown: see `markdownShortcuts`. Each applies through an editing
        // command whose own input event comes back here — `shortcutting` keeps it from being
        // read for a shortcut a second time.
        if (input?.inputType === 'insertText' && open.tag !== 'pre' && !shortcutting.current) {
          shortcutting.current = true
          try {
            const marker = input.data === ' ' ? blockShortcut(textBeforeCaret(host)) : null
            const current = docRef.current
            if (marker && current !== null && marker !== specBlockTypeOf(current, open.tag, open)) {
              deleteBeforeCaret(host)
              retype(open.key, marker, host, 0)
              return
            }
            if (input.data && /[`*_~)]/.test(input.data)) applyInlineShortcut()
          } finally {
            shortcutting.current = false
          }
        }
        const next = { ...open, draft: serializeBlock(open.tag, host), dirty: true }
        blockRef.current = next
        setBlock(next)
      },
      onDone: () => {
        if (!holdRef.current) closeBlock()
      },
      onEnter: (host) => {
        const open = blockRef.current
        const current = docRef.current
        const selection = window.getSelection()
        if (!open || current === null || !selection || selection.rangeCount === 0) return
        const range = selection.getRangeAt(0)
        const head = document.createRange()
        head.selectNodeContents(host)
        head.setEnd(range.startContainer, range.startOffset)
        const tail = document.createRange()
        tail.selectNodeContents(host)
        tail.setStart(range.endContainer, range.endOffset)
        const before = serializeBlock(open.tag, head.cloneContents())
        const after = serializeBlock(open.tag, tail.cloneContents())
        // Enter on an empty item leaves the list, the way every editor does.
        if (open.item && before === '' && after === '') {
          retype(open.key, 'p', host, 0)
          return
        }
        const next = splitSpecBlock(current, open, before, after)
        restructure(next.doc, { keys: next.keys, offset: 0 })
      },
      onBackspaceAtStart: (host) => {
        const open = blockRef.current
        const current = docRef.current
        if (!open || current === null || open.tag === 'pre') return
        // A heading, an item or a quote first becomes a paragraph; only a paragraph merges.
        if (specBlockTypeOf(current, open.tag, open) !== 'p') {
          retype(open.key, 'p', host, 0)
          return
        }
        const hosts = Array.from(document.querySelectorAll<HTMLElement>('[data-rich-block]'))
        const previousHost = hosts[hosts.indexOf(host) - 1]
        const previous = previousHost ? lines.get(previousHost.getAttribute('data-rich-block') ?? '') : undefined
        if (!previous || previous.tag === 'pre') return
        const target = openSpecBlock(current, previous.tag, previous.source)
        const joinAt = target.text === EMPTY_BLOCK ? 0 : (previousHost.textContent ?? '').length
        const next = mergeSpecBlocks(current, target, open, serializeBlock(open.tag, host))
        restructure(next, { keys: [previous.key], offset: joinAt })
      },
      onRetype: (key, type) => {
        const host = document.querySelector<HTMLElement>(`[data-rich-block="${CSS.escape(key)}"]`)
        retype(key, type, host, host ? (caretOffsetIn(host) ?? (host.textContent ?? '').length) : 0)
      },
      hold: (on) => { holdRef.current = on },
    }
  }, [editable, doc, block?.key, block?.caret, pending, lines, t])

  /**
   * One step back through the history, or forward again. The block that held the caret is
   * reopened where it was, when the step left it in the same place — the ordinary case, a
   * change inside the line being written in.
   */
  const stepHistory = (direction: 'undo' | 'redo'): boolean => {
    const from = direction === 'undo' ? pastRef : futureRef
    const to = direction === 'undo' ? futureRef : pastRef
    const now = latestRef.current
    let target = from.current.pop()
    while (target !== undefined && target === now) target = from.current.pop()
    if (target === undefined || now === null) return false
    to.current.push(now)
    const open = blockRef.current
    const host = open ? document.querySelector<HTMLElement>(`[data-rich-block="${CSS.escape(open.key)}"]`) : null
    const offset = host ? caretOffsetIn(host) ?? 0 : 0
    blockRef.current = null
    docRef.current = target
    lastTypedAt.current = 0
    setDoc(target)
    setBlock(null)
    // `was`: the block's text before the step, so the caret lands where the step changed it.
    if (open) setPending({ keys: [open.key], offset, was: host?.textContent ?? undefined })
    return true
  }
  const stepRef = useRef(stepHistory)
  stepRef.current = stepHistory

  /**
   * CMD+Z AND CMD+SHIFT+Z ON THE SPEC, taken from the browser. Two ways in, one step:
   *
   *  * the keystroke, in the capture phase, before the block's own undo and before the app
   *    menu's Edit › Undo — Chromium offers a Cmd shortcut to the page first, and one the
   *    page prevents never reaches the menu;
   *  * `beforeinput` with `historyUndo`, which is what that menu item sends when it is
   *    clicked rather than typed.
   *
   * Only in the spec, or with the focus on nothing — a reader who has just left a block with
   * Escape is still "in" the document. Never in a field: a comment being written and the
   * link's address each keep their own undo.
   */
  useEffect(() => {
    if (!editable) return
    const inSpec = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false
      if (target.closest('input, textarea, select, [data-comment-composer]')) return false
      return target === document.body || !!target.closest('[data-rich-block]')
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const letter = e.key.toLowerCase()
      if (!(e.metaKey || e.ctrlKey) || e.altKey || (letter !== 'z' && letter !== 'y')) return
      if (!inSpec(e.target)) return
      const inBlock = e.target instanceof Element && !!e.target.closest('[data-rich-block]')
      const stepped = stepRef.current(letter === 'y' || e.shiftKey ? 'redo' : 'undo')
      // Inside a block, the browser's own undo is never let through, stepped or not: it would
      // undo into a DOM this history has already replaced.
      if (stepped || inBlock) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType !== 'historyUndo' && e.inputType !== 'historyRedo') return
      if (!inSpec(e.target)) return
      e.preventDefault()
      stepRef.current(e.inputType === 'historyRedo' ? 'redo' : 'undo')
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('beforeinput', onBeforeInput, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('beforeinput', onBeforeInput, true)
    }
  }, [editable])

  /**
   * The conflict's way out: drop the reader's text and read the plan as it now is. The ONLY
   * path that discards writing the reader did not choose to delete — and it is still their
   * click, after a sentence telling them to copy what they want to keep.
   */
  const reloadAfterConflict = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
    blockRef.current = null
    setBlock(null)
    setPending(null)
    latestRef.current = null
    savedRef.current = null
    setEditError(null)
    setSaveState('idle')
    retry()
  }, [retry])

  /** Beside the heading: where the autosave is, or how to start writing. */
  const editStatus = !editable
    ? null
    : saveState === 'saving'
      ? t('common.saving')
      : composed !== savedRef.current
        ? t('plans.edit.unsaved')
        : saveState === 'saved'
          ? t('plans.edit.saved')
          : block ? null : t('plans.edit.clickToEdit')

  return (
    <div className="flex flex-col">
      {/* The trail out, and the band the page scrolls under. Full-bleed via the negative
          margins so nothing slides past an inset edge, and `bg-bg-secondary` because that
          is PageModal's own panel colour: anything else would read as a floating
          toolbar.

          WHAT IT CARRIES DEPENDS ON `condensed`, the arrangement `Tasks/TaskDetailPage`
          settled on for the same bar: the title and the status STAND IN for the heading
          once it has gone behind the band, and are absent while the heading itself is on
          screen — two copies of a title six pixels apart is not a reminder, it is a
          duplicate. What fills the bar before that is the repository name, in grey: the
          one piece of the header worth keeping at a glance and the only thing here that
          does not repeat something visible. */}
      <StickyBar height={TOP_BAR_H} stuck={condensed} className="-mx-6 px-6">
        {/* `Button tone="ghost"` — no plate at rest, which is what a trail out of a page
            should be: it is not an action the reader came here for. `-ml-2` pulls the
            label's optical left edge back onto the page's own inset, which the button's
            own horizontal padding would otherwise push in by twelve pixels. The ticket
            page's bar is drawn the same way, and they are the same object. */}
        <Button
          tone="ghost"
          icon={ArrowLeft}
          onClick={onBack}
          title={t('plans.detail.back')}
          className="-ml-2"
        >
          {t('plans.detail.back')}
        </Button>
        {condensed ? (
          <>
            {/* THE BADGE COMES WITH THE TITLE, the way a task's key does in its own
                pinned bar: the bar stands in for the heading it replaced, and the heading
                is `#7` and a name. Without it the reader who has scrolled has nothing on
                screen naming which plan this is other than a truncated title.

                The row's own type size, not the heading's: this is the title standing in
                for itself in a 56px band, not a second `h1`. `title` on the element so
                a name the bar has to truncate is still readable on hover. */}
            <PlanIdBadge number={card.number} />
            <Text className="min-w-0 flex-1 truncate" title={planLabel(card)}>
              {planLabel(card)}
            </Text>
            {/* Pinned to the right edge, where the heading's own pill sits: the bar is
                the heading, so the two must not swap sides as one replaces the other. */}
            {statusChip}
          </>
        ) : (
          <Text tone="secondary" className="min-w-0 flex-1 truncate opacity-50">
            {card.repoName ?? t('plans.noRepo')}
          </Text>
        )}
      </StickyBar>

      {/* The heading is the CARD's, drawn before the read comes back and unchanged by it:
          the reader clicked this row and must see its title straight away, not a spinner
          where the name of the thing they opened should be. */}
      <div ref={titleRef} className="flex items-start justify-between gap-4 min-w-0">
        {/* Badge, then name — the row's order, so the list and the page it opens read the
            same way down the left edge. At `md`, the size a ticket's key wears on ITS
            page: this is a heading, and the list's 24px badge beside a `text-xl` title
            read as a caption that had come adrift from it.

            `items-center` centres the two on their HEIGHTS, which is what `TaskDetailPage`
            settled on for the same pair: hung from the first line's cap height the badge
            sits visibly high on the one-line titles that are most of them. */}
        <div className="flex items-center gap-3 min-w-0">
          <PlanIdBadge number={card.number} size="lg" />
          <h1 className="min-w-0 text-xl font-semibold text-ink break-words">{planLabel(card)}</h1>
        </div>
        {/* The one action on the plan AS A WHOLE, beside its status: reworking it opens an
            agent, it edits nothing here. Only once the read has a session, since there is
            no plan to rework before that. Disabled for a reason the reader cannot see, so
            the reason is the tooltip, and said again under the heading. */}
        <div className="flex shrink-0 items-center gap-3">
          {session && (
            <Button
              icon={NotebookPen}
              onClick={reworkPlan}
              disabled={!localSpec?.ok}
              title={changeBlocked ?? t('plans.detail.changeHint')}
            >
              {t('plans.detail.change')}
            </Button>
          )}
          {statusChip}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
        <RepoColorChip colorKey={repoConfigKey} label={card.repoName ?? t('plans.noRepo')} />
        {/* The author as the LIST'S OWN LABEL, not as a phrase. The plans list settled
            on chips — "three chips, not three phrases separated by spaces" — and this
            page was still drawing the same person as loose text beside a bare avatar,
            so the one thing a reader moves between showed up in two shapes.

            `alt=""` because the author is named in the very next breath; an alt
            repeating the adjacent label makes a screen reader say the same person
            twice. `truncate` because an address has no maximum length. */}
        <Label avatar={{ src: card.avatarUrl ?? null, alt: '' }} truncate>
          {card.author}
        </Label>
        {/* Only once the read is in: `specSyncedAt` is on the session, not on the card,
            and it is the one line here that says something about the SPEC rather than
            about the plan. Guarded against a timestamp no Date can parse. */}
        {syncedAt > 0 && (
          <span>{t('plans.detail.syncedAt', {
            when: t('relative.ago', { time: formatTimestamp(syncedAt, now, t) }),
          })}</span>
        )}
      </div>
      {/* Said in place, as the ticket page says a repository with no local folder: the
          tooltip alone is invisible until someone hovers a button that does nothing. */}
      {changeBlocked && (
        <Text tone="secondary" className="mt-2 block opacity-70">{changeBlocked}</Text>
      )}

      {detail === null ? (
        <p className="py-10 text-center text-sm text-text-secondary">{t('common.loading')}</p>
      ) : detail.failed ? (
        /* BEFORE the not-found branch, exactly as on the list: a read that errored has no
           session either, and "this plan is not available" over a dropped connection is a
           claim about the reader's access that nothing here has evidence for. */
        <Notice Icon={CloudOff} title={t('plans.error.title')} body={t('plans.error.body')}>
          <button type="button" onClick={retry} className={`${BTN_PRIMARY} mt-1`}>
            <RotateCcw className="w-3.5 h-3.5" />
            {t('common.retry')}
          </button>
        </Notice>
      ) : !session ? (
        /* RLS answers "no such plan" and "not yours" identically — an empty result — so
           this says exactly that much and no more. Reachable from a list that is a few
           minutes old: the session may have been deleted, or the repository unshared,
           since the row was drawn. */
        <Notice
          Icon={AlertTriangle}
          title={t('plans.detail.notFound')}
          body={t('plans.detail.notFoundHint')}
        />
      ) : (
        <>
          {/* The idea, as a section like the others: its heading above the card, the card in
              the tickets' and the links' own ground. */}
          {session.idea && (
            <>
              <SectionHeading hint={t('plans.detail.ideaHint')}>{t('plans.detail.idea')}</SectionHeading>
              <div className="px-4 py-3 rounded-xl bg-surface-subtle">
                <p className="text-sm text-ink/80 whitespace-pre-line">{session.idea}</p>
              </div>
            </>
          )}

          <SectionHeading>{t('plans.detail.tickets')}</SectionHeading>
          {detail.tickets.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-secondary bg-surface-subtle rounded-xl">
              {t('plans.detail.noTickets')}
            </p>
          ) : (
            <TicketTree
              groups={groupPlanTickets(detail.tickets)}
              configKey={repoConfigKey}
              states={ticketStates}
            />
          )}

          {/* The plan's external links — Figma, Notion, a Claude artifact — under its tickets
              and in their shape. Rows of their own, never part of the spec below. */}
          <PlanLinks
            sessionId={session.id}
            ownerId={session.ownerId}
            viewerId={viewerId}
            heading={(title) => <SectionHeading>{title}</SectionHeading>}
          />

          {/* The heading, with the autosave's state on its right: the one sign that the text
              takes a caret, and then where the writing is. Quiet on purpose — the document
              is the editor, and a status louder than a caption would read as a toolbar. */}
          <div className="flex items-end justify-between gap-3">
            <SectionHeading>{t('plans.detail.spec')}</SectionHeading>
            {editStatus && (
              <Text size="xs" tone="secondary" className="mb-3 opacity-60">{editStatus}</Text>
            )}
          </div>
          {/* Above the document, where the eye is when a save comes back: each is a fact about
              the save just attempted, and the text is still below it. */}
          {editError === 'conflict' && (
            <Banner
              variant="danger"
              bordered
              className="mb-3"
              hint={t('plans.edit.conflictHint')}
              actions={[{ label: t('plans.edit.reload'), icon: RotateCcw, onClick: reloadAfterConflict, primary: true }]}
            >
              {t('plans.edit.conflict')}
            </Banner>
          )}
          {editError === 'denied' && (
            <Banner variant="danger" bordered className="mb-3">{t('plans.edit.denied')}</Banner>
          )}
          {editError === 'failed' && (
            <Banner
              variant="danger"
              bordered
              className="mb-3"
              actions={[{ label: t('common.retry'), icon: RotateCcw, onClick: () => { void save() }, primary: true }]}
            >
              {t('plans.edit.failed')}
            </Banner>
          )}
          {fileNotice && (
            <Banner variant="warning" bordered className="mb-3">
              {t(fileNotice === 'diverged' ? 'plans.edit.fileDiverged' : 'plans.edit.fileError')}
            </Banner>
          )}
          {/* FOUR STATES, each said out loud, because a blank panel is what this page
              was built to stop being:
                · the markdown, rendered;
                · the markdown AND the oversize flag, which is a spec that synced while
                  it was small enough and has since grown past the ceiling;
                · too large to sync and nothing stored, a finished document on somebody
                  else's disk that will never arrive on its own;
                · not written yet, which is the ordinary first minutes of a session and
                  really will fill in.
              THE FLAG ALONE DOES NOT DECIDE, and that is the whole of this branching.
              `specFields` sends `specOversize: true` and NOTHING ELSE for an oversize
              read, and `CloudStore.planSessionRow` omits rather than nulls, so the last
              good markdown and the `spec_synced_at` beside it both survive in the row. A
              flag-first test would therefore hide a document the page is holding and call
              it "never uploaded", directly under a header still reading "Spec updated
              <date>". So the markdown wins when there is any, and the flag downgrades it
              to a stale copy instead of suppressing it; only a row with no markdown at all
              gets the "never uploaded" wording, which is the one place it is true. */}
          <div className="px-6 py-5 rounded-xl bg-surface">
            {spec ? (
              <>
                {session.specOversize && (
                  /* ABOVE the markdown, not below it: a caveat placed after a long
                     document is read once the stale content it warns about already has
                     been. */
                  <p className="mb-4 flex items-start gap-2 text-sm text-text-secondary">
                    <FileWarning className="w-4 h-4 shrink-0 mt-0.5 text-yellow" />
                    {t('plans.detail.specOversizeStale')}
                  </p>
                )}
                {/* THE DOCUMENT IS THE EDITOR: a click on a block puts a caret in it. `doc` is
                    what is on screen whenever the page holds one — the row's markdown plus
                    what has been written since — and the row's own until it does. */}
                <EditableLinesProvider value={editing}>
                  <SpecBody content={doc?.trim() ? doc : spec} comments={specComments} editable={editable} />
                </EditableLinesProvider>
                {/* The comments did not load. Said out loud rather than swallowed: the spec
                    is readable either way, but a page that silently drew no comments over a
                    failed read would be telling the reader their colleagues said nothing. */}
                {comments.read?.failed && (
                  <p className="mt-4 flex items-start gap-2 text-sm text-text-secondary">
                    <CloudOff className="w-4 h-4 shrink-0 mt-0.5" />
                    {t('plans.comments.failed')}
                  </p>
                )}
                {/* The read succeeded and is INCOMPLETE, which is a different sentence and
                    therefore a different line: the comments above are all real, there are
                    simply more of them than the cap brings back. Said for the reason the
                    failure above is said — a reader who has just written a comment on a
                    very long thread would otherwise watch it not appear, and conclude the
                    write was lost rather than that the list is capped. */}
                {comments.read?.truncated && (
                  <p className="mt-4 flex items-start gap-2 text-sm text-text-secondary">
                    <FileWarning className="w-4 h-4 shrink-0 mt-0.5" />
                    {t('plans.comments.truncated')}
                  </p>
                )}
              </>
            ) : session.specOversize ? (
              <p className="flex items-start gap-2 text-sm text-text-secondary">
                <FileWarning className="w-4 h-4 shrink-0 mt-0.5 text-yellow" />
                {t('plans.detail.specOversize')}
              </p>
            ) : (
              <p className="text-sm text-text-secondary">{t('plans.detail.specPending')}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
