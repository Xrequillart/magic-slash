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
 * two places that offer it.
 *
 * A HOOK and not a function, because starting an agent has a local outcome the caller
 * has to render: `startFailed`. It began as three `useCallback`s inside
 * `TaskDetailPage`, and stopped being able to live there the day the board's cards grew
 * a Start button of their own — two copies of "where does this agent open" is two
 * answers to a question with one right one, and the card's copy would have been the one
 * without the multi-repository rule in it.
 */
export function useTaskAgent(repos: TaskAgentRepo[]) {
  /**
   * The repositories an agent could actually be opened in: the same question
   * `AgentInfoSidebar` asks before offering one, since a team repo nobody has bound to
   * a folder on this machine has no directory to launch in.
   */
  const startable = useMemo(
    () => repos.filter((entry) => !!entry.config && !entry.config.needsLocalPath && !!entry.config.path),
    [repos],
  )

  const [startFailed, setStartFailed] = useState(false)

  /**
   * Whether an agent can be started here AT ALL, answered locally.
   *
   * Asked rather than letting `pickUpTask` throw, because that error is an untranslated
   * English sentence and this is a state the surface can explain and act on — which is
   * the whole of what makes a repository with no local path say so instead of failing
   * silently.
   *
   * ONE of the card's repositories being launchable is enough: on a shared ticket the
   * agent is not started in a repository at all (see below), so a sibling with no local
   * folder is no reason to withhold the button.
   */
  const canStart = startable.length > 0

  /**
   * Open an agent on this ticket with a first prompt already typed — in its repository
   * when the ticket has one of its own, and see below when it does not.
   *
   * The prompt MUST be a single line, in either mode. Run, it travels to the PTY as
   * `claude "<prompt>"` with `JSON.stringify` doing the quoting, so a newline is escaped
   * into a literal backslash-n that the shell hands to Claude Code verbatim. Drafted, it
   * is typed into the input box, where a Return IS the send — a two-line draft would post
   * its first line and leave the second behind.
   */
  const openAgent = useCallback(async (
    /** The identity `/magic:start` writes into `agents.ticket_id` — a Jira key, or an issue number. */
    ticketId: string,
    initialPrompt: string,
    promptMode: InitialPromptMode = 'run',
    // The identity the new agent starts with, for the caller that has one. "Start" has
    // none to give: `/magic:start` attaches the ticket and names the agent itself, out
    // of the ticket it has just read, and a title set here would be overwritten by a
    // better one seconds later.
    metadata?: LaunchMetadata,
  ) => {
    if (startable.length === 0) return
    const only = startable.length === 1 ? startable[0].config?.path : undefined
    setStartFailed(false)
    try {
      // WHERE the agent opens, and the one place the Tasks page is allowed to decide it.
      //
      // With ONE repository behind the ticket there is nothing to decide: the agent
      // opens in it, as it always has. Only `cwd` is kept from `pickUpTask` — its own
      // initialPrompt is `/magic:continue`, the wrong verb for any of these buttons. The
      // matching is left exactly as it is: this passes the local path it already knows,
      // so it resolves to that same repository, and `expandPath` on the way out is why
      // the call is worth making.
      //
      // With SEVERAL — a Jira project two repositories are planned in — the ticket
      // belongs to none of them in particular, and picking the first would start work in
      // the wrong folder about half the time and say nothing. So no repository is chosen
      // here at all: the agent opens at the default directory and `/magic:start` resolves
      // the scope itself, which it does properly — it scores every configured repository
      // against the ticket's labels, title and description and asks when the answer is
      // not clear (skills/magic-start/SKILL.md §3). It reads that config over the app's
      // local HTTP API rather than from its working directory, so starting it outside a
      // repository costs it nothing. A multi-repo ticket is the case it is already built
      // for.
      const cwd = only
        ? (await window.electronAPI.org.pickUpTask(ticketId, [only])).cwd
        : undefined
      // The agents page owns every guard on creating one (max agents, unreachable
      // repositories, which pane it lands in), so this asks for an agent the same way
      // the sidebar's "+" does rather than launching one itself.
      const launch: NewTerminalDetail = { ...(cwd ? { cwd } : {}), initialPrompt, promptMode, ...(metadata ? { metadata } : {}) }
      window.dispatchEvent(new CustomEvent<NewTerminalDetail>('new-terminal', { detail: launch }))
    } catch {
      // Never `err.message`: pickUpTask throws an English sentence with no catalogue
      // entry, and every surface here is translated.
      setStartFailed(true)
    }
  }, [startable])

  /**
   * The affirmative action itself, per tracker.
   *
   * A Jira ticket is started on its KEY — `/magic:start PER-1234` — and not on its
   * browse URL. The key is what the skill resolves a ticket by, what it writes into
   * `agents.ticket_id`, and what the branch and the commit trailers are named after; a
   * URL would have to be parsed back into it first. A GitHub issue has no such portable
   * identity across repositories, so it goes on being started on its URL.
   */
  const startAgent = useCallback(
    (ticketId: string, ref: string) => openAgent(ticketId, `/magic:start ${ref}`),
    [openAgent],
  )

  /** Lets a caller clear the failure when it re-reads, or moves to another ticket. */
  const clearStartFailed = useCallback(() => setStartFailed(false), [])

  return { canStart, startFailed, clearStartFailed, openAgent, startAgent }
}
