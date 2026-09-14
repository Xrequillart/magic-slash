'use client'

import { useEffect, useRef, useState } from 'react'
import { HeaderRepoCard, type SelectIconGroup } from '@ds/desktop'
import { Github, Play, VSCode } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** Two of the sixteen hues the app assigns a repository at runtime. */
const ROSE = '#F43F5E'
const CYAN = '#06B6D4'

const SCRIPTS: SelectIconGroup[] = [
  {
    label: 'magic-slash',
    items: [
      { id: '0:0', label: 'lint', hint: 'npm lint' },
      { id: '0:1', label: 'test', hint: 'npm test' },
    ],
  },
  {
    label: 'desktop',
    items: [
      { id: '1:0', label: 'dev', hint: 'npm dev', disabled: true },
      { id: '1:1', label: 'build', hint: 'npm build' },
    ],
  },
]

const PROPS: PropRow[] = [
  {
    name: 'name',
    type: 'string',
    required: true,
    description: 'The repository’s name. It is what truncates when the row runs out of room.',
  },
  {
    name: 'title',
    type: 'string',
    description:
      'The tooltip on the name — the repository’s path. A truncated name has no other way to say what it truncated, and two checkouts of one repository are told apart by nothing else.',
  },
  {
    name: 'color',
    type: 'string',
    description:
      'The repository’s hue, one of the sixteen the app assigns at runtime. A hex and not a token: it is chosen while the app is running, so Tailwind never saw it. Without one the chip falls back to the neutral plate.',
  },
  {
    name: 'onNameClick',
    type: '() => void',
    description:
      'Makes the name pressable — it opens the repository’s settings. Absent, the chip is inert and does not light up under a cursor that can do nothing with it.',
  },
  {
    name: 'scripts',
    type: "Omit<SelectIconProps, 'size' | 'tone' | 'className'>",
    description: 'The scripts menu. The size and the tone are this row’s to decide; everything else is the caller’s.',
  },
  {
    name: 'editor',
    type: '{ icon, title, onClick }',
    description:
      'Open in the editor. It wears VS Code’s own blue on hover — a borrowed colour that may never become a token, which is why ButtonIcon carries it as a tone rather than letting a call site spell the hex.',
  },
  {
    name: 'remote',
    type: '{ icon, title, onClick }',
    description:
      'Open where the repository lives. The mark is the caller’s: this row knows a remote is a place you can go, not whose place it is.',
  },
  {
    name: 'remove',
    type: '{ title, onClick }',
    description:
      'Detach the repository from the agent. No icon to pass: a cross is not a brand, and the danger tone is what actually says what this one does.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and width. Not the gaps, the order or any of the tones.' },
]

/** The portalled menu needs a host inside the themed ground — see SelectIcon’s entry. */
function usePortalHost() {
  const ref = useRef<HTMLSpanElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => setHost(ref.current), [])
  return { ref, host }
}

function Live({
  name,
  color,
  withRemote = true,
  withScripts = true,
}: {
  name: string
  color?: string
  withRemote?: boolean
  withScripts?: boolean
}) {
  const { ref, host } = usePortalHost()
  const [note, setNote] = useState<string | null>(null)
  const say = (what: string) => () => setNote(what)

  return (
    <div className="flex flex-col gap-2">
      <span ref={ref} />
      <HeaderRepoCard
        name={name}
        title={`/Users/you/Documents/${name}`}
        color={color}
        onNameClick={say('opened the settings')}
        scripts={
          withScripts
            ? {
                icon: Play,
                title: 'Run a script',
                groups: SCRIPTS,
                emptyLabel: 'No scripts',
                portalTo: host,
                onSelect: (item) => setNote(`ran ${item.label}`),
              }
            : undefined
        }
        editor={{ icon: VSCode, title: 'Open in the editor', onClick: say('opened the editor') }}
        remote={
          withRemote
            ? { icon: Github, title: 'Open on GitHub', onClick: say('opened the remote') }
            : undefined
        }
        remove={{ title: 'Remove this repository', onClick: say('removed it') }}
      />
      {note && <span className="font-mono text-[10px] text-text-secondary">{note}</span>}
    </div>
  )
}

export function HeaderRepoCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="HeaderRepoCard"
        uses={usesOf('headerrepocard')}
        onOpen={onOpen}
      >
        The top line of a repository’s card: what it is, and everything you can do to it. The
        order is the component — a name, a menu, the two places the repository exists outside
        this app, then the one control that takes it away.
      </EntryHeader>

      <EntrySection
        title="The whole row"
        note="Press anything: the name opens the repository's settings, the menu runs a script, and each button says what it did. Written in any other order the row stops reading left to right as “this thing → open it → drop it”, and the destructive control stops being where the eye arrives last."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <div className="max-w-sm">
            <Live name="magic-slash" color={ROSE} />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Every control is optional"
        note="A repository with no remote has no button for one, rather than a dead chip; a repository with no package.json has no menu. Each is an object that pairs the handler with the name it needs — the way BranchCard's copy and Label's avatar do, because an icon-only control with no name is a control only its author can use."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <div className="max-w-sm">
            <Live name="notes" color={CYAN} withRemote={false} />
          </div>
          <div className="max-w-sm">
            <Live name="scratch" withRemote={false} withScripts={false} />
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            no remote · then no menu either, and no colour — the neutral plate is the right
            answer for a repository nobody has coloured
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The name gives way, the controls never do"
        note="This lives in a sidebar that is 288px at its narrowest, holding a repository name of whatever length somebody chose. Half a chip is not a button, so the label truncates to nothing before a control loses a pixel — and the path stays in the tooltip, which is also the only thing telling two checkouts of one repository apart."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <div className="w-[288px]">
            <Live name="acme-checkout-api-PAY-318-invoice-vat" color={ROSE} />
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            288px — hover the name for the path
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { HeaderRepoCard } from '@ds/desktop'
import { Github, VSCode } from '@ds/desktop/icons'

<HeaderRepoCard
  name={repoName}
  title={repoPath}
  color={repoColor}
  onNameClick={() => openRepoSettings(repoName)}
  scripts={useScriptsMenu({ repoPath, repoName, agentId, agentName })}
  editor={{ icon: VSCode, title: t('agentInfo.openRepoInEditor'), onClick: openInEditor }}
  remote={repoUrl ? { icon: Github, title: t('agentInfo.openRepoOnGitHub'), onClick: openRemote } : undefined}
  remove={{ title: t('agentInfo.removeRepository'), onClick: onRemove }}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The scripts menu arrives as <em>props</em> and not as a rendered chip, which is why
          the app’s <code>ScriptsDropdown</code> became <code>useScriptsMenu</code>: this row
          draws its own controls, and a component handed in from outside would be a second chip
          in a row that already knows how many it has and in what order.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It is <em>not</em> the card, only its first row. What sits underneath — running
          scripts, the branch, the diff, the commits — is the caller’s, and none of it is the
          same kind of thing as a header.
        </p>
      </EntrySection>
    </article>
  )
}
