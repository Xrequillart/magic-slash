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
  /// How far a drag is pulling the open list back over the drawer.
  @GestureState private var drag: CGFloat = 0
  /// Bumped on every tap that should be felt: the menu button and each session.
  @State private var taps = 0

  private static let slide = Animation.snappy(duration: 0.3)

  var body: some View {
    // Read outside the full-screen layers below, which no longer see the safe area.
    GeometryReader { screen in
      let insets = screen.safeAreaInsets
      layers(insets: insets)
    }
    .sensoryFeedback(.impact(weight: .light), trigger: taps)
    .sheet(item: $sheet) { sheet in
      switch sheet {
      case .pair:
        PairingView(relay: relay)
      case .macs:
        PairedMacsView(relay: relay) { self.sheet = .pair }
      }
    }
  }

  private func layers(insets: EdgeInsets) -> some View {
    GeometryReader { proxy in
      let width = min(proxy.size.width * 0.82, 340)
      ZStack(alignment: .topLeading) {
        // Underneath, and still: the list slides aside to show it.
        AccountDrawer(
          client: store.client,
          onSignOut: {
            withAnimation(Self.slide) { showsDrawer = false }
            onSignOut()
          }
        )
        .padding(.top, insets.top)
        .padding(.bottom, insets.bottom)
        .frame(width: width)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(theme.bgSecondary)

        sessions
          // The list's own ground, full screen: it travels with the list, so nothing
          // of the drawer shows at the edges while it is closed.
          .background(theme.bg)
          .overlay {
            // While open, a tap anywhere on the list closes the drawer instead of
            // opening a session.
            if showsDrawer {
              Color.black.opacity(0.18)
                .ignoresSafeArea()
                .contentShape(Rectangle())
                .onTapGesture { setDrawer(false) }
                .transition(.opacity)
                .accessibilityLabel("Close")
                .accessibilityAddTraits(.isButton)
            }
          }
          .clipShape(RoundedRectangle(cornerRadius: showsDrawer ? 24 : 0, style: .continuous))
          .shadow(color: .black.opacity(showsDrawer ? 0.25 : 0), radius: 20, x: -4)
          .offset(x: showsDrawer ? max(0, width + min(0, drag)) : 0)
          .simultaneousGesture(
            DragGesture(minimumDistance: 12)
              .updating($drag) { value, state, _ in
                if showsDrawer { state = value.translation.width }
              }
              .onEnded { value in
                if showsDrawer, value.translation.width < -width / 3 { setDrawer(false) }
              }
          )
      }
    }
    // Both layers span the whole screen, status bar and home indicator included. Their
    // content still keeps to the safe area: only the frames are stretched.
    .ignoresSafeArea()
  }

  private var sessions: some View {
    NavigationStack(path: $path) {
      content
        .background(theme.bg.ignoresSafeArea())
        // The bar's own backdrop is hidden for ours: a system material is a neutral grey
        // whatever the theme, where this one is the theme's ground, blurred.
        .overlay(alignment: .top) { HeaderBackdrop() }
        .navigationTitle("Sessions")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            PairingButton(relay: relay) {
              taps += 1
              open(isPaired ? .macs : .pair)
            }
          }
          ToolbarItem(placement: .topBarLeading) {
            Button {
              setDrawer(!showsDrawer)
            } label: {
              Image(systemName: "line.3.horizontal")
                .foregroundStyle(theme.icon)
            }
            .accessibilityLabel("Account")
          }
        }
        .navigationDestination(for: String.self) { id in
          AgentSessionView(store: store, relay: relay, agentId: id)
        }
    }
  }

  private func setDrawer(_ open: Bool) {
    taps += 1
    withAnimation(Self.slide) { showsDrawer = open }
  }

  private var isPaired: Bool {
    !relay.macs.isEmpty && !relay.needsRepair
  }

  /// Closes the drawer, then opens the sheet it asked for.
  private func open(_ next: Sheet) {
    withAnimation(Self.slide) { showsDrawer = false }
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

  private func rows(_ agents: [OrderedAgent]) -> some View {
    ForEach(agents) { row in
      Button {
        taps += 1
        path.append(row.agent.id)
      } label: {
        AgentRow(agent: row.agent)
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

/// One session: a chat mark, its title and when it last moved, and the ticket it took.
private struct AgentRow: View {
  @Environment(\.theme) private var theme
  let agent: Agent

  var body: some View {
    HStack(spacing: 12) {
      // The mark and the label both sit in the middle of the row.
      HStack(spacing: 14) {
        SessionGlyph()
          .fill(theme.ink)
          .frame(width: 20, height: 20)

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

/// The header's ground: the theme's background, translucent over a blur, so the list
/// scrolls under it in the theme's colour rather than a system grey. It covers the status
/// bar and the navigation bar, which is the content's top safe area.
private struct HeaderBackdrop: View {
  @Environment(\.theme) private var theme

  var body: some View {
    GeometryReader { proxy in
      let height = proxy.safeAreaInsets.top
      ZStack(alignment: .bottom) {
        Rectangle().fill(.ultraThinMaterial)
        theme.bg.opacity(0.72)
        Rectangle().fill(theme.lineSubtle.opacity(0.6)).frame(height: 0.5)
      }
      .environment(\.colorScheme, theme.isDark ? .dark : .light)
      .frame(height: height)
      .offset(y: -height)
    }
    .frame(height: 0)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
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
