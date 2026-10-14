import Foundation
import Observation

/// Carries a tapped notification to the agent list, which opens that agent's session.
///
/// The app delegate sets `pending` when a notification is tapped, possibly before any view
/// exists (the tap that launched the app); `AgentListView` takes it once it can resolve the
/// agent, and clears it either way.
@MainActor
@Observable
final class NotificationRouter {
  struct Request: Equatable {
    /// The desktop's terminal id, as the Mac put it in the box (PROTOCOL.md §14).
    let appAgentId: String
    /// The Mac the notification came from: only a list that has it paired takes the request,
    /// so a tap never opens anything in another account's list.
    let macId: String
  }

  private(set) var pending: Request?

  func open(appAgentId: String, macId: String) {
    pending = Request(appAgentId: appAgentId, macId: macId.lowercased())
  }

  /// Drops the request once handled, or when it cannot be.
  func clear() {
    pending = nil
  }
}
