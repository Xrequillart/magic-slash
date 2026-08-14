import { RepoSection } from './RepoSection'
import { SkillHoursBanner } from './SkillHoursBanner'

/**
 * The Team page — "who is working on what", read from the org-wide agents
 * roster. One question, answered honestly: per repository shared with the
 * organization, how many agents are running and how many are on a PR.
 *
 * The hours above it are the one figure on this page that is NOT scoped by the tab
 * below: they are the viewer's own across every organization. Mounted here rather than
 * inside `RepoSection`, which owns the tabs — a card living above the strip it does not
 * answer to is the placement that says so, and it also means the hours do not wait on
 * the agents roster to draw. Same arrangement as the webapp's dashboard.
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
