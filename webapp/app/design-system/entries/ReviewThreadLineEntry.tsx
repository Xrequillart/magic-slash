'use client'

import { useState } from 'react'
import { ReviewThreadLine } from '@ds/desktop'
import { CheckCircle2, Circle, MinusCircle } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  { name: 'author', type: 'string', required: true, description: 'Who opened the thread. Truncates: a shortened login is still readable.' },
  {
    name: 'badge',
    type: '{ label: string; tone: PRTone }',
    description:
      'The review verdict, when this thread is one. Already translated and already toned: a mapping from a GraphQL enum to a word is the app’s job, not this file’s.',
  },
  {
    name: 'location / locationTitle',
    type: 'string',
    description:
      'Where in the diff it hangs — watcher.ts:184, composed by the caller. The app draws the basename and keeps the whole path in the tooltip: a sidebar column cannot hold the path, and that is a fact about the column.',
  },
  {
    name: 'replies',
    type: 'string',
    description:
      'How many answers, already counted and already pluralised. The catalogue interpolates but does not pluralise, so the caller picks the key — handing this a number and a translator would drag the i18n runtime into the design system for one span.',
  },
  {
    name: 'state',
    type: '{ icon: IconComponent; label: string; tone: PRTone; strong?: boolean }',
    description:
      'Whether GitHub tracks a state for this thread at all. Absent on a conversation comment and on a review summary, which are not threads with a state. strong is the one drawn as a tinted badge rather than as a word beside an icon.',
  },
  { name: 'age', type: 'string', description: 'When it was opened, already formatted and already translated.' },
  {
    name: 'resolved',
    type: 'boolean',
    fallback: 'false',
    description:
      'Settled, so the row steps back — border tinted green, text dimmed. The badge inside stays at full strength: it is the one thing on the row that has to be readable without stopping.',
  },
  { name: 'openLabel / onOpen', type: 'string / () => void', required: true, description: 'The whole row is the control. It reports the click and nothing else.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement. Not the fill, the border or any of the tones.' },
]

const THREADS = [
  {
    id: 'a',
    author: 'greptile-apps',
    badge: { label: 'Changes requested', tone: 'red' as const },
    location: 'status-server.ts:184',
    locationTitle: 'desktop/src/main/hooks/status-server.ts',
    replies: '2 replies',
    state: { icon: Circle, label: 'Open', tone: 'blue' as const },
    age: '3h',
  },
  {
    id: 'b',
    author: 'xrequillart',
    location: 'PRWatchCard.tsx:612',
    locationTitle: 'desktop/src/renderer/components/agent-info-sidebar/PRWatchCard.tsx',
    replies: '1 reply',
    state: { icon: CheckCircle2, label: 'Resolved', tone: 'green' as const, strong: true },
    age: '1d',
    resolved: true,
  },
  {
    id: 'c',
    author: 'copilot',
    badge: { label: 'Approved', tone: 'green' as const },
    age: '2d',
  },
  {
    id: 'd',
    author: 'greptile-apps',
    location: 'themes.ts:44',
    locationTitle: 'desktop/src/renderer/theme/themes.ts',
    state: { icon: MinusCircle, label: 'Outdated', tone: 'muted' as const },
    age: '4d',
  },
]

/** The real thing: press a row and it reports which thread it handed back. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [opened, setOpened] = useState<string | null>(null)
  return (
    <Stage theme={theme}>
      <ul className="max-w-[460px] space-y-1">
        {THREADS.map(thread => (
          <ReviewThreadLine
            key={thread.id}
            author={thread.author}
            badge={thread.badge}
            location={thread.location}
            locationTitle={thread.locationTitle}
            replies={thread.replies}
            state={thread.state}
            age={thread.age}
            resolved={thread.resolved}
            openLabel="Open this thread"
            onOpen={() => setOpened(thread.id)}
          />
        ))}
      </ul>
      <p className="mt-3 font-mono text-[10px] text-text-secondary">
        {opened ? `onOpen → thread ${opened}` : 'press a row'}
      </p>
    </Stage>
  )
}

export function ReviewThreadLineEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="ReviewThreadLine"
        uses={[
          { id: 'icon', label: 'Icon' },
          { id: 'text', label: 'Text' },
        ]}
        onOpen={onOpen}
      >
        One review thread, on one line: who opened it, where, how many answers, and whether it
        is settled. It lives inside a <code>CollapsibleLine</code>, which lives inside a{' '}
        <code>PullRequestCard</code> — three levels, each drawing one thing.
      </EntryHeader>

      <EntrySection
        title="A row to scan, not to read"
        note="Every decision in here follows from that. The sidebar it lives in is 500px wide and does not resize, so the bodies are deliberately absent — a card per comment turned a bot-reviewed PR into a page of prose in a column too narrow for it. The question it answers is “what is still open, and where”, not “what exactly was said”; reading the conversation is a panel of its own."
      >
        <Live theme={theme} />
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The whole row is the control, because every part of it names the same thread — a
          chevron at one end would be a smaller target saying the same thing. The counts and
          states travel to the right edge as one group, so they line up column-wise down the
          list rather than trailing each row’s own text.
        </p>
      </EntrySection>

      <EntrySection
        title="Resolved steps back, and one thing does not"
        note="Border tinted green, author dimmed — the same reading as the checklist above it, where a ticked line goes quiet so the eye lands on what is still open. The state badge inside stays at full strength: in a list of twenty threads it is what separates “still to do” from “done”, and it has to be readable without stopping."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <Specimen label="open, with a verdict and a place">
            <ul className="max-w-[460px]">
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
            </ul>
          </Specimen>
          <Specimen label="resolved — the badge is the one thing at full strength">
            <ul className="max-w-[460px]">
              <ReviewThreadLine
                author="xrequillart"
                location="PRWatchCard.tsx:612"
                replies="1 reply"
                state={{ icon: CheckCircle2, label: 'Resolved', tone: 'green', strong: true }}
                age="1d"
                resolved
                openLabel="Open this thread"
                onOpen={() => {}}
              />
            </ul>
          </Specimen>
          <Specimen label="a review summary — no place, no state GitHub tracks">
            <ul className="max-w-[460px]">
              <ReviewThreadLine
                author="copilot"
                badge={{ label: 'Approved', tone: 'green' }}
                age="2d"
                openLabel="Open this thread"
                onOpen={() => {}}
              />
            </ul>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The location is a plain <code>span</code> and not a <code>Text</code>, on purpose:{' '}
          <code>Text</code> pins Cera Pro as its face, so a <code>font-mono</code> in its{' '}
          <code>className</code> would be a second font-family class settled by emission
          order. A file and a line number are read the way a hash is.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ReviewThreadLine } from '@ds/desktop'

<ReviewThreadLine
  author={root.author}
  badge={verdict && { label: t(verdict.label), tone: verdict.tone }}
  location={\`\${basename}:\${thread.line}\`}
  locationTitle={thread.path}
  replies={t(one ? 'threadReply' : 'threadReplies', { count })}
  state={state && { icon: state.Icon, label: t(state.label), tone: state.tone, strong: state.strong }}
  age={formatTimestamp(createdAt, now, t)}
  resolved={thread.state === 'resolved'}
  openLabel={t('prComments.openThread')}
  onOpen={() => onOpen(thread.id)}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
