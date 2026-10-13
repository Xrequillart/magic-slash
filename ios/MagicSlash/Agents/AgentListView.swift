import SwiftUI

struct AgentListView: View {
  @Environment(\.theme) private var theme

  let store: AgentStore
  let relay: RelayStore
  /// The order the desktop sidebar uses, followed live.
  let sort: AgentSortMode
  let onSignOut: () -> Void

  private enum Sheet: String, Identifiable {
    case pair, macs
    var id: String { rawValue }
  }

  @State private var sheet: Sheet?
  /// The sessions opened, as a path: rows push onto it themselves, which keeps the list
  /// free of the disclosure chevron a `NavigationLink` row draws.
  @State private var path: [String] = []
  @State private var showsDrawer = false

  var body: some View {
    NavigationStack(path: $path) {
      content
        .background(theme.bg.ignoresSafeArea())
        .navigationTitle("Sessions")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(theme.bg, for: .navigationBar)
        .toolbar {
          ToolbarItem(placement: .topBarLeading) {
            Button {
              withAnimation(.snappy(duration: 0.28)) { showsDrawer = true }
            } label: {
              Image(systemName: "line.3.horizontal")
                .foregroundStyle(theme.icon)
            }
            .accessibilityLabel("Account and pairing")
          }
        }
        .navigationDestination(for: String.self) { id in
          AgentSessionView(store: store, relay: relay, agentId: id)
        }
    }
    .overlay {
      AccountDrawer(
        isOpen: $showsDrawer,
        email: store.client.auth.currentUser?.email,
        relay: relay,
        onPair: { open(.pair) },
        onPairedMacs: { open(.macs) },
        onSignOut: onSignOut
      )
    }
    .sheet(item: $sheet) { sheet in
      switch sheet {
      case .pair:
        PairingView(relay: relay)
      case .macs:
        PairedMacsView(relay: relay) { self.sheet = .pair }
      }
    }
  }

  /// Closes the drawer, then opens the sheet it asked for.
  private func open(_ next: Sheet) {
    withAnimation(.snappy(duration: 0.28)) { showsDrawer = false }
    sheet = next
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
              .font(.footnote.weight(.semibold))
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

  private func rows(_ agents: [OrderedAgent]) -> some View {
    ForEach(agents) { row in
      Button {
        path.append(row.agent.id)
      } label: {
        AgentRow(agent: row.agent)
      }
      .buttonStyle(.plain)
      .listRowBackground(theme.bg)
      .listRowSeparator(.hidden)
      .listRowInsets(EdgeInsets(top: 10, leading: 20, bottom: 10, trailing: 16))
    }
  }
}

/// One session: a chat mark, its title and when it last moved, and the ticket it took.
private struct AgentRow: View {
  @Environment(\.theme) private var theme
  let agent: Agent

  var body: some View {
    HStack(spacing: 12) {
      // The mark sits on the title's line, the label in the middle of the row.
      HStack(alignment: .firstTextBaseline, spacing: 14) {
        Image(systemName: "bubble.left")
          .font(.body)
          .foregroundStyle(theme.iconMuted)

        VStack(alignment: .leading, spacing: 3) {
          Text(agent.title)
            .font(.body)
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          if let updated = agent.updatedAt {
            Text(updated.formatted(.relative(presentation: .named)))
              .font(.subheadline)
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
