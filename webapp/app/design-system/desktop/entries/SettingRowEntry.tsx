'use client'

import { useState } from 'react'
import { Card, SettingRow } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const MODES = [
  { value: 'plan', label: 'Plan', note: 'Asks before every edit, and writes nothing on its own.' },
  { value: 'default', label: 'Default', note: 'Asks the first time it touches a tool, then remembers.' },
  { value: 'acceptEdits', label: 'Accept edits', note: 'Edits files without asking. Still asks before running anything.' },
]

const PROPS: PropRow[] = [
  {
    name: 'label · hint',
    type: 'string · string',
    description:
      'What the setting is called, and what it is. hint wraps; the name never does. Both translated.',
  },
  {
    name: 'note',
    type: 'string',
    description:
      'What the setting is SET TO, under the whole row. hint says what the setting is — “How agents launch” — and note says what the current value means — “Plan mode asks before every edit”. The first is true whatever you pick; the second changes when you pick. The caller resolves it: which option is in force is a lookup this row does not do.',
  },
  {
    name: 'control',
    type: 'SettingRowControl | SettingRowControl[]',
    description:
      'A tagged union — select, switch, stepper, input, button, buttonIcon or chips, each with that control’s own props — and never a node. A row that took children would let each call site decide the control’s size, and a settings page whose pickers are 28px on one tab and 32 on the next is exactly what this exists to stop. A list keeps a pair in one cluster at one gap, in reading order. A new kind is a new member of the union, deliberately: the day a row needs something else, that is one line in the design system and a compiler error at every call site that has to care.',
  },
  {
    name: 'icon',
    type: 'IconComponent',
    description:
      'A mark before the name, saying what KIND of setting this is before the name says which one. A padlock on “Commits on main branches” says the row is a safety, which neither its name nor its switch could say alone. Most rows have none — a mark on every row is decoration, and decoration everywhere stops meaning anything.',
  },
  {
    name: 'layout',
    type: "'inline' | 'stacked'",
    fallback: "'inline'",
    description:
      'Where the control sits. stacked is for a control that has no business being squeezed into the right-hand column — a chip list, a textarea, a field with its own Save. It is a fact about the control’s shape rather than about the setting, which is why it is a rung and not a guess from the kind: a short input is happy inline, and the same kind stacked is a template editor.',
  },
  {
    name: 'hintKeys',
    type: 'string[][]',
    description:
      'Chords the setting is also reachable by, drawn as caps at the end of the help line — [[\u2318, +], [\u2318, \u2212]] for the interface scale. Two gestures are two caps, which is Kbd’s own rule. The sentence is written towards them; what used to happen instead was a help line split into two catalogue entries with the caps spliced between, which is a sentence no translator can reorder.',
  },
  {
    name: 'control (absent)',
    type: '—',
    description:
      'A row with no control states something instead of offering it: “closing the window leaves the app in the menu bar” is a fact about the setting above it, written at the same rung so it reads as part of the same card. The empty right-hand side is the whole message — there is nothing to set here.',
  },
  {
    name: 'disabled',
    type: 'boolean',
    fallback: 'false',
    description:
      'The ROW’s, and not passed down to the control: a control merely disabled would still be at full strength in a row the reader is being told does not apply.',
  },
]

export function SettingRowEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [mode, setMode] = useState('plan')
  const [enabled, setEnabled] = useState(true)
  const [watch, setWatch] = useState(false)

  const active = MODES.find((m) => m.value === mode)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SettingRow" uses={usesOf('settingrow')} onOpen={onOpen}>
        One setting: what it is called, what it does, the control that changes it, and
        what the current value means.
      </EntryHeader>

      <EntrySection
        title="The most repeated shape in the settings, and it had no owner"
        note="Application, Appearance, Claude Code and the repository tabs all stack rows of exactly this — a text-sm font-medium name over a text-xs text-text-secondary/50 help line, a control pushed to the right edge, gap-6 between them — and every one of them spelled it again. ToggleRow in the app was the switch-shaped half and stands on this now; the select-shaped half was written out four times."
      >
        <Stage theme={theme}>
          <Specimen label="a picker, with what the choice means underneath">
            <Card className="flex flex-col gap-4">
              <SettingRow
                label="Launch mode"
                hint="How agents start, before you have said anything"
                note={active?.note}
                control={{
                  kind: 'select',
                  value: mode,
                  options: MODES.map((m) => ({ value: m.value, label: m.label })),
                  onChange: setMode,
                  ariaLabel: 'Launch mode',
                  width: 208,
                }}
              />
            </Card>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The control is data, not a child"
        note="A kind and its props go in; the row draws the control and owns where it sits. A new kind is a new member of the union, deliberately: the day a row needs a stepper or an input, that is one line in the component and a compiler error at every call site that has to care — where a children slot would have accepted it silently, at whatever size the call site felt like."
      >
        <Stage theme={theme}>
          <Specimen label="a switch, a pair, and a row switched off by the one above it">
            <Card className="flex flex-col gap-4">
              <SettingRow
                label="Usage card"
                hint="The plan gauges, at the foot of the left sidebar"
                control={{ kind: 'switch', checked: enabled, onChange: setEnabled, label: 'Usage card' }}
              />
              <div className="border-t border-line-subtle" />
              <SettingRow
                label="Agent context"
                hint="What the agent is spending, on the right"
                disabled={!enabled}
                control={[
                  {
                    kind: 'select',
                    value: 'full',
                    options: [
                      { value: 'full', label: 'Expanded' },
                      { value: 'minimized', label: 'Compact' },
                    ],
                    onChange: () => undefined,
                    ariaLabel: 'Agent context format',
                    width: 128,
                  },
                  { kind: 'switch', checked: watch, onChange: setWatch, label: 'Agent context' },
                ]}
              />
            </Card>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The pair reads left to right and the switch goes last, because the switch is the
          row’s <em>answer</em> and the picker is a detail of it — which is the order the
          sidebar rows already had. <code>disabled</code> is the row’s: the second row
          above is dimmed whole, rather than keeping a bright label over an inert control.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SettingRow } from '@ds/desktop'

<SettingRow
  label={t('settings.launchMode.label')}
  hint={t('settings.launchMode.help')}
  note={active ? t(active.descriptionKey) : undefined}
  control={{
    kind: 'select',
    value: launchMode,
    options: LAUNCH_MODE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    onChange: (next) => handleLaunchModeChange(next as LaunchMode),
    ariaLabel: t('settings.launchMode.label'),
    width: SELECT_WIDTH,
  }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
