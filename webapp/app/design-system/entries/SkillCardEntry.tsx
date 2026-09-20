'use client'

import { SkillCard } from '@ds/desktop'
import { GitFork } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const ACCENT = 'rgb(var(--c-accent, 99 102 241))'

const PROPS: PropRow[] = [
  { name: 'name', type: 'string', required: true, description: 'What it is called. Drawn in sentence case — these are directory names off disk, and an identifier set flush lower-case among sentences reads as a symbol rather than a name.' },
  { name: 'description', type: 'string', description: 'The one line under it, translated. Truncates; absent draws nothing and the tile keeps its height from the 48px plate.' },
  { name: 'imageUrl', type: 'string | null', description: 'The picture, as a data: URL — Avatar.src’s contract and for its reason. Null draws icon on the empty plate. Not an Avatar: that is round and is a FACE, and a skill’s picture is artwork.' },
  { name: 'badge', type: '{ label, color? }', description: 'A plate beside the name. color is a CSS value, Label.color’s contract: what a hue means belongs to the caller.' },
]

export function SkillCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SkillCard" uses={usesOf('skillcard')} onOpen={onOpen}>
        One skill as a tile: its picture, its name, what it is for, and the arrow that
        says the whole thing opens.
      </EntryHeader>

      <EntrySection
        title="The tile, where the rail draws the row"
        note="The split this folder makes everywhere — CommitLine against CommitCard, FileModifiedLine against UnCommittedChangesCard. The skills page draws both: this is the three-across grid on the overview, and the rail down the left is the row. Neither is the other at a smaller size."
      >
        <Stage theme={theme}>
          <Specimen label="a badge, a description, and a tile with neither">
            <div className="grid w-full grid-cols-2 gap-2">
              <SkillCard
                name="magic-commit"
                description="Create atomic commits with conventional messages"
                badge={{ label: 'Built-in', color: ACCENT }}
                onClick={() => undefined}
              />
              <SkillCard
                name="brand-designer"
                description="Poppins brand identity guardian, for UI code and copy"
                onClick={() => undefined}
              />
              <SkillCard name="poster" onClick={() => undefined} />
              <SkillCard
                name="shakespeare"
                description="The official Poppins copywriter"
                icon={GitFork}
                onClick={() => undefined}
              />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          No outline. It wore <code>border border-line-strong</code> and a hover that
          changed the border to the colour it already was — a rule that did nothing on
          hover and one more edge on a grid that already has nine of them. The plate is
          the tile: <code>surface</code> against the page’s ground, stepping to{' '}
          <code>surface-strong</code> under the cursor. The arrow carries the affordance
          the border was pretending to.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SkillCard } from '@ds/desktop'

<SkillCard
  name={skill.name}
  description={skill.description}
  imageUrl={imageCache[skill.dirName] ?? null}
  badge={{ label: t('skills.source.builtIn'), color: SOURCE_COLOR['built-in'] }}
  onClick={() => { window.location.hash = \`#/skill/\${encodeURIComponent(skill.dirName)}\` }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
