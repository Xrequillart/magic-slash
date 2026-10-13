import SwiftUI

/// What opens when a session is tapped: whether this iPhone is paired with a Mac, the
/// link's state when it is, and a way to pair when it is not. The cloud details live
/// behind the Info button.
///
/// The chat and its input will take this screen over once the iPhone can read the
/// conversation and send a prompt (#354).
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
        ScrollView {
          Group {
            if isPaired {
              paired(agent)
            } else {
              notPaired
            }
          }
          .padding(16)
          .frame(maxWidth: .infinity)
        }
        .navigationTitle(agent.title)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Button("Info", systemImage: "info.circle") { sheet = .info }
              .foregroundStyle(theme.icon)
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

  private func paired(_ agent: Agent) -> some View {
    VStack(spacing: 24) {
      StatusHeader(
        systemImage: "checkmark.circle.fill",
        tint: theme.green,
        title: "Paired with your Mac",
        message: "This iPhone follows the session live from the desktop app."
      )

      SectionCard(title: relay.macs.count > 1 ? "Macs" : "Mac") {
        ForEach(relay.statuses()) { status in
          MacLine(status: status, now: relay.now)
        }
        lockNotice
      }

      SectionCard(title: "Session") {
        if let runtime = relay.runtime(for: agent.appAgentId) {
          HStack(spacing: 6) {
            RuntimePill(runtime: runtime)
            Spacer(minLength: 4)
            Text(runtime.isCurrent ? "Current" : "Last known state")
              .font(.cera(.caption, .semibold))
              .foregroundStyle(runtime.isCurrent ? theme.green : theme.textSecondary)
          }
        } else {
          EmptyLine(text: "Not running on a paired Mac right now")
        }
      }
    }
  }

  /// The link's keys are locked behind Face ID until the iPhone unlocks them.
  @ViewBuilder
  private var lockNotice: some View {
    switch relay.keyState {
    case .locked(let message):
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        Text(message)
          .font(.cera(.footnote))
          .foregroundStyle(theme.textSecondary)
          .frame(maxWidth: .infinity, alignment: .leading)
        Button("Unlock") { Task { await relay.unlock() } }
          .font(.cera(.footnote, .semibold))
          .foregroundStyle(theme.accent)
      }
    case .unavailable(let message):
      EmptyLine(text: message)
    case .unlocking, .idle, .unlocked:
      EmptyView()
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
