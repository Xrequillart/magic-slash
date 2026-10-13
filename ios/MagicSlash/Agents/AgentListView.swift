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

  var body: some View {
    NavigationStack {
      content
        .safeAreaInset(edge: .top, spacing: 0) {
          MacPresenceBanner(relay: relay) { sheet = .pair }
        }
        .background(theme.bg.ignoresSafeArea())
        .navigationTitle("Agents")
        .toolbarBackground(theme.bg, for: .navigationBar)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Menu {
              Button("Pair a Mac", systemImage: "qrcode.viewfinder") { sheet = .pair }
              Button("Paired Macs", systemImage: "laptopcomputer") { sheet = .macs }
              Divider()
              Button("Sign out", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive, action: onSignOut)
            } label: {
              Image(systemName: "person.crop.circle")
                .foregroundStyle(theme.icon)
            }
            .accessibilityLabel("Account")
          }
        }
        .navigationDestination(for: String.self) { id in
          AgentDetailView(store: store, relay: relay, agentId: id)
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
      NavigationLink(value: row.agent.id) {
        AgentRow(agent: row.agent, runtime: relay.runtime(for: row.agent.appAgentId))
      }
      .listRowBackground(theme.bg)
      .listRowSeparatorTint(theme.lineSubtle)
    }
  }
}

private struct AgentRow: View {
  @Environment(\.theme) private var theme
  let agent: Agent
  let runtime: AgentRuntime?

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(agent.title)
        .font(.body.weight(.semibold))
        .foregroundStyle(theme.ink)
        .lineLimit(2)

      HStack(spacing: 6) {
        TypeBadge(type: agent.type)
        StatusPill(status: agent.status)
        if let runtime {
          RuntimePill(runtime: runtime)
        }
        Spacer(minLength: 4)
        if let ticket = agent.ticketId {
          Text(ticket)
            .font(.caption.monospaced())
            .foregroundStyle(theme.textSecondary)
            .lineLimit(1)
        }
      }
    }
    .padding(.vertical, 4)
  }
}
