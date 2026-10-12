'use client'

import { RepositoryList } from '@ds/desktop'
import { Building2, Lock } from '@ds/desktop/icons'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const noop = () => undefined

const PROPS: PropRow[] = [
  { name: 'add', type: '{ label, busy?, onClick }', required: true, description: 'The one action, at the right edge. busy spins the mark: adding hits the cloud, and a button that only dims says “unavailable” about a control that is working.' },
  { name: 'sections', type: 'RepositoryListSection[]', required: true, description: 'One per owner — the reader’s own, each organization’s — with RepositoryItem props per row, and the sentence for an owner with none.' },
  { name: 'empty', type: '{ title, hint }', description: 'No repository at all: the whole list becomes one dashed box that adds the first one.' },
]

export function RepositoryListEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="RepositoryList" uses={usesOf('repositorylist')} onOpen={onOpen}>
        The Repositories page: the button that adds one, and a section per owner with a
        RepositoryItem per repository.
      </EntryHeader>

      <EntrySection
        title="Two owners, and one with nothing yet"
        note="No heading over the whole: the window has one page and the page is the repositories. What a row says — which remote, how many agents, whether a folder is bound — is worked out by the app."
      >
        <Stage theme={theme}>
          <Specimen label="personal, an organization, an empty organization">
            <div className="w-full">
              <RepositoryList
                add={{ label: 'Add repository', onClick: noop }}
                sections={[
                  { id: 'me', icon: Lock, title: 'Personal', empty: 'No personal repository.', rows: [{ key: 'side', name: 'side-project', color: PROJECT_COLORS[4], href: '#', path: '~/Code/side-project', remote: { connected: true, label: 'Connected' } }] },
                  { id: 'acme', icon: Building2, title: 'Acme', empty: 'No shared repository yet.', rows: [
                    { key: 'api', name: 'checkout-api', color: PROJECT_COLORS[0], href: '#', path: '~/Code/acme/checkout-api', remote: { connected: true, label: 'Connected' }, agents: '2 agents' },
                    { key: 'mobile', name: 'mobile-app', color: PROJECT_COLORS[2], href: '#', missingPath: 'No local folder — click to set it' },
                  ] },
                  { id: 'labs', icon: Building2, title: 'Acme Labs', empty: 'No shared repository in this organization yet.', rows: [] },
                ]}
              />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { RepositoryList } from '@ds/desktop'

<RepositoryList
  add={{ label: t('settings.repos.add'), busy: isAdding, onClick: handleOpenProject }}
  empty={{ title: t('settings.repos.emptyTitle'), hint: t('settings.repos.emptyHint') }}
  sections={sections}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
