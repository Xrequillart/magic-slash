import { JiraAccountSection } from './JiraAccountSection'

/**
 * Connections tab: the outside services this machine is linked to.
 *
 * Split out of the Account tab, which had come to answer two questions at once —
 * "who am I", which is the cloud identity and the profile Claude reads, and "what
 * is this machine allowed to reach". The two differ in kind: an identity follows
 * the user to every machine they sign in on, while a connection is a credential
 * sitting in THIS machine's keychain, and revoking one says nothing about the
 * other.
 *
 * One section today, and a tab rather than a second card on Account precisely so
 * the next integration — a Claude Code account, a GitHub link — has somewhere to
 * land without reopening the question of where connections live.
 *
 * What lands here is what the APP itself signs in with: the Atlassian credential
 * below is how the Tasks page reads a sprint and how a ticket page loads. The
 * skills do not use it — they reach Jira and GitHub through the MCP servers, which
 * are provisioned in Application → Machine setup. Anything that is an MCP server
 * belongs there, not here, however much the two look alike from the outside.
 */
export function ConnectionsPage() {
  return (
    <div className="flex flex-col gap-8">
      <JiraAccountSection />
    </div>
  )
}
