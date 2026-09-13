'use client'

import { useState } from 'react'
import { ButtonIcon, type ButtonIconSize } from '@ds/desktop'
import { ArrowDownUp, ExternalLink, Minus, Play, Trash2 } from '@ds/desktop/icons'
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
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg'",
    fallback: "'sm'",
    description:
      '24 / 28 / 32 — Label’s and Status’s three. A control that is only a mark sits in rows with the badges that name things; a scale of its own would be a second ladder to keep in step.',
  },
  {
    name: 'active',
    type: 'boolean',
    description:
      'The control is on — a filter applied, a sort that is not the default. It takes the accent ground at rest, the one case a chip may announce a colour before being touched, and becomes a toggle for a screen reader through aria-pressed. Undefined rather than false by default: a button that does not toggle should not announce itself as an unpressed switch.',
  },
  { name: 'disabled', type: 'boolean', fallback: 'false', description: 'Half opacity, and no pointer.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement — ml-auto, a gap. Not the size, the ground or the hover.' },
]

/** The sort button, as the app draws it: tinted while the order is not the default. */
function Toggle() {
  const [on, setOn] = useState(false)
  return <ButtonIcon icon={ArrowDownUp} title="Sort the agents" active={on} onClick={() => setOn((v) => !v)} />
}

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
        A control that is a mark and nothing else, on the ticket badge’s own ground. Written out, the agent sidebar’s four repository actions ran to some 270px of a
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

      <EntrySection
        title="Sizes"
        note="Three, and they are Label's and Status's — the same 24 / 28 / 32. A control that is only a mark sits in rows with the badges that name things: the repository card is a Label and four of these on one line. A scale of its own would be two ladders to keep in step, and the first row where they disagreed would be the one nobody noticed."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {(
            [
              ['sm', '24px · every one of the app’s eight'],
              ['md', '28px · a row of 14px type'],
              ['lg', '32px · the mark is the row’s subject'],
            ] as [ButtonIconSize, string][]
          ).map(([size, note]) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-8 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {size}
              </span>
              <ButtonIcon icon={Play} title="Run a script" size={size} onClick={() => undefined} />
              <ButtonIcon icon={Trash2} title="Remove" size={size} tone="danger" onClick={() => undefined} />
              <span className="font-mono text-[10px] text-text-secondary">{note}</span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="On, and off"
        note="The one case a chip may announce a colour before being touched: the row is no longer four equal siblings, and saying which one is doing something is the point. It carries aria-pressed with the tint — the app's sort button had the colour and not the state, so a control that said “sorted by recent” on screen said only “button” out loud."
      >
        <Stage theme={theme} className="flex items-center gap-4">
          <Toggle />
          <span className="font-mono text-[10px] text-text-secondary">
            press it — the sort button in the agents header is this exact control
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ButtonIcon } from '@ds/desktop'
import { ArrowDownUp, Trash2 } from '@ds/desktop/icons'

<ButtonIcon icon={Trash2} title={t('repo.remove')} tone="danger" onClick={remove} />

// A toggle: the tint and the aria-pressed come together.
<ButtonIcon
  icon={ArrowDownUp}
  title={t('sidebar.sort.title', { mode })}
  active={open || current !== DEFAULT_AGENT_SORT}
  onClick={toggle}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <strong className="font-semibold text-ink">Migrated.</strong> The app’s{' '}
          <code>ACTION_CHIP</code> had eight square call sites — the repository card’s four, the
          usage card’s two, the sidebar’s new-agent button and the agent sort — and all eight are
          this component now. It sets <code>type=&quot;button&quot;</code>, which 238 of the
          renderer’s buttons do not: a bare button inside a form submits it.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>ACTION_CHIP</code> itself stays, for the three of its nineteen uses that are{' '}
          <em>not</em> icon-only — a branch name, a refresh with its word beside it, and the
          scripts menu with its chevron. Folding those in would mean a <code>children</code> slot,
          which is how a component like this one stops being about one thing.{' '}
          <code>BTN_ICON</code> in the app’s <code>theme/controls.ts</code> is a second
          icon-button language — 28px, bordered, on <code>bg-surface</code> — and is still out
          there in Settings. It is not a size of this one, and which of the two the app should
          keep is a decision for a person rather than for a migration.
        </p>
      </EntrySection>
    </article>
  )
}
