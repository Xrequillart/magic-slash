'use client'

import { Card, SidebarAgentCoderInfo, Text } from '@ds/desktop'
import { Github, Play, VSCode } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

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
  {
    name: 'usage',
    type: 'ContextAgentCardProps',
    description:
      'What the agent is spending — context, cost, model. The card’s own arguments, so there is no third vocabulary to learn and nothing to fall out of date: a prop added to ContextAgentCard arrives here for free.',
  },
  {
    name: 'ticket',
    type: 'TitleAgentCardProps',
    description: 'What it is working on — the ticket badge, the status picker, the two editable fields. TitleAgentCard’s own arguments.',
  },
  {
    name: 'repositories',
    type: 'CoderRepository[]',
    description:
      'One per attached repository, in reading order. Each entry is RepositoryCard’s own props plus a key, so there is no second vocabulary here and nothing to fall out of date: a prop added to that card arrives in this list for free.',
  },
  {
    name: 'repositorySelector',
    type: 'RepositorySelectorProps',
    description:
      'The picker the dashed box opens — rendered by this column, because it is this column’s own dialog and not a thing that happens to float next to it. It portals out anyway, which is what used to make the caller render it as a sibling: true of the pixels, false of everything else. Absent while it is shut.',
  },
  {
    name: 'addRepository',
    type: '{ label, onClick, className? }',
    description:
      'Under the cards: the dashed empty slot that attaches another repository. The box is drawn by the column, the words and the click are not — it has no translator and no idea what attaching one means. It used to be a footer slot, which meant three copies of the same rectangle that had already drifted apart. Omit it and there is no box, which is how a planning agent gets a column without one.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins. Not the width, the ground, or the order of the regions.' },
]

const noop = () => undefined

/**
 * A field at rest and going nowhere. `EditableText` is controlled, so a drawing hands it
 * the closed state and handlers that do nothing — the price of using the real component,
 * and a fair one: the pencil and the column it reserves are the app's.
 */
const FIELD = (value: string) => ({
  value,
  placeholder: value,
  editing: false,
  draft: value,
  onDraftChange: noop,
  onStartEditing: noop,
  onSave: noop,
  onCancel: noop,
})

const USAGE = {
  contextPercent: 42,
  contextDetail: '84.0k / 200.0k tokens',
  model: 'Opus 5',
  cost: '$1.20',
  duration: '12m 04s',
  onMinimizedChange: noop,
  labels: { context: 'Context', minimize: 'Fold', expand: 'Unfold' },
}

const TICKET = {
  ticket: { children: 'PAY-318', tone: 'jira' as const, title: 'PAY-318', onClick: noop },
  title: FIELD('Round the VAT once, on the total'),
  description: FIELD('Per-line rounding drifts by a cent on long invoices.'),
}

const REPOSITORIES = [
  {
    id: '/Users/dev/magic-pay',
    header: {
      name: 'magic-pay',
      color: '#F43F5E',
      scripts: { icon: Play, title: 'Run a script', groups: [], onSelect: noop, emptyLabel: 'No scripts' },
      editor: { icon: VSCode, title: 'Open in the editor', onClick: noop },
      remote: { icon: Github, title: 'Open on GitHub', onClick: noop },
      remove: { title: 'Remove this repository', onClick: noop },
    },
    branch: {
      branch: 'feature/pay-318-invoice-vat',
      base: 'main',
      copy: { label: 'Copy branch name', onCopy: noop },
    },
  },
]

export function SidebarAgentCoderInfoEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="SidebarAgentCoderInfo"
        uses={usesOf('sidebaragentcoderinfo')}
        onOpen={onOpen}
      >
        The right column of a CODER agent, whole — and, like <code>Sidebar</code> opposite
        it, it knows nothing. Everything the app knows about the agent you are looking at:
        what it is spending, what it is on, and the repositories it lands in. A planning
        agent gets <code>SidebarAgentPlannerInfo</code> instead.
      </EntryHeader>

      <EntrySection
        title="The order is the meaning"
        note="It runs from the account down to the work, and the column draws every card itself — the caller hands it data. Named props rather than children, so a caller cannot put the spec above the ticket, the same bargain RepositoryCard strikes one level down. Hand it nothing and it draws the empty line."
      >
        <Stage theme={theme} className="flex gap-6 overflow-x-auto">
          <Specimen label="an agent mid-task">
            <div className="h-[420px]">
              <SidebarAgentCoderInfo
                width={300}
                usage={USAGE}
                ticket={TICKET}
                repositories={REPOSITORIES}
                addRepository={{ label: 'Add a repository', onClick: noop }}
              />
            </div>
          </Specimen>
          <Specimen label="nothing selected">
            <div className="h-[420px]">
              <SidebarAgentCoderInfo width={220} emptyLabel="No active agent" />
            </div>
          </Specimen>
          <Specimen label="collapsed — it slides shut by its own width">
            <div className="h-[420px]">
              <SidebarAgentCoderInfo width={220} collapsed usage={USAGE} ticket={TICKET} />
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
        <Snippet>{`import { SidebarAgentCoderInfo } from '@ds/desktop'

<SidebarAgentCoderInfo
  width={width}
  collapsed={!isOpen}
  animate={animateWidth}
  emptyLabel={activeTerminal ? undefined : t('agentInfo.noActiveAgent')}
  usage={useUsageCard({ usage, minimized, onMinimizedChange })}
  ticket={useTicketCard({ metadata, agentId, taskSelection, identity })}
  repositories={paths.map(path => toCoderRepository({ path, gitData, t, … }))}
  addRepository={{ label: t('agentInfo.addRepository'), onClick: openRepoPicker }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
