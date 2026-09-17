'use client'

import { SectionHeader } from '@ds/desktop'
import { Building2, Lock, NotebookPen, Plus, RefreshCw, User, UserPlus } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const noop = () => undefined

const PROPS: PropRow[] = [
  { name: 'icon', type: 'IconComponent', required: true, description: 'The mark in the gutter, at 16px.' },
  { name: 'title', type: 'string', required: true, description: 'What the section is. Already translated; truncates.' },
  {
    name: 'count',
    type: 'number',
    description:
      'How many things are under it, drawn quiet beside the title. It rides with the title and not at the far edge, because a count is part of what the heading says — “Personal, three of them” is one phrase, and putting the figure at the other end of the row makes the eye travel the width of the page to finish reading a label. Omit where the section is not a list: a count of one setting is noise.',
  },
  {
    name: 'actions',
    type: 'SectionHeaderAction[]',
    description:
      'At the far edge, where the hand goes. Data rather than a node: the predecessor took action: ReactNode, and its two call sites passed hand-built buttons with two different spellings of the same control. A list of { label, icon, onClick } lets the heading draw all of them at one rung.',
  },
  {
    name: 'spacing',
    type: "'default' | 'none'",
    fallback: "'default'",
    description:
      'none drops the bottom margin, for a parent that already spaces its children with a flex gap — the arrangement the Plans page and the repository list use, and the better one: a heading that spaces itself with a margin only one of the two knows about is a heading you have to adjust twice.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and width. Not the height, the gutter or the type.' },
]

export function SectionHeaderEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SectionHeader" uses={usesOf('sectionheader')} onOpen={onOpen}>
        What the thing under it is — a mark, a name, optionally how many, and what you can
        do to the lot.
      </EntryHeader>

      <EntrySection
        title="One heading for the whole app"
        note="The same fourteen pixels of secondary text beside a sixteen-pixel glyph were being drawn from a component in pages/Config by twelve settings surfaces, and spelled out by hand in the Plans page, the Tasks board and four places in Skills. Three of those copies had already drifted: the repository list wore an 11px uppercase variant nobody else used, and two of the counts disagreed about their own opacity. A heading repeated in eighteen places is a heading nobody can keep correct."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="bare — the shape twelve settings sections use">
            <SectionHeader icon={User} title="Profile" spacing="none" />
          </Specimen>
          <Specimen label="with a count — the repository list, one section per owner">
            <div className="flex flex-col gap-3">
              <SectionHeader icon={Lock} title="Personal" count={3} spacing="none" />
              <SectionHeader icon={Building2} title="Acme" count={0} spacing="none" />
            </div>
          </Specimen>
          <Specimen label="with actions — pinned to h-5, so a taller control overflows rather than moving the row">
            <SectionHeader
              icon={Building2}
              title="2 organizations"
              spacing="none"
              actions={[
                { id: 'create', label: 'Create', icon: Plus, onClick: noop },
                { id: 'join', label: 'Join', icon: UserPlus, onClick: noop },
              ]}
            />
          </Specimen>
          <Specimen label="a disabled action — the machine setup, while the check is still out">
            <SectionHeader
              icon={NotebookPen}
              title="Machine setup"
              spacing="none"
              actions={[{ id: 'recheck', label: 'Check again', icon: RefreshCw, disabled: true, onClick: noop }]}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The count rides with the title, the actions do not"
        note="Both are extras on one row, and they answer to different sides. An action is a control and belongs at the far edge. A count is part of what the heading says. Zero is drawn like any other number: an empty section is a fact, and whatever sits under the heading is already saying so in words."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The colour sits on the group and both children take <code>inherit</code>, which
          is how every copy of this heading already drew it and the only spelling that
          keeps the mark and the word at one weight. <code>Icon</code> has no{' '}
          <code>secondary</code> tone of its own — it offers <code>default</code>,{' '}
          <code>muted</code> and <code>inherit</code> — so a mark taking its own colour
          here would be a bright glyph beside a quiet label.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SectionHeader } from '@ds/desktop'

<SectionHeader icon={User} title={t('profile.section')} />

// In a parent that already spaces its children:
<div className="flex flex-col gap-3">
  <SectionHeader icon={Lock} title={t('settings.repos.personal')} count={repos.length} spacing="none" />
  <ItemGroup>{repos.map(renderRepoRow)}</ItemGroup>
</div>`}</Snippet>
      </EntrySection>
    </article>
  )
}
