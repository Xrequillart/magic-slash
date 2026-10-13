import Foundation
import Supabase

/// The Supabase connection, built once from the values the build baked into Info.plist.
///
/// The host and anon key come from `Config/Secrets.xcconfig` through the `SupabaseHost`
/// and `SupabaseAnonKey` Info.plist keys. A clone without that file still builds, with
/// both values empty: `Backend.client` is then nil and the app shows a "not configured"
/// screen rather than crashing on a force-unwrapped URL.
enum Backend {
  static let client: SupabaseClient? = makeClient()

  /// The project URL, or nil when the build carries no usable configuration.
  static var projectURL: URL? {
    guard let host = infoString("SupabaseHost"), !host.isEmpty else { return nil }
    // The xcconfig cannot hold `https://` (`//` starts a comment there), so the scheme
    // is added here. A local stack (`127.0.0.1:54321`) speaks plain http.
    let isLocal = host.hasPrefix("localhost") || host.hasPrefix("127.0.0.1")
    let url = URL(string: "\(isLocal ? "http" : "https")://\(host)")
    return url?.host() == nil ? nil : url
  }

  private static func makeClient() -> SupabaseClient? {
    guard let url = projectURL,
          let key = infoString("SupabaseAnonKey"), !key.isEmpty
    else { return nil }

    return SupabaseClient(
      supabaseURL: url,
      supabaseKey: key,
      options: SupabaseClientOptions(
        // Opt in to the next major's behaviour now: the stored session is emitted as is,
        // and AuthModel checks its expiry itself.
        auth: .init(emitLocalSessionAsInitialSession: true),
        // The SDK's own word on the socket, in the connection log.
        global: .init(logger: RealtimeLogTap()),
        // Realtime's protocol 1.0.0, as the desktop speaks it. Under 2.0.0 (the SDK's default)
        // the phone's presence never reached the Mac.
        realtime: RealtimeClientOptions(vsn: .v1)
      )
    )
  }

  private static func infoString(_ key: String) -> String? {
    let value = Bundle.main.object(forInfoDictionaryKey: key) as? String
    let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines)
    // An unexpanded `$(SUPABASE_HOST)` means the build setting was never defined.
    if let trimmed, trimmed.hasPrefix("$(") { return nil }
    return trimmed
  }
}
