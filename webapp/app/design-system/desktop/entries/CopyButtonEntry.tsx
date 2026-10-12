'use client'

import { CopyButton } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'value', type: 'string', required: true, description: 'What goes on the clipboard. A URL, usually.' },
  { name: 'label', type: 'string', required: true, description: 'The tooltip and the accessible name at rest, already translated. The button is icon-only everywhere, so this is the only thing that says what it does.' },
  { name: 'copiedLabel', type: 'string', required: true, description: 'What it says for the two seconds after. Confirmed only once the write RESOLVES — a refused write leaves the button offering the copy, which is the truth.' },
  { name: 'size', type: 'ButtonIconSize', fallback: "'md'", description: 'ButtonIcon’s ladder. It matters more here than on most controls: this sits beside buttons of different heights on three surfaces, and a control that ignores its neighbour’s height is what reads as broken.' },
]

export function CopyButtonEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="CopyButton" uses={usesOf('copybutton')} onOpen={onOpen}>
        A string onto the clipboard, and two seconds of tick to say it got there.
      </EntryHeader>

      <EntrySection
        title="Press it"
        note="The tick is ButtonIcon’s success tone — the one that folder wrote for “it just worked”, a state a caller swaps to for a second rather than a kind of button."
      >
        <Stage theme={theme}>
          <Specimen label="sm / md / lg — click one">
            <div className="flex items-center gap-3">
              <CopyButton value="https://github.com/acme/api/issues/412" label="Copy link" copiedLabel="Copied" size="sm" />
              <CopyButton value="https://github.com/acme/api/issues/412" label="Copy link" copiedLabel="Copied" />
              <CopyButton value="https://github.com/acme/api/issues/412" label="Copy link" copiedLabel="Copied" size="lg" />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Icon-only, always. It sits immediately left of a worded “Open on GitHub”, and a
          second set of words there takes its width from the one element that has none to
          give — a ticket’s title on a card, the condensed title in a pinned bar, the
          author and path on a review comment.
        </p>
      </EntrySection>

      <EntrySection
        title="Why the confirmation is in here"
        note="Three surfaces in two areas of the app copy a link. A copy offered on a board card, on that ticket’s own page and on a comment in the agent sidebar must not confirm differently, or hold the confirmation for a different length of time — which is a design decision, and therefore this folder’s rather than the app’s."
      >
        <Snippet>{`import { CopyButton } from '@ds/desktop'

<CopyButton
  value={issue.url}
  label={t('tasks.copyLink')}
  copiedLabel={t('tasks.copyLinkDone')}
  size="sm"
/>`}</Snippet>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <p className="max-w-2xl pt-4 text-xs leading-relaxed text-muted">
          The click carries no event — <code>ButtonIcon</code>’s contract — so a caller
          nesting this inside something clickable stops propagation on the cluster
          around it rather than asking the button to know it is nested.
        </p>
      </EntrySection>
    </article>
  )
}
