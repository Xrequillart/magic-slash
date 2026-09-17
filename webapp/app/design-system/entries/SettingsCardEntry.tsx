'use client'

import { useState } from 'react'
import { SettingsCard } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'rows',
    type: '(SettingsCardRow | false | null | undefined)[]',
    required: true,
    description:
      'The rows, top to bottom. Each one is SettingRow’s own props plus a stable id — the setting’s name in the config, typically, never the index: rows come and go, and React would carry a row’s switch state over to whichever row slid into its place. false and undefined are dropped, so a caller can write enabled && row inline and the hairlines still land between what is actually on screen. Nothing left means nothing is drawn.',
  },
  {
    name: 'className',
    type: 'string',
    description:
      'Margins and width. Not the ground, the padding, the radius or the gaps — those are the card, and a second spelling of the padding would win or lose on the order Tailwind emitted the two.',
  },
]

export function SettingsCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [waiting, setWaiting] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [digest, setDigest] = useState(false)
  const [master, setMaster] = useState(true)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SettingsCard" uses={usesOf('settingscard')} onOpen={onOpen}>
        A card of settings: several rows of the same kind, stacked, with a hairline
        between each pair.
      </EntryHeader>

      <EntrySection
        title="The shape SettingRow left behind"
        note="SettingRow settled what one setting looks like, and every settings page went on spelling out what a group of them looks like: bg-surface border border-line-strong rounded-xl p-4 space-y-4 with a loose divider div pushed between the rows by hand. Fifteen copies across Application, Appearance, Notifications and the repository tabs, and they had already drifted — some carried the border, some had dropped it; some spaced at space-y-4, some at gap-4."
      >
        <Stage theme={theme}>
          <Specimen label="two rows, one rule between them">
            <SettingsCard
              rows={[
                {
                  id: 'agentWaiting',
                  label: 'Agent waiting',
                  hint: 'An agent is asking you something and has stopped',
                  control: { kind: 'switch', checked: waiting, onChange: setWaiting, label: 'Agent waiting' },
                },
                {
                  id: 'agentCompleted',
                  label: 'Agent finished',
                  hint: 'A task ended on its own, with nothing left to answer',
                  control: { kind: 'switch', checked: completed, onChange: setCompleted, label: 'Agent finished' },
                },
              ]}
            />
          </Specimen>
          <Specimen label="one row, and therefore no rule at all">
            <SettingsCard
              rows={[
                {
                  id: 'digest',
                  label: 'Daily digest',
                  hint: 'One summary in the morning, instead of each event as it lands',
                  control: { kind: 'switch', checked: digest, onChange: setDigest, label: 'Daily digest' },
                },
              ]}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The separator is not a row"
        note="It is what sits between two of them, which is the one thing a hand-placed div can never promise: the last row cannot be followed by a rule, a single-row card cannot draw one at all, and a row that stops being rendered cannot leave its divider behind. That was the actual bug this component removes, and it is why the rows arrive as a list rather than as children."
      >
        <Stage theme={theme}>
          <Specimen label="switch the master off — the rows leave, and no rule is left hanging">
            <div className="flex w-full flex-col gap-4">
              <SettingsCard
                rows={[
                  {
                    id: 'master',
                    label: 'Notifications',
                    hint: 'Everything below, in one switch',
                    control: { kind: 'switch', checked: master, onChange: setMaster, label: 'Notifications' },
                  },
                ]}
              />
              <SettingsCard
                rows={[
                  master && {
                    id: 'prReview',
                    label: 'Review status',
                    hint: 'A review moved on a pull request open in the app',
                    control: { kind: 'switch', checked: true, onChange: () => undefined, label: 'Review status' },
                  },
                  master && {
                    id: 'prChangesRequested',
                    label: 'Changes requested',
                    hint: 'A reviewer asked for changes on one of yours',
                    control: { kind: 'switch', checked: true, onChange: () => undefined, label: 'Changes requested' },
                  },
                ]}
              />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The second card renders nothing at all once both its rows are dropped — an
          empty plate is a card promising settings it does not have. Hiding a row
          writes nothing either, so the per-kind choices come back untouched when the
          master switch does.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SettingsCard } from '@ds/desktop'

<SettingsCard
  rows={[
    { id: 'agentWaiting', ...agentWaiting },
    { id: 'agentCompleted', ...agentCompleted },
  ]}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
