'use client'

import { useState } from 'react'
import { CollapsibleLine, PullRequestCard, ReviewThreadLine, type PullRequestState } from '@ds/desktop'
import { AlertTriangle, CheckCircle2, Circle, Loader2, MessagesSquare } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  {
    name: 'state',
    type: 'PullRequestState',
    description:
      'open, draft, merged or closed — or nothing at all, which is a real answer and not a default: a card built before the watcher has ever read the PR knows nothing, and guessing “open” would be the card inventing a fact.',
  },
  { name: 'title', type: 'string', required: true, description: 'The line that names it — the app writes “PR #481”.' },
  { name: 'subtitle', type: 'string', description: 'Under the title, quieter: the owner/repo it lives in. Truncates.' },
  {
    name: 'badge',
    type: '{ label: string; tone: PRTone }',
    description:
      'The one word in the top-right slot. Which word is the caller’s call, and it is a real decision: on an open PR the state is what the reader already knows — the card is there — while “Changes requested” is what they opened the sidebar to find out.',
  },
  {
    name: 'open',
    type: '{ label: string; onOpen: () => void }',
    required: true,
    description:
      'Opening it somewhere else. The whole header is this control, badge included: the badge labels the PR, so clicking it should open the PR rather than land on dead space.',
  },
  {
    name: 'children',
    type: 'ReactNode',
    description:
      'The bands. Each gets a hairline above it, drawn from the card rather than by each band — a caller spelling its own is a caller that can forget one.',
  },
  {
    name: 'footer',
    type: '{ label: string; refresh: { label, busy?, onRefresh } }',
    description:
      'The status bar: how old everything above it is, and the button that makes it newer. Optional, because there is one state where it must not be there — with the watcher off, nothing above will move again and a refresh would be a control that cannot do what it says.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and width. Not the ground, the radius or the dividers.' },
]

const STATES: { state: PullRequestState; badge: { label: string; tone: 'green' | 'red' | 'purple' | 'neutral' } }[] = [
  { state: 'open', badge: { label: 'Changes requested', tone: 'red' } },
  { state: 'draft', badge: { label: 'Draft', tone: 'neutral' } },
  { state: 'merged', badge: { label: 'Merged', tone: 'purple' } },
  { state: 'closed', badge: { label: 'Closed', tone: 'red' } },
]

/** The real thing, at the sidebar's own width, with every fold live. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [open, setOpen] = useState<string | null>('comments')
  const [busy, setBusy] = useState(false)
  const fold = (key: string) => ({
    open: open === key,
    onToggle: () => setOpen(open === key ? null : key),
  })

  return (
    <Stage theme={theme}>
      <div className="max-w-[420px]">
        <PullRequestCard
          state="open"
          title="PR #481"
          subtitle="Xrequillart/magic-slash"
          badge={{ label: 'Changes requested', tone: 'red' }}
          open={{ label: 'View pull request', onOpen: () => {} }}
          footer={{
            label: 'Checked 2 min ago',
            refresh: {
              label: 'Refresh',
              busy,
              onRefresh: () => {
                setBusy(true)
                setTimeout(() => setBusy(false), 1600)
              },
            },
          }}
        >
          <>
            <CollapsibleLine
              icon={MessagesSquare}
              tone="blue"
              label="Comments"
              muted
              detail={<span className="text-[10px] text-text-secondary/60 tabular-nums">3 comments</span>}
              toggle={fold('comments')}
            >
              <ul className="space-y-1 pt-1">
                <ReviewThreadLine
                  author="greptile-apps"
                  badge={{ label: 'Changes requested', tone: 'red' }}
                  location="status-server.ts:184"
                  replies="2 replies"
                  state={{ icon: Circle, label: 'Open', tone: 'blue' }}
                  age="3h"
                  openLabel="Open this thread"
                  onOpen={() => {}}
                />
                <ReviewThreadLine
                  author="xrequillart"
                  location="PRWatchCard.tsx:612"
                  state={{ icon: CheckCircle2, label: 'Resolved', tone: 'green', strong: true }}
                  age="1d"
                  resolved
                  openLabel="Open this thread"
                  onOpen={() => {}}
                />
              </ul>
            </CollapsibleLine>

            <CollapsibleLine
              icon={Loader2}
              tone="blue"
              spin
              label="Checks"
              detail={<span className="text-[10px] text-text-secondary/60 tabular-nums">9/12 passed</span>}
              toggle={fold('checks')}
            >
              <ul className="space-y-1">
                {['lint', 'test (node 20)', 'build / macos'].map(name => (
                  <li key={name} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0 text-green" />
                    <span className="min-w-0 truncate text-[10px] text-text-secondary/70">{name}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleLine>

            <CollapsibleLine icon={CheckCircle2} tone="green" label="No conflicts" muted />
          </>
        </PullRequestCard>
      </div>
      <p className="mt-3 font-mono text-[10px] text-text-secondary">
        press the refresh — it spins for 1.6s and blocks the click while it does
      </p>
    </Stage>
  )
}

export function PullRequestCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="PullRequestCard"
        uses={[
          { id: 'buttonicon', label: 'ButtonIcon' },
          { id: 'collapsibleline', label: 'CollapsibleLine' },
          { id: 'icon', label: 'Icon' },
          { id: 'text', label: 'Text' },
        ]}
        onOpen={onOpen}
      >
        A pull request, as the sidebar watches it: what it is, what has to be true before it
        ships, and how old that answer is. Three bands and nothing else — a header, whatever
        the caller stacks in the middle, and a footer that is almost always there.
      </EntryHeader>

      <EntrySection
        title="The middle is the caller’s"
        note="What belongs in it is a watch error, a checklist, a prompt to switch the watcher back on — and which of those applies is a question about the app’s own state. The card draws the plate, the header, the hairline between every band and the status bar; the caller decides what the bands say. Everything below is live: the folds open, and the refresh spins."
      >
        <Live theme={theme} />
      </EntrySection>

      <EntrySection
        title="The header is the link"
        note="Which is why there is no “View pull request” button under the card: the title, the slug and the tooltip already say where this goes, and an external-link glyph would say it a fourth time. The badge sits inside that target — it labels the PR, so clicking it should open the PR rather than land on dead space."
      >
        <Stage theme={theme} className="grid gap-3 sm:grid-cols-2">
          {STATES.map(item => (
            <Specimen key={item.state} label={item.state}>
              <PullRequestCard
                state={item.state}
                title="PR #481"
                subtitle="Xrequillart/magic-slash"
                badge={item.badge}
                open={{ label: 'View pull request', onOpen: () => {} }}
              />
            </Specimen>
          ))}
          <Specimen label="nothing read yet — no state, no badge, no footer">
            <PullRequestCard
              title="Pull request"
              subtitle="Xrequillart/magic-slash"
              open={{ label: 'View pull request', onOpen: () => {} }}
            />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Merged is purple and not a severity — GitHub has meant that for a decade, and the
          sidebar keeps the association so the state reads before the word does. See{' '}
          <code>prTones</code> on why this folder names colours rather than inventing a scale
          a pull request would outgrow.
        </p>
      </EntrySection>

      <EntrySection
        title="The footer is optional, and that is a state"
        note="With the watcher switched off, nothing above the status bar will ever move again — so a refresh button there would be a control that cannot do what it says. Omitting the whole band is how the card says so, and the app puts its own prompt in children instead."
      >
        <Stage theme={theme}>
          <div className="max-w-[420px]">
            <PullRequestCard
              state="open"
              title="PR #481"
              subtitle="Xrequillart/magic-slash"
              badge={{ label: 'Open', tone: 'green' }}
              open={{ label: 'View pull request', onOpen: () => {} }}
            >
              <div className="p-2">
                <div className="flex items-start gap-2 rounded-lg bg-surface-sunken px-2 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-icon" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-ink/80">Watcher off</div>
                    <div className="text-[10px] text-text-secondary/70">
                      What is shown is a dated snapshot.
                    </div>
                  </div>
                </div>
              </div>
            </PullRequestCard>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { PullRequestCard, CollapsibleLine } from '@ds/desktop'

<PullRequestCard
  state={state}
  title={t('agentInfo.pr.number', { number })}
  subtitle={repoSlug}
  badge={badge}
  open={{ label: t('agentInfo.viewPullRequest'), onOpen: () => shell.openExternal(prUrl) }}
  footer={watcherOff ? undefined : {
    label: checkedLabel,
    refresh: { label: t('agentInfo.pr.refresh'), busy: refreshing, onRefresh: handleRefresh },
  }}
>
  {/* the bands */}
</PullRequestCard>`}</Snippet>
      </EntrySection>
    </article>
  )
}
