import Supabase
import SwiftUI

@main
struct MagicSlashApp: App {
  @State private var theme = DesktopSettingsStore()
  /// Whether the app knows what to show: the splash leaves once it does.
  @State private var ready = false
  @State private var showsSplash = true

  init() {
    Cera.applyToNavigationBars()
  }

  var body: some Scene {
    WindowGroup {
      Group {
        if let client = Backend.client {
          RootView(client: client, theme: theme, ready: $ready)
        } else {
          MessageScreen(
            systemImage: "gearshape.2",
            title: "Not configured",
            message: "This build has no Supabase host or key. Copy ios/Config/Secrets.example.xcconfig to Secrets.xcconfig, fill it in, and rebuild."
          )
          .onAppear { ready = true }
        }
      }
      .themed(theme.tokens)
      .environment(\.chatToolDetail, theme.chatToolDetail)
      // Any text that does not pick a style of its own is still Cera Pro.
      .font(.cera(.body))
      .overlay {
        if showsSplash {
          SplashView(ready: ready) { showsSplash = false }
        }
      }
    }
  }
}

/// Routes between the sign-in steps and the agent list, and owns the stores that only
/// exist while signed in.
private struct RootView: View {
  @Environment(\.scenePhase) private var scenePhase

  let theme: DesktopSettingsStore
  /// Set once the screen shows more than a loader, which lets the splash go.
  @Binding var ready: Bool
  @State private var auth: AuthModel
  @State private var agents: AgentStore?
  /// Created, swapped and stopped with `agents`: both belong to the signed-in account.
  @State private var relay: RelayStore?
  @State private var wentToBackground = false

  init(client: SupabaseClient, theme: DesktopSettingsStore, ready: Binding<Bool>) {
    self.theme = theme
    _ready = ready
    _auth = State(initialValue: AuthModel(client: client))
  }

  var body: some View {
    content
      .task { await auth.start() }
      .onChange(of: hasContent, initial: true) { _, hasContent in
        if hasContent { ready = true }
      }
      .onChange(of: auth.state) { _, state in
        apply(state)
      }
      .onChange(of: scenePhase) { _, phase in
        switch phase {
        case .background:
          wentToBackground = true
          // The pair keys never outlive the foreground session: Face ID again on return.
          relay?.lock()
        case .active where wentToBackground:
          wentToBackground = false
          Task {
            async let agentsResumed: Void? = agents?.start()
            async let relayResumed: Void? = relay?.start()
            async let themeResumed: Void = theme.resume()
            _ = await (agentsResumed, relayResumed, themeResumed)
          }
        default:
          break
        }
      }
  }

  /// True once the session is restored and, when signed in, the first agent read is
  /// done, so the splash reveals the list rather than another spinner.
  private var hasContent: Bool {
    switch auth.state {
    case .restoring:
      false
    case .signedOut, .needsTOTP:
      true
    case .signedIn(let userId):
      agents?.ownerId == userId && agents?.loadState != .loading
    }
  }

  @ViewBuilder
  private var content: some View {
    switch auth.state {
    case .restoring:
      LoadingScreen()
    case .signedOut:
      SignInView(auth: auth)
    case .needsTOTP:
      TOTPView(auth: auth)
    case .signedIn(let userId):
      // The owner check covers the frame between a sign-in and `apply`: another account's
      // list is never drawn under this one.
      if let agents, let relay, agents.ownerId == userId, relay.ownerId == userId {
        AgentListView(store: agents, relay: relay, settings: theme) {
          Task { await auth.signOut() }
        }
      } else {
        LoadingScreen()
      }
    }
  }

  /// Swaps the stores synchronously, so the screen never shows the previous account's
  /// list, then starts and stops them off the main path. Agent stores are per account and
  /// the theme store ignores a stale stop, so no transition waits on another one's reads.
  private func apply(_ state: AuthState) {
    switch state {
    case .signedIn(let userId):
      guard agents?.ownerId != userId else { return }
      let previous = agents
      let previousRelay = relay
      let store = AgentStore(client: auth.client, userId: userId)
      let relayStore = RelayStore(client: auth.client, userId: userId)
      agents = store
      relay = relayStore
      Task {
        if let previous {
          await theme.stop(for: previous.ownerId)
          await previous.stop()
        }
        await previousRelay?.stop()
      }
      Task {
        async let agentsStarted: Void = store.start()
        async let relayStarted: Void = relayStore.start()
        async let themeStarted: Void = theme.start(client: auth.client, userId: userId)
        _ = await (agentsStarted, relayStarted, themeStarted)
      }
    case .signedOut:
      let previousRelay = relay
      relay = nil
      // Keys out of memory now, not once the channel has gone.
      previousRelay?.lock()
      Task { await previousRelay?.stop() }
      guard let previous = agents else { return }
      agents = nil
      Task {
        await theme.stop(for: previous.ownerId)
        await previous.stop()
      }
    case .restoring, .needsTOTP:
      break
    }
  }
}
