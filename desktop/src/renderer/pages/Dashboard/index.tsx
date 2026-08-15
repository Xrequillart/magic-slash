import { RepoSection } from './RepoSection'
import { SkillHoursBanner } from './SkillHoursBanner'
import { UsageSection } from './UsageSection'

/**
 * The Team page — "who is working on what", read from the org-wide agents
 * roster. One question, answered honestly: per repository shared with the
 * organization, how many agents are running and how many are on a PR.
 *
 * The two blocks above it are the figures on this page that are NOT scoped by the tab
 * below — the hours are the viewer's own across every organization, and the usage is the
 * active organization's. Both are mounted here rather than inside `RepoSection`, which
 * owns the tabs: a block living above the strip it does not answer to is the placement
 * that says so, and it also means neither waits on the agents roster to draw. Same
 * arrangement as the webapp's dashboard.
 */
export function DashboardPage() {
  return (
    <div className="h-full flex flex-col">
      {/* The title and the live indicator are rendered by the hosting modal. */}
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
        <SkillHoursBanner />
        {/* What the active organization SPENT, above the roster of what it is doing. */}
        <UsageSection />
        <RepoSection />
      </div>
    </div>
  )
}
