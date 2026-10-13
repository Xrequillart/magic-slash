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
      VStack(alignment: .leading, spacing: 22) {
        identity
        live
        ticket
        repositories
        pullRequests
        spec
      }
      .padding(16)
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

  // MARK: Identity

  private var identity: some View {
    SectionCard(title: "Agent") {
      Text(agent.title)
        .font(.cera(.title3, .semibold))
        .foregroundStyle(theme.ink)
      HStack(spacing: 6) {
        TypeBadge(type: agent.type)
        StatusPill(status: agent.status)
      }
      if let description = agent.description {
        Text(description)
          .font(.cera(.subheadline))
          .foregroundStyle(theme.textSecondary)
          .textSelection(.enabled)
      } else {
        EmptyLine(text: "No description")
      }
    }
  }

  // MARK: Live

  /// Runtime state, the pending question and usage, from the paired Mac over the encrypted
  /// relay.
  @ViewBuilder
  private var live: some View {
    let runtime = relay.runtime(for: agent.appAgentId)
    LiveSection(runtime: runtime, hasPairedMac: !relay.macs.isEmpty)
    if let runtime, let question = runtime.question, let appAgentId = agent.appAgentId {
      QuestionCard(relay: relay, runtime: runtime, question: question, appAgentId: appAgentId)
        .id(question.token)
    }
    if runtime != nil {
      UsageSection(runtime: runtime)
    }
  }

  // MARK: Ticket

  private var ticket: some View {
    SectionCard(title: "Ticket") {
      if let ticketId = agent.ticketId {
        Text(ticketId)
          .font(.body.monospaced().weight(.medium))
          .foregroundStyle(theme.ink)
          .textSelection(.enabled)
      } else {
        EmptyLine(text: "No ticket")
      }
    }
  }

  // MARK: Repositories

  private var repositories: some View {
    SectionCard(title: "Repositories") {
      let paths = agent.allRepositoryPaths
      if paths.isEmpty {
        EmptyLine(text: "No repository attached")
      } else {
        ForEach(Array(paths.enumerated()), id: \.element) { index, path in
          if index > 0 { Divider().overlay(theme.lineSubtle) }
          VStack(alignment: .leading, spacing: 6) {
            Text(Self.repoName(path))
              .font(.cera(.body, .semibold))
              .foregroundStyle(theme.ink)
            LabeledLine(label: "Branch", value: agent.branchName, monospaced: true)
            LabeledLine(label: "Base branch", value: agent.baseBranch, monospaced: true)
          }
        }
      }
    }
  }

  // MARK: Pull requests

  private var pullRequests: some View {
    SectionCard(title: "Pull request") {
      let withPR = agent.allRepositoryPaths.compactMap { path -> (String, RepositoryMetadata)? in
        guard let meta = agent.repositoryMetadata[path], meta.hasPullRequest else { return nil }
        return (path, meta)
      }
      if withPR.isEmpty {
        EmptyLine(text: "No pull request yet")
      } else {
        ForEach(Array(withPR.enumerated()), id: \.element.0) { index, entry in
          if index > 0 { Divider().overlay(theme.lineSubtle) }
          PullRequestBlock(repoName: Self.repoName(entry.0), meta: entry.1, showsRepo: withPR.count > 1)
        }
      }
    }
  }

  // MARK: Spec

  private var spec: some View {
    SectionCard(title: "Spec") {
      switch plans.state {
      case .loading:
        HStack(spacing: 8) {
          ProgressView().tint(theme.textSecondary)
          Text("Loading spec…")
            .font(.cera(.subheadline))
            .foregroundStyle(theme.textSecondary)
        }
      case .none:
        EmptyLine(text: agent.type == .planner ? "No spec written yet" : "No spec linked to this agent")
        specPathLine
      case .unavailable:
        EmptyLine(text: "Spec unavailable")
        specPathLine
      case .oversize(let plan):
        planHeader(plan)
        EmptyLine(text: "This spec is too large to sync. Open it on the desktop.")
      case .loaded(let plan):
        planHeader(plan)
        if let text = plan.spec {
          Divider().overlay(theme.lineSubtle)
          SpecText(markdown: text)
        } else {
          EmptyLine(text: "The spec is empty")
        }
      }
    }
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

  private func planHeader(_ plan: PlanStore.Plan) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack(spacing: 6) {
        if let number = plan.number ?? agent.planNumber {
          Text(verbatim: "#\(number)")
            .font(.subheadline.monospacedDigit().weight(.semibold))
            .foregroundStyle(theme.textSecondary)
        }
        Text(plan.title ?? String(localized: "Untitled plan"))
          .font(.cera(.body, .semibold))
          .foregroundStyle(theme.ink)
      }
      if let status = plan.status {
        Pill(text: status, color: theme.cyan, strength: .soft)
      }
    }
  }

  static func repoName(_ path: String) -> String {
    let trimmed = path.hasSuffix("/") ? String(path.dropLast()) : path
    return trimmed.split(separator: "/").last.map(String.init) ?? path
  }
}

private struct PullRequestBlock: View {
  @Environment(\.theme) private var theme
  @Environment(\.openURL) private var openURL

  let repoName: String
  let meta: RepositoryMetadata
  let showsRepo: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      if showsRepo {
        Text(repoName)
          .font(.cera(.subheadline, .semibold))
          .foregroundStyle(theme.ink)
      }

      HStack(spacing: 6) {
        if let state = meta.effectiveState {
          Pill(text: Self.label(state), color: stateColor(state))
        }
        if let review = meta.prReviewStatus {
          Pill(text: Self.label(review), color: reviewColor(review), strength: .soft)
        }
        if meta.effectiveState == .open || meta.effectiveState == .draft {
          mergeableHint
        }
      }

      if !meta.prReviewers.isEmpty {
        LabeledLine(label: "Reviewers", value: meta.prReviewers.joined(separator: ", "))
      }
      if let comments = meta.prReviewCommentCount, comments > 0 {
        LabeledLine(label: "Comments", value: "\(comments)")
      }

      checks

      if let url = meta.prUrl {
        Button {
          Haptics.tap()
          openURL(url)
        } label: {
          Label(Self.shortLink(url), systemImage: "arrow.up.right.square")
            .font(.cera(.subheadline, .medium))
        }
        .foregroundStyle(theme.accent)
      }
    }
  }

  @ViewBuilder
  private var mergeableHint: some View {
    switch meta.prMergeable {
    case .some(true):
      Text("Mergeable").font(.cera(.caption)).foregroundStyle(theme.textSecondary)
    case .some(false):
      Text("Conflicts").font(.cera(.caption, .semibold)).foregroundStyle(theme.red)
    case .none:
      EmptyView()
    }
  }

  @ViewBuilder
  private var checks: some View {
    if let summary = meta.prChecks, summary.total > 0 {
      VStack(alignment: .leading, spacing: 6) {
        HStack(spacing: 12) {
          countLabel(summary.passed, "passed", theme.green)
          countLabel(summary.failed, "failed", theme.red)
          countLabel(summary.running, "running", theme.yellow)
          countLabel(summary.skipped, "skipped", theme.textSecondary)
        }
        ForEach(Array(meta.prCheckList.enumerated()), id: \.offset) { _, check in
          HStack(spacing: 8) {
            Image(systemName: Self.icon(check.state))
              .foregroundStyle(checkColor(check.state))
              .font(.cera(.caption))
            Text(check.name)
              .font(.cera(.caption))
              .foregroundStyle(theme.ink)
              .lineLimit(1)
          }
        }
      }
    } else {
      EmptyLine(text: "No checks reported")
    }
  }

  private func countLabel(_ count: Int, _ label: String, _ color: Color) -> some View {
    HStack(spacing: 3) {
      Text("\(count)").font(.caption.monospacedDigit().weight(.semibold)).foregroundStyle(color)
      Text(label).font(.cera(.caption)).foregroundStyle(theme.textSecondary)
    }
  }

  private func stateColor(_ state: RepositoryMetadata.PRState) -> Color {
    switch state {
    case .open: theme.green
    case .draft: theme.textSecondary
    case .merged: theme.purple
    case .closed: theme.red
    }
  }

  private func reviewColor(_ review: RepositoryMetadata.ReviewStatus) -> Color {
    switch review {
    case .approved: theme.green
    case .changesRequested: theme.red
    case .commented: theme.blue
    case .pending: theme.yellow
    }
  }

  private func checkColor(_ state: RepositoryMetadata.Check.State?) -> Color {
    switch state {
    case .passed: theme.green
    case .failed: theme.red
    case .running: theme.yellow
    case .skipped, .none: theme.textSecondary
    }
  }

  private static func icon(_ state: RepositoryMetadata.Check.State?) -> String {
    switch state {
    case .passed: "checkmark.circle.fill"
    case .failed: "xmark.circle.fill"
    case .running: "clock.fill"
    case .skipped: "minus.circle"
    case .none: "questionmark.circle"
    }
  }

  private static func label(_ state: RepositoryMetadata.PRState) -> String {
    switch state {
    case .open: String(localized: "Open")
    case .draft: String(localized: "Draft")
    case .merged: String(localized: "Merged")
    case .closed: String(localized: "Closed")
    }
  }

  private static func label(_ review: RepositoryMetadata.ReviewStatus) -> String {
    switch review {
    case .approved: String(localized: "Approved")
    case .changesRequested: String(localized: "Changes requested")
    case .commented: String(localized: "Commented")
    case .pending: String(localized: "Review pending")
    }
  }

  /// `owner/repo#123` for a GitHub PR URL, the URL itself otherwise.
  private static func shortLink(_ url: URL) -> String {
    let parts = url.pathComponents.filter { $0 != "/" }
    if parts.count >= 4, parts[2] == "pull" {
      return "\(parts[0])/\(parts[1])#\(parts[3])"
    }
    return url.absoluteString
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
