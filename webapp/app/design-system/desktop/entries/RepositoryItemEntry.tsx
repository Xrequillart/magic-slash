'use client'

import { ItemGroup, RepositoryItem } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** Three of the sixteen hues the app assigns a repository at runtime. */
const ROSE = '#F43F5E'
const CYAN = '#06B6D4'
const AMBER = '#F59E0B'

const PROPS: PropRow[] = [
  {
    name: 'name',
    type: 'string',
    required: true,
    description: 'The repository’s name. What truncates when the row runs out of room.',
  },
  {
    name: 'color',
    type: 'string',
    description:
      'The repository’s hue, one of the sixteen the app assigns at runtime. It tints the name’s plate and paints the folder mark on it — that colour is the only thing telling two of these rows apart. A value and not a class: it is picked while the app is running, so Tailwind never saw it.',
  },
  {
    name: 'remote',
    type: '{ connected: boolean; label: string }',
    description:
      'The GitHub chip: whether the repository has a remote, and the translated word for it. Absent draws nothing, and that is a real state — a repository with no local folder has not been looked at yet, so “no remote” would be a verdict on a question nobody has asked.',
  },
  { name: 'path', type: 'string', description: 'Where it is on this disk.' },
  {
    name: 'missingPath',
    type: 'string',
    description:
      'Replaces the path when there is no local folder bound, in the warning’s own yellow: the translated line saying so, and what to do about it.',
  },
  {
    name: 'agents',
    type: 'string',
    description:
      'How many agents are working in it, already counted and already worded — “3 agents”, not 3. The plural rule belongs to the app’s catalogue, not to a component that cannot know which language it is rendering in.',
  },
  {
    name: 'href',
    type: 'string',
    required: true,
    description: 'Where the row goes. Item renders an <a> for it, which is what a row of a list is.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description:
      'Placement. Not a margin, which is the one thing it used to be for: the rows are flush now, and a gap between two of them breaks the stack the first and last radii are describing.',
  },
]

export function RepositoryItemEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="RepositoryItem" uses={usesOf('repositoryitem')} onOpen={onOpen}>
        One repository as the settings list shows it: its name, whether it has a remote, where
        it is on this disk, and how many agents are in it right now. Four facts and a chevron —
        the only thing you can do with it is open it.
      </EntryHeader>

      <EntrySection
        title="The list"
        note="The chrome is Item's. The row wore border-line-strong all the way round its own plate, and eight of them drew a ladder of hairlines down the panel — a table's rules without a table's columns. Then it wore a plate of its own with a gap either side, which made a list of eight read as eight cards that happened to be near each other. It is flush now, on the ground, the hover, the rule and the radius PlanItem stands on: one panel divided into eight."
      >
        <Stage theme={theme}>
          <ItemGroup>
            <RepositoryItem
              name="magic-slash"
              color={ROSE}
              remote={{ connected: true, label: 'Connected' }}
              path="/Users/you/Documents/magic-slash"
              agents="3 agents"
              href="#"
            />
            <RepositoryItem
              name="notes"
              color={CYAN}
              remote={{ connected: true, label: 'Connected' }}
              path="/Users/you/Documents/notes"
              href="#"
            />
            <RepositoryItem
              name="scratch"
              remote={{ connected: false, label: 'No remote' }}
              path="/Users/you/Documents/scratch"
              href="#"
            />
          </ItemGroup>
        </Stage>
      </EntrySection>

      <EntrySection
        title="What it is on the left, what is true of it on the right"
        note="The name and the path are the repository; the remote and the agent count are states it happens to be in. Those two used to sit on either side of the row — the remote beside the name, the count at the far edge — which put one fact of a pair in the title and the other in the margin. Gathered at the right edge they read as one column of statuses you can scan straight down, both a rung under the name, and the left column is then only ever a name over a path."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <ItemGroup>
            <RepositoryItem
              name="acme-checkout-api"
              color={AMBER}
              remote={{ connected: true, label: 'Connected' }}
              path="/Users/you/Developer/acme/services/checkout-api"
              agents="1 agent"
              href="#"
            />
          </ItemGroup>
          <span className="font-mono text-[10px] text-text-secondary">
            the mark sits inside the name’s plate, where it used to be a 32px tile of its own
            in front of the row — it gives the name a left edge that lines up down the column.
            gap-2 under it and not gap-1: the gap is what says the path is a caption rather
            than the row’s second field
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A repository with no local folder"
        note="The path line becomes the warning, and the remote chip goes away rather than reporting none: until a folder is bound there is nothing to read a remote off, so “No remote” would be a verdict on a question nobody has asked."
      >
        <Stage theme={theme}>
          <ItemGroup>
            <RepositoryItem
              name="shared-design-tokens"
              color={CYAN}
              missingPath="No local folder — click to set it"
              href="#"
            />
          </ItemGroup>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The name gives way, the statuses never do"
        note="min-w-0 on the column and on the name inside it: a flex child will not shrink below its content without it, so a long name would push the chips and the chevron off the row instead of ellipsising. The path stays in the tooltip, which is also the only thing telling two checkouts of one repository apart."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <div className="w-[360px]">
            <ItemGroup>
              <RepositoryItem
                name="acme-checkout-api-PAY-318-invoice-vat"
                color={ROSE}
                remote={{ connected: true, label: 'Connected' }}
                path="/Users/you/Developer/acme/services/checkout-api-PAY-318-invoice-vat"
                agents="2 agents"
                href="#"
              />
            </ItemGroup>
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            360px — hover the name for the path
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { RepositoryItem } from '@ds/desktop'

<RepositoryItem
  name={name}
  color={colorMap[name]}
  href={\`#/repo/\${encodeURIComponent(name)}\`}
  remote={repo.needsLocalPath ? undefined : { connected: hasGithub, label: t('settings.repos.connected') }}
  path={repo.needsLocalPath ? undefined : repo.path}
  missingPath={repo.needsLocalPath ? t('settings.repos.noLocalFolder') : undefined}
  agents={count > 0 ? t('settings.repos.agents.other', { count }) : undefined}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Not <code>RepositoryCard</code>, and the two are worth telling apart. That one is the
          agent sidebar’s panel — a stack of blocks describing the <em>work</em> happening in a
          repository, branch and diff and commits. This is a row in a list you scan.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The agent count is the one place this row spends the accent. The name wears the
          repository’s own hue and the remote chip wears a verdict; the count is the only thing
          on the row that is about <em>this app</em>, so it takes this app’s colour.
        </p>
      </EntrySection>
    </article>
  )
}
