'use client'

import { ItemGroup, ItemNote, PlanItem } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** Three of the sixteen hues the app assigns a repository at runtime. */
const ROSE = '#F43F5E'
const CYAN = '#06B6D4'

const noop = () => undefined

const PROPS: PropRow[] = [
  {
    name: 'number',
    type: 'number',
    description:
      'The plan’s own number, drawn as #7 on the grey plate a tracker with no brand colour of its own gets. Absent draws nothing rather than # or #0: a row written before plans had numbers has none, and #0 would look like a plan that exists at position zero.',
  },
  {
    name: 'title',
    type: 'string',
    required: true,
    description: 'The plan’s name. What truncates when the row runs out of room.',
  },
  {
    name: 'status',
    type: '{ label: string; tone: StatusTone }',
    required: true,
    description:
      'What state the plan is in: the translated word and the colour it is drawn in. Inert — a plan’s status is derived from whether its tickets exist, where an agent’s is set from its pill, and a plate that lit up under the cursor and did nothing would be lying about which of the two this is.',
  },
  {
    name: 'when',
    type: 'string',
    description:
      'When it was started, already worded — “3d ago”, not a timestamp. The relative phrasing belongs to the app’s catalogue.',
  },
  {
    name: 'idea',
    type: 'string',
    description:
      'One line of the idea, clamped to one whatever arrives. It is there to tell two plans on the same repository apart; a paragraph here would turn the list back into a stack of cards.',
  },
  {
    name: 'repository',
    type: '{ label: string; color?: string }',
    required: true,
    description:
      'The repository as its coloured mark and its name. The colour is a value the caller resolved, and may legitimately be absent — a plan on an organization repository this machine has never cloned has no local entry to take one from.',
  },
  {
    name: 'author',
    type: '{ name: string; avatarUrl?: string | null }',
    required: true,
    description:
      'Who wrote it. The avatar’s alt is empty on purpose: the author is named in the very next breath, and an alt repeating the adjacent word makes a screen reader say the same person twice per row.',
  },
  {
    name: 'tickets',
    type: 'string',
    required: true,
    description:
      'How many tickets it produced, already counted and already worded — “7 tickets”, not 7, and “no ticket” rather than a hidden chip.',
  },
  {
    name: 'personal',
    type: 'string',
    description:
      'That the plan is its author’s alone, already worded — “Personal”. One more chip after the counts. Absent on a shared plan, the ordinary case: a personal plan is only ever shown to its author, and the chip tells them their colleagues cannot see it.',
  },
  {
    name: 'onSelect',
    type: '() => void',
    required: true,
    description: 'Opens the plan. The whole row is the target.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description:
      'Placement. Not a margin: the rows are flush, and a gap between two of them breaks the stack the first and last radii are describing.',
  },
]

export function PlanItemEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="PlanItem" uses={usesOf('planitem')} onOpen={onOpen}>
        One plan, as one dense line — the row the Plans list is made of. The number and the
        title, the status and when it was started, an excerpt of the idea, then the repository,
        the author and the ticket count.
      </EntryHeader>

      <EntrySection
        title="The list"
        note="The same four things the webapp’s /plans list names, in the same order: the two are read by the same people about the same sessions. The rows are flush on Item’s ground, and the note at the end is what a read that came back at its cap says about itself."
      >
        <Stage theme={theme}>
          <ItemGroup>
            <PlanItem
              number={12}
              title="Split view, Stage Manager style"
              status={{ label: 'Planned', tone: 'green' }}
              when="2d ago"
              idea="two agents side by side, and the one you are not typing into goes quiet"
              repository={{ label: 'magic-slash', color: ROSE }}
              author={{ name: 'Camille', avatarUrl: null }}
              tickets="7 tickets"
              onSelect={noop}
            />
            <PlanItem
              number={11}
              title="Repository colours everywhere"
              status={{ label: 'Planning', tone: 'yellow' }}
              when="5d ago"
              idea="one hue per repository, and it follows the repo across Plans, Tasks and the sidebar"
              repository={{ label: 'magic-slash', color: ROSE }}
              author={{ name: 'Alex', avatarUrl: null }}
              tickets="no ticket"
              onSelect={noop}
            />
            <PlanItem
              number={9}
              title="Invoice VAT rounding"
              status={{ label: 'Planned', tone: 'green' }}
              when="3w ago"
              idea="the totals disagree with the tax lines by a cent on some currencies"
              repository={{ label: 'acme-checkout-api', color: CYAN }}
              author={{ name: 'Camille', avatarUrl: null }}
              tickets="1 ticket"
              personal="Personal"
              onSelect={noop}
            />
            <ItemNote>Showing the 50 most recent plans.</ItemNote>
          </ItemGroup>
        </Stage>
      </EntrySection>

      <EntrySection
        title="It knows nothing"
        note="The row this replaces read the store for the repository colours, called the translator for four of its own strings, counted the tickets and worded the plural, and resolved a cloud repository id to a local config key. None of that is true here: every string arrives translated, the count arrives worded, the colour arrives as a value. A repository this machine has never cloned resolves to no colour at all, which draws the neutral plate rather than an invented hue."
      >
        <Stage theme={theme}>
          <ItemGroup>
            <PlanItem
              number={31}
              title="Rate limits on the public API"
              status={{ label: 'Planning', tone: 'yellow' }}
              when="1d ago"
              repository={{ label: 'acme-gateway' }}
              author={{ name: 'A teammate', avatarUrl: null }}
              tickets="no ticket"
              onSelect={noop}
            />
          </ItemGroup>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The right-hand pair never moves"
        note="The status and the date are fixed-width facts every row has, so they hold a column each on the right edge and read straight down the list — where the title’s length, and the badge’s, vary. The status used to sit immediately after the title, which put it at a different x on every row. A plan with no number and no idea still lines up."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <div className="w-[520px]">
            <ItemGroup>
              <PlanItem
                number={128}
                title="A plan whose title runs past the room the row has for it, and then some"
                status={{ label: 'Planned', tone: 'green' }}
                when="now"
                repository={{ label: 'magic-slash', color: ROSE }}
                author={{ name: 'Camille', avatarUrl: null }}
                tickets="12 tickets"
                onSelect={noop}
              />
              <PlanItem
                title="No number, no idea"
                status={{ label: 'Planning', tone: 'yellow' }}
                repository={{ label: 'magic-slash', color: ROSE }}
                author={{ name: 'Camille', avatarUrl: null }}
                tickets="no ticket"
                onSelect={noop}
              />
            </ItemGroup>
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            520px — the title gives way, the pair on the right does not
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { PlanItem } from '@ds/desktop'

<PlanItem
  number={card.number}
  title={planLabel(card)}
  status={{ label: t(labelKey), tone }}
  when={when > 0 ? t('relative.ago', { time: formatTimestamp(when, now, t) }) : undefined}
  idea={card.idea}
  repository={{ label: card.repoName ?? t('plans.noRepo'), color: repoColor }}
  author={{ name: card.author, avatarUrl: card.avatarUrl }}
  tickets={ticketCountLabel(card.ticketCount, t)}
  onSelect={() => onSelect(card)}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The app’s <code>PlanRow</code> is what does that wiring, and it is thirty lines: the
          store, the translator, the plural rule, the relative date, and the resolution from a
          plan’s cloud repository id to the local key its colour is filed under.
        </p>
      </EntrySection>
    </article>
  )
}
