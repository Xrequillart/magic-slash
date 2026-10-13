import SwiftUI

/// What opens when a session is tapped: the agent's conversation, read live from the paired
/// Mac (PROTOCOL.md §11), with its pending question at the end and a Liquid Glass composer
/// floating over it. Not paired yet: a way to pair. The cloud details live behind the Info
/// button.
struct AgentSessionView: View {
  @Environment(\.theme) private var theme

  let store: AgentStore
  let relay: RelayStore
  let agentId: String

  private enum Sheet: String, Identifiable {
    case info, pair
    var id: String { rawValue }
  }

  @State private var sheet: Sheet?

  var body: some View {
    Group {
      if let agent = store.agent(id: agentId) {
        Group {
          if isPaired {
            paired(agent)
          } else {
            ScrollView {
              notPaired
                .padding(16)
                .frame(maxWidth: .infinity)
            }
          }
        }
        .navigationTitle(agent.title)
        .toolbar {
          ToolbarItem(placement: .principal) {
            SessionTitle(title: agent.title, runtime: relay.runtime(for: agent.appAgentId))
          }
          ToolbarItem(placement: .topBarTrailing) {
            Button("Info", systemImage: "info.circle") { sheet = .info }
              .tint(theme.ink)
              .foregroundStyle(theme.ink)
          }
        }
      } else {
        MessageScreen(
          systemImage: "archivebox",
          title: "Session closed",
          message: "This session was archived or deleted on the desktop."
        )
      }
    }
    .background(theme.bg.ignoresSafeArea())
    .navigationBarTitleDisplayMode(.inline)
    .sheet(item: $sheet) { sheet in
      switch sheet {
      case .info:
        NavigationStack {
          AgentDetailView(store: store, relay: relay, agentId: agentId)
            .toolbar {
              ToolbarItem(placement: .confirmationAction) {
                Button("Done") { self.sheet = nil }
              }
            }
        }
      case .pair:
        PairingView(relay: relay)
      }
    }
  }

  /// Paired means at least one Mac this iPhone can still read: pairings lost to a Face ID
  /// change do not count.
  private var isPaired: Bool {
    !relay.macs.isEmpty && !relay.needsRepair
  }

  // MARK: Paired

  @ViewBuilder
  private func paired(_ agent: Agent) -> some View {
    let runtime = relay.runtime(for: agent.appAgentId)
    let chat = agent.appAgentId.flatMap { relay.chats[$0] }
    ScrollViewReader { proxy in
      ScrollView {
        VStack(spacing: 16) {
          if let chat {
            ChatTranscriptView(chat: chat)
          } else {
            placeholder(runtime: runtime)
          }
          if let runtime, let appAgentId = agent.appAgentId, let question = runtime.question {
            // Answered here too: a prompt waits on it.
            QuestionCard(relay: relay, runtime: runtime, question: question, appAgentId: appAgentId)
              .id(question.token)
          }
          Color.clear.frame(height: 1).id(Self.bottom)
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .frame(maxWidth: .infinity)
      }
      .defaultScrollAnchor(.bottom)
      .scrollDismissesKeyboard(.interactively)
      .onChange(of: scrollKey(chat: chat, runtime: runtime)) {
        withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo(Self.bottom, anchor: .bottom) }
      }
      .safeAreaInset(edge: .bottom) {
        if let runtime, let appAgentId = agent.appAgentId {
          PromptComposer(relay: relay, runtime: runtime, appAgentId: appAgentId)
            .padding(.horizontal, 12)
            .padding(.bottom, 8)
        }
      }
    }
    // Renewed while the screen is open (§11), and again as soon as the Mac, or the keys,
    // come back: the Mac stops sending once the lease runs out.
    .task(id: leaseKey(agent: agent, runtime: runtime)) {
      guard let appAgentId = agent.appAgentId, relay.keyState == .unlocked else { return }
      while !Task.isCancelled {
        await relay.requestChat(appAgentId: appAgentId)
        try? await Task.sleep(for: RelayStore.chatRenewal)
      }
    }
  }

  private static let bottom = "bottom"

  /// What moves the view to the newest line: a new entry, a tool settling, a question.
  private func scrollKey(chat: AgentChat?, runtime: AgentRuntime?) -> String {
    "\(chat?.entries.last?.id ?? "")|\(chat?.entries.count ?? 0)|\(chat?.queue.count ?? 0)|\(runtime?.question?.token ?? "")"
  }

  private func leaseKey(agent: Agent, runtime: AgentRuntime?) -> String {
    "\(agent.appAgentId ?? "")|\(runtime?.macId ?? "")|\(runtime?.isCurrent == true)|\(relay.keyState == .unlocked)"
  }

  /// No conversation to show yet, and why.
  @ViewBuilder
  private func placeholder(runtime: AgentRuntime?) -> some View {
    switch relay.keyState {
    case .locked(let message):
      ChatPlaceholder(systemImage: "lock.fill", title: "Locked", message: message) {
        Button("Unlock") { Task { await relay.unlock() } }
          .font(.cera(.body, .semibold))
          .buttonStyle(.borderedProminent)
          .tint(theme.accent)
      }
    case .unavailable(let message):
      ChatPlaceholder(systemImage: "lock.slash", title: "Unavailable", message: message)
    case .idle, .unlocking, .unlocked:
      if let runtime {
        if runtime.isCurrent {
          ChatPlaceholder(systemImage: nil, title: "Loading the conversation…", message: nil)
        } else {
          ChatPlaceholder(
            systemImage: "wifi.slash",
            title: "\(runtime.macName) is offline",
            message: "The conversation shows here once the Mac is back."
          )
        }
      } else {
        ChatPlaceholder(
          systemImage: "laptopcomputer.slash",
          title: "Not running on a paired Mac",
          message: "Open this session in the desktop app to follow it here."
        )
      }
    }
  }

  // MARK: Not paired

  private var notPaired: some View {
    VStack(spacing: 24) {
      StatusHeader(
        systemImage: "link.badge.plus",
        tint: theme.textSecondary,
        title: relay.needsRepair ? "Pair your Mac again" : "Not paired with a Mac",
        message: relay.needsRepair
          ? "Face ID changed on this iPhone, so its Macs were unpaired."
          : "Pair this iPhone with the desktop app to follow this session live."
      )

      Button {
        sheet = .pair
      } label: {
        Label("Pair a Mac", systemImage: "qrcode.viewfinder")
          .font(.cera(.body, .semibold))
          .frame(maxWidth: .infinity)
          .padding(.vertical, 6)
      }
      .buttonStyle(.borderedProminent)
      .tint(theme.accent)
    }
    .padding(.top, 40)
  }
}

/// The bar's title: the session's name, and under it the agent's state on its Mac.
private struct SessionTitle: View {
  @Environment(\.theme) private var theme
  let title: String
  let runtime: AgentRuntime?

  var body: some View {
    VStack(spacing: 1) {
      Text(title)
        .font(.cera(.subheadline, .semibold))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
      if let runtime {
        HStack(spacing: 5) {
          Circle()
            .fill(RuntimeStyle.tone(runtime.state).color(in: theme))
            .frame(width: 6, height: 6)
          Text(runtime.isCurrent
            ? "\(RuntimeStyle.label(runtime.state)) · \(runtime.macName)"
            : "Last known: \(RuntimeStyle.label(runtime.state)) · \(runtime.macName)")
            .font(.cera(.caption2))
            .foregroundStyle(theme.textSecondary)
            .lineLimit(1)
        }
        .opacity(runtime.isCurrent ? 1 : 0.7)
      }
    }
    .accessibilityElement(children: .combine)
  }
}

/// Where the conversation will be, while there is none to show.
private struct ChatPlaceholder<Action: View>: View {
  @Environment(\.theme) private var theme
  let systemImage: String?
  let title: String
  let message: String?
  @ViewBuilder var action: Action

  var body: some View {
    VStack(spacing: 10) {
      if let systemImage {
        Image(systemName: systemImage)
          .font(.system(size: 36))
          .foregroundStyle(theme.iconMuted)
      } else {
        ProgressView().tint(theme.textSecondary)
      }
      Text(title)
        .font(.cera(.headline))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
      if let message {
        Text(message)
          .font(.cera(.subheadline))
          .foregroundStyle(theme.textSecondary)
          .multilineTextAlignment(.center)
      }
      action
    }
    .frame(maxWidth: .infinity)
    .padding(.top, 80)
  }
}

extension ChatPlaceholder where Action == EmptyView {
  init(systemImage: String?, title: String, message: String?) {
    self.init(systemImage: systemImage, title: title, message: message) { EmptyView() }
  }
}

/// A large icon, a title and one line under it: the state of the link at a glance.
private struct StatusHeader: View {
  @Environment(\.theme) private var theme
  let systemImage: String
  let tint: Color
  let title: String
  let message: String

  var body: some View {
    VStack(spacing: 10) {
      Image(systemName: systemImage)
        .font(.system(size: 44))
        .foregroundStyle(tint)
      Text(title)
        .font(.cera(.title3, .semibold))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
      Text(message)
        .font(.cera(.subheadline))
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)
    }
    .padding(.top, 16)
  }
}
