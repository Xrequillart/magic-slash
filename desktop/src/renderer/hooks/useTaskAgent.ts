import { useCallback, useMemo, useState } from 'react'
import type { InitialPromptMode, LaunchMetadata, RepositoryConfig } from '../../types'
import type { NewTerminalDetail } from '../pages/Terminals'

/** One of the repositories a ticket's card stands for, with its configuration. */
export interface TaskAgentRepo {
  configKey: string
  name: string
  /** Its entry in the config, when it still has one. Absent means nothing can be launched there. */
  config?: RepositoryConfig
}

/**
 * Opening an agent on a ticket — the one launcher the Tasks page has, shared by the
 * places that offer it.
 *
 * TWO HOOKS OVER ONE LAUNCH, and the launch itself is the plain function below them.
 * `useTaskAgent` is for a surface that has ONE ticket in front of it — the ticket page —
 * and `useTaskAgents` for one that has a whole board of them. They differ only in where
 * the failure is kept: a single boolean, or a set of card ids. Everything about WHERE an
 * agent opens is `launchAgent`'s, so the two cannot drift on the question that matters.
 *
 * THE BOARD'S HOOK EXISTS BECAUSE ITS CARDS STOPPED BEING COMPONENTS. A card used to be
 * `pages/Tasks/TaskCard.tsx`, which called `useTaskAgent` once per ticket; the board is
 * `TaskBoard` in the design system now and takes its cards as DATA, so nothing per-card
 * is left to hang a hook on. One hook at the board, keyed by card, is the same state in
 * one place instead of seventy-five.
 */

/**
 * The repositories an agent could actually be opened in: the same question
 * `AgentInfoSidebar` asks before offering one, since a team repo nobody has bound to a
 * folder on this machine has no directory to launch in.
 */
function startableRepos(repos: TaskAgentRepo[]): TaskAgentRepo[] {
  return repos.filter((entry) => !!entry.config && !entry.config.needsLocalPath && !!entry.config.path)
}

/**
 * Whether an agent can be started here AT ALL, answered locally.
 *
 * Asked rather than letting `pickUpTask` throw, because that error is an untranslated
 * English sentence and this is a state the surface can explain and act on — which is the
 * whole of what makes a repository with no local path say so instead of failing
 * silently.
 *
 * ONE of the card's repositories being launchable is enough: on a shared ticket the agent
 * is not started in a repository at all (see `launchAgent`), so a sibling with no local
 * folder is no reason to withhold the button.
 */
export function canStartAgent(repos: TaskAgentRepo[]): boolean {
  return startableRepos(repos).length > 0
}

/**
 * What became of a launch, and why it is three values rather than a boolean: a ticket
 * with nowhere to open has not FAILED at anything, and colouring the button red for it
 * would report a breakage where there is only a repository with no local folder.
 */
export type LaunchOutcome = 'started' | 'failed' | 'unavailable'

/**
 * Open an agent on this ticket with a first prompt already typed — in its repository when
 * the ticket has one of its own, and see below when it does not.
 *
 * The prompt MUST be a single line, in either mode. Run, it travels to the PTY as
 * `claude "<prompt>"` with `JSON.stringify` doing the quoting, so a newline is escaped
 * into a literal backslash-n that the shell hands to Claude Code verbatim. Drafted, it is
 * typed into the input box, where a Return IS the send — a two-line draft would post its
 * first line and leave the second behind.
 */
async function launchAgent(
  repos: TaskAgentRepo[],
  /** The identity `/magic:start` writes into `agents.ticket_id` — a Jira key, or an issue number. */
  ticketId: string,
  initialPrompt: string,
  promptMode: InitialPromptMode = 'run',
  // The identity the new agent starts with, for the caller that has one. "Start" has none
  // to give: `/magic:start` attaches the ticket and names the agent itself, out of the
  // ticket it has just read, and a title set here would be overwritten by a better one
  // seconds later.
  metadata?: LaunchMetadata,
): Promise<LaunchOutcome> {
  const startable = startableRepos(repos)
  if (startable.length === 0) return 'unavailable'
  const only = startable.length === 1 ? startable[0].config?.path : undefined
  try {
    // WHERE the agent opens, and the one place the Tasks page is allowed to decide it.
    //
    // With ONE repository behind the ticket there is nothing to decide: the agent opens
    // in it, as it always has. Only `cwd` is kept from `pickUpTask` — its own
    // initialPrompt is `/magic:continue`, the wrong verb for any of these buttons. The
    // matching is left exactly as it is: this passes the local path it already knows, so
    // it resolves to that same repository, and `expandPath` on the way out is why the
    // call is worth making.
    //
    // With SEVERAL — a Jira project two repositories are planned in — the ticket belongs
    // to none of them in particular, and picking the first would start work in the wrong
    // folder about half the time and say nothing. So no repository is chosen here at all:
    // the agent opens at the default directory and `/magic:start` resolves the scope
    // itself, which it does properly — it scores every configured repository against the
    // ticket's labels, title and description and asks when the answer is not clear
    // (skills/magic-start/SKILL.md §3). It reads that config over the app's local HTTP API
    // rather than from its working directory, so starting it outside a repository costs it
    // nothing. A multi-repo ticket is the case it is already built for.
    const cwd = only
      ? (await window.electronAPI.org.pickUpTask(ticketId, [only])).cwd
      : undefined
    // The agents page owns every guard on creating one (max agents, unreachable
    // repositories, which pane it lands in), so this asks for an agent the same way the
    // sidebar's "+" does rather than launching one itself.
    const detail: NewTerminalDetail = { ...(cwd ? { cwd } : {}), initialPrompt, promptMode, ...(metadata ? { metadata } : {}) }
    window.dispatchEvent(new CustomEvent<NewTerminalDetail>('new-terminal', { detail }))
    return 'started'
  } catch {
    // Never `err.message`: pickUpTask throws an English sentence with no catalogue entry,
    // and every surface here is translated.
    return 'failed'
  }
}

/**
 * The first prompt a Start button sends, per tracker.
 *
 * A Jira ticket is started on its KEY — `/magic:start PER-1234` — and not on its browse
 * URL. The key is what the skill resolves a ticket by, what it writes into
 * `agents.ticket_id`, and what the branch and the commit trailers are named after; a URL
 * would have to be parsed back into it first. A GitHub issue has no such portable
 * identity across repositories, so it goes on being started on its URL.
 */
const startPrompt = (ref: string) => `/magic:start ${ref}`

/** ONE ticket's launcher: the ticket page, which has a single subject and a single state. */
export function useTaskAgent(repos: TaskAgentRepo[]) {
  const canStart = useMemo(() => canStartAgent(repos), [repos])
  const [startFailed, setStartFailed] = useState(false)

  const openAgent = useCallback(async (
    ticketId: string,
    initialPrompt: string,
    promptMode: InitialPromptMode = 'run',
    metadata?: LaunchMetadata,
  ) => {
    setStartFailed(false)
    const outcome = await launchAgent(repos, ticketId, initialPrompt, promptMode, metadata)
    if (outcome === 'failed') setStartFailed(true)
  }, [repos])

  const startAgent = useCallback(
    (ticketId: string, ref: string) => openAgent(ticketId, startPrompt(ref)),
    [openAgent],
  )

  /** Lets a caller clear the failure when it re-reads, or moves to another ticket. */
  const clearStartFailed = useCallback(() => setStartFailed(false), [])

  return { canStart, startFailed, clearStartFailed, openAgent, startAgent }
}

/**
 * A WHOLE BOARD'S launcher: one hook over up to seventy-five cards.
 *
 * The failure is a SET OF CARD IDS rather than a boolean, which is the only thing the
 * board needs that a single ticket does not — a launch that failed colours the button on
 * the card it was pressed from and leaves the rest of the column alone. Ids are never
 * cleared on a re-read: a card whose launch failed keeps saying so until it is pressed
 * again, and a card that has left the board takes its id out of the set with it only when
 * the page is left. A set of a few strings is not worth a sweep.
 */
export function useTaskAgents() {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set())

  const startAgent = useCallback(async (id: string, repos: TaskAgentRepo[], ticketId: string, ref: string) => {
    // Cleared before the attempt, so a second press on a card that failed does not sit
    // red while the launch it just asked for is in flight.
    setFailed((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    const outcome = await launchAgent(repos, ticketId, startPrompt(ref))
    if (outcome === 'failed') setFailed((prev) => new Set(prev).add(id))
  }, [])

  return { startFailed: failed, startAgent }
}
