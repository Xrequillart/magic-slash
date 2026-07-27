import { RepoSection } from './RepoSection'

/**
 * The Team page — "who is working on what", read from the org-wide agents
 * roster. One question, answered honestly: per repository shared with the
 * organization, how many agents are running and how many are on a PR.
 */
export function DashboardPage() {
  return (
    <div className="h-full flex flex-col">
      {/* The title and the live indicator are rendered by the hosting modal. */}
      <div className="flex-1 overflow-auto p-6">
        <RepoSection />
      </div>
    </div>
  )
}
