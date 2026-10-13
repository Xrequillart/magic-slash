import SwiftUI

struct AgentListView: View {
  @Environment(\.theme) private var theme

  let store: AgentStore
  let relay: RelayStore
  /// The desktop settings: the sidebar order the list follows live, and the settings
  /// screen behind the account menu.
  let settings: DesktopSettingsStore
  let onSignOut: () -> Void

  private enum Sheet: String, Identifiable {
    case account, settings, pair, macs
    var id: String { rawValue }
  }

  @State private var sheet: Sheet?
  /// The sessions opened, as a path: rows push onto it themselves, which keeps the list
  /// free of the disclosure chevron a `NavigationLink` row draws.
  @State private var path: [String] = []
  @State private var profile: ProfileStore
  /// Bumped on every tap that should be felt: the header buttons and each session.

  init(store: AgentStore, relay: RelayStore, settings: DesktopSettingsStore, onSignOut: @escaping () -> Void) {
    self.store = store
    self.relay = relay
    self.settings = settings
    self.onSignOut = onSignOut
    _profile = State(initialValue: ProfileStore(client: store.client))
  }

  var body: some View {
    // The system bar, as on a session's page: no backdrop of our own.
    NavigationStack(path: $path) {
      content
        .background(theme.bg.ignoresSafeArea())
        .navigationTitle("Sessions")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .topBarLeading) {
            Button {
              Haptics.tap()
              sheet = .account
            } label: {
              ProfileAvatar(profile: profile, size: 30)
            }
            .accessibilityLabel("Account")
          }
          ToolbarItem(placement: .topBarTrailing) {
            PairingButton(relay: relay) {
              Haptics.tap()
              sheet = isPaired ? .macs : .pair
            }
          }
        }
        .navigationDestination(for: String.self) { id in
          AgentSessionView(store: store, relay: relay, agentId: id)
        }
    }
    .task { await profile.load() }
    .sheet(item: $sheet) { sheet in
      switch sheet {
      case .account:
        AccountSheet(profile: profile) {
          self.sheet = .settings
        } onSignOut: {
          self.sheet = nil
          onSignOut()
        }
      case .settings:
        SettingsView(settings: settings)
      case .pair:
        PairingView(relay: relay)
      case .macs:
        PairedMacsView(relay: relay) { self.sheet = .pair }
      }
    }
  }

  private var sort: AgentSortMode { settings.agentSort }

  private var isPaired: Bool {
    !relay.macs.isEmpty && !relay.needsRepair
  }

  @ViewBuilder
  private var content: some View {
    switch store.loadState {
    case .loading where store.agents.isEmpty:
      LoadingScreen()
    case .failed(let message) where store.agents.isEmpty:
      refreshableMessage(systemImage: "wifi.exclamationmark", title: "Agents unavailable", message: message)
    default:
      if store.agents.isEmpty {
        refreshableMessage(
          systemImage: "tray",
          title: "No agents",
          message: "Agents you start on the desktop app appear here."
        )
      } else {
        list
      }
    }
  }

  /// A message that still pulls to refresh, for the states with no agent to list.
  private func refreshableMessage(systemImage: String, title: String, message: String) -> some View {
    ScrollView {
      MessageScreen(systemImage: systemImage, title: title, message: message)
        .frame(minHeight: 480)
    }
    .refreshable { await store.refresh() }
  }

  /// The agents in the sidebar's order, cut into its repository groups in `repository`
  /// mode and left as one run otherwise.
  private var groups: [(key: String, agents: [OrderedAgent])] {
    let ordered = AgentOrder.ordered(store.agents, sort: sort, repositories: store.repositories) { agent in
      relay.runtime(for: agent.appAgentId)?.state
    }
    guard sort == .repository else { return [(key: "", agents: ordered)] }
    var groups: [(key: String, agents: [OrderedAgent])] = []
    for row in ordered {
      if groups.last?.key == row.groupKey {
        groups[groups.count - 1].agents.append(row)
      } else {
        groups.append((key: row.groupKey, agents: [row]))
      }
    }
    return groups
  }

  private var list: some View {
    List {
      ForEach(groups, id: \.key) { group in
        if sort == .repository {
          Section {
            rows(group.agents)
          } header: {
            Text(AgentOrder.label(forGroup: group.key))
              .font(.cera(.footnote, .semibold))
              .foregroundStyle(theme.textSecondary)
              .textCase(nil)
          }
        } else {
          rows(group.agents)
        }
      }
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .refreshable { await store.refresh() }
  }

  /// The agent's state when an online Mac reports it, nil otherwise.
  private func liveState(of agent: Agent) -> String? {
    guard let runtime = relay.runtime(for: agent.appAgentId), runtime.isCurrent else { return nil }
    return runtime.state
  }

  private func rows(_ agents: [OrderedAgent]) -> some View {
    ForEach(agents) { row in
      Button {
        Haptics.tap()
        path.append(row.agent.id)
      } label: {
        AgentRow(agent: row.agent, state: liveState(of: row.agent))
      }
      .buttonStyle(.plain)
      .listRowBackground(theme.bg)
      // A trail between sessions, barely there: the spacing does most of the separating.
      .listRowSeparator(.visible)
      .listRowSeparatorTint(theme.lineSubtle.opacity(0.5))
      .alignmentGuide(.listRowSeparatorLeading) { _ in 0 }
      .listRowInsets(EdgeInsets(top: 18, leading: 20, bottom: 18, trailing: 16))
    }
  }
}

/// One session: its agent's state (the chat mark when idle), its title and when it last
/// moved, and the ticket it took.
private struct AgentRow: View {
  @Environment(\.theme) private var theme
  let agent: Agent
  let state: String?

  var body: some View {
    HStack(spacing: 12) {
      // The mark and the label both sit in the middle of the row.
      HStack(spacing: 14) {
        SessionStateMark(state: state)

        VStack(alignment: .leading, spacing: 3) {
          Text(agent.title)
            .font(.cera(.body))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          if let updated = agent.updatedAt {
            Text(updated.formatted(.relative(presentation: .named)))
              .font(.cera(.subheadline))
              .foregroundStyle(theme.textSecondary)
              .lineLimit(1)
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      if let ticket = agent.ticketId {
        DSLabel(text: ticket, tone: DSLabel.Tone(ticketId: ticket))
      }
    }
    .contentShape(Rectangle())
  }
}

/// The header's pairing control. Paired: a laptop and, beside it, the desktop's live dot,
/// green and pulsing while a Mac is online, red otherwise. Not paired yet: a QR code, which
/// is where pairing starts.
private struct PairingButton: View {
  @Environment(\.theme) private var theme
  let relay: RelayStore
  let action: () -> Void

  private var isPaired: Bool {
    !relay.macs.isEmpty && !relay.needsRepair
  }

  private var anyOnline: Bool {
    relay.statuses().contains(where: \.isOnline)
  }

  var body: some View {
    Button(action: action) {
      if isPaired {
        // The dot is part of the button's width, not hung off its corner.
        HStack(spacing: 6) {
          Image(systemName: "laptopcomputer")
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(theme.icon)
          LiveDot(color: anyOnline ? theme.green : theme.red, pulses: anyOnline)
        }
      } else {
        Image(systemName: "qrcode")
          .foregroundStyle(theme.icon)
      }
    }
    .accessibilityLabel(isPaired ? (anyOnline ? "Mac online" : "Mac offline") : "Pair a Mac")
  }
}

/// The desktop's live dot (`LivePill`, design-system/desktop/LivePill.tsx): 8 pt in the
/// theme's colour and, while live, a copy of it rippling out, Tailwind's `animate-ping`
/// (1 s, twice the size, fading from 75% to nothing).
private struct LiveDot: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  let color: Color
  let pulses: Bool

  var body: some View {
    ZStack {
      if pulses && !reduceMotion {
        TimelineView(.animation) { context in
          let t = context.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 1)
          // `cubic-bezier(0, 0, 0.2, 1)`, the ping's ease-out, is close to this curve.
          let eased = 1 - pow(1 - t, 3)
          Circle()
            .fill(color)
            .scaleEffect(1 + eased)
            .opacity(0.75 * (1 - eased))
        }
      }
      Circle().fill(color)
    }
    .frame(width: 8, height: 8)
  }
}
