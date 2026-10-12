import Foundation
import Observation
import Supabase

/// The theme the user picked on the desktop, read from `user_settings.theme` and kept
/// current over Realtime.
///
/// The last value seen is remembered on the device so the sign-in screen and the first
/// frame after launch already wear it, instead of flashing the fallback.
@MainActor
@Observable
final class ThemeStore {
  private(set) var themeID: ThemeID

  var tokens: ThemeTokens { .tokens(for: themeID) }

  @ObservationIgnored private var client: SupabaseClient?
  @ObservationIgnored private var userId: UUID?
  @ObservationIgnored private var channel: RealtimeChannelV2?
  @ObservationIgnored private var tasks: [Task<Void, Never>] = []
  /// Bumped by every Realtime change, so a read that started before one is not applied
  /// over it.
  @ObservationIgnored private var liveRevision = 0

  private static let cacheKey = "lastThemeID"

  init() {
    themeID = ThemeID(raw: UserDefaults.standard.string(forKey: Self.cacheKey))
  }

  func start(client: SupabaseClient, userId: UUID) async {
    self.client = client
    self.userId = userId
    await resume()
  }

  func stop() async {
    await unsubscribe()
    client = nil
    userId = nil
  }

  /// Subscribes, then reads, so no change slips between the two. Also called when the app
  /// comes back to the foreground: the socket may have died while suspended, and any
  /// change made meanwhile was missed.
  func resume() async {
    guard client != nil else { return }
    await subscribe()
    await refresh()
  }

  private func refresh() async {
    guard let client, let userId else { return }
    let revision = liveRevision
    do {
      let rows: [JSONObject] = try await client
        .from("user_settings")
        .select("theme")
        .eq("user_id", value: userId.uuidString.lowercased())
        .limit(1)
        .execute()
        .value
      guard revision == liveRevision else { return }
      // No row yet means the user never changed anything: the desktop default applies.
      apply(raw: rows.first?["theme"]?.stringValue)
    } catch {
      // Keep whatever theme is showing; a failed read is not a theme change.
    }
  }

  private func subscribe() async {
    guard let client, let userId else { return }
    await unsubscribe()

    let channel = client.channel("ios-user-settings")
    let filter = RealtimePostgresFilter.eq("user_id", value: userId.uuidString.lowercased())
    let changes = channel.postgresChange(AnyAction.self, table: "user_settings", filter: filter)

    tasks = [
      Task { [weak self] in
        for await change in changes {
          switch change {
          case .insert(let action): self?.applyLive(raw: action.record["theme"]?.stringValue)
          case .update(let action): self?.applyLive(raw: action.record["theme"]?.stringValue)
          default: break
          }
        }
      },
    ]
    self.channel = channel
    try? await channel.subscribeWithError()
  }

  private func unsubscribe() async {
    tasks.forEach { $0.cancel() }
    tasks = []
    if let channel, let client {
      await client.removeChannel(channel)
    }
    channel = nil
  }

  private func applyLive(raw: String?) {
    liveRevision += 1
    apply(raw: raw)
  }

  private func apply(raw: String?) {
    let id = ThemeID(raw: raw)
    if id != themeID { themeID = id }
    UserDefaults.standard.set(id.rawValue, forKey: Self.cacheKey)
  }
}
