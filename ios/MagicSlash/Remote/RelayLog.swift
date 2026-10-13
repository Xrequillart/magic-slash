import Foundation
import Observation
import Supabase

/// What the link to the Macs went through, newest last: the relay's own events, and what the
/// Supabase SDK says about its socket and channels (closes, errors, reconnects). Shown in
/// Settings → Paired Macs → Connection log, to be copied when the link misbehaves. States,
/// names and SDK messages only, never a key or a payload.
@MainActor
@Observable
final class RelayLog {
  static let shared = RelayLog()

  private(set) var events: [String] = []

  func add(_ event: String) {
    events.append("\(Date().formatted(date: .omitted, time: .standard))  \(event)")
    if events.count > 400 { events.removeFirst(events.count - 400) }
  }
}

/// Hands the SDK's realtime messages that matter for the relay to `RelayLog`: warnings and
/// errors, and the debug lines about the socket and channels closing or failing.
struct RealtimeLogTap: SupabaseLogger {
  private static let keywords = ["WebSocket", "closed", "close", "error", "Error", "Failed", "reconnect", "Reconnect", "timed out", "timeout"]

  func log(message: SupabaseLogMessage) {
    guard message.system.localizedCaseInsensitiveContains("realtime") else { return }
    let relevant = message.level == .warning || message.level == .error
      || Self.keywords.contains(where: message.message.contains)
    guard relevant else { return }
    let line = "sdk \(message.level): \(message.message.prefix(300))"
    Task { @MainActor in RelayLog.shared.add(line) }
  }
}
