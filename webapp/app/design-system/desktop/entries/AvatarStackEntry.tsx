'use client'

import { AvatarStack, DEFAULT_PORTRAIT_SRC, type AvatarStackPerson } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/**
 * The AvatarStack entry.
 *
 * One photo among the specimens, and it is the default portrait: the only picture this page
 * can draw without reaching into the desktop app. Everyone else wears an initial, which is
 * what the plan header draws for a colleague who has not uploaded one.
 */

const PEOPLE: AvatarStackPerson[] = [
  { id: 'u1', name: 'alice@example.com', src: DEFAULT_PORTRAIT_SRC },
  { id: 'u2', name: 'bruno@example.com' },
  { id: 'u3', name: 'chloe@example.com' },
  { id: 'u4', name: 'david@example.com' },
  { id: 'u5', name: 'emma@example.com' },
  { id: 'u6', name: 'farid@example.com' },
]

const PROPS: PropRow[] = [
  {
    name: 'people',
    type: '{ id: string; name: string; src?: string | null }[]',
    required: true,
    description:
      'Data, not faces: the stack draws each Avatar itself, so the overlap, the ring and the +N chip cannot be broken by a caller. No src draws the initial of the name, never the default portrait, which would make three people with no photo the same stranger three times. Empty renders nothing.',
  },
  {
    name: 'max',
    type: 'number',
    fallback: '4',
    description:
      'The most slots the stack takes, the chip included. Past it the last slot is +N, and the people it stands for are named in its tooltip. At exactly max, everyone is drawn: nobody hides behind a +1 that could have been their face.',
  },
  { name: 'size', type: "'sm' | 'md'", fallback: "'md'", description: '20px or 24px. A stack lives in a bar or a row, never alone on a line.' },
  {
    name: 'label',
    type: 'string',
    required: true,
    description: 'What the group is, translated (“Also on this plan”). Its tooltip and its accessible name.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and layout. Not the overlap or the ring.' },
]

export function AvatarStackEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="AvatarStack" uses={usesOf('avatarstack')} onOpen={onOpen}>
        A few people, as overlapping faces: who else is here right now. Made for the plan
        page’s header, where it lists the colleagues who have the same plan open.
      </EntryHeader>

      <EntrySection
        title="Up to max, then +N"
        note="The chip takes a slot of its own, so the stack is never wider than max promises the bar it sits in."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-8">
          <Specimen label="one colleague">
            <AvatarStack people={PEOPLE.slice(0, 1)} label="Also on this plan" />
          </Specimen>
          <Specimen label="four, max 4: all drawn">
            <AvatarStack people={PEOPLE.slice(0, 4)} label="Also on this plan" />
          </Specimen>
          <Specimen label="six, max 4">
            <AvatarStack people={PEOPLE} label="Also on this plan" />
          </Specimen>
          <Specimen label="six, max 4, sm">
            <AvatarStack people={PEOPLE} size="sm" label="Also on this plan" />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { AvatarStack } from '@ds/desktop'

<AvatarStack
  label={t('plans.presence.label')}
  people={members.map((m) => ({ id: m.userId, name: m.email, src: avatars[m.userId] }))}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
