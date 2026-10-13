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

  /// Kept on disk, so the log of a session the user had to quit to get the link back is
  /// still there to copy after relaunching.
  private static let file = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("relay-log.txt")

  private init() {
    if let saved = try? String(contentsOf: Self.file, encoding: .utf8) {
      events = saved.split(separator: "\n", omittingEmptySubsequences: true).map(String.init)
    }
    add("app launched")
  }

  func add(_ event: String) {
    let stamp = Date().formatted(.dateTime.day().month(.twoDigits).hour().minute().second())
    events.append("\(stamp)  \(event)")
    if events.count > 600 { events.removeFirst(events.count - 600) }
    try? events.joined(separator: "\n").write(to: Self.file, atomically: true, encoding: .utf8)
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
