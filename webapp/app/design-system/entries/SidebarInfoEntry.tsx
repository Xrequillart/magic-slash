'use client'

import { BranchCard, Card, HeaderRepoCard, RepositoryCard, SidebarInfo, Text } from '@ds/desktop'
import { FolderGit2, Github, Play, VSCode } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  {
    name: 'width',
    type: 'number',
    required: true,
    description:
      'The column’s width in pixels, from the caller. The difference from Sidebar: the left column is a fixed 230px by decree, this one is derived — the app takes a share of the viewport, floored and capped, and widens it again for a planning agent whose spec needs the room.',
  },
  {
    name: 'collapsed',
    type: 'boolean',
    fallback: 'false',
    description: 'Folded away: it slides shut by its own width rather than unmounting, so the scroll position survives.',
  },
  {
    name: 'animate',
    type: 'boolean',
    fallback: 'false',
    description:
      'Whether a width change animates. A prop because the column cannot tell the two kinds of width change apart, and they want opposite things: folding open or shut is a move and should be seen, while a width that changed because the window was resized is not a move — easing into it lags the window edge the reader is dragging.',
  },
  { name: 'emptyLabel', type: 'string', description: 'Nothing is selected. Drawn alone, when every slot is empty.' },
  { name: 'usage', type: 'ReactNode', description: 'What the agent is spending — context, cost, model.' },
  { name: 'ticket', type: 'ReactNode', description: 'What it is working on.' },
  { name: 'spec', type: 'ReactNode', description: 'The spec being written, or read.' },
  { name: 'repositories', type: 'ReactNode', description: 'One card per attached repository, already stacked.' },
  { name: 'footer', type: 'ReactNode', description: 'Under the cards: attaching another repository.' },
  {
    name: 'fill',
    type: 'boolean',
    fallback: 'false',
    description:
      'The spec fills the column and owns the only scroll region, so this one stops scrolling — there is never a scrollbar inside a scrollbar. A layout mode rather than a style: the content box goes to h-full and its children take a gap instead of stacked margins, because one child now has to be allowed to grow.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins. Not the width, the ground, or the order of the regions.' },
]

const noop = () => undefined

function Usage() {
  return (
    <Card>
      <Text tone="secondary">Context · 42% · Opus 5</Text>
    </Card>
  )
}

function Ticket() {
  return (
    <Card className="flex flex-col gap-1">
      <Text weight="bold">PAY-318</Text>
      <Text tone="secondary">Round the VAT once, on the total</Text>
    </Card>
  )
}

function Repositories() {
  return (
    <div className="space-y-3">
      <RepositoryCard
        header={
          <HeaderRepoCard
            name="magic-pay"
            color="#F43F5E"
            scripts={{ icon: Play, title: 'Run a script', groups: [], onSelect: noop, emptyLabel: 'No scripts' }}
            editor={{ icon: VSCode, title: 'Open in the editor', onClick: noop }}
            remote={{ icon: Github, title: 'Open on GitHub', onClick: noop }}
            remove={{ title: 'Remove this repository', onClick: noop }}
          />
        }
        branch={<BranchCard branch="feature/pay-318-invoice-vat" base="main" copy={{ label: 'Copy branch name', onCopy: noop }} />}
      />
    </div>
  )
}

function AddRepo() {
  return (
    <button
      type="button"
      className="w-full rounded-xl border border-dashed border-border/50 py-4 text-center transition-colors hover:border-text-secondary/50 hover:bg-surface"
    >
      <span className="text-xs text-text-secondary/50">Add a repository</span>
    </button>
  )
}

export function SidebarInfoEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="SidebarInfo"
        uses={[
          { id: 'repositorycard', label: 'RepositoryCard' },
          { id: 'text', label: 'Text' },
        ]}
        onOpen={onOpen}
      >
        The right column, whole — and, like <code>Sidebar</code> opposite it, it knows
        nothing. Everything the app knows about the agent you are looking at: what it is
        spending, what it is on, what it is writing, and the repositories it lands in.
      </EntryHeader>

      <EntrySection
        title="The order is the meaning"
        note="It runs from the account down to the work. Named slots rather than children, so a caller cannot put the spec above the ticket — the same bargain RepositoryCard strikes one level down. Hand it none of them and it draws the empty line."
      >
        <Stage theme={theme} className="flex gap-6 overflow-x-auto">
          <Specimen label="an agent mid-task">
            <div className="h-[420px]">
              <SidebarInfo
                width={300}
                usage={<Usage />}
                ticket={<Ticket />}
                repositories={<Repositories />}
                footer={<AddRepo />}
              />
            </div>
          </Specimen>
          <Specimen label="nothing selected">
            <div className="h-[420px]">
              <SidebarInfo width={220} emptyLabel="No active agent" />
            </div>
          </Specimen>
          <Specimen label="collapsed — it slides shut by its own width">
            <div className="h-[420px]">
              <SidebarInfo width={220} collapsed usage={<Usage />} ticket={<Ticket />} />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Two nested boxes, both load-bearing"
        note="The outer one animates its width to zero to fold the column away; the inner one is pinned at the full width so the cards do not reflow while that happens — text rewrapping through a 300ms collapse is the thing this arrangement exists to prevent. Sliding shut rather than unmounting also keeps the scroll position for when it comes back."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The face is set here too, once, for everything inside — <code>Text</code>’s own.
          The app used to spell it as an inline <code>fontFamily</code> on the scrolling
          container, which was the one place in the renderer that named a font outside the
          design system.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SidebarInfo } from '@ds/desktop'

<SidebarInfo
  width={width}
  collapsed={!isOpen}
  animate={animateWidth}
  fill={spec?.mode === 'replace'}
  emptyLabel={activeTerminal ? undefined : t('agentInfo.noActiveAgent')}
  usage={<UsageCard … />}
  ticket={<TicketHeader … />}
  spec={<SpecPanel … />}
  repositories={repos.map(path => <RepositoryCard key={path} … />)}
  footer={<button>{t('agentInfo.addRepository')}</button>}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
