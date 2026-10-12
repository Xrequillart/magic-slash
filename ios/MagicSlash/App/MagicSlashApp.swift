import Supabase
import SwiftUI

@main
struct MagicSlashApp: App {
  @State private var theme = ThemeStore()

  var body: some Scene {
    WindowGroup {
      Group {
        if let client = Backend.client {
          RootView(client: client, theme: theme)
        } else {
          MessageScreen(
            systemImage: "gearshape.2",
            title: "Not configured",
            message: "This build has no Supabase host or key. Copy ios/Config/Secrets.example.xcconfig to Secrets.xcconfig, fill it in, and rebuild."
          )
        }
      }
      .themed(theme.tokens)
    }
  }
}

/// Routes between the sign-in steps and the agent list, and owns the stores that only
/// exist while signed in.
private struct RootView: View {
  @Environment(\.scenePhase) private var scenePhase

  let theme: ThemeStore
  @State private var auth: AuthModel
  @State private var agents: AgentStore?
  @State private var wentToBackground = false

  init(client: SupabaseClient, theme: ThemeStore) {
    self.theme = theme
    _auth = State(initialValue: AuthModel(client: client))
  }

  var body: some View {
    content
      .task { await auth.start() }
      .onChange(of: auth.state) { _, state in
        Task { await apply(state) }
      }
      .onChange(of: scenePhase) { _, phase in
        switch phase {
        case .background:
          wentToBackground = true
        case .active where wentToBackground:
          wentToBackground = false
          Task {
            async let agentsResumed: Void? = agents?.start()
            async let themeResumed: Void = theme.resume()
            _ = await (agentsResumed, themeResumed)
          }
        default:
          break
        }
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
    case .signedIn:
      if let agents {
        AgentListView(store: agents) {
          Task { await auth.signOut() }
        }
      } else {
        LoadingScreen()
      }
    }
  }

  private func apply(_ state: AuthState) async {
    switch state {
    case .signedIn(let userId):
      let store = AgentStore(client: auth.client, userId: userId)
      agents = store
      async let agentsStarted: Void = store.start()
      async let themeStarted: Void = theme.start(client: auth.client, userId: userId)
      _ = await (agentsStarted, themeStarted)
    case .signedOut:
      let previous = agents
      agents = nil
      await previous?.stop()
      await theme.stop()
    case .restoring, .needsTOTP:
      break
    }
  }
}
