import Foundation
import Observation

/// Carries a tapped notification to the agent list, which opens that agent's session.
///
/// The app delegate sets `pending` when a notification is tapped, possibly before any view
/// exists (the tap that launched the app); `AgentListView` takes it once it can resolve the
/// agent, or once it can tell it never will.
@MainActor
@Observable
final class NotificationRouter {
  struct Request: Equatable {
    /// The desktop's terminal id, as the Mac put it in the box (PROTOCOL.md §14).
    let appAgentId: String
    /// The Mac the notification came from: only a list that has it paired takes the request,
    /// so a tap never opens anything in another account's list.
    let macId: String
    /// When it was tapped: a request the list cannot resolve in time is dropped, so it never
    /// opens an agent long after the tap.
    let at: Date
  }

  /// How long a tap waits for its agent to reach the list (a refresh on return from the
  /// background, for an agent started while the app was away).
  static let patience: TimeInterval = 30

  private(set) var pending: Request?

  func open(appAgentId: String, macId: String) {
    pending = Request(appAgentId: appAgentId, macId: macId.lowercased(), at: .now)
  }

  /// Drops the request once handled, or when it cannot be.
  func clear() {
    pending = nil
  }
}
