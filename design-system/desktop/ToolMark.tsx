import { BotMessageSquare, FilePen, FileText, FolderSearch, Globe, ListTodo, MessageCircleQuestionMark, Sparkles, SquareTerminal, TextSearch, Wrench } from './icons'
import { Figma, Github, Jira, Notion, Slack } from './brand'
import { MarkTile } from './MarkTile'
import type { IconComponent } from './types'

/**
 * A TOOL CALL'S MARK, from the tool's name alone, on a disc of its product's colour, the
 * way `Label` colours a chip by whose it is: Jira's blue ground for a Jira tool, white
 * under the marks drawn for white (Slack, Notion, Figma), and a light grey with the glyph
 * in black for GitHub and for Claude Code's own tools (the terminal for Bash, a file for
 * Read), the wrench for anything else.
 *
 * MCP tools arrive named `mcp__<server>__<tool>`, so the server is read off the name.
 *
 * FIXED, NOT THEMED: white and light grey on every theme, the glyph in the fixed ink, so
 * a run of marks reads the same on the darkest ground as on the lightest. Jira's ground
 * is opaque too: its chip's 14% tint (`JIRA_CHIP_GROUND`) laid over the paper, so the disc
 * is the same pale blue on every theme instead of a darker shade of a dark thread.
 */

export interface ToolMarkProps {
  /** The tool's name as the transcript gives it: `Bash`, `mcp__atlassian__getJiraIssue`. */
  name: string
}

/** The fixed paper and ink of `release-paper` / `release-ink`, and a grey between them. */
const PAPER = '#FFFFFF'
const GREY = '#E4E4E7'
/** `JIRA_CHIP_GROUND` (Jira's blue at 14%) over `PAPER`, as one opaque colour. */
const JIRA_PLATE = '#E1EEFF'
const INK = 'rgb(10 10 11)'

interface Plate {
  glyph: IconComponent
  tint: string
  ink?: string
}

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

export function toolPlate(name: string): Plate {
  const [, server = '', tool = ''] = name.match(/^mcp__(.+?)__(.+)$/) ?? []
  if (/atlassian|jira/i.test(server) && !/confluence/i.test(tool)) return { glyph: Jira, tint: JIRA_PLATE }
  if (/notion/i.test(server)) return { glyph: Notion, tint: PAPER }
  if (/slack/i.test(server)) return { glyph: Slack, tint: PAPER }
  if (/figma/i.test(server)) return { glyph: Figma, tint: PAPER }
  if (/github/i.test(server)) return { glyph: Github, tint: GREY, ink: INK }
  const builtIn = server ? undefined : BUILT_IN_MARKS[name]
  return { glyph: builtIn ?? Wrench, tint: GREY, ink: INK }
}

export function ToolMark({ name }: ToolMarkProps) {
  const { glyph, tint, ink } = toolPlate(name)
  return <MarkTile glyph={glyph} size="sm" shape="round" tint={tint} ink={ink} />
}
