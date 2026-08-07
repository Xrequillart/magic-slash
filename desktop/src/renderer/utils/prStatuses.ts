/**
 * The workflow statuses that mean "this agent has a live PR". The single source
 * of truth for that question — the Team page counts on it. 'PR merged' is
 * deliberately out: the PR is no longer in flight.
 */
export const PR_WORKFLOW_STATUSES: readonly string[] = [
  'PR created',
  // The PR is at its most in-flight here — green and waiting on a reviewer. Left out
  // until 0.68.5, which made an agent drop off the Team page's PR count the moment
  // its pipeline passed.
  'CI green',
  'in review',
  'changes requested',
  'Review addressed',
]
