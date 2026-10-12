import {
  CheckList,
  CollapsibleLine,
  PullRequestCard,
  ReviewThreadLine,
  SidebarAgentCoderInfo,
  SidebarAgentPlannerInfo,
  type CheckListEntry,
  type PullRequestState,
  type StatusTone,
} from '@ds/desktop'
import { CheckCircle2, Circle, Github, Loader2, MessagesSquare, Play, VSCode } from '@ds/desktop/icons'
// The spec card's body is the app's own Markdown renderer, as `specCard.tsx` hands it over.
import MarkdownView from '../../../desktop/src/renderer/components/file-preview/MarkdownView'
import { at, progress } from './timeline'

const noop = () => undefined
export const PANEL_WIDTH = 400

const FIELD = (value: string) => ({
  value,
  placeholder: value,
  editing: false,
  draft: value,
  onDraftChange: noop,
  onStartEditing: noop,
  onSave: noop,
  onCancel: noop,
})

const USAGE_LABELS = { context: 'Context', minimize: 'Fold', expand: 'Unfold' }

const SPEC = `## Problem
Customers email support for a PDF of every invoice. **31 tickets** last month.

## Solution
- \`GET /invoices/:id/pdf\` returns the invoice as a PDF
- One template per locale (FR, EN, DE)
- A **Download PDF** button on the invoice page

## Stories
1. PDF template per locale
2. Export endpoint
3. Download button
4. Audit log entry

## Out of scope
Bulk export, e-invoicing formats.`

/** The planner's panel: the spec it is writing, revealed line by line as the Write runs. */
export function PlannerPanel({ frame }: { frame: number }) {
  const lines = SPEC.split('\n')
  const shown = Math.round(progress(frame, at('plan', 214), at('plan', 356)) * lines.length)
  const filed = frame >= at('tickets', 140)
  return (
    <SidebarAgentPlannerInfo
      width={PANEL_WIDTH}
      usage={{
        contextPercent: 18,
        contextDetail: '180.4k / 1.00M tokens',
        model: 'Fable 5.1',
        cost: '$0.84',
        duration: '3m 12s',
        onMinimizedChange: noop,
        labels: USAGE_LABELS,
      }}
      spec={{
        repos: [{ name: 'magic-pay', color: '#3B82F6' }],
        emptyLabel: '.magic/spec-invoice-pdf.md',
        plan: { children: 'Plan #12', tone: 'magic-slash', title: 'Plan #12' },
        status: filed
          ? { label: 'Tickets created', tone: 'green' }
          : { label: 'Drafting', tone: 'yellow' },
        expand: { title: 'Open', onClick: noop },
        title: FIELD('Invoice PDF export'),
        className: 'film-spec',
        scrollToTopLabel: 'Back to top',
        children: <MarkdownView content={lines.slice(0, Math.max(1, shown)).join('\n')} />,
      }}
    />
  )
}

type Status = { label: string; tone: StatusTone }

const STATUSES: { at: number; status: Status }[] = [
  { at: 0, status: { label: 'In progress', tone: 'yellow' } },
  { at: at('commit', 106), status: { label: 'Committed', tone: 'cyan' } },
  { at: at('ship', 150), status: { label: 'PR created', tone: 'green' } },
  { at: at('ship', 228), status: { label: 'CI green', tone: 'accent' } },
  { at: at('resolve', 58), status: { label: 'Changes requested', tone: 'red' } },
  { at: at('resolve', 332), status: { label: 'Review addressed', tone: 'teal' } },
  { at: at('close', 40), status: { label: 'In review', tone: 'blue' } },
  { at: at('close', 80), status: { label: 'PR merged', tone: 'purple' } },
  { at: at('close', 156), status: { label: 'Done', tone: 'green' } },
]

const COMMITS = [
  { at: at('commit', 80), hash: 'e4b7a1c', subject: 'feat(billing): render invoices as PDF' },
  { at: at('commit', 106), hash: '9c02f6d', subject: 'feat(api): add GET /invoices/:id/pdf' },
  { at: at('resolve', 310), hash: '3f8e21b', subject: 'fix(api): 404 when the invoice is not the caller’s' },
]

const BRANCH = 'feature/PAY-312-invoice-pdf'

function checksAt(frame: number): CheckListEntry[] {
  const passed = (when: number) => (frame >= when ? 'passed' : 'running')
  const checks: CheckListEntry[] = [
    { name: 'lint', state: passed(at('ship', 200)) },
    { name: 'test', state: passed(at('ship', 215)) },
    { name: 'build', state: passed(at('ship', 228)) },
  ]
  return checks.map((c) => ({ ...c, stateLabel: c.state === 'passed' ? 'Passed' : 'Running' }))
}

/** The CI line as `PRWatchCard` draws it: a fold whose header says how far along it is. */
function ChecksLine({ frame }: { frame: number }) {
  const checks = checksAt(frame)
  const passed = checks.filter((c) => c.state === 'passed').length
  const running = passed < checks.length
  return (
    <CollapsibleLine
      icon={running ? Loader2 : CheckCircle2}
      tone={running ? 'blue' : 'green'}
      spin={running}
      label="CI checks"
      muted={!running}
      detail={<span className="text-[10px] tabular-nums text-text-secondary/60">{`${passed}/${checks.length} passed`}</span>}
      toggle={{ open: true, onToggle: noop }}
    >
      <CheckList checks={checks} />
    </CollapsibleLine>
  )
}

const THREADS = [
  { location: 'invoices.ts:44', answered: at('resolve', 332) },
  { location: 'pdf.ts:7', answered: at('resolve', 332) },
]

/** The review's threads as `PRWatchCard` lists them: who, where, and whether settled. */
function CommentsLine({ frame }: { frame: number }) {
  return (
    <CollapsibleLine
      icon={MessagesSquare}
      tone="blue"
      label="Comments"
      muted
      detail={<span className="text-[10px] tabular-nums text-text-secondary/60">{`${THREADS.length} comments`}</span>}
      toggle={{ open: true, onToggle: noop }}
    >
      <div className="space-y-1">
        {THREADS.map((t) => {
          const resolved = frame >= t.answered
          return (
            <ReviewThreadLine
              key={t.location}
              author="marie"
              badge={{ label: 'Changes requested', tone: 'red' }}
              location={t.location}
              replies={resolved ? '1 reply' : undefined}
              state={resolved
                ? { icon: CheckCircle2, label: 'Resolved', tone: 'green', strong: true }
                : { icon: Circle, label: 'open', tone: 'blue' }}
              age="2m"
              resolved={resolved}
              openLabel="Open the thread"
              onOpen={noop}
            />
          )
        })}
      </div>
    </CollapsibleLine>
  )
}

/** The coder's panel: ticket, branch, changes, commits, then the pull request. */
export function CoderPanel({ frame }: { frame: number }) {
  const status = [...STATUSES].reverse().find((s) => frame >= s.at)!.status
  const files = [
    ...(frame >= at('start', 324) ? [{ path: 'src/billing/pdf.ts', name: 'pdf.ts', additions: 9, deletions: 1 }] : []),
    ...(frame >= at('start', 366) ? [{ path: 'src/api/invoices.ts', name: 'invoices.ts', additions: 6, deletions: 0 }] : []),
  ].filter(() => frame < at('commit', 106))
  // The review's fix, uncommitted until /magic:resolve pushes it.
  if (frame >= at('resolve', 238) && frame < at('resolve', 310)) files.push({ path: 'src/api/invoices.ts', name: 'invoices.ts', additions: 2, deletions: 1 })
  const commits = COMMITS.filter((c) => frame >= c.at)
  const prState: PullRequestState = frame >= at('close', 80) ? 'merged' : 'open'
  const approved = frame >= at('close', 40)
  // From the review on, the comments are part of the card.
  const review = frame >= at('resolve', 58)

  return (
    <SidebarAgentCoderInfo
      width={PANEL_WIDTH}
      usage={{
        contextPercent: 34,
        contextDetail: '340.2k / 1.00M tokens',
        model: 'Fable 5.1',
        cost: '$2.41',
        duration: frame >= at('ship') ? '21m 04s' : '12m 37s',
        onMinimizedChange: noop,
        labels: USAGE_LABELS,
      }}
      ticket={{
        ticket: { children: 'PAY-312', tone: 'jira', title: 'PAY-312', onClick: noop },
        status: { ...status, options: [], onSelect: noop },
        title: FIELD('Export endpoint'),
        description: FIELD('GET /invoices/:id/pdf returns the invoice as a PDF, for its owner only.'),
        className: 'film-ticket',
      }}
      repositories={[
        {
          id: 'magic-pay',
          header: {
            name: 'magic-pay',
            color: '#3B82F6',
            scripts: { icon: Play, title: 'Scripts', groups: [], onSelect: noop },
            editor: { icon: VSCode, title: 'Open in VS Code', onClick: noop },
            remote: { icon: Github, title: 'Open on GitHub', onClick: noop },
            remove: { title: 'Remove', onClick: noop },
          },
          branch: { branch: frame >= at('close', 172) ? 'main' : BRANCH, base: 'main', copy: { label: BRANCH, onCopy: noop }, className: 'film-branch' },
          ...(files.length
            ? {
                changes: {
                  label: 'Uncommitted changes',
                  summary: `${files.length} file${files.length > 1 ? 's' : ''}`,
                  additions: files.reduce((n, f) => n + f.additions, 0),
                  deletions: files.reduce((n, f) => n + f.deletions, 0),
                  files,
                  onOpenFile: noop,
                  className: 'film-changes',
                },
              }
            : {}),
          ...(commits.length
            ? {
                commits: {
                  label: 'Commits',
                  summary: `${commits.length} ahead of main`,
                  commits: [...commits].reverse().map((c) => ({
                    hash: c.hash,
                    shortHash: c.hash,
                    subject: c.subject,
                    relativeDate: 'now',
                    copyLabel: c.hash,
                  })),
                  onCopyHash: noop,
                  className: 'film-commits',
                },
              }
            : {}),
          ...(frame >= at('ship', 150)
            ? {
                pullRequest: (
                  <div className="film-pr">
                  <PullRequestCard
                    state={prState}
                    title="PR #128"
                    subtitle="acme/magic-pay"
                    {...(prState === 'merged'
                      ? { badge: { label: 'Merged', tone: 'purple' } }
                      : approved
                        ? { badge: { label: 'Approved', tone: 'green' } }
                        : review
                          ? { badge: { label: 'Changes requested', tone: 'red' } }
                          : {})}
                    open={{ label: 'View pull request', onOpen: noop }}
                    footer={{ label: 'Checked just now', refresh: { label: 'Refresh', onRefresh: noop } }}
                  >
                    {review ? <CommentsLine frame={frame} /> : null}
                    <ChecksLine frame={frame} />
                  </PullRequestCard>
                  </div>
                ),
              }
            : {}),
        },
      ]}
    />
  )
}
