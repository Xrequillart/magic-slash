'use client'

import { COMPONENT_SIZES, CollapsibleLine, Tally } from '@ds/desktop'
import { MessagesSquare } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'counts',
    type: '{ label: string; value: number }[]',
    required: true,
    description:
      'The parts, in the order they should be read. Zeroes are the caller’s to drop: which of them is worth stating is a question about what the surface is for, and this component cannot answer it.',
  },
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg'",
    fallback: "'sm'",
    description:
      'ComponentSize, which is Label’s scale promoted to the shared one. sm is the fold this was built for — a 10px pair under a 12px header. The rung only climbs because the thing above the breakdown climbed: it has no size of its own to choose.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and placement. Not the sizes, the gutters or either colour.',
  },
]

const COMMENTS = [
  { label: 'inline', value: 4 },
  { label: 'conversation', value: 2 },
  { label: 'reviews', value: 1 },
]

export function TallyEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Tally" uses={usesOf('tally')} onOpen={onOpen}>
        Several named counts on one line — a total that has already been said, broken into
        the parts it is made of. The pull request card leads with “7 comments” and unfolds
        this underneath: the number above is the answer most of the time, and this is the
        follow-up question.
      </EntryHeader>

      <EntrySection
        title="A breakdown, never a headline"
        note="It belongs under the figure it explains. A Tally with one entry in it is a sentence that would read better as a sentence — and a Tally standing alone is a total nobody stated."
      >
        <Stage theme={theme}>
          <div className="max-w-[420px] overflow-hidden rounded-lg bg-ink/5">
            <CollapsibleLine
              icon={MessagesSquare}
              tone="blue"
              label="Comments"
              muted
              detail={<span className="text-[10px] tabular-nums text-text-secondary/60">7 comments</span>}
              toggle={{ open: true, onToggle: () => {} }}
            >
              <Tally counts={COMMENTS} />
            </CollapsibleLine>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The number leads"
        note="It carries the ink while its name stays secondary: a column of these is scanned for the figures, and the words are what the figure turns out to mean. tabular-nums so a stack of them lines up on the digit rather than on the glyph — the one thing that makes several of these read as a table."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          <Specimen label="three parts">
            <div className="max-w-[420px] rounded-lg bg-ink/5 p-3">
              <Tally counts={COMMENTS} />
            </div>
          </Specimen>
          <Specimen label="it wraps — 288px is the sidebar it unfolds in">
            <div className="max-w-[240px] rounded-lg bg-ink/5 p-3">
              <Tally
                counts={[...COMMENTS, { label: 'suggestions', value: 12 }, { label: 'resolved', value: 3 }]}
              />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The gutters are uneven on purpose — wide between pairs, tight within one — so a
          wrapped line still reads as pairs rather than as six loose words.
        </p>
      </EntrySection>

      <EntrySection
        title="Seven rungs, and they are the folder’s"
        note="ComponentSize — 2xs through 2xl — is the folder’s one ladder, so a caller moving between components relearns nothing. sm is what this always drew: the pair used to be a hand-spelled text-[10px], and now it is Text’s 2xs rung."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          {COMPONENT_SIZES.map((size) => (
            <Specimen key={size} label={size}>
              <div className="max-w-[420px] rounded-lg bg-ink/5 p-3">
                <Tally counts={COMMENTS} size={size} />
              </div>
            </Specimen>
          ))}
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          One size for BOTH halves of a pair, stated once on the row: the number and its name are
          one phrase and must not be able to end up at two sizes. The gutters climb with the type —
          a 14px pair on 12px of gutter reads as two columns that collided, and the ratio is what
          keeps a wrapped line reading as pairs.
        </p>
      </EntrySection>

      <EntrySection
        title="DiffStat’s sibling, not its generalisation"
        note="The split is the same one the app makes everywhere. DiffStat is two numbers whose meaning is fixed — added and taken away, green and red, forever — where this is any number of counts whose names the caller brings."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Neither is a version of the other: a <code>DiffStat</code> built out of this would
          have lost the two colours that are its whole point.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Tally } from '@ds/desktop'

<Tally counts={rows.map(row => ({ label: t(row.label), value: row.value }))} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
