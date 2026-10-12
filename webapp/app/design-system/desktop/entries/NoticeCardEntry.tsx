'use client'

import { NoticeCard, type NoticeCardRow } from '@ds/desktop'
import { VSCode, Wand2 } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const ACCENT = 'rgb(var(--c-accent, 99 102 241))'
const BLUE = 'rgb(var(--c-blue, 59 130 246))'
const GREEN = 'rgb(var(--c-green, 34 197 94))'

const PROPS: PropRow[] = [
  {
    name: 'children',
    type: 'string',
    required: true,
    description:
      'The fact, already translated — the banner’s own sentence, and a string for the banner’s own reason. It states a total; the rows underneath are what the total is made of.',
  },
  {
    name: 'rows',
    type: 'NoticeCardRow[]',
    description:
      'The evidence: a name, an optional measurement at the quiet end of the row, and optional tags saying where it was found. An empty list draws no body and no hairline, so the card is the band alone.',
  },
  {
    name: 'actions',
    type: 'BannerAction[]',
    description:
      'What can be done about ALL of them, in the band. The banner ranks them and paints them in the variant’s colour. A fix that differs per row is a RepairList, not this.',
  },
  {
    name: 'rows[].tags[].color',
    type: 'string',
    description:
      'A CSS value — Label’s contract — and never a class. What a hue MEANS is the caller’s: the skills page decides built-in is the accent and a repository is blue, and a table of those meanings in here would be the app’s vocabulary stored in the shared folder.',
  },
  {
    name: 'variant / icon / hint',
    type: 'BannerVariant | IconComponent | string',
    description: 'Passed straight through to the band. See Banner — this card adds nothing to them.',
  },
]

const DUPLICATES: NoticeCardRow[] = [
  {
    id: 'magic-commit',
    name: 'magic-commit',
    detail: '2x',
    tags: [
      { label: 'Built-in', color: ACCENT },
      { label: 'magic-slash', color: BLUE },
    ],
  },
  {
    id: 'brand-designer',
    name: 'brand-designer',
    detail: '3x',
    tags: [
      { label: 'Built-in', color: ACCENT },
      { label: 'poppins', color: BLUE },
      { label: 'Local', color: GREEN },
    ],
  },
]

const LONG: NoticeCardRow[] = [
  { id: 'skill-creator', name: 'skill-creator', detail: '186 words' },
  { id: 'magic-plan', name: 'magic-plan', detail: '142 words' },
  { id: 'poster', name: 'poster', detail: '118 words' },
]

export function NoticeCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="NoticeCard" uses={usesOf('noticecard')} onOpen={onOpen}>
        A fact about a set of things, and the things — a banner across the top and, under
        the hairline, one row per thing it counts.
      </EntryHeader>

      <EntrySection
        title="A banner counts, but it cannot name"
        note="“3 skills have descriptions longer than 110 words” is a banner’s whole sentence, and the reader’s next question is always which three. Banner.children is a string on purpose, so the naming had nowhere to go — and it went into two hand-built boxes on the skills page, rounded-lg bg-orange/10 border border-orange/20 px-3 py-2.5, written out twice with their own pairs of buttons spelled text-orange border border-orange/20 by hand."
      >
        <Stage theme={theme}>
          <Specimen label="the fact, the fix, and the three it means">
            <NoticeCard
              variant="warning"
              rows={LONG}
              actions={[
                { label: 'Open in VS Code', icon: VSCode, onClick: () => undefined },
                { label: 'Fix with agent', icon: Wand2, onClick: () => undefined, primary: true },
              ]}
            >
              3 skills with descriptions longer than 110 words. Consider optimizing them for
              better performance.
            </NoticeCard>
          </Specimen>
          <Specimen label="tags, for a row that is listed because it is in two places at once">
            <NoticeCard variant="warning" rows={DUPLICATES}>
              2 skill names are used in multiple sources. Duplicates may cause unexpected
              behavior.
            </NoticeCard>
          </Specimen>
          <Specimen label="no rows: the band alone, and no hairline under it">
            <NoticeCard variant="info">
              Every skill fits the listing budget on a 1M window.
            </NoticeCard>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The band is a real <code>Banner</code> at its <code>inset</code> layout, which is
          the one defined as sitting between two hairlines: the card’s own edge is the
          first, and the rule over the rows is the second. That is also why the card pays
          no padding and clips — a full-bleed band inside a padded card would leave a frame
          of surface showing around the tint.
        </p>
      </EntrySection>

      <EntrySection
        title="The severity is stated once"
        note="The rows of a warning are not each a warning."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The measurements at the end of each row are secondary ink, not orange. They were
          orange — <code>text-orange/70</code> — back when the whole box was tinted and
          there was something for them to belong to. The tint has moved up into the band,
          and a column of orange figures under an orange band is the same statement made
          twice. The tags keep their own hues because those say something the band does
          not: which source each copy came from.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { NoticeCard } from '@ds/desktop'

<NoticeCard
  variant="warning"
  actions={[
    { label: t('skills.openInVSCode'), icon: VSCode, onClick: openAll },
    { label: t('skills.fixWithAgent'), icon: Wand2, onClick: onFix, primary: true },
  ]}
  rows={longDescriptions.map((entry) => ({
    id: \`\${entry.source}-\${entry.name}\`,
    name: entry.name,
    detail: t('skills.longDesc.words', { count: entry.wordCount }),
  }))}
>
  {t('skills.longDesc.other', { count: longDescriptions.length })}
</NoticeCard>`}</Snippet>
      </EntrySection>
    </article>
  )
}
