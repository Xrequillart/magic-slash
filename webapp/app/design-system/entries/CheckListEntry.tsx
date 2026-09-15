'use client'

import { CheckList, COMPONENT_SIZES, CollapsibleLine, type CheckListEntry as Check } from '@ds/desktop'
import { AlertTriangle } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'checks',
    type: 'CheckListEntry[]',
    required: true,
    description:
      'The checks, worst first. The order is the caller’s: a watcher that caps its list keeps the failures and the runs, and sorting again in here would put back the passed checks it deliberately dropped.',
  },
  {
    name: 'more',
    type: 'string',
    description:
      '“and 14 more”, when the list is capped — already composed and already translated. A fold showing 20 checks under a header that reads 12/34 invites the reader to count, and the count they arrive at is wrong.',
  },
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg'",
    fallback: "'sm'",
    description:
      'ComponentSize, which is Label’s scale promoted to the shared one. sm is the fold this was built for — a 10px name beside a 12px tick. It climbs because the line above it climbed, never because the list wants to be louder.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and placement. Not the gutter, the row height or either colour.',
  },
]

const ENTRY_PROPS: PropRow[] = [
  {
    name: 'name',
    type: 'string',
    required: true,
    description: 'The check’s name, as CI reports it — “build / macos”, “test (node 20)”.',
  },
  {
    name: 'state',
    type: "'passed' | 'failed' | 'running' | 'skipped'",
    required: true,
    description:
      'Which of the four. NEUTRAL, CANCELLED, TIMED_OUT and the rest of the Checks API fold into these at the edge that reads them — a scale with nine rungs would be nine icons nobody can tell apart at 12px.',
  },
  {
    name: 'stateLabel',
    type: 'string',
    description:
      'The state as a word, for the mark’s tooltip. Optional rather than required: the colour and the glyph already say it to anyone who can see them, so a list without it is quieter than it should be but never wrong.',
  },
]

const RUN: Check[] = [
  { name: 'e2e / chromium', state: 'failed', stateLabel: 'Failed' },
  { name: 'build / macos', state: 'running', stateLabel: 'Running' },
  { name: 'lint', state: 'passed', stateLabel: 'Passed' },
  { name: 'test (node 20)', state: 'passed', stateLabel: 'Passed' },
  { name: 'codeql / javascript', state: 'skipped', stateLabel: 'Skipped' },
]

export function CheckListEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="CheckList" uses={usesOf('checklist')} onOpen={onOpen}>
        The named CI checks behind a count — what “9/12 passed” is actually made of. It
        unfolds under a <code>CollapsibleLine</code> whose header carries the figure, which
        is why it has no heading, no total and no ground of its own.
      </EntryHeader>

      <EntrySection
        title="Where it lives"
        note="Never on its own: it is the inside of a fold, and the line above it already said how many there are and how far along they got. A version of this with its own title and its own count would be the fold arguing with the line it hangs off."
      >
        <Stage theme={theme}>
          <div className="max-w-[420px] overflow-hidden rounded-lg bg-ink/5">
            <CollapsibleLine
              icon={AlertTriangle}
              tone="red"
              label="Checks"
              detail={<span className="text-[10px] tabular-nums text-text-secondary/60">2/34 passed</span>}
              toggle={{ open: true, onToggle: () => {} }}
            >
              <CheckList checks={RUN} more="and 29 more" />
            </CollapsibleLine>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The glyphs are in here, the words are not"
        note="CHECK_STATE_MARK maps each state to its mark and its colour, on PR_STATE_MARK’s model: a red cross for a failed check is not a fact about one app’s watcher, it is what a failed check looks like. What the caller keeps is the half that needs a catalogue and a language — so two surfaces listing checks cannot disagree about what skipped looks like."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          <Specimen label="the four states, and the one that turns">
            <div className="max-w-[420px] rounded-lg bg-ink/5 p-3">
              <CheckList checks={RUN} />
            </div>
          </Specimen>
          <Specimen label="capped — said out loud rather than silently dropped">
            <div className="max-w-[420px] rounded-lg bg-ink/5 p-3">
              <CheckList checks={RUN.slice(0, 2)} more="and 32 more" />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>skipped</code> is muted rather than neutral. It is the one state that is
          settled without having been done, and a grey minus beside a green tick reads as
          “not applicable” where a full-strength one reads as a third outcome.
        </p>
      </EntrySection>

      <EntrySection
        title="Seven rungs, and they are the folder’s"
        note="ComponentSize — 2xs through 2xl — is the folder’s one ladder, so a caller moving between components relearns nothing. sm is what this always drew: the names used to be a hand-spelled text-[10px], and now they are Text’s 2xs rung."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          {COMPONENT_SIZES.map((size) => (
            <Specimen key={size} label={size}>
              <div className="max-w-[420px] rounded-lg bg-ink/5 p-3">
                <CheckList checks={RUN.slice(0, 3)} more="and 31 more" size={size} />
              </div>
            </Specimen>
          ))}
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The mark is a rung above the word at the bottom two, and they meet at the top. A tick, a
          cross and a spinner have to be told apart at a glance, and below 12px they cannot be — so
          the glyph holds its own floor while the name drops beneath it. The indent on{' '}
          <code>more</code> is measured rather than chosen: the mark’s width plus the gap, so the
          remark starts where the names start and not where their icons do.
        </p>
      </EntrySection>

      <EntrySection
        title="One component, not a row plus a list"
        note="This folder usually splits them — CommitLine/CommitCard, FileModifiedLine/UnCommittedChangesCard. Those rows are things a page draws on their own: one file in a review drawer, one commit in a timeline."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          A single CI check is not. It only means anything as part of the run it belongs
          to, next to the ones that passed — so exporting a <code>CheckLine</code> would be
          offering a component whose only honest use is this one.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <p className="max-w-2xl pt-6 text-xs leading-relaxed text-muted">
          Each entry of <code>checks</code>:
        </p>
        <PropsTable rows={ENTRY_PROPS} />
        <Snippet>{`import { CheckList } from '@ds/desktop'

<CheckList
  checks={checkList.map(check => ({
    name: check.name,
    state: check.state,
    stateLabel: t(CHECK_STATE_LABELS[check.state]),
  }))}
  more={hidden > 0 ? t('agentInfo.pr.checksMore', { count: hidden }) : undefined}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
