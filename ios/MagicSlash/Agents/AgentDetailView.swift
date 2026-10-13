import Supabase
import SwiftUI

/// Everything the cloud knows about one agent. Read from the store on every render, so
/// a status or PR change pushed over Realtime shows here without leaving the screen.
struct AgentDetailView: View {
  @Environment(\.theme) private var theme

  let store: AgentStore
  let relay: RelayStore
  let agentId: String

  var body: some View {
    Group {
      if let agent = store.agent(id: agentId) {
        AgentDetailContent(agent: agent, client: store.client, relay: relay)
      } else {
        MessageScreen(
          systemImage: "archivebox",
          title: "Agent closed",
          message: "This agent was archived or deleted on the desktop."
        )
      }
    }
    .background(theme.bg.ignoresSafeArea())
    .navigationBarTitleDisplayMode(.inline)
  }
}

private struct AgentDetailContent: View {
  @Environment(\.theme) private var theme
  @Environment(\.scenePhase) private var scenePhase

  let agent: Agent
  let relay: RelayStore
  @State private var plans: PlanStore
  /// Bumped on each return to the foreground: the plan channel may have died while
  /// suspended, so the watch restarts, reading the spec again and resubscribing.
  @State private var foregroundCount = 0

  init(agent: Agent, client: SupabaseClient, relay: RelayStore) {
    self.agent = agent
    self.relay = relay
    _plans = State(initialValue: PlanStore(client: client))
  }

  var body: some View {
    ScrollView {
      // The desktop's column: `px-2 pb-2 space-y-4`, its repositories `space-y-3`.
      VStack(alignment: .leading, spacing: 16) {
        let runtime = relay.runtime(for: agent.appAgentId)
        ContextInfoCard(usage: runtime?.usage)
        if let runtime, let question = runtime.question, let appAgentId = agent.appAgentId {
          QuestionCard(relay: relay, runtime: runtime, question: question, appAgentId: appAgentId)
            .id(question.token)
        }
        TitleInfoCard(agent: agent)
        let paths = agent.allRepositoryPaths
        if !paths.isEmpty {
          VStack(spacing: 12) {
            ForEach(Array(paths.enumerated()), id: \.element) { index, path in
              RepositoryInfoCard(path: path, index: index, agent: agent)
            }
          }
        }
        if agent.type == .planner || agent.planId != nil || agent.specPath != nil {
          spec
        }
        if let usage = runtime?.usage, usage.fiveHourPercent != nil || usage.sevenDayPercent != nil {
          LimitsInfoCard(usage: usage)
        }
      }
      .padding(.horizontal, 12)
      .padding(.top, 4)
      .padding(.bottom, 16)
    }
    .navigationTitle(agent.title)
    // Re-watched when the link to the plan changes, not on every status tick.
    .task(id: "\(agent.planId ?? "")|\(agent.type.rawValue)|\(foregroundCount)") {
      await plans.watch(agent)
    }
    .onChange(of: scenePhase) { old, phase in
      if old == .background, phase != .background { foregroundCount += 1 }
    }
    .refreshable { await plans.load(for: agent) }
  }

  // MARK: Spec

  @ViewBuilder
  private var spec: some View {
    switch plans.state {
    case .loading:
      SpecInfoCard(planNumber: agent.planNumber, status: nil, title: nil) {
        HStack(spacing: 8) {
          ProgressView().tint(theme.textSecondary)
          Text("Loading spec…")
            .font(.cera(size: 12, .medium))
            .foregroundStyle(theme.textSecondary)
        }
      }
    case .none, .unavailable:
      SpecInfoCard(planNumber: agent.planNumber, status: nil, title: nil) {
        VStack(alignment: .leading, spacing: 6) {
          specEmpty(plans.state == .unavailable ? "Spec unavailable" : agent.type == .planner ? "No spec written yet" : "No spec linked to this agent")
          specPathLine
        }
      }
    case .oversize(let plan):
      SpecInfoCard(planNumber: plan.number ?? agent.planNumber, status: plan.status, title: plan.title) {
        specEmpty("This spec is too large to sync. Open it on the desktop.")
      }
    case .loaded(let plan):
      SpecInfoCard(planNumber: plan.number ?? agent.planNumber, status: plan.status, title: plan.title) {
        if let text = plan.spec {
          SpecText(markdown: text)
        } else {
          specEmpty("The spec is empty")
        }
      }
    }
  }

  private func specEmpty(_ text: LocalizedStringKey) -> some View {
    Text(text)
      .font(.cera(size: 12, .medium))
      .foregroundStyle(theme.textSecondary.opacity(0.6))
  }

  @ViewBuilder
  private var specPathLine: some View {
    if let specPath = agent.specPath {
      Text(specPath)
        .font(.caption.monospaced())
        .foregroundStyle(theme.textSecondary)
        .textSelection(.enabled)
    }
  }

}

/// The spec's markdown, rendered inline (emphasis, code, links) with its line breaks
/// kept. Block-level markdown (headings, lists) stays as written, which reads fine.
private struct SpecText: View {
  @Environment(\.theme) private var theme
  let markdown: String

  var body: some View {
    Text(rendered)
      .font(.cera(.callout))
      .foregroundStyle(theme.ink)
      .textSelection(.enabled)
      .frame(maxWidth: .infinity, alignment: .leading)
  }

  private var rendered: AttributedString {
    let options = AttributedString.MarkdownParsingOptions(
      interpretedSyntax: .inlineOnlyPreservingWhitespace,
      failurePolicy: .returnPartiallyParsedIfPossible
    )
    return (try? AttributedString(markdown: markdown, options: options)) ?? AttributedString(markdown)
  }
}
