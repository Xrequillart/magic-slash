/**
 * AN ACTION: a card of the canvas that is not a skill but a thing to DO once a step is
 * done, through an MCP server the user has on their machine. "When the PR is created,
 * post its link in #dev on Slack." Like an end note, a link leads to it and nothing
 * leaves it; unlike one, it is carried out, by the hidden `magic-action` skill, which
 * reads the action from the app (`GET /workflow/action`) rather than from the caller, so
 * the admin's words reach it as they were saved.
 *
 * WHAT THE ADMIN WRITES IS AN INSTRUCTION, NOT A TEMPLATE THE APP FILLS. The app does not
 * know the PR's URL, the agent does: `{pr_url}` and its siblings (ACTION_VARIABLES) are
 * filled by the agent from what the run already resolved, and one it cannot fill is said
 * so in the message rather than guessed.
 *
 * WHO IT RUNS AS. An action runs with the MCP servers of whoever ran the step, so a Slack
 * message goes out under their name. That is why a member can turn a repository's actions
 * off for themselves (Settings → Workflow, `runActions`, on by default), and why a link into
 * one that is a suggestion (the default) asks before it runs.
 *
 * Pure, no node or electron import: the main process serves it, the renderer edits it.
 */

/** What an action can do. One kind for now; each has its reference in `skills/magic-action/references/`. */
export const WORKFLOW_ACTION_TYPES = ['slack'] as const
export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number]

export function isActionType(value: unknown): value is WorkflowActionType {
  return typeof value === 'string' && (WORKFLOW_ACTION_TYPES as readonly string[]).includes(value)
}

/** The longest instruction: a message and how to word it, not a document. */
export const ACTION_PROMPT_MAX_LENGTH = 1000

/** The longest channel name Slack allows is 80; a leading `#` on top. */
export const ACTION_CHANNEL_MAX_LENGTH = 81

/**
 * The values the agent fills in an action's prompt, in the order the editor offers them.
 * Whichever the run resolved: a commit has no PR yet, and `{pr_url}` there is said to be
 * unknown, never invented.
 */
export const ACTION_VARIABLES = [
  'ticket_id', 'ticket_title', 'ticket_url', 'repository', 'branch', 'pr_url', 'pr_number', 'pr_title', 'outcome',
] as const

/** An instruction as stored: its lines kept, each trimmed of trailing spaces, no more than one blank line in a row, capped. */
export function normalizeActionPrompt(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, ACTION_PROMPT_MAX_LENGTH)
}

/** A Slack channel as stored: one word, no spaces, a `#` in front, lower case (Slack's own spelling). Empty stays empty. */
export function normalizeSlackChannel(value: string): string {
  const name = value.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase()
  return name ? `#${name}`.slice(0, ACTION_CHANNEL_MAX_LENGTH) : ''
}
