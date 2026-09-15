'use client'

import { useState } from 'react'
import { Status, type StatusOption, type StatusSize, type StatusTone } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The app's own twelve, which is what the tone table has to survive. */
const WORKFLOW: StatusOption[] = [
  { value: '', label: 'no status', tone: 'neutral' },
  { value: 'planning', label: 'planning', tone: 'orange', strength: 'soft' },
  { value: 'planned', label: 'planned', tone: 'cyan', strength: 'soft' },
  { value: 'in progress', label: 'in progress', tone: 'yellow' },
  { value: 'committed', label: 'committed', tone: 'cyan' },
  { value: 'ready for PR', label: 'ready for PR', tone: 'orange' },
  { value: 'PR created', label: 'PR created', tone: 'green' },
  { value: 'CI green', label: 'CI green', tone: 'accent' },
  { value: 'in review', label: 'in review', tone: 'blue' },
  { value: 'changes requested', label: 'changes requested', tone: 'red' },
  { value: 'Review addressed', label: 'Review addressed', tone: 'teal' },
  { value: 'PR merged', label: 'PR merged', tone: 'purple' },
]

/** A planner's three, as the sidebar filters them. */
const PLANNER = WORKFLOW.filter((o) => ['', 'planning', 'planned'].includes(o.value))

const PROPS: PropRow[] = [
  {
    name: 'label',
    type: 'string',
    required: true,
    description:
      'The word on the plate, already translated. Passed rather than looked up in options, so a status this build does not recognise can still be shown as itself instead of collapsing to “no status” and hiding that the workflow moved on.',
  },
  {
    name: 'tone',
    type: "'neutral' | 'accent' | 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'purple' | 'cyan' | 'teal'",
    fallback: "'neutral'",
    description:
      'The palette’s roles, not semantic names. A workflow has no direction — there is nothing “success” about committed — and twelve states need twelve hues long before they need twelve meanings.',
  },
  {
    name: 'strength',
    type: "'soft' | 'strong'",
    fallback: "'strong'",
    description:
      '10% or 20% of the hue. Ten roles against twelve states means two pairs share a colour, and the alpha is the only thing holding each pair apart. Reach for soft when you have run out of hues, never for emphasis.',
  },
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg'",
    fallback: "'sm'",
    description:
      '24 / 28 / 32 — Label’s three, because a status and a label sit in the same rows and two badges of different heights on one line is what a shared scale exists to stop.',
  },
  {
    name: 'options',
    type: 'StatusOption[]',
    description:
      'The picker’s contents, and the switch that makes the plate clickable at all. Absent, this is an inert span: no chevron, no hover, nothing in the tab order.',
  },
  {
    name: 'value',
    type: 'string',
    description: 'Which option is the current one, for the tick. Not necessarily one of them.',
  },
  { name: 'onSelect', type: '(value: string) => void', description: 'Called with the chosen value.' },
  {
    name: 'align',
    type: "'left' | 'right'",
    fallback: "'right'",
    description:
      'Which edge the menu hangs from. Right by default: this sits at the end of a row in a 320px sidebar, where a left-aligned menu goes off the panel.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and layout. Not the ground, the padding or the radius.',
  },
]

function Picker({ options, initial, size }: { options: StatusOption[]; initial: string; size?: StatusSize }) {
  const [value, setValue] = useState(initial)
  const current = options.find((o) => o.value === value)
  return (
    <Status
      label={current?.label ?? value}
      tone={current?.tone ?? 'neutral'}
      strength={current?.strength}
      value={value}
      options={options}
      onSelect={setValue}
      align="left"
      size={size}
    />
  )
}

export function StatusEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="Status"
        uses={usesOf('status')}
        onOpen={onOpen}
      >
        A state on a tinted plate, and the picker that changes it. The other side of the
        line <code>Label</code> draws: a label <em>names</em> a thing and the thing does not
        change while you look at it, where a status <em>reports</em> one that changes on its
        own.
      </EntryHeader>

      <EntrySection
        title="Clickable, or not"
        note="options is what decides, and it is the same rule Label makes with onClick. Given them the plate is a button that opens the picker; without them it is a span with no chevron, no hover and nothing in the tab order — because a plan's status is derived from whether its tickets exist, and a plate that lit up under the cursor and did nothing was the thing every chip in this app got wrong in one direction or the other."
      >
        <Stage theme={theme} className="flex items-start gap-10">
          <div className="flex flex-col gap-2">
            <Picker options={WORKFLOW} initial="in progress" />
            <span className="font-mono text-[10px] text-text-secondary">
              an agent’s — set from here
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Status label="planned" tone="green" />
            <span className="font-mono text-[10px] text-text-secondary">
              a plan’s — derived, inert
            </span>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The catalogue belongs to the caller"
        note="The twelve workflow statuses are Magic Slash's vocabulary, not a design language, and a plan's two are not agent statuses at all. Hardcoding one list here would lock the plans list out of the component whose shape it was already copying by hand. The same split ProgressBar makes with its thresholds: this folder owns how a state looks, the app owns which states there are."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            {WORKFLOW.map((o) => (
              <Status key={o.value || 'none'} label={o.label} tone={o.tone} strength={o.strength} />
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Picker options={PLANNER} initial="planning" />
            <span className="font-mono text-[10px] text-text-secondary">
              a planner is offered three of the twelve — one list of all of them made two
              workflows read as branches of a single longer one
            </span>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Two alphas, and why"
        note="Ten palette roles against twelve states means two pairs have to share a hue. The fill alpha is the only thing holding each pair apart — they wore a ring for a while instead, and no other plate in this app has one."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {(
            [
              ['orange', 'planning', 'ready for PR'],
              ['cyan', 'planned', 'committed'],
            ] as [StatusTone, string, string][]
          ).map(([tone, soft, strong]) => (
            <div key={tone} className="flex items-center gap-4">
              <span className="w-14 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {tone}
              </span>
              <Status label={soft} tone={tone} strength="soft" />
              <span className="font-mono text-[10px] text-text-secondary">soft · 10%</span>
              <Status label={strong} tone={tone} strength="strong" />
              <span className="font-mono text-[10px] text-text-secondary">strong · 20%</span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Neutral is reserved"
        note="It is what an empty status wears, and what a status this build does not recognise wears. So no known state may be given it: a plate rendering grey is saying “I do not know this one”, and a known state saying that is a lie the reader cannot see through. An unrecognised value carries its raw text through rather than falling back to “no status”, which would hide that the workflow actually progressed."
      >
        <Stage theme={theme} className="flex items-center gap-4">
          <Status label="no status" tone="neutral" />
          <Status label="awaiting triage" tone="neutral" />
          <span className="font-mono text-[10px] text-text-secondary">
            a value from a newer skill than this build knows
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Sizes"
        note="Seven rungs now — ComponentSize, the folder’s one ladder — so a caller moving between components relearns nothing. Every rung that already existed kept its exact geometry and every default is the one it was: the new ones are additions, there so a size can be changed at a call site in one word instead of being a reason to edit the component. The middle three are Label's — the same 24 / 28 / 32. A status and a label sit in the same rows, and two badges of different heights on one line is the thing a shared scale exists to stop. The plate is a pill rather than a rounded rectangle and takes a little more horizontal padding for it, but the heights are pinned to the same three."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {(
            [
              ['2xs', '16px · a state inside a chip'],
              ['xs', '20px · under a row rather than in one'],
              ['sm', '24px · a list row, the default'],
              ['md', '28px · a row of 14px type'],
              ['lg', '32px · beside a heading'],
              ['xl', '36px · beside a page heading'],
              ['2xl', '40px · the state is the subject'],
            ] as [StatusSize, string][]
          ).map(([size, note]) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-8 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {size}
              </span>
              <Status label="in progress" tone="yellow" size={size} />
              <Picker options={WORKFLOW} initial="PR merged" size={size} />
              <span className="font-mono text-[10px] text-text-secondary">{note}</span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Status } from '@ds/desktop'

// An agent's: the picker is the only way it changes.
<Status
  label={t(current.labelKey)}
  tone={current.tone}
  strength={current.strength}
  value={status}
  options={offered}
  onSelect={onStatusChange}
/>

// A plan's: derived from whether its tickets exist, so inert.
<Status label={t(labelKey)} tone={tone} />`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The picker closes on a click elsewhere and on Escape, from a hook written out
          inside the component rather than imported. The app had one — a design system that
          needs a hook from the app consuming it is not shared code, and twenty lines is the
          right price for that. The app’s copy had no other caller left and is gone.
        </p>
      </EntrySection>
    </article>
  )
}
