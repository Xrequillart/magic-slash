'use client'

import { RepoPageHeader } from '@ds/desktop'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'name', type: 'string', required: true, description: 'The repository’s name — the page’s h1.' },
  { name: 'color', type: 'string', required: true, description: 'Its colour, as hex: the tile appends its own 12% alpha behind the folder.' },
  { name: 'subtitle', type: 'string', required: true, description: 'The line under the name, translated. The read-only wording when the reader may not edit.' },
  { name: 'backLabel / onBack', type: 'string / () => void', required: true, description: 'The way back to the list.' },
]

export function RepoPageHeaderEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="RepoPageHeader" uses={usesOf('repopageheader')} onOpen={onOpen}>
        The top of one repository’s settings page: the way back, the repository’s tile at
        page-title scale, its name, and one line under them.
      </EntryHeader>

      <EntrySection
        title="The tile the list draws, at 40px"
        note="The same object the repository list, the rail and the agent sidebar draw a repository with — its colour at 12% behind a folder."
      >
        <Stage theme={theme}>
          <Specimen label="an editable repository">
            <div className="w-full">
              <RepoPageHeader name="checkout-api" color={PROJECT_COLORS[0]} subtitle="Configure repository settings" backLabel="Back to repositories" onBack={() => undefined} />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { RepoPageHeader } from '@ds/desktop'

<RepoPageHeader
  name={repoName}
  color={repoColor}
  subtitle={readOnly ? t('repo.subtitleReadOnly') : t('repo.subtitle')}
  backLabel={t('repo.back')}
  onBack={() => { window.location.hash = '#/' }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
