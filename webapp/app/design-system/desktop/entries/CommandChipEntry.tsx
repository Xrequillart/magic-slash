'use client'

import { CommandChip } from '@ds/desktop'
import { Terminal } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'children', type: 'string', required: true, description: 'The command, verbatim. A string and never a node — a command with structure in it is a code block, which is a different object with a different measure.' },
  { name: 'icon', type: 'IconComponent', description: 'A mark before it, saying where the command goes. Terminal is the usual one; a chip with no glyph is legitimate where the surrounding sentence already said.' },
  { name: 'copy', type: '{ label, copiedLabel }', description: 'A CopyButton at the end of the chip. Worth it for anything longer than two tokens, and worth NOT having for a command quicker to type than to reach for — the button is 24px of the plate either way.' },
]

export function CommandChipEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="CommandChip" uses={usesOf('commandchip')} onOpen={onOpen}>
        A command the reader is meant to type, on a plate that says so.
      </EntryHeader>

      <EntrySection
        title="It is not a button and must not look like one"
        note="That is the whole reason it is its own component rather than a Label with a mono class on it: everything else this app puts on a small rounded plate can be pressed, and a chip that reads as pressable while the only thing it can do is be retyped in a terminal is the cruellest control on a page about something being broken."
      >
        <Stage theme={theme}>
          <Specimen label="bare, with a mark, and with the one pressable part it is allowed">
            <div className="flex flex-col items-start gap-3">
              <CommandChip>brew install gh</CommandChip>
              <CommandChip icon={Terminal}>gh auth login</CommandChip>
              <CommandChip icon={Terminal} copy={{ label: 'Copy', copiedLabel: 'Copied' }}>
                gh auth login --scopes repo,read:org
              </CommandChip>
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          No hover on the plate, no pointer, nothing in the tab order — and, where the
          command is worth carrying away, a <code>CopyButton</code> inside it that is
          unambiguously the pressable part.
        </p>
      </EntrySection>

      <EntrySection
        title="A sunken plate, not a border"
        note="The four hand-built copies of this in the app were all border border-line rounded-md with the text at [11px], which is a box drawn around a phrase."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          A recessed plate says “this is a different kind of text” without an edge, and it
          is the same ground the diff and log views already read code on. The four it
          replaces — two on the Tasks page’s GitHub panel, one in the setup wizard’s
          prerequisite row, one in the repository settings page — disagreed about their
          padding, their radius and whether the glyph came before the command.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The command wraps with <code>break-all</code> rather than truncating: half a
          command is not a command, so a chip too narrow for one breaks it rather than
          hiding the end behind an ellipsis nobody can expand.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { CommandChip } from '@ds/desktop'

<CommandChip icon={Terminal} copy={{ label: t('copy'), copiedLabel: t('copied') }}>
  gh auth login
</CommandChip>`}</Snippet>
      </EntrySection>
    </article>
  )
}
