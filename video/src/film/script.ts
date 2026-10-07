import type { ChatDiffData, ChatViewEntry } from '@ds/desktop'
import { at, streamed } from './timeline'

/**
 * WHAT IS SAID IN THE CHAT, AND WHEN. Each beat has the frame it appears on; a tool
 * runs until `done`, an assistant message streams in from its frame. The entries the
 * chat shows at any frame are read off this list, so the film never holds state.
 */
type Beat =
  | { kind: 'user'; at: number; text: string }
  | { kind: 'assistant'; at: number; text: string; cps?: number }
  | { kind: 'tool'; at: number; done: number; name: string; summary: string; diff?: ChatDiffData }

const PDF_DIFF: ChatDiffData = {
  path: 'src/billing/pdf.ts',
  added: 9,
  removed: 1,
  hunks: [
    {
      oldStart: 1,
      newStart: 1,
      lines: [
        "-import { formatInvoice } from './format'",
        "+import { renderToBuffer } from '@react-pdf/renderer'",
        "+import { InvoiceDocument } from './InvoiceDocument'",
        "+import type { Invoice } from './types'",
        '+',
        '+export async function invoiceToPdf(invoice: Invoice): Promise<Buffer> {',
        '+  const doc = InvoiceDocument({ invoice, locale: invoice.locale })',
        '+  return renderToBuffer(doc)',
        '+}',
      ],
    },
  ],
}

const ROUTE_DIFF: ChatDiffData = {
  path: 'src/api/invoices.ts',
  added: 6,
  removed: 0,
  hunks: [
    {
      oldStart: 42,
      newStart: 42,
      lines: [
        " router.get('/invoices/:id', getInvoice)",
        '+',
        "+router.get('/invoices/:id/pdf', async (req, res) => {",
        '+  const invoice = await findInvoice(req.params.id, req.user)',
        '+  const pdf = await invoiceToPdf(invoice)',
        "+  res.type('application/pdf').attachment(`${invoice.number}.pdf`).send(pdf)",
        '+})',
      ],
    },
  ],
}

const FIX_DIFF: ChatDiffData = {
  path: 'src/api/invoices.ts',
  added: 2,
  removed: 1,
  hunks: [
    {
      oldStart: 44,
      newStart: 44,
      lines: [
        " router.get('/invoices/:id/pdf', async (req, res) => {",
        '-  const invoice = await findInvoice(req.params.id, req.user)',
        '+  const invoice = await findInvoice(req.params.id, req.user)',
        "+  if (!invoice) return res.sendStatus(404)",
        '   const pdf = await invoiceToPdf(invoice)',
      ],
    },
  ],
}

export const IDEA = 'Let customers download their invoices as PDF'

/** When the idea is typed into the composer, and when it is sent. */
export const DRAFT = { from: at('plan', 74), sent: at('plan', 122) }

/** The planner's session: `/magic:plan`, the spec, then the tickets it files. */
const PLANNER: Beat[] = [
  { kind: 'user', at: DRAFT.sent, text: `/magic:plan ${IDEA}` },
  { kind: 'tool', at: at('plan', 132), done: at('plan', 148), name: 'Read', summary: 'src/billing/invoice.ts' },
  { kind: 'tool', at: at('plan', 144), done: at('plan', 162), name: 'Grep', summary: '"invoice" in src/api' },
  { kind: 'assistant', at: at('plan', 166), text: 'Clear. I wrote the spec on the right: one export endpoint, a PDF template per locale, and a download button on the invoice page. Review it before I file anything.' },
  { kind: 'tool', at: at('plan', 210), done: at('plan', 358), name: 'Write', summary: '.magic/spec-invoice-pdf.md' },
  { kind: 'assistant', at: at('plan', 364), text: 'Spec ready: **one epic, four stories**. Shall I file them in Jira?' },
  { kind: 'user', at: at('tickets', 40), text: 'Yes, file them' },
  { kind: 'tool', at: at('tickets', 50), done: at('tickets', 70), name: 'Jira', summary: 'Create epic PAY-310 · Invoice PDF export' },
  { kind: 'tool', at: at('tickets', 66), done: at('tickets', 86), name: 'Jira', summary: 'Create story PAY-311 · PDF template per locale' },
  { kind: 'tool', at: at('tickets', 82), done: at('tickets', 102), name: 'Jira', summary: 'Create story PAY-312 · Export endpoint' },
  { kind: 'tool', at: at('tickets', 98), done: at('tickets', 118), name: 'Jira', summary: 'Create story PAY-313 · Download button' },
  { kind: 'tool', at: at('tickets', 114), done: at('tickets', 134), name: 'Jira', summary: 'Create story PAY-314 · Audit log entry' },
  { kind: 'assistant', at: at('tickets', 140), text: 'Filed **PAY-310** and its four stories. They are on your board.' },
]

const PLAN_BANNER = `On it. Here is how I will do PAY-312.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Implementation plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. \`invoiceToPdf()\` in \`src/billing/pdf.ts\`
2. \`GET /invoices/:id/pdf\`, scoped to the invoice owner
3. Tests for both

## Risks
- ⚠️ Large invoices: stream the buffer, never hold it twice`

/** The coder's session: `/magic:start` on PAY-312 through to `/magic:done`. */
const CODER: Beat[] = [
  { kind: 'user', at: at('start', 144), text: '/magic:start PAY-312' },
  { kind: 'tool', at: at('start', 159), done: at('start', 180), name: 'Jira', summary: 'Read PAY-312 · Export endpoint' },
  { kind: 'tool', at: at('start', 177), done: at('start', 210), name: 'Bash', summary: 'git worktree add -b feature/PAY-312-invoice-pdf' },
  { kind: 'assistant', at: at('start', 219), text: PLAN_BANNER, cps: 100 },
  { kind: 'tool', at: at('start', 291), done: at('start', 324), name: 'Edit', summary: 'src/billing/pdf.ts', diff: PDF_DIFF },
  { kind: 'tool', at: at('start', 333), done: at('start', 366), name: 'Edit', summary: 'src/api/invoices.ts', diff: ROUTE_DIFF },
  { kind: 'tool', at: at('start', 375), done: at('start', 414), name: 'Bash', summary: 'npm test' },
  { kind: 'assistant', at: at('start', 420), text: 'Done. **42 tests pass**, two of them new.' },

  { kind: 'user', at: at('commit', 48), text: '/magic:commit' },
  { kind: 'tool', at: at('commit', 58), done: at('commit', 80), name: 'Bash', summary: 'git commit -m "feat(billing): render invoices as PDF"' },
  { kind: 'tool', at: at('commit', 84), done: at('commit', 106), name: 'Bash', summary: 'git commit -m "feat(api): add GET /invoices/:id/pdf"' },
  { kind: 'assistant', at: at('commit', 112), text: 'Two atomic commits on `feature/PAY-312-invoice-pdf`.' },

  // No command typed from here: the repository's workflow chains each step into the next.
  { kind: 'assistant', at: at('ship', 46), text: 'Committed. Your workflow runs **Security check** next.' },
  { kind: 'tool', at: at('ship', 60), done: at('ship', 100), name: 'Skill', summary: 'security-check · 2 files, no finding' },
  { kind: 'assistant', at: at('ship', 104), text: 'All clear. Opening the PR.' },
  { kind: 'tool', at: at('ship', 114), done: at('ship', 130), name: 'Bash', summary: 'git push -u origin feature/PAY-312-invoice-pdf' },
  { kind: 'tool', at: at('ship', 128), done: at('ship', 150), name: 'Bash', summary: 'gh pr create · feat(billing): download invoices as PDF' },
  { kind: 'tool', at: at('ship', 148), done: at('ship', 166), name: 'Jira', summary: 'PAY-312 → In review, PR linked' },
  { kind: 'tool', at: at('ship', 170), done: at('ship', 192), name: 'Slack', summary: '#dev · PR #128 is ready for review' },
  { kind: 'assistant', at: at('ship', 198), text: 'PR **#128** is open, PAY-312 is in review, and **#dev** knows.' },

  { kind: 'user', at: at('resolve', 156), text: '/magic:resolve' },
  { kind: 'tool', at: at('resolve', 166), done: at('resolve', 186), name: 'GitHub', summary: 'Read 2 review threads on PR #128' },
  { kind: 'assistant', at: at('resolve', 192), text: '**invoices.ts:44**: right, a stranger’s invoice gets a 404. Fixing it.' },
  { kind: 'tool', at: at('resolve', 214), done: at('resolve', 238), name: 'Edit', summary: 'src/api/invoices.ts', diff: FIX_DIFF },
  { kind: 'assistant', at: at('resolve', 244), text: '**pdf.ts:7**: the PDF is rendered on demand, a cache is out of the ticket’s scope. I’ll say so on the thread.' },
  { kind: 'tool', at: at('resolve', 270), done: at('resolve', 290), name: 'Bash', summary: 'npm test' },
  { kind: 'tool', at: at('resolve', 290), done: at('resolve', 310), name: 'Bash', summary: 'git commit -m "fix(api): 404 when the invoice is not the caller’s" && git push' },
  { kind: 'tool', at: at('resolve', 312), done: at('resolve', 332), name: 'GitHub', summary: 'Replied to 2 threads, review requested from @marie' },
  { kind: 'assistant', at: at('resolve', 338), text: 'Both threads answered and the fix pushed. Review requested again from **@marie**.' },

  { kind: 'assistant', at: at('close', 84), text: 'PR **#128** was merged into `main`. Run `/magic:done` to wrap up.' },
  { kind: 'user', at: at('close', 130), text: '/magic:done' },
  { kind: 'tool', at: at('close', 140), done: at('close', 156), name: 'Jira', summary: 'PAY-312 → Done' },
  { kind: 'tool', at: at('close', 154), done: at('close', 172), name: 'Bash', summary: 'git worktree remove ../magic-pay-PAY-312' },
  { kind: 'assistant', at: at('close', 178), text: 'PAY-312 is **Done**. Branch and worktree cleaned up. 🎉' },
]

/** The frame each part of the coder's session starts on: earlier turns scroll away. */
const CODER_PAGES = [at('start'), at('ship'), at('resolve', 150), at('close', 84)]

function entriesOf(beats: Beat[], frame: number, from: number): ChatViewEntry[] {
  return beats
    .filter((b) => b.at <= frame && b.at >= from)
    .map((b, i): ChatViewEntry => {
      const id = `${b.kind}-${b.at}-${i}`
      if (b.kind === 'user') return { kind: 'user', id, text: b.text }
      if (b.kind === 'assistant') return { kind: 'assistant', id, text: streamed(b.text, frame, b.at, b.cps ?? 70) }
      return {
        kind: 'tool',
        id,
        name: b.name,
        summary: b.summary,
        status: frame >= b.done ? 'done' : 'running',
        ...(b.diff && frame >= b.done ? { diff: b.diff } : {}),
      }
    })
    // A message whose first word has not landed yet is not on screen yet.
    .filter((e) => e.kind !== 'assistant' || e.text.length > 0)
}

/** Whether Claude is mid-turn: a user beat has been answered by nothing final yet. */
function workingOf(beats: Beat[], frame: number) {
  const past = beats.filter((b) => b.at <= frame)
  const last = past[past.length - 1]
  if (!last) return false
  if (last.kind === 'user') return true
  if (last.kind === 'tool') return true
  // An assistant message is final once it has finished streaming.
  return streamed(last.text, frame, last.at, last.cps ?? 70).length < last.text.length
}

export function plannerChat(frame: number) {
  // From the tickets onward the spec turns scroll away, as they would.
  const from = frame >= at('tickets', 40) ? at('plan', 364) : 0
  return { entries: entriesOf(PLANNER, frame, from), working: workingOf(PLANNER, frame) }
}

export function coderChat(frame: number) {
  const from = [...CODER_PAGES].reverse().find((p) => frame >= p) ?? 0
  return { entries: entriesOf(CODER, frame, from), working: workingOf(CODER, frame) }
}
