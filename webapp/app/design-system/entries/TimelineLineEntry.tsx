'use client'

import { useState } from 'react'
import { TimelineLine } from '@ds/desktop'
import { Figma, Notion } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'actor',
    type: 'string',
    required: true,
    description: 'Who did it, a name or an address already resolved. Truncates before the action does.',
  },
  {
    name: 'avatar',
    type: '{ src: string | null; alt: string }',
    required: true,
    description:
      'The face, as the bytes Avatar draws. alt is usually empty: the name is written right beside it, and a screen reader should not say the same person twice.',
  },
  {
    name: 'action',
    type: 'string',
    required: true,
    description: 'What they did, translated: “edited the spec”, “pinned”, “removed”.',
  },
  {
    name: 'detail',
    type: 'string',
    description: 'What it was done to, in ink after the action: a link’s title. A revision of the spec has none.',
  },
  {
    name: 'detailNote / detailTitle',
    type: 'string',
    description: 'A quieter second name after detail (a removed link’s address, when its title is the detail), and the tooltip that says it in full.',
  },
  {
    name: 'icon',
    type: 'IconComponent',
    description: 'The mark in front of detail, the tool a link opens. A component, never a node.',
  },
  {
    name: 'badge',
    type: '{ label: string; tone?: LabelTone; icon?: IconComponent }',
    description:
      'How it was done, drawn as a Label. Data and not a slot: the same answer has to look the same on every row, which a caller-drawn chip would not guarantee.',
  },
  {
    name: 'statusChange',
    type: '{ from?: { label; tone? }; to: { label; tone? }; title?: string }',
    description:
      'A status that changed, drawn as the two Status plates it went between with an arrow. Takes the place of detail. Data and not a slot, so a status looks like itself on every row.',
  },
  {
    name: 'date / dateTitle',
    type: 'string',
    required: true,
    description: 'The relative date, already translated, and the full one for the tooltip.',
  },
  {
    name: 'first / last',
    type: 'boolean',
    fallback: 'false',
    description: 'Where the row sits on the rail. The first has no segment above its tick, the last none below.',
  },
  {
    name: 'selected / onSelect / selectLabel',
    type: 'boolean / () => void / string',
    description:
      'A row that can be picked, to see what a revision changed. With onSelect the row is a toggle button; without it, plain text with no hover and nothing in the tab order.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and placement. Not the rail, the ground or the type.',
  },
]

const ROWS = [
  { id: 's1', actor: 'camille@example.com', action: 'changed the status', statusChange: { from: { label: 'Tickets filed', tone: 'green' as const }, to: { label: 'Done', tone: 'blue' as const } }, badge: { label: 'By hand' }, date: '2m' },
  { id: 'r3', actor: 'camille@example.com', action: 'edited the spec', badge: { label: 'By hand' }, date: '5m' },
  { id: 'l2', actor: 'camille@example.com', action: 'removed', detail: 'Onboarding notes', detailNote: 'notion.so/acme/onboarding', icon: Notion, date: '1h' },
  { id: 'r2', actor: 'xavier@example.com', action: 'edited the spec', badge: { label: 'With Claude · Planner', tone: 'claude-code' as const }, date: '3h' },
  { id: 'l1', actor: 'xavier@example.com', action: 'pinned', detail: 'Checkout mock-up', icon: Figma, date: '1d' },
  { id: 'r1', actor: 'xavier@example.com', action: 'wrote the spec', badge: { label: 'With Claude · Planner', tone: 'claude-code' as const }, date: '2d' },
]

/** Revisions pick, one at a time; link events and status changes do not. One rail, one shape. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [picked, setPicked] = useState<string | null>('r3')
  const toggle = (id: string) => setPicked((now) => (now === id ? null : id))
  return (
    <Stage theme={theme}>
      <div className="max-w-xl">
        {ROWS.map((row, i) => (
          <TimelineLine
            key={row.id}
            actor={row.actor}
            avatar={{ src: null, alt: '' }}
            action={row.action}
            detail={row.detail}
            detailNote={row.detailNote}
            icon={row.icon}
            statusChange={row.statusChange}
            badge={row.badge}
            date={row.date}
            first={i === 0}
            last={i === ROWS.length - 1}
            selected={picked === row.id}
            onSelect={row.id.startsWith('r') ? () => toggle(row.id) : undefined}
            selectLabel={row.id.startsWith('r') ? 'See what this revision changed' : undefined}
          />
        ))}
      </div>
    </Stage>
  )
}

export function TimelineLineEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="TimelineLine" uses={usesOf('timelineline')} onOpen={onOpen}>
        One event in a history: who did it, what they did, how, and when, on a rail that says
        the events are a sequence. A plan’s page draws its edit history with it, spec revisions,
        pinned links and status changes interleaved by date.
      </EntryHeader>

      <EntrySection
        title="Three kinds of event, one row"
        note="A revision of the spec, a link pinned or removed and a change of status are all “somebody did something to this plan at some moment”. A revision can be picked, one at a time, to see what it changed; the others cannot, and without onSelect a row is plain text. Press the revisions."
      >
        <Live theme={theme} />
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The badge says how: by hand on a neutral plate, with Claude on Claude Code’s own. It
          is data rather than a slot, so the same answer looks the same on every row.
        </p>
      </EntrySection>

      <EntrySection
        title="CommitLine’s rail, not its colour"
        note="Drawn per row in two halves meeting at a tick, exactly as a branch’s commits are, so a row knows only whether it is the first or the last. A hairline rather than yellow: yellow is a branch’s unpushed work, and a history is nobody’s pending anything. The tick fills when the row is selected."
      >
        <Stage theme={theme}>
          <div className="max-w-xl">
            <TimelineLine
              actor="xavier@example.com"
              avatar={{ src: null, alt: '' }}
              action="wrote the spec"
              badge={{ label: 'With Claude', tone: 'claude-code' }}
              date="2d"
              first
              last
            />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { TimelineLine } from '@ds/desktop'

<TimelineLine
  actor={planAuthor(revision.authorId, emailByAuthor)}
  avatar={{ src: avatarByAuthor[revision.authorId] ?? null, alt: '' }}
  action={t('plans.history.edited')}
  badge={revision.source === 'agent'
    ? { label: t('plans.history.withClaude', { agent }), tone: 'claude-code' }
    : { label: t('plans.history.byHand') }}
  date={formatTimestamp(at, now, t)}
  first={index === 0}
  last={index === rows.length - 1}
  selected={picked === revision.id}
  onSelect={() => toggle(revision.id)}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
