'use client'

import { ToolMarkStack } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/**
 * The ToolMarkStack entry. Each specimen sits on the thread's ground, `surface-sunken`,
 * because that is the colour of the rings that cut the discs apart: on the window's
 * ground they would show as outlines the app never draws.
 */

const RUN = ['mcp__atlassian__getJiraIssue', 'Bash', 'Bash', 'AskUserQuestion', 'Bash']
const LONG_RUN = ['Read', 'Grep', 'Read', 'Edit', 'Bash', 'mcp__github__create_pull_request', 'mcp__slack__slack_send_message']

const PROPS: PropRow[] = [
  { name: 'names', type: 'string[]', required: true, description: 'The tools’ names, in the order they were called. One mark per call: a run that read three files shows three files.' },
  {
    name: 'max',
    type: 'number',
    fallback: '5',
    description: 'How many of the LAST calls are drawn. No +N: the line beside the stack already prints the count.',
  },
]

function Thread({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-surface-sunken px-3 py-2">{children}</div>
}

export function ToolMarkStackEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ToolMarkStack" uses={usesOf('toolmarkstack')} onOpen={onOpen}>
        What a run of tool calls did, as overlapping marks the way AvatarStack overlaps
        faces. The chat draws it before every tool line: a grouped run’s, and a single call’s as a run of one.
      </EntryHeader>

      <EntrySection
        title="Discs cut out of the thread"
        note="Each call is a ToolMark, on its product’s colour. Its ring is the thread’s ground, so the disc on top cuts the one under it instead of drawing over it."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-8">
          <Specimen label="one call">
            <Thread><ToolMarkStack names={['Bash']} /></Thread>
          </Specimen>
          <Specimen label="five calls">
            <Thread><ToolMarkStack names={RUN} /></Thread>
          </Specimen>
          <Specimen label="seven calls: the last five">
            <Thread><ToolMarkStack names={LONG_RUN} /></Thread>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ToolMarkStack } from '@ds/desktop'

<ToolMarkStack names={tools.map((t) => t.name)} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
