/**
 * The workflow statuses that mean "this agent has a live PR". The single source
 * of truth for that question — the Team page counts on it. 'PR merged' is
 * deliberately out: the PR is no longer in flight.
 */
export const PR_WORKFLOW_STATUSES: readonly string[] = [
  'PR created',
  'in review',
  'changes requested',
  'Review addressed',
]
