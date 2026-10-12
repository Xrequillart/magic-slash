'use client'

import { BudgetMeter } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'value / max',
    type: 'number',
    required: true,
    description:
      'What is spent, and the allowance. Both figures are printed, because the question this shape answers is how much room is LEFT — not what fraction is used. value may exceed max; see tone.',
  },
  {
    name: 'unit',
    type: 'string',
    required: true,
    description: 'The noun after the pair — “chars”, “tokens”. Translated by the caller.',
  },
  {
    name: 'locale',
    type: 'string',
    required: true,
    description:
      'The BCP 47 tag the two figures are grouped in. It has to be passed: a bare toLocaleString() follows the machine’s locale, not the language the app is showing, so a French window on an English machine groups with commas.',
  },
  {
    name: 'tone',
    type: "'accent' | 'success' | 'warning' | 'danger'",
    description:
      'The colour while the reading is within the allowance. Past it the bar goes danger whatever this says — the bar is clamped at 100%, so “over” is not a width it could ever show.',
  },
]

export function BudgetMeterEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="BudgetMeter" uses={usesOf('budgetmeter')} onOpen={onOpen}>
        A quantity against its allowance: the two figures, a bar, and the percentage they
        come to.
      </EntryHeader>

      <EntrySection
        title="Both figures, because the question is how much is left"
        note="RateLimitBar reports a PROPORTION of something the server owns — 62% of the week gone, resetting in two hours — and a proportion is all it has. This one is spending against a number the reader can act on, which is why the percentage sits quiet under the bar rather than bold above it."
      >
        <Stage theme={theme}>
          <Specimen label="room to spare, and the accent it spends in">
            <div className="grid w-full grid-cols-2 gap-3">
              <BudgetMeter label="Characters" value={5200} max={40000} unit="chars" locale="en-US" tone="accent" />
              <BudgetMeter label="Tokens" value={1300} max={10000} unit="tokens" locale="en-US" tone="warning" />
            </div>
          </Specimen>
          <Specimen label="over the line: not a darker shade of nearly-full">
            <div className="grid w-full grid-cols-2 gap-3">
              <BudgetMeter label="Characters" value={9400} max={8000} unit="chars" locale="en-US" tone="accent" />
              <BudgetMeter label="Caractères" value={9400} max={8000} unit="car." locale="fr-FR" tone="accent" />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          No outline on either plate. These come in PAIRS side by side, and two outlined
          boxes with a 12px gutter between them read as a table of two cells — what is
          worth comparing is the two bars, not the two frames. <code>NoteCard</code> makes
          the same call.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The pair on the right is the same reading at <code>fr-FR</code>. Past the
          allowance the thing being measured stops working altogether — a skill listing
          over budget is a listing with descriptions silently dropped — and since the bar
          is clamped at 100%, that state has to be a colour rather than a width.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { BudgetMeter } from '@ds/desktop'

<BudgetMeter
  label={t('skills.budget.chars')}
  value={totalChars}
  max={charBudget}
  unit={t('skills.budget.unitChars')}
  locale={useLocale()}
  tone="accent"
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
