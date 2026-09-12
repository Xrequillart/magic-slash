'use client'

import { ButtonIcon } from '@ds/desktop'
import { ExternalLink, Minus, Play, Trash2 } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  { name: 'icon', type: 'IconComponent', required: true, description: 'The mark, from @ds/desktop/icons.' },
  {
    name: 'title',
    type: 'string',
    required: true,
    description:
      'The name of the action — the tooltip and the accessible name at once. Required, and the only required string in this folder: an icon-only control with no name is a control only its author can use, and there is no label beside it to fall back on.',
  },
  { name: 'onClick', type: '() => void', required: true, description: 'It is always a button. There is no inert form of this one.' },
  {
    name: 'tone',
    type: "'neutral' | 'danger' | 'vscode'",
    fallback: "'neutral'",
    description:
      'A hover tint and nothing at rest: these sit in rows of siblings, and a chip announcing its colour before being touched breaks the row into unrelated controls. The two exceptions are the app’s real ones — removing a repository, and opening one in VS Code, whose blue is the editor’s and not a token.',
  },
  { name: 'disabled', type: 'boolean', fallback: 'false', description: 'Half opacity, and no pointer.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement — ml-auto, a gap. Not the size, the ground or the hover.' },
]

export function ButtonIconEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ButtonIcon" uses={[{ id: 'icon', label: 'Icon' }]} onOpen={onOpen}>
        A control that is a mark and nothing else — a 24px square on the ticket badge’s own
        ground. Written out, the agent sidebar’s four repository actions ran to some 270px of a
        288px column, so the mark carries the meaning and the tooltip carries the name.
      </EntryHeader>

      <EntrySection
        title="Tones"
        note="Nothing at rest, a tint on hover. Put a cursor on them."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-3">
          <ButtonIcon icon={Play} title="Run a script" onClick={() => undefined} />
          <ButtonIcon icon={Minus} title="Fold" onClick={() => undefined} />
          <ButtonIcon icon={ExternalLink} title="Open in VS Code" tone="vscode" onClick={() => undefined} />
          <ButtonIcon icon={Trash2} title="Remove the repository" tone="danger" onClick={() => undefined} />
          <ButtonIcon icon={Play} title="Unavailable" onClick={() => undefined} disabled />
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ButtonIcon } from '@ds/desktop'
import { Trash2 } from '@ds/desktop/icons'

<ButtonIcon icon={Trash2} title={t('repo.remove')} tone="danger" onClick={remove} />`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <strong className="font-semibold text-ink">Not migrated in the app.</strong> The design
          system holds the shape and the rule; the renderer’s 284 buttons are a separate job. This
          one sets <code>type=&quot;button&quot;</code>, which 238 of them do not — a bare button
          inside a form submits it.
        </p>
      </EntrySection>
    </article>
  )
}
