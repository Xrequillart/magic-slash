import Foundation
import Supabase

/// This phone's rows in `public.push_devices` (PROTOCOL.md §14): one per paired Mac, holding
/// the APNs token, its gateway, and the two notification toggles. The first table the iPhone
/// writes to.
///
/// The server sends nothing to a (phone, Mac) couple without a row, which is the filter a
/// notification extension cannot provide: it may rewrite a notification, never drop it. So a
/// row exists exactly while the pairing does, and goes on forget, revocation, invalidation and
/// sign-out.
///
/// Every write is fire-and-forget from the caller's side: nothing here blocks the screen, and a
/// failure is only logged. The next launch, unlock or token writes the rows again.
@MainActor
final class PushRegistration {
  /// The two toggles, the same on every row of this phone.
  struct Preferences: Equatable, Sendable {
    var waiting: Bool
    var completed: Bool
  }

  /// The APNs device token, lower-case hex, once iOS has handed it over. Shared by every
  /// account: the token belongs to the app install, not to a user.
  private(set) static var token: String?
  /// The registration of the signed-in account, which a new token is written for.
  private static weak var current: PushRegistration?

  /// From the app delegate. iOS hands the token on every launch: written again only when it
  /// changed, or when the account had nothing written yet.
  static func didReceive(token data: Data) {
    let hex = data.map { String(format: "%02x", $0) }.joined()
    guard hex != token else { return }
    token = hex
    current?.syncAgain()
  }

  private let client: SupabaseClient
  private let userId: String
  /// The Macs the rows follow, as last handed to `sync`.
  private var macs: [PairedMac] = []

  init(client: SupabaseClient, userId: UUID) {
    self.client = client
    self.userId = userId.uuidString.lowercased()
    Self.current = self
  }

  /// Brings this phone's rows in line with `macs`: one per Mac with the current token, and
  /// none for a Mac no longer in the list. Without a token yet, only the removals happen; the
  /// token's arrival writes the rest.
  func sync(_ macs: [PairedMac]) {
    self.macs = macs
    syncAgain()
  }

  private func syncAgain() {
    // Only the pairings made under the phone's current identity: `unlock` drops the others.
    let phoneId = DeviceKeys.shared.phoneId
    let macs = macs.filter { $0.pairingId != nil && $0.phoneId.lowercased() == phoneId }
    let token = Self.token
    let environment = Self.environment
    let userId = userId
    let client = client
    Task {
      do {
        try await Self.write(client: client, userId: userId, phoneId: phoneId, macs: macs, token: token, environment: environment)
      } catch {
        RelayLog.shared.add("push registration failed: \(error.localizedDescription)")
      }
    }
  }

  private nonisolated static func write(
    client: SupabaseClient, userId: String, phoneId: String, macs: [PairedMac], token: String?, environment: String
  ) async throws {
    let table = "push_devices"
    let macIds = macs.map { $0.macId.lowercased() }
    // A Mac forgotten while the app was closed, or a pairing replaced: its row goes first.
    var stale = client.from(table).delete(returning: .minimal).eq("phone_id", value: phoneId)
    if !macIds.isEmpty { stale = stale.notIn("mac_id", values: macIds) }
    try await stale.execute()
    guard let token, !macIds.isEmpty else { return }

    // A new Mac's row starts from the defaults: it takes the toggles the other rows hold, so
    // the phone keeps one setting whatever it pairs with next.
    let existing: [Toggles] = try await client.from(table).select("notify_waiting, notify_completed")
      .eq("phone_id", value: phoneId).limit(1).execute().value
    let rows = macIds.map { Upsert(user_id: userId, phone_id: phoneId, mac_id: $0, apns_token: token, environment: environment) }
    // Only the columns sent are updated on conflict: the toggles of an existing row stay.
    try await client.from(table).upsert(rows, onConflict: "user_id,phone_id,mac_id", returning: .minimal).execute()
    if let held = existing.first, !(held.notify_waiting && held.notify_completed) {
      try await client.from(table).update(held, returning: .minimal).eq("phone_id", value: phoneId).execute()
    }
  }

  /// Removes the rows of these Macs now, whatever `sync` last saw: on forget, revocation and
  /// invalidation, where the phone id may be one the phone no longer holds.
  func remove(_ macs: [PairedMac]) {
    let client = client
    Task {
      for mac in macs {
        do {
          try await client.from("push_devices").delete(returning: .minimal)
            .eq("phone_id", value: mac.phoneId.lowercased()).eq("mac_id", value: mac.macId.lowercased()).execute()
        } catch {
          RelayLog.shared.add("push row not removed: \(error.localizedDescription)")
        }
      }
    }
  }

  /// Every row of this phone, before signing out: once the session is gone, RLS refuses the
  /// delete. Awaited, but bounded by the request itself; a failure does not stop the sign-out.
  func removeAll() async {
    let phoneIds = Set([DeviceKeys.shared.phoneId] + macs.map { $0.phoneId.lowercased() })
    macs = []
    for phoneId in phoneIds {
      do {
        try await client.from("push_devices").delete(returning: .minimal).eq("phone_id", value: phoneId).execute()
      } catch {
        RelayLog.shared.add("push rows not removed: \(error.localizedDescription)")
      }
    }
  }

  // MARK: - Toggles

  /// The toggles as this phone's rows hold them, nil when it has no row (no paired Mac yet, or
  /// no token). Throws when the read fails.
  func preferences() async throws -> Preferences? {
    let rows: [Toggles] = try await client.from("push_devices").select("notify_waiting, notify_completed")
      .eq("phone_id", value: DeviceKeys.shared.phoneId).limit(1).execute().value
    return rows.first.map { Preferences(waiting: $0.notify_waiting, completed: $0.notify_completed) }
  }

  /// Writes both toggles to every row of this phone: the table is their only home.
  func setPreferences(_ preferences: Preferences) async throws {
    try await client.from("push_devices")
      .update(Toggles(notify_waiting: preferences.waiting, notify_completed: preferences.completed), returning: .minimal)
      .eq("phone_id", value: DeviceKeys.shared.phoneId).execute()
  }

  // MARK: - Rows

  private struct Toggles: Codable {
    let notify_waiting: Bool
    let notify_completed: Bool
  }

  private struct Upsert: Encodable {
    let user_id: String
    let phone_id: String
    let mac_id: String
    let apns_token: String
    let environment: String
  }

  // MARK: - Gateway

  /// Which APNs gateway the token belongs to: `sandbox` for a build signed for development,
  /// `production` for TestFlight and the App Store. Read from the provisioning profile the
  /// build embeds, which is what decides it: a Release build run from Xcode is still a
  /// development one. App Store and TestFlight builds carry no profile at all.
  static let environment: String = {
    #if targetEnvironment(simulator)
      return "sandbox"
    #else
      guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
            let data = try? Data(contentsOf: url),
            // The profile is a signed CMS blob around a plain XML plist: the text is readable.
            let text = String(data: data, encoding: .isoLatin1),
            let range = text.range(of: "<key>aps-environment</key>")
      else { return "production" }
      let rest = text[range.upperBound...].prefix(80)
      return rest.contains("<string>development</string>") ? "sandbox" : "production"
    #endif
  }()
}
