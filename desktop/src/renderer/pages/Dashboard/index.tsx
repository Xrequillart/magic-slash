import { RepoSection } from './RepoSection'
import { SkillHoursBanner } from './SkillHoursBanner'

/**
 * The Team page — "who is working on what", read from the org-wide agents
 * roster. One question, answered honestly: per repository shared with the
 * organization, how many agents are running and how many are on a PR.
 *
 * The block above it is the one figure on this page that is NOT scoped by the tab
 * below — the hours are the viewer's own across every organization. It is mounted here
 * rather than inside `RepoSection`, which owns the tabs: a block living above the strip
 * it does not answer to is the placement that says so, and it also means it does not
 * wait on the agents roster to draw.
 *
 * `UsageSection` — the org's cost & usage — used to sit between the two and is
 * deliberately unmounted while that part of the app is reworked. The component and its
 * copy are kept intact so remounting it is a one-line change.
 */
export function DashboardPage() {
  return (
    <div className="h-full flex flex-col">
      {/* The title and the live indicator are rendered by the hosting modal. */}
      <div className="flex-1 overflow-auto p-6 flex flex-col gap-4">
        <SkillHoursBanner />
        <RepoSection />
      </div>
    </div>
  )
}
