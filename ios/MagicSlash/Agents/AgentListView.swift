import SwiftUI

struct AgentListView: View {
  @Environment(\.theme) private var theme

  let store: AgentStore
  let onSignOut: () -> Void

  var body: some View {
    NavigationStack {
      content
        .background(theme.bg.ignoresSafeArea())
        .navigationTitle("Agents")
        .toolbarBackground(theme.bg, for: .navigationBar)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Menu {
              Button("Sign out", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive, action: onSignOut)
            } label: {
              Image(systemName: "person.crop.circle")
                .foregroundStyle(theme.icon)
            }
            .accessibilityLabel("Account")
          }
        }
        .navigationDestination(for: String.self) { id in
          AgentDetailView(store: store, agentId: id)
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

  private var list: some View {
    List(store.agents) { agent in
      NavigationLink(value: agent.id) {
        AgentRow(agent: agent)
      }
      .listRowBackground(theme.bg)
      .listRowSeparatorTint(theme.lineSubtle)
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .refreshable { await store.refresh() }
  }
}

private struct AgentRow: View {
  @Environment(\.theme) private var theme
  let agent: Agent

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(agent.title)
        .font(.body.weight(.semibold))
        .foregroundStyle(theme.ink)
        .lineLimit(2)

      HStack(spacing: 6) {
        TypeBadge(type: agent.type)
        StatusPill(status: agent.status)
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
