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
  /// Whether the thread is read at its end: only then does a new line pull it down.
  @State private var atBottom = true
  /// The thread's visible height, to tell where its end marker sits.
  @State private var viewportHeight: CGFloat = 0
  /// Whether the thread was taken to its end once it arrived: the first transcript lands
  /// after the screen opens, so the scroll view's initial anchor alone misses it.
  @State private var landed = false

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
            SessionTitle(title: agent.title)
          }
          ToolbarItem(placement: .topBarTrailing) {
            Button("Info", systemImage: "info.circle") {
              Haptics.tap()
              sheet = .info
            }
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
              CloseToolbarItem { self.sheet = nil }
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
          if let chat, chat.entries.isEmpty, chat.queue.isEmpty, runtime?.state != "working", runtime?.question == nil {
            // Nothing said yet: the desktop's robot, in the middle of the screen.
            ChatEmptyState()
              .containerRelativeFrame(.vertical)
          } else if let chat {
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
            .background {
              GeometryReader { marker in
                Color.clear.preference(key: BottomMarkerKey.self, value: marker.frame(in: .named(Self.thread)).minY)
              }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .frame(maxWidth: .infinity)
      }
      .coordinateSpace(name: Self.thread)
      .background {
        GeometryReader { viewport in
          Color.clear
            .onAppear { viewportHeight = viewport.size.height }
            .onChange(of: viewport.size.height) { _, height in viewportHeight = height }
        }
      }
      .openingAtBottom()
      .scrollDismissesKeyboard(.interactively)
      // The desktop's `STICK_PX`: within 48 pt of the end counts as reading it. Above that,
      // the reader is looking at something, and the thread stays where they put it.
      .onPreferenceChange(BottomMarkerKey.self) { minY in
        atBottom = minY <= viewportHeight + Self.stick
      }
      .onChange(of: scrollKey(chat: chat, runtime: runtime), initial: true) {
        if !landed {
          // Opening the session: straight to the newest line, whatever came in meanwhile.
          guard chat != nil else { return }
          landed = true
          land(proxy)
          return
        }
        guard atBottom else { return }
        withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo(Self.bottom, anchor: .bottom) }
      }
      .safeAreaInset(edge: .bottom) {
        if let runtime, let appAgentId = agent.appAgentId {
          // Drawn back while the reader is up the thread, full size again at the end.
          PromptComposer(relay: relay, runtime: runtime, appAgentId: appAgentId, compact: !atBottom)
            // The thread fades into the page's own ground under the composer, from a little
            // above it to the screen's edge, so the field reads over whatever scrolls past.
            .background(alignment: .bottom) {
              LinearGradient(
                stops: [
                  .init(color: theme.bg.opacity(0), location: 0),
                  .init(color: theme.bg.opacity(0.85), location: 0.45),
                  .init(color: theme.bg, location: 1),
                ],
                startPoint: .top,
                endPoint: .bottom
              )
              .padding(.top, -48)
              .ignoresSafeArea(edges: .bottom)
              .allowsHitTesting(false)
            }
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
  private static let thread = "thread"
  private static let stick: CGFloat = 48

  /// To the end without animation, then again once the rows (markdown, tables) have laid
  /// themselves out: the first pass can leave the end short of the bottom.
  private func land(_ proxy: ScrollViewProxy) {
    proxy.scrollTo(Self.bottom, anchor: .bottom)
    Task {
      try? await Task.sleep(for: .milliseconds(150))
      proxy.scrollTo(Self.bottom, anchor: .bottom)
    }
  }

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
        Button("Unlock") {
          Haptics.tap()
          Task { await relay.unlock() }
        }
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
          ) {
            ReconnectButton(relay: relay)
              .font(.cera(.body, .semibold))
              .buttonStyle(.bordered)
              .padding(.top, 6)
          }
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
        Haptics.tap()
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

/// The bar's title: the session's name.
private struct SessionTitle: View {
  @Environment(\.theme) private var theme
  let title: String

  var body: some View {
    Text(title)
      .font(.cera(.headline))
      .foregroundStyle(theme.ink)
      .lineLimit(1)
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

/// Where the thread's end marker sits, in the scroll view's own space.
private struct BottomMarkerKey: PreferenceKey {
  static let defaultValue: CGFloat = 0
  static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
    value = nextValue()
  }
}

private extension View {
  /// Opens the thread at its end. From iOS 18, only that: the anchor's other roles would
  /// also hold the end in place as the thread grows, moving whatever the reader scrolled
  /// up to. Following new lines is `atBottom`'s call alone.
  @ViewBuilder
  func openingAtBottom() -> some View {
    if #available(iOS 18, *) {
      defaultScrollAnchor(.bottom, for: .initialOffset)
    } else {
      defaultScrollAnchor(.bottom)
    }
  }
}
