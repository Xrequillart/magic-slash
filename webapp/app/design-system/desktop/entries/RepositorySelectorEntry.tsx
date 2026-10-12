'use client'

import { useState } from 'react'
import { RepositorySelector } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'title', type: 'string', required: true, description: 'Heads the list. It names the list, not a repository.' },
  {
    name: 'repos',
    type: '{ path, name, color?, attached }[]',
    required: true,
    description:
      'A row each. The path is the row’s identity and what onToggle hands back — not the name, because the same repository can be attached twice from two clones. The colour is resolved by the caller: it needs a palette and a config this folder cannot reach.',
  },
  { name: 'emptyLabel', type: 'string', required: true, description: 'Nothing to pick from: no repository is configured yet.' },
  { name: 'closeLabel', type: 'string', required: true, description: 'The dismiss control’s tooltip and accessible name.' },
  { name: 'onClose', type: '() => void', required: true, description: 'Dismiss.' },
  { name: 'onToggle', type: '(path) => void', required: true, description: 'Attach the repository, or detach it.' },
  {
    name: 'backdropClassName',
    type: 'string',
    description: 'The caller’s enter and exit animation — see Modal, which owns neither.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Additive on the panel.' },
  { name: 'onAnimationEnd', type: '(e) => void', description: 'For a caller driving its own exit.' },
]

const REPOS = [
  { path: '/Users/dev/magic-pay', name: 'magic-pay', color: '#F43F5E', attached: true },
  { path: '/Users/dev/magic-web', name: 'magic-web', color: '#3B82F6', attached: false },
  { path: '/Users/dev/magic-infra', name: 'magic-infra', color: '#10B981', attached: false },
  { path: '/Users/dev/scratch', name: 'scratch', attached: false },
]

export function RepositorySelectorEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  /* The dialog portals, and the theme's variables live on `Stage` rather than on `:root`
     here — so it portals INTO the stage. Without this the panel resolves `bg-bg-secondary`
     against nothing and comes out transparent. */
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const [attached, setAttached] = useState(REPOS.filter((r) => r.attached).map((r) => r.path))

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="RepositorySelector" uses={usesOf('repositoryselector')} onOpen={onOpen}>
        The picker: which repositories this agent is working in. A <code>Modal</code> holding
        a <code>Card</code>, and a row per repository.
      </EntryHeader>

      <EntrySection
        title="Every row is the repository’s own chip"
        note="A Label at lg — the same chip HeaderRepoCard puts on a repository card and SpecCard puts in its heading, one size up because here the repository is the row rather than a detail inside one. The picker used to draw one purple folder glyph on every row, so the list said nothing until it was read, while every other surface in the app had been colouring these repositories for months. Now the picker matches its own result: the card a click adds to the sidebar wears the same chip."
      >
        <Stage theme={theme}>
          <div ref={setPortal} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong"
          >
            Pick repositories
          </button>
          {open && (
            <RepositorySelector
              portalTo={portal}
              title="Repositories"
              closeLabel="Close"
              emptyLabel="No repository configured"
              repos={REPOS.map((r) => ({ ...r, attached: attached.includes(r.path) }))}
              onClose={() => setOpen(false)}
              onToggle={(path) =>
                setAttached((a) => (a.includes(path) ? a.filter((p) => p !== path) : [...a, path]))
              }
            />
          )}
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The last row has no colour, which is a real case and not a defensive one: the map is
          keyed by the reader’s local config, and an organization repository this machine
          never cloned has no entry to resolve.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { RepositorySelector } from '@ds/desktop'

<RepositorySelector
  title={t('agentInfo.selectRepositories')}
  repos={availableRepos.map(r => ({ ...r, color: colors[r.name], attached: … }))}
  onToggle={onToggleRepository}
  onClose={close}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
