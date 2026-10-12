import { CliToolsCard } from './CliToolsCard'
import { JiraAccountSection } from './JiraAccountSection'
import { McpServersCard } from './McpServersCard'

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
 * What lands here first is what the APP itself signs in with: the Atlassian
 * credential below is how the Tasks page reads a sprint and how a ticket page loads.
 * The skills do not use it — they reach Jira and GitHub through MCP servers, which
 * sit here too, under their own section with the optional ones (Slack): to the user
 * each is one more service this machine is linked to. The required ones are also
 * repaired from Application → Machine setup, whose verdict is "can the skills run".
 * Last come the CLIs: `gh` is how the GitHub MCP server signs in, so it is checked here.
 */
export function ConnectionsPage() {
  return (
    <div className="flex flex-col gap-8">
      <JiraAccountSection />
      <McpServersCard />
      <CliToolsCard />
    </div>
  )
}
