import type { MessageKey } from '../../i18n'
import type { TerminalInfo, Config, RepositoryConfig } from '../../types'

export type WorkflowGroupKey =
  | 'needs_attention'
  | 'active'
  | 'in_review'
  | 'done'

export interface TerminalWithRepos extends TerminalInfo {
  matchingProjects: string[]
}

// A catalogue key rather than a literal: this list is module-scope data, so a
// string here would freeze at the boot language. The Sidebar resolves it through
// useT() at render time, which is what makes the headers follow a live switch.
export const WORKFLOW_GROUPS: {
  key: WorkflowGroupKey
  labelKey: MessageKey
}[] = [
  { key: 'needs_attention',  labelKey: 'workflow.needsAttention' },
  { key: 'active',           labelKey: 'workflow.active' },
  { key: 'in_review',        labelKey: 'workflow.inReview' },
  { key: 'done',             labelKey: 'workflow.done' },
]

/**
 * The workflow statuses that mean "this agent has a live PR". The single source
 * of truth for that question: the sidebar groups on it, and the Team page counts
 * on it. 'PR merged' is deliberately out — the PR is no longer in flight.
 */
export const PR_WORKFLOW_STATUSES: readonly string[] = [
  'PR created',
  'in review',
  'changes requested',
  'Review addressed',
]

export function classifyTerminal(terminal: TerminalInfo): WorkflowGroupKey {
  const { state } = terminal
  const status = terminal.metadata?.status || ''

  if (state === 'error' || state === 'waiting') return 'needs_attention'

  if (PR_WORKFLOW_STATUSES.includes(status)) return 'in_review'
  if (status === 'PR merged') return 'done'
  if (['', 'in progress', 'committed', 'ready for PR'].includes(status)) return 'active'

  // Safety net: a non-empty status we don't explicitly recognize means the
  // workflow has progressed past the known "active" states (e.g. a newer skill
  // sent a value the desktop app doesn't know yet). Treat it as in_review rather
  // than letting it silently fall back to "active" and relocate the card.
  return 'in_review'
}

export function groupTerminals(terminalList: TerminalInfo[], config: Config | null) {
  const groups: Record<WorkflowGroupKey, TerminalWithRepos[]> = {
    needs_attention: [],
    active: [],
    in_review: [],
    done: [],
  }

  for (const terminal of terminalList) {
    const repos = terminal.repositories || []
    const matchingProjects: string[] = []

    if (config) {
      for (const [repoName, repoConfig] of Object.entries(config.repositories)) {
        if (repos.some(repo => repo.startsWith((repoConfig as RepositoryConfig).path))) {
          matchingProjects.push(repoName)
        }
      }
    }

    const enriched: TerminalWithRepos = { ...terminal, matchingProjects }
    const groupKey = classifyTerminal(terminal)
    groups[groupKey].push(enriched)
  }

  return groups
}
