'use client'

import { MenuBarPanel, type MenuBarAgent, type MenuBarUpdate } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const noop = () => {}

const LABELS = {
  allow: 'Allow',
  deny: 'Deny',
  send: 'Send',
  multiHint: 'Pick as many as you like',
  unsupported: 'Answer this one in the app',
  openAgent: 'Open the agent',
  moreOptions: (count: number) => `${count} more in the agent`,
}

const AGENTS: MenuBarAgent[] = [
  {
    id: 'a',
    name: 'Fix the login redirect',
    state: 'waiting',
    ticketId: 'PER-5138',
    title: 'Waiting',
    onClick: noop,
    question: {
      token: 't1',
      kind: 'permission',
      prompt: 'Claude wants to run a command',
      preview: '$ npm run test -- --watch=false',
      options: [],
      onAnswer: noop,
      onOpenAgent: noop,
    },
  },
  { id: 'b', name: 'Review the billing PR', state: 'working', ticketId: '#482', title: 'Working', onClick: noop },
  { id: 'c', name: 'Onboarding copy', state: 'completed', title: 'Completed', onClick: noop },
]

const PROPS: PropRow[] = [
  { name: 'account', type: '{ label; title; onClick; avatar? }', required: true, description: 'Who is signed in, as the title bar draws them: a Label with the photo. avatar absent is nobody signed in, and the label is then the invitation to sign in.' },
  { name: 'update', type: 'MenuBarUpdate', required: true, description: 'The updater as a ButtonIcon: idle or error checks (red when the last check failed), busy spins and does nothing, ready is the pressed accent button that restarts into the new version.' },
  { name: 'agents', type: 'MenuBarAgent[]', required: true, description: 'The rows, in the order to draw them — the sidebar’s Agent. A question carries the card drawn under its row (MenuBarQuestion).' },
  { name: 'waiting · notice · empty', type: 'string', description: 'The counter over the list when agents are blocked, a line for an answer that did not go through, and what an empty list says.' },
  { name: 'panelRef', type: 'RefObject<HTMLDivElement>', description: 'The panel’s own box, for the window to size itself to it.' },
]

function Panel({ update, agents, signedIn = true }: { update: MenuBarUpdate; agents: MenuBarAgent[]; signedIn?: boolean }) {
  return (
    <div className="w-[320px]">
      <MenuBarPanel
        app={{ title: 'Open Magic Slash', onOpen: noop }}
        account={{
          label: signedIn ? 'Xavier' : 'Account',
          title: 'Account and settings',
          onClick: noop,
          avatar: signedIn ? { src: null, alt: 'Xavier' } : undefined,
        }}
        update={update}
        agents={agents}
        empty="No active agents"
        waiting={agents.some((a) => a.question) ? '1 awaiting an answer' : undefined}
        questionLabels={LABELS}
        quit={{ label: 'Quit the app', onClick: noop }}
      />
    </div>
  )
}

export function MenuBarPanelEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="MenuBarPanel" uses={usesOf('menubarpanel')} onOpen={onOpen}>
        The window that drops from the menu bar icon: the app, the person signed in, the
        update control, and every agent, answerable where it asks.
      </EntryHeader>

      <EntrySection
        title="Built from the parts, not beside them"
        note="It was the app’s TrayPopover, drawn by hand: a bare circle glyph where every other surface shows the person’s face, and three hand-rolled square buttons for the updater. The account is the title bar’s Label now, the updater a ButtonIcon, the rows the sidebar’s Agent."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-6">
          <Specimen label="an agent asking, update ready">
            <Panel update={{ phase: 'ready', title: 'Restart to update (v0.102.0)', onInstall: noop }} agents={AGENTS} />
          </Specimen>
          <Specimen label="nothing running, checking, signed out">
            <Panel update={{ phase: 'busy', title: 'Checking for updates…' }} agents={[]} signedIn={false} />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { MenuBarPanel } from '@ds/desktop'

<MenuBarPanel
  panelRef={panelRef}
  app={{ title: t('tray.showWindow'), onOpen: showWindow }}
  account={{ label: name, title: t('tray.popover.account'), onClick: openSettings, avatar: { src: avatar, alt: name } }}
  update={toUpdate(version, update, t)}
  agents={rows}
  empty={t('tray.popover.empty')}
  questionLabels={labels}
  quit={{ label: t('tray.popover.quit'), onClick: quit }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
