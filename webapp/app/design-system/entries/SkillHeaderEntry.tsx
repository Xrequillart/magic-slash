'use client'

import { SkillHeader } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const ACCENT = 'rgb(var(--c-accent, 99 102 241))'
const BLUE = 'rgb(var(--c-blue, 59 130 246))'

const PROPS: PropRow[] = [
  { name: 'name', type: 'string', required: true, description: 'What the skill is called, in sentence case.' },
  { name: 'source', type: '{ label, color? }', description: 'Where it came from. color is a CSS value, Label.color’s contract: what a hue means belongs to the caller.' },
  {
    name: 'readOnlyLabel',
    type: 'string',
    description:
      'The words for “read-only”, translated. Present draws the padlock chip; absent draws nothing. A string and not a boolean, because the chip is a WORD and this folder cannot look one up — the presence of the word is the flag.',
  },
  { name: 'tools / toolsLabel', type: 'string[] | string', description: 'One chip each, already split by the caller, set in mono: a tool pattern is code, and Bash(*) in the UI face reads as prose. None draws no row at all.' },
  { name: 'argumentHint / argumentLabel', type: 'string', description: 'What the skill expects after its name, and the word introducing it. The value alone would be a bare string with nothing saying what it is.' },
  { name: 'sourcePath', type: 'string', description: 'Where the file is, drawn as the path it is. Truncates, with the full path as its tooltip.' },
]

export function SkillHeaderEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SkillHeader" uses={usesOf('skillheader')} onOpen={onOpen}>
        What a skill is, read rather than edited: its picture, its name, where it came
        from, what it does, what it may touch, and the file it lives in.
      </EntryHeader>

      <EntrySection
        title="A document has a masthead; a form has fields you cannot fill"
        note="A built-in skill and one that lives in a repository cannot be changed from here, and the page used to say so by showing the editor with every field disabled — which announced “you may not touch this” far louder than it said what the skill was for, with the instructions themselves greyed out in a monospace textarea."
      >
        <Stage theme={theme}>
          <Specimen label="a built-in, with tools and an argument">
            <SkillHeader
              name="magic-commit"
              source={{ label: 'Built-in', color: ACCENT }}
              readOnlyLabel="Read-only"
              description="Creates atomic commits with conventional messages, splitting the staged changes into logical units without asking."
              argumentLabel="Arguments"
              argumentHint="[--no-split]"
              toolsLabel="Allowed tools"
              tools={['Bash(*)', 'Read', 'Edit', 'Write', 'Glob', 'Grep']}
              sourcePath="~/.claude/skills/magic-commit/SKILL.md"
            />
          </Specimen>
          <Specimen label="one from a repository, with nothing but a description">
            <SkillHeader
              name="brand-designer"
              source={{ label: 'poppins', color: BLUE }}
              readOnlyLabel="Read-only"
              description="Poppins brand identity guardian."
              sourcePath="/Users/x/Documents/poppins/.claude/skills/brand-designer/SKILL.md"
            />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>SkillCard</code> is the same subject at a different distance — a tile in a
          grid you are scanning, three facts and an arrow. This is the one you arrived at.
          The read-only chip is neutral and not a colour: it is not a warning and not a
          failure, it is the ordinary state of most of these.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SkillHeader } from '@ds/desktop'

<SkillHeader
  name={skill.name}
  imageUrl={imageUrl}
  source={source}
  readOnlyLabel={t('skills.doc.readOnly')}
  description={skill.description}
  toolsLabel={t('skills.editor.allowedTools')}
  tools={tools}
  sourcePath={sourcePath}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
