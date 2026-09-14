'use client'

import { useState } from 'react'
import { ScriptCard } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  { name: 'name', type: 'string', required: true, description: 'The script’s own name, as package.json spells it — dev, build.' },
  {
    name: 'workspace',
    type: 'string',
    description:
      'The package it belongs to, on a monorepo. It prefixes the name, dimmed: three packages each with a dev script would otherwise give three identical cards, and which one is serving is the whole question a reader opens this card with.',
  },
  { name: 'state', type: "'running' | 'error'", fallback: "'running'", description: 'Purple while it runs, red when it died. Two values, because there are exactly two states worth a card.' },
  { name: 'title', type: 'string', description: 'The tooltip on the name — the app composes the full label.' },
  { name: 'onOpen', type: '() => void', description: 'Opening the script’s terminal. The name and the mark are this control.' },
  {
    name: 'stop',
    type: '{ label: string; title: string; onStop: () => void }',
    description:
      'Stopping it. Worded and always visible, never a hover reveal on a lone glyph: stopping a server is the action a person comes to this card for, and a control that only exists under the pointer cannot be found by someone looking for it.',
  },
  { name: 'urls', type: 'ScriptCardUrl[]', description: 'The addresses it answers on, each its own row under the bar. Each carries the address, the label to show, and its tooltip.' },
  { name: 'onOpenUrl', type: '(url: string) => void', description: 'Handed the address. A callback and not a link: opening it is the app’s to do.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and width. Not the fill, the radius or either state’s colour.' },
]

const noop = () => undefined
const STOP = { label: 'Stop', title: 'Stop this script', onStop: noop }

/** The real thing: press Stop and the card turns, press it again and it comes back. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [state, setState] = useState<'running' | 'error'>('running')
  return (
    <Stage theme={theme}>
      <div className="max-w-[320px]">
        <ScriptCard
          name="dev"
          workspace="web"
          state={state}
          title="web/dev — pnpm dev"
          onOpen={noop}
          stop={{
            label: state === 'running' ? 'Stop' : 'Clear',
            title: state === 'running' ? 'Stop this script' : 'Dismiss',
            onStop: () => setState(state === 'running' ? 'error' : 'running'),
          }}
          urls={
            state === 'running'
              ? [
                  { url: 'http://localhost:3000', label: 'localhost:3000', title: 'Open localhost:3000' },
                  { url: 'http://localhost:4000', label: 'localhost:4000', title: 'Open localhost:4000' },
                ]
              : []
          }
          onOpenUrl={noop}
        />
      </div>
    </Stage>
  )
}

export function ScriptCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="ScriptCard"
        uses={[
          { id: 'loader', label: 'Loader' },
          { id: 'icon', label: 'Icon' },
          { id: 'text', label: 'Text' },
        ]}
        onOpen={onOpen}
      >
        A script running on a repository, and the addresses it answers on. The one{' '}
        <em>filled</em> card in the whole sidebar — every other block there is a plate at
        5% ink, and this one is solid purple because a process the reader started is still
        alive on their machine.
      </EntryHeader>

      <EntrySection
        title="The only thing that is happening now"
        note="Everything else in a repository card is reported after the fact: a branch, a diff, commits that already landed. This is a live process, and the fill is what says so. Press Stop below — the card turns red and its addresses go with it, because a script that died is answering on none of them."
      >
        <Live theme={theme} />
      </EntrySection>

      <EntrySection
        title="The addresses hang off it"
        note="Attached rather than spaced: they are that script’s addresses, not further items in a list. So the radius belongs to the block — the bar loses its bottom corners as soon as there is a row under it, and the last row takes them. A row per address and not one per script, because a dev script starting an API next to a front end is the ordinary case."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <Specimen label="running, nothing served yet">
            <div className="max-w-[320px]">
              <ScriptCard name="build" state="running" stop={STOP} onOpen={noop} />
            </div>
          </Specimen>
          <Specimen label="serving one address">
            <div className="max-w-[320px]">
              <ScriptCard
                name="dev"
                state="running"
                stop={STOP}
                onOpen={noop}
                urls={[{ url: 'http://localhost:3000', label: 'localhost:3000', title: 'Open it' }]}
                onOpenUrl={noop}
              />
            </div>
          </Specimen>
          <Specimen label="on a monorepo — the package prefixes the name">
            <div className="max-w-[320px]">
              <ScriptCard name="dev" workspace="storybook" state="running" stop={STOP} onOpen={noop} />
            </div>
          </Specimen>
          <Specimen label="it exited non-zero">
            <div className="max-w-[320px]">
              <ScriptCard name="test" state="error" stop={{ ...STOP, label: 'Clear' }} onOpen={noop} />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Two buttons, not a button inside a button"
        note="The stop control used to be a span carrying an onClick, nested in the bar’s own button — which renders, and which no keyboard can reach. Side by side they are both real controls, and the bar keeps the whole width it is not using."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Stop is not a <code>ButtonIcon</code> either: that component is icon-only by
          construction and this control carries its verb in the open, which is the whole
          reason it reads. Its plate is <code>on-brand/15</code> — the fill’s own ink at a
          tint — so it is a chip <em>on</em> the coloured bar rather than a second colour
          beside it.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ScriptCard } from '@ds/desktop'

<ScriptCard
  name={script.scriptName}
  workspace={script.workspace}
  state={script.state === 'running' ? 'running' : 'error'}
  title={scriptLabel(script)}
  onOpen={() => openScriptTerminalModal(script)}
  stop={{ label: t('common.stop'), title: t('agentInfo.stopScript'), onStop: () => stopScript(script.id) }}
  urls={(script.serverUrls ?? []).map(url => ({
    url,
    label: serverUrlLabel(url),
    title: t('agentInfo.openServerInBrowser', { url }),
  }))}
  onOpenUrl={url => shell.openExternal(url)}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
