'use client'

import { ToolMark } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/**
 * The ToolMark entry: every mark it knows, named the way a transcript names the tool, each
 * on the thread's ground (`surface-sunken`) since Jira's plate is a tint of whatever it
 * sits on.
 */

const MCP = [
  'mcp__atlassian__getJiraIssue',
  'mcp__notion__notion-fetch',
  'mcp__slack__slack_send_message',
  'mcp__figma__get_design_context',
  'mcp__github__create_pull_request',
]

const BUILT_IN = ['Bash', 'Read', 'Edit', 'Grep', 'Glob', 'WebFetch', 'Agent', 'AskUserQuestion', 'TodoWrite', 'Skill']

const PROPS: PropRow[] = [
  {
    name: 'name',
    type: 'string',
    required: true,
    description:
      'The tool’s name as the transcript gives it. An MCP tool (mcp__<server>__<tool>) wears its service’s logo on its product’s colour; Claude Code’s own tools wear a glyph of what they do on light grey; anything else, the wrench.',
  },
]

function Thread({ children }: { children: React.ReactNode }) {
  return <div className="flex rounded-lg bg-surface-sunken p-2">{children}</div>
}

export function ToolMarkEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ToolMark" uses={usesOf('toolmark')} onOpen={onOpen}>
        What a tool call was, at a glance, on a disc of its product’s colour. The chat draws
        them through ToolMarkStack, one per call.
      </EntryHeader>

      <EntrySection
        title="Services, on their colour"
        note="The plates Label gives the same services: Jira’s blue tint, white under the marks drawn for white, light grey for GitHub. Confluence’s tools are not Jira’s, so they get the wrench rather than a logo that would lie."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-6">
          {MCP.map((name) => (
            <Specimen key={name} label={name.split('__')[1]}>
              <Thread><ToolMark name={name} /></Thread>
            </Specimen>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Claude Code’s own tools, on light grey"
        note="A black glyph on a fixed light grey, the same on every theme. Edit, MultiEdit, Write and NotebookEdit share the pen; WebFetch and WebSearch the globe."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-6">
          {BUILT_IN.map((name) => (
            <Specimen key={name} label={name}>
              <Thread><ToolMark name={name} /></Thread>
            </Specimen>
          ))}
          <Specimen label="anything else">
            <Thread><ToolMark name="mcp__linear__list_issues" /></Thread>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { ToolMark } from '@ds/desktop'

<ToolMark name={entry.name} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
