'use client'

import { ToolMark } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The ToolMark entry: every mark it knows, named the way a transcript names the tool. */

const MCP = [
  'mcp__atlassian__getJiraIssue',
  'mcp__notion__notion-fetch',
  'mcp__slack__slack_send_message',
  'mcp__github__create_pull_request',
  'mcp__figma__get_design_context',
]

const BUILT_IN = ['Bash', 'Read', 'Edit', 'Grep', 'Glob', 'WebFetch', 'Agent', 'AskUserQuestion', 'TodoWrite', 'Skill']

const PROPS: PropRow[] = [
  {
    name: 'name',
    type: 'string',
    required: true,
    description:
      'The tool’s name as the transcript gives it. An MCP tool (mcp__<server>__<tool>) wears its service’s logo when there is one; Claude Code’s own tools wear a glyph of what they do; anything else, the wrench.',
  },
  {
    name: 'tone',
    type: "'ground' | 'paper'",
    fallback: "'ground'",
    description: 'What it is drawn on: the theme’s ground, glyph in the icon tone, or the fixed white of a disc, glyph in the fixed ink.',
  },
]

export function ToolMarkEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ToolMark" uses={usesOf('toolmark')} onOpen={onOpen}>
        What a tool call was, at a glance: the chat draws one before each tool line, and
        ToolMarkStack strings them together for a run.
      </EntryHeader>

      <EntrySection
        title="Logos for the services"
        note="A logo keeps its own colours at 14px. Atlassian’s Confluence tools are not Jira’s, so they get the wrench rather than a logo that would lie."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-6">
          {MCP.map((name) => (
            <Specimen key={name} label={name.split('__')[1]}>
              <ToolMark name={name} />
            </Specimen>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Glyphs for Claude Code’s own tools"
        note="12px in the icon tone, so a glyph and a logo read as the same size side by side. Edit, MultiEdit, Write and NotebookEdit share the pen; WebFetch and WebSearch the globe."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-6">
          {BUILT_IN.map((name) => (
            <Specimen key={name} label={name}>
              <ToolMark name={name} />
            </Specimen>
          ))}
          <Specimen label="anything else">
            <ToolMark name="mcp__linear__list_issues" />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="On paper"
        note="The paper tone is how ToolMarkStack draws them on its white discs: the glyphs and GitHub’s mark in the fixed ink, the other logos in their own colours."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-6">
          {[...MCP, 'Bash', 'AskUserQuestion'].map((name) => (
            <Specimen key={name} label={name.split('__')[1] ?? name}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-release-paper">
                <ToolMark name={name} tone="paper" />
              </span>
            </Specimen>
          ))}
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
