import SwiftUI

struct AgentListView: View {
  @Environment(\.theme) private var theme

  let store: AgentStore
  let relay: RelayStore
  /// The desktop settings: the sidebar order the list follows live.
  let settings: DesktopSettingsStore
  /// A tapped notification's agent, opened here once the list can find it.
  let router: NotificationRouter
  let onSignOut: () -> Void

  private enum Sheet: String, Identifiable {
    case account, pair, macs
    var id: String { rawValue }
  }

  @State private var sheet: Sheet?
  /// The sessions opened, as a path: rows push onto it themselves, which keeps the list
  /// free of the disclosure chevron a `NavigationLink` row draws.
  @State private var path: [String] = []
  @State private var profile: ProfileStore
  /// Bumped on every tap that should be felt: the header buttons and each session.

  init(
    store: AgentStore, relay: RelayStore, settings: DesktopSettingsStore, router: NotificationRouter,
    onSignOut: @escaping () -> Void
  ) {
    self.store = store
    self.relay = relay
    self.settings = settings
    self.router = router
    self.onSignOut = onSignOut
    _profile = State(initialValue: ProfileStore(client: store.client))
  }

  var body: some View {
    // The system bar, as on a session's page: no backdrop of our own.
    NavigationStack(path: $path) {
      content
        .background(theme.bg.ignoresSafeArea())
        .navigationTitle("Sessions")
        // A large title at the top left, which folds into the bar's centre on scroll.
        .navigationBarTitleDisplayMode(.large)
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
    // Back to the list, by the back button or the edge swipe alike.
    .onChange(of: path.count) { old, new in
      if new < old { Haptics.tap() }
    }
    .task { await profile.load() }
    // Whichever comes last, the tap or the first read of the agents, opens the session.
    .onChange(of: RouteTrigger(request: router.pending, loaded: store.loadState != .loading, agentIds: store.agents.map(\.appAgentId)), initial: true) {
      openTappedAgent()
    }
    .sheet(item: $sheet) { sheet in
      switch sheet {
      case .account:
        SettingsView(relay: relay, profile: profile) {
          self.sheet = .pair
        } onSignOut: {
          self.sheet = nil
          onSignOut()
        }
      case .pair:
        PairingView(relay: relay)
      case .macs:
        PairedMacsView(relay: relay) { self.sheet = .pair }
      }
    }
  }

  private var sort: AgentSortMode { settings.agentSort }

  private struct RouteTrigger: Equatable {
    let request: NotificationRouter.Request?
    let loaded: Bool
    /// The agents listed: an agent started while the app was away arrives with a refresh that
    /// leaves `loadState` at `.loaded`, so the list itself has to be watched.
    let agentIds: [String?]
  }

  /// A tapped notification (PROTOCOL.md §14): its `appAgentId` names the desktop's terminal,
  /// mapped here to the session's row. Only from a Mac paired with this account, so a tap
  /// meant for another account opens nothing. An agent not listed yet is waited for, up to
  /// `NotificationRouter.patience`: past that (archived since), the list stays as it is.
  private func openTappedAgent() {
    guard let request = router.pending, store.loadState != .loading else { return }
    guard relay.macs.contains(where: { $0.macId == request.macId }),
          Date.now.timeIntervalSince(request.at) < NotificationRouter.patience
    else { return router.clear() }
    guard let agent = store.agents.first(where: { $0.appAgentId == request.appAgentId }) else { return }
    router.clear()
    sheet = nil
    path = [agent.id]
  }

  private var isPaired: Bool {
    !relay.macs.isEmpty && !relay.needsRepair
  }

  @ViewBuilder
  private var content: some View {
    switch store.loadState {
    case .loading where store.agents.isEmpty:
      LoadingScreen()
    case .failed(let message) where store.agents.isEmpty:
      refreshableMessage(systemImage: "wifi.exclamationmark", title: "Agents unavailable", message: "\(message)")
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
  private func refreshableMessage(systemImage: String, title: LocalizedStringKey, message: LocalizedStringKey) -> some View {
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
      // No rules between sessions: the spacing alone separates them.
      .listRowSeparator(.hidden)
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
          if let created = agent.createdDate {
            Text(Self.created(created))
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

extension AgentRow {
  /// When the session was created: "Today, 14:32", "Yesterday, 09:05", "12 Oct, 14:32",
  /// with the year once it is not this one.
  static func created(_ date: Date) -> String {
    let calendar = Calendar.current
    let time = date.formatted(date: .omitted, time: .shortened)
    if calendar.isDateInToday(date) { return String(localized: "Today, \(time)") }
    if calendar.isDateInYesterday(date) { return String(localized: "Yesterday, \(time)") }
    let sameYear = calendar.isDate(date, equalTo: .now, toGranularity: .year)
    let day = sameYear
      ? date.formatted(.dateTime.day().month(.abbreviated))
      : date.formatted(.dateTime.day().month(.abbreviated).year())
    return "\(day), \(time)"
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
            .foregroundStyle(theme.ink)
          LiveDot(color: anyOnline ? theme.green : theme.red, pulses: anyOnline)
        }
      } else {
        Image(systemName: "qrcode")
          .foregroundStyle(theme.ink)
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
