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
  /// Bumped by every start and stop, so work begun for one account never lands after the
  /// next account has taken over.
  @ObservationIgnored private var session = 0
  /// Each subscription gets its own channel name, so removing an old channel can never
  /// tear down the one that replaced it.
  @ObservationIgnored private var subscriptionCount = 0

  private static let cacheKey = "lastThemeID"

  init() {
    themeID = ThemeID(raw: UserDefaults.standard.string(forKey: Self.cacheKey))
  }

  func start(client: SupabaseClient, userId: UUID) async {
    session += 1
    self.client = client
    self.userId = userId
    await resume()
  }

  /// Stops only if `userId` is still the account being followed: a sign-out that finishes
  /// after the next sign-in must not stop the new account's theme.
  func stop(for userId: UUID) async {
    guard self.userId == userId else { return }
    session += 1
    let oldClient = client
    client = nil
    self.userId = nil
    await unsubscribe(using: oldClient)
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
    let session = session
    do {
      let rows: [JSONObject] = try await client
        .from("user_settings")
        .select("theme")
        .eq("user_id", value: userId.uuidString.lowercased())
        .limit(1)
        .execute()
        .value
      guard revision == liveRevision, session == self.session else { return }
      // No row yet means the user never changed anything: the desktop default applies.
      apply(raw: rows.first?["theme"]?.stringValue)
    } catch {
      // Keep whatever theme is showing; a failed read is not a theme change.
    }
  }

  private func subscribe() async {
    guard let client, let userId else { return }
    let session = session
    // Claimed before awaiting: if another subscribe starts while this one waits for the
    // old channel to go, the newer call owns the subscription and this one steps aside.
    subscriptionCount += 1
    let attempt = subscriptionCount
    await unsubscribe(using: client)
    guard session == self.session, attempt == subscriptionCount else { return }

    let channel = client.channel("ios-user-settings-\(attempt)")
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

  /// Detaches synchronously, then removes the old channel: nothing set up after this call
  /// returns control can be undone by it.
  private func unsubscribe(using client: SupabaseClient?) async {
    tasks.forEach { $0.cancel() }
    tasks = []
    let old = channel
    channel = nil
    if let old, let client {
      await client.removeChannel(old)
    }
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
