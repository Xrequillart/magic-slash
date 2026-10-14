import { BotMessageSquare, FilePen, FileText, FolderSearch, Globe, ListTodo, MessageCircleQuestionMark, Sparkles, SquareTerminal, TextSearch, Wrench } from './icons'
import { Figma, Github, Jira, Notion, Slack } from './brand'
import type { IconComponent } from './types'

/**
 * A TOOL CALL'S MARK, from the tool's name alone: the service's own logo for an MCP tool
 * of one (Jira, by the Atlassian server's tools that are not Confluence's; Notion, Slack,
 * GitHub, Figma), a glyph of what it does for Claude Code's own tools (the terminal for
 * Bash, a file for Read), the wrench for everything else.
 *
 * MCP tools arrive named `mcp__<server>__<tool>`, so the server is read off the name. A
 * logo is 14px and keeps its colours; a glyph is 12px in the icon tone, so the two read
 * as the same size beside each other. GitHub's mark is one colour, `currentColor`: it
 * takes the ink.
 */

export interface ToolMarkProps {
  /** The tool's name as the transcript gives it: `Bash`, `mcp__atlassian__getJiraIssue`. */
  name: string
  /**
   * What it is drawn on. `ground` (the default) sits on the theme's ground, the glyph in
   * the icon tone. `paper` sits on the fixed white of `ToolMarkStack`'s discs, the glyph
   * and GitHub's mark in the fixed ink, so they read on white whatever the theme.
   */
  tone?: ToolMarkTone
}

export type ToolMarkTone = 'ground' | 'paper'

const LOGO = 'w-3.5 h-3.5 flex-shrink-0'
const GLYPH = 'w-3 h-3 flex-shrink-0'
const INK: Record<ToolMarkTone, string> = { ground: 'text-icon', paper: 'text-release-ink' }

const BUILT_IN_MARKS: Record<string, IconComponent> = {
  Bash: SquareTerminal,
  BashOutput: SquareTerminal,
  KillShell: SquareTerminal,
  Read: FileText,
  Edit: FilePen,
  MultiEdit: FilePen,
  Write: FilePen,
  NotebookEdit: FilePen,
  Grep: TextSearch,
  Glob: FolderSearch,
  WebFetch: Globe,
  WebSearch: Globe,
  // `Task` is the name older transcripts give the Agent tool.
  Task: BotMessageSquare,
  Agent: BotMessageSquare,
  AskUserQuestion: MessageCircleQuestionMark,
  TodoWrite: ListTodo,
  Skill: Sparkles,
}

function toolMark(name: string, tone: ToolMarkTone): { Icon: IconComponent; className: string } {
  const [, server = '', tool = ''] = name.match(/^mcp__(.+?)__(.+)$/) ?? []
  if (/atlassian|jira/i.test(server) && !/confluence/i.test(tool)) return { Icon: Jira, className: LOGO }
  if (/notion/i.test(server)) return { Icon: Notion, className: LOGO }
  if (/slack/i.test(server)) return { Icon: Slack, className: LOGO }
  if (/github/i.test(server)) return { Icon: Github, className: `${LOGO} ${tone === 'paper' ? INK.paper : 'text-ink'}` }
  if (/figma/i.test(server)) return { Icon: Figma, className: LOGO }
  const builtIn = server ? undefined : BUILT_IN_MARKS[name]
  return { Icon: builtIn ?? Wrench, className: `${GLYPH} ${INK[tone]}` }
}

export function ToolMark({ name, tone = 'ground' }: ToolMarkProps) {
  const { Icon, className } = toolMark(name, tone)
  return <Icon className={className} />
}
