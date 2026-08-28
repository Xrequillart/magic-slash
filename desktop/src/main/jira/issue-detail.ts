import type { JiraTaskIssueDetail, TicketComment } from '../../types'
import { readLabels, readPerson, readPriority, readReporter, readStatus } from './sprint-issues'

/**
 * Everything the ONE-TICKET read decides, with nothing it needs a machine for.
 *
 * PURE in `sprint-issues.ts`'s sense and for its reasons: no `electron`, no
 * filesystem, no ambient `fetch`, and no import of `connect.ts`. So the whole of
 * what this module actually does — turning Atlassian Document Format into the
 * markdown the panel renders — is exercised by `issue-detail.test.ts` without a
 * single mock. What it imports from `sprint-issues.ts` — `readStatus`, `readPerson`,
 * `readReporter`, `readLabels` — is pure on the same terms: a shared vocabulary for
 * Jira's own values, not a dependency on the sprint read. Shared rather than copied
 * because the panel is opened FROM a row, so any question the two answer differently
 * shows up as a ticket changing its mind on being opened.
 *
 * It answers two questions and no others. WHAT TO ASK: `DETAIL_FIELDS`, the half
 * of a ticket the sprint read deliberately leaves behind. WHAT CAME BACK:
 * `mapIssueDetail`, which fills every hole with an empty value rather than letting
 * `undefined` reach the renderer.
 *
 * WHY IT FAILED is NOT here. `classify` and `classifyUnexpected` already live in
 * `sprint-issues.ts` and the handler imports them from there: the failure ladder is
 * the same one, and re-exporting it through this module would be indirection with
 * nothing on the other side of it.
 */

/**
 * The fields the detail read asks for, and the reason each is there.
 *
 * The complement of `SPRINT_FIELDS`, not a superset of it: `summary` and `created`
 * came with the row and the panel still holds them, so asking again would only
 * create a second copy that could disagree.
 *
 * `status` IS asked for again, on purpose. It came with the row too, but this read
 * happens when someone opens a ticket that may have been listed minutes ago — and
 * a ticket transitioned in the meantime must not go on showing the word the list
 * captured (the same rule `TaskIssueDetail.state` follows next door). `priority` is
 * asked for again for exactly that reason: it is the other field on this ticket a
 * human moves between the list read and the click.
 *
 * `comment` is the one field here whose weight is worth naming. It brings the whole
 * conversation back in the response the panel already makes — one round trip rather
 * than the two a `/issue/{key}/comment` call would cost — and it is asked for only
 * when somebody opens a ticket, never on the list read. Jira pages it on its own
 * terms and reports a `total`, which is why `mapComments` carries that number out
 * rather than letting the panel present a page as the whole thread.
 *
 * `reporter` and `labels` came with the row as of this story and are STILL asked
 * for, for `status`' reason: this read happens later, and a ticket relabelled or
 * reassigned in the meantime must not go on showing what the list captured.
 *
 * Nothing else. No `issuetype`, no story points: every field named here is one more
 * the read pays for.
 */
export const DETAIL_FIELDS = ['description', 'status', 'priority', 'assignee', 'reporter', 'creator', 'labels', 'comment']

/** The shape of an ADF node, as far as anything here needs to know. */
interface AdfNode {
  type?: unknown
  content?: unknown
  text?: unknown
  marks?: unknown
  attrs?: unknown
}

function asNode(value: unknown): AdfNode {
  return value && typeof value === 'object' ? (value as AdfNode) : {}
}

function children(node: AdfNode): unknown[] {
  return Array.isArray(node.content) ? node.content : []
}

function attrs(node: AdfNode): Record<string, unknown> {
  return node.attrs && typeof node.attrs === 'object' ? (node.attrs as Record<string, unknown>) : {}
}

function typeOf(node: AdfNode): string {
  return typeof node.type === 'string' ? node.type : ''
}

/**
 * ADF's inline nodes — the closed set the format defines, and the ONLY thing this
 * list decides.
 *
 * It picks a SEPARATOR, never what is kept: a run of children that are all inline
 * is joined with nothing (`text` + `mention` + `text` is one sentence), anything
 * else is joined with a blank line. An unknown type therefore reads as a block,
 * which is the safe direction to be wrong in — a spurious blank line, never two
 * words run together.
 */
const INLINE_TYPES = new Set([
  'text', 'hardBreak', 'mention', 'emoji', 'date', 'status', 'inlineCard', 'placeholder',
  'inlineExtension', 'mediaInline',
])

/**
 * A run of children, as one string.
 *
 * The block/inline decision is made once, here, from what the children ARE rather
 * than from what their parent is — which is what lets an unknown wrapper (`expand`,
 * a layout column, a table cell) be walked into without this module knowing it exists.
 */
function renderContent(nodes: unknown[]): string {
  if (nodes.length === 0) return ''
  const inline = nodes.every((child) => INLINE_TYPES.has(typeOf(asNode(child))))
  return inline ? renderInlineRun(nodes) : renderBlocks(nodes)
}

function renderBlocks(nodes: unknown[]): string {
  return nodes
    .map((node) => renderBlock(asNode(node)))
    .filter((block) => block !== '')
    .join('\n\n')
}

function renderInlineRun(nodes: unknown[]): string {
  return nodes.map((node) => renderInline(asNode(node))).join('')
}

/** The text of a run with every mark stripped — what a code block holds. */
function plainText(nodes: unknown[]): string {
  return nodes.map((node) => {
    const child = asNode(node)
    if (typeof child.text === 'string') return child.text
    const nested = children(child)
    return nested.length > 0 ? plainText(nested) : ''
  }).join('')
}

/**
 * A node type this module has never heard of — the point of the whole converter
 * (see `adfToMarkdown`).
 *
 * It recurses into its content when it has any, and otherwise gives up its `text`
 * or its `url` — which is the ONLY thing a `mention`, an `inlineCard`, an `emoji`
 * or a `status` carries. Returning `''` instead would silently delete the person
 * somebody was assigned to, or the link the whole paragraph was about.
 *
 * ONE function, called from both `renderInline`'s default arm and `renderBlock`'s,
 * because it is one rule: written out twice, a later edit could fix the block half
 * and leave the inline half dropping content.
 */
function renderUnknown(node: AdfNode): string {
  const nested = children(node)
  return nested.length > 0 ? renderContent(nested) : leafText(node)
}

/** One inline node. Its default arm is `renderUnknown`, for that function's reason. */
function renderInline(node: AdfNode): string {
  switch (typeOf(node)) {
    case 'text':
      return applyMarks(typeof node.text === 'string' ? node.text : '', node.marks)
    // Two trailing spaces, which is markdown's own line break inside a paragraph:
    // `remarkGfm` does not turn a bare newline into one.
    case 'hardBreak':
      return '  \n'
    default:
      return renderUnknown(node)
  }
}

/**
 * A `code` mark, with a delimiter long enough to survive its own contents.
 *
 * The same rule `renderCodeBlock` applies to fences, and for the same reason: a
 * single backtick around text that itself contains one closes the span early, so
 * `` foo`bar `` would render as the code `foo` followed by stray prose. The
 * delimiter therefore grows past the longest run inside it. The padding space is
 * markdown's own escape for a span that starts or ends on a backtick — a reader
 * strips one leading and one trailing space, so it never reaches the screen.
 */
function inlineCode(text: string): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((run) => run[0].length))
  const fence = '`'.repeat(longest + 1)
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : ''
  return `${fence}${pad}${text}${pad}${fence}`
}

/** Whatever an attribute-only leaf has to say for itself. */
function leafText(node: AdfNode): string {
  const { text, url } = attrs(node)
  if (typeof text === 'string' && text !== '') return text
  if (typeof url === 'string' && url !== '') return url
  return ''
}

/**
 * A text node's marks, applied innermost first.
 *
 * `code` goes on first so the emphasis around it is not swallowed by the backticks,
 * and `link` goes on last so the whole styled run is what the link wraps — which is
 * the order the markdown these produce has to nest in.
 */
function applyMarks(text: string, marks: unknown): string {
  if (text === '' || !Array.isArray(marks)) return text
  const types = new Set(marks.map((mark) => typeOf(asNode(mark))))
  let out = text
  if (types.has('code')) out = inlineCode(out)
  if (types.has('strong')) out = `**${out}**`
  if (types.has('em')) out = `*${out}*`
  if (types.has('strike')) out = `~~${out}~~`
  const link = marks.find((mark) => typeOf(asNode(mark)) === 'link')
  if (link) {
    const href = attrs(asNode(link)).href
    if (typeof href === 'string' && href !== '') out = `[${out}](${href})`
  }
  return out
}

/** One block node. Its default arm is `renderUnknown`, the same one `renderInline` ends on. */
function renderBlock(node: AdfNode): string {
  const kids = children(node)
  switch (typeOf(node)) {
    case 'doc':
      return renderBlocks(kids)
    case 'paragraph':
      return renderInlineRun(kids)
    case 'heading': {
      const level = attrs(node).level
      const depth = typeof level === 'number' && level >= 1 && level <= 6 ? Math.trunc(level) : 1
      const body = renderInlineRun(kids)
      return body === '' ? '' : `${'#'.repeat(depth)} ${body}`
    }
    case 'codeBlock':
      return renderCodeBlock(node)
    case 'rule':
      return '---'
    case 'bulletList':
      return renderList(kids, null)
    case 'orderedList': {
      const order = attrs(node).order
      return renderList(kids, typeof order === 'number' && Number.isInteger(order) ? order : 1)
    }
    case 'listItem':
      return renderBlocks(kids)
    case 'table':
      return renderTable(node)
    case 'taskList':
      return renderTaskList(kids)
    // A quote and a panel are the same shape in markdown, and the panel is the one
    // that matters: Jira's "info"/"warning"/"note" boxes are how a description says
    // "read this bit first", and walked into as an unknown wrapper they came out as
    // an ordinary paragraph indistinguishable from the prose around it.
    case 'blockquote':
    case 'panel':
      return renderQuote(kids)
    default:
      return renderUnknown(node)
  }
}

/**
 * A quote, or one of Jira's panels — every line prefixed, blank lines included.
 *
 * The blank line between two blocks has to carry the marker too, or markdown ends
 * the quote there and the second paragraph falls out of the box.
 */
function renderQuote(nodes: unknown[]): string {
  const body = renderBlocks(nodes)
  if (body === '') return ''
  return body.split('\n').map((line) => (line === '' ? '>' : `> ${line}`)).join('\n')
}

/**
 * A checklist, as markdown's own task list.
 *
 * Not `renderList`: the marker carries the state, and an ADF `taskItem` reports it
 * as `attrs.state` — walked into as an unknown wrapper the whole list came out as
 * unmarked paragraphs, which reads as prose rather than as work with a tick against
 * half of it.
 */
function renderTaskList(items: unknown[]): string {
  return items
    .map((entry) => {
      const item = asNode(entry)
      if (typeOf(item) !== 'taskItem') return renderBlock(item)
      const body = renderContent(children(item))
      if (body === '') return ''
      const done = attrs(item).state === 'DONE'
      const pad = '      '
      return body
        .split('\n')
        .map((line, i) => (i === 0 ? `- [${done ? 'x' : ' '}] ${line}` : line === '' ? '' : `${pad}${line}`))
        .join('\n')
    })
    .filter((item) => item !== '')
    .join('\n')
}

/**
 * ONE CELL, flattened to a single line — which is the constraint the whole table
 * renderer is built around.
 *
 * A GFM row is delimited by newlines, so a cell cannot contain one: a cell holding
 * two paragraphs is joined with a space, and a `|` inside the text is escaped or it
 * would open a column of its own. `<br>` is not an option — `MarkdownView` renders
 * without `rehype-raw`, so raw HTML in a cell reaches the screen as nothing at all.
 *
 * `colspan` is carried out rather than applied: markdown has no merged cells, so the
 * caller pads with empty ones instead, which keeps every later column under the
 * heading it belongs to.
 */
function renderCell(node: AdfNode): { text: string; span: number } {
  const span = attrs(node).colspan
  return {
    text: renderContent(children(node)).replace(/\s*\n+\s*/g, ' ').replace(/\|/g, '\\|').trim(),
    span: typeof span === 'number' && Number.isInteger(span) && span > 1 ? span : 1,
  }
}

/**
 * A table, as a GFM table — the one ADF block whose absence was not quiet.
 *
 * Every other unknown wrapper degrades into readable prose (see `adfToMarkdown`); a
 * table degrades into its cells one under another, with no hint that they were ever
 * a grid. A ticket whose acceptance criteria are a table came out as a wall of
 * fragments, which is what this exists to fix.
 *
 * WIDTH IS FIXED BY THE WIDEST ROW, and every shorter row is padded. GFM aligns
 * columns by position, so a row with fewer cells than the header silently shifts
 * everything after it one column left.
 *
 * THE HEADER is the first row only when it really is one — a row of `tableHeader`
 * cells. GFM has no headerless table, so a table that starts with data gets an empty
 * header band rather than having its first line of content promoted to a heading it
 * never was.
 */
function renderTable(node: AdfNode): string {
  const rows = children(node)
    .map((row) => asNode(row))
    .filter((row) => typeOf(row) === 'tableRow')
    .map((row) => children(row).flatMap((cell) => {
      const item = asNode(cell)
      const { text, span } = renderCell(item)
      return [
        { text, header: typeOf(item) === 'tableHeader' },
        // The columns a merged cell swallowed, so the rows below stay aligned.
        ...Array.from({ length: span - 1 }, () => ({ text: '', header: typeOf(item) === 'tableHeader' })),
      ]
    }))
    .filter((row) => row.length > 0)

  if (rows.length === 0) return ''

  const width = Math.max(...rows.map((row) => row.length))
  const line = (cells: { text: string }[]): string =>
    `| ${Array.from({ length: width }, (_, i) => cells[i]?.text ?? '').join(' | ')} |`

  const headed = rows[0].every((cell) => cell.header)
  const body = headed ? rows.slice(1) : rows
  const head = headed ? rows[0] : []

  return [
    line(head),
    `|${' --- |'.repeat(width)}`,
    ...body.map(line),
  ].join('\n')
}

/**
 * A fenced block, with a fence long enough to survive its own contents.
 *
 * Three backticks are the usual fence and are wrong for the one thing a Jira
 * description routinely holds: a snippet that itself contains a markdown fence.
 * The fence therefore grows past the longest run inside it.
 */
function renderCodeBlock(node: AdfNode): string {
  const code = plainText(children(node))
  const language = attrs(node).language
  const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map((run) => run[0].length))
  const fence = '`'.repeat(Math.max(3, longest + 1))
  return `${fence}${typeof language === 'string' ? language : ''}\n${code}\n${fence}`
}

/**
 * A list, with every line of a multi-block item indented under its own marker.
 *
 * The continuation indent is what keeps a nested list nested and a second paragraph
 * inside the item rather than after it; blank lines are left blank rather than
 * padded, so the markdown carries no trailing whitespace.
 */
function renderList(items: unknown[], start: number | null): string {
  let index = start ?? 0
  return items
    .map((item) => {
      const body = renderBlock(asNode(item))
      if (body === '') return ''
      const marker = start === null ? '- ' : `${index++}. `
      const pad = ' '.repeat(marker.length)
      return body
        .split('\n')
        .map((line, i) => (i === 0 ? `${marker}${line}` : line === '' ? '' : `${pad}${line}`))
        .join('\n')
    })
    .filter((item) => item !== '')
    .join('\n')
}

/**
 * A Jira description as markdown.
 *
 * ─── The rule this converter exists to enforce ──────────────────────────────────
 * A node type it does not know about RECURSES into its content, and gives up its
 * `attrs.text` or `attrs.url` when it has none. Never `''`.
 *
 * That is not defensive coding, it is the difference between a description and a
 * wrong description. ADF is an open format with node types this app has never seen:
 * dropping an unknown WRAPPER (`expand`, a layout column, a nested table) discards
 * its entire subtree, so a description written as one panel comes
 * out blank — and the panel says "no description" about a ticket that has one.
 * Dropping an unknown LEAF is quieter and worse: `mention`, `inlineCard`,
 * `blockCard`, `emoji`, `status`, `taskItem` and `mediaSingle` carry no `text`
 * child at all, so the sentence still renders, with the person, the link or the
 * decision silently missing from the middle of it.
 *
 * A string rather than ADF is passed through untouched: `/rest/api/3` answers with
 * ADF, but a site behind an older renderer answering wiki markup is content we can
 * show as-is, and refusing it would be losing it.
 */
export function adfToMarkdown(description: unknown): string {
  if (typeof description === 'string') return description.trim()
  if (!description || typeof description !== 'object') return ''
  return renderBlock(asNode(description)).trim()
}

/**
 * The comments on a ticket, plus how many there really are.
 *
 * Jira answers `fields.comment` as a PAGE — `{ comments, total, maxResults, startAt }`
 * — and picks the size itself. So the count is carried out beside the array and the
 * panel says "showing the first N" when they disagree; rendering the page as if it
 * were the thread is the one outcome that is actually wrong, because a reader who
 * scrolls to the bottom of a truncated conversation believes they have read it.
 *
 * `total` is only reported when it EXCEEDS what came back. Equal is the common case
 * and needs no sentence, and a `total` smaller than the array is a Jira answering
 * something impossible — trusting it there would produce "showing the first 20 of
 * 3", so the array wins.
 *
 * Every comment is kept, including one whose body is empty and one Jira attributes
 * to nobody: a comment that exists is part of the conversation, and dropping it
 * would leave the reader with a thread that silently skips a turn.
 */
function mapComments(raw: unknown): { comments: TicketComment[]; commentTotal?: number } {
  const page = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const entries = Array.isArray(page.comments) ? page.comments : []

  const comments = entries.map((entry, index): TicketComment => {
    const comment = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {}
    const created = typeof comment.created === 'string' ? comment.created : ''
    const updated = typeof comment.updated === 'string' ? comment.updated : ''
    return {
      // The index is the fallback so the React key stays unique within the thread:
      // an id Jira omitted is not a reason for two comments to collide into one row.
      id: typeof comment.id === 'string' && comment.id !== '' ? comment.id : `comment-${index}`,
      author: readPerson(comment.author),
      createdAt: created,
      // Carried only when it says something the created date does not. Jira sets
      // `updated` to `created` on a comment nobody has touched, so passing it
      // through unconditionally would mark every comment in the thread as edited.
      ...(updated && updated !== created ? { updatedAt: updated } : {}),
      body: adfToMarkdown(comment.body),
    }
  })

  const total = page.total
  const known = typeof total === 'number' && Number.isFinite(total) ? Math.trunc(total) : 0

  return {
    comments,
    ...(known > comments.length ? { commentTotal: known } : {}),
  }
}

/**
 * One Jira issue as the detail panel reads it.
 *
 * A MAPPER, not a validator, in `mapIssue`'s sense: nothing here can fail, because
 * the panel was opened on a row that already exists and every field it wants
 * degrades to an empty one. A ticket with no description shows the empty-body line,
 * one with no assignee shows "none" — neither is a reason to report a failed read.
 *
 * `assignee` and `reporter` are OMITTED rather than set to `''` when Jira reports
 * nobody: the field is optional in the type, and an empty string would be a person
 * whose name is blank. `priority` is omitted on the same rule, decided inside
 * `readPriority` — a project with the field switched off has no priority, which is
 * not the same thing as a low one.
 */
export function mapIssueDetail(raw: unknown): JiraTaskIssueDetail {
  const issue = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const fields = issue.fields && typeof issue.fields === 'object'
    ? (issue.fields as Record<string, unknown>)
    : {}

  const status = readStatus(fields.status)
  const priority = readPriority(fields.priority)
  const assignee = readPerson(fields.assignee)
  // The same `reporter` or `creator` choice the row made, through the same function:
  // the panel showing a different name from the row it was opened from would read as
  // two different tickets.
  const reporter = readReporter(fields)

  return {
    description: adfToMarkdown(fields.description),
    ...(assignee ? { assignee } : {}),
    ...(reporter ? { reporter } : {}),
    labels: readLabels(fields.labels),
    statusName: status.name,
    statusCategory: status.category,
    // Absent, not "None": see `readPriority`. The panel's own block says so in a
    // word the reader can tell apart from a priority actually called "None".
    ...(priority ? { priority } : {}),
    ...mapComments(fields.comment),
  }
}
