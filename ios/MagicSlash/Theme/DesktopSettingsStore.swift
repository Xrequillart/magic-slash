import Foundation
import Observation
import Supabase
import SwiftUI

/// The three desktop settings the iPhone follows itself, read from `user_settings` and kept
/// current over Realtime: the theme, how the sidebar sorts the agents, and which tool calls
/// the chat draws a line for. Read only: the iPhone has settings of its own
/// (`AppPreferences`), and the desktop's are changed on the desktop.
///
/// The three are remembered on the device so the sign-in screen and the first frame after
/// launch already wear them, instead of flashing the fallback.
@MainActor
@Observable
final class DesktopSettingsStore {
  private(set) var themeID: ThemeID
  private(set) var agentSort: AgentSortMode
  private(set) var chatToolDetail: ChatToolDetail

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

  private static let themeCacheKey = "lastThemeID"
  private static let sortCacheKey = "lastAgentSort"
  private static let toolDetailCacheKey = "lastChatToolDetail"

  init() {
    themeID = ThemeID(raw: UserDefaults.standard.string(forKey: Self.themeCacheKey))
    agentSort = AgentSortMode(raw: UserDefaults.standard.string(forKey: Self.sortCacheKey))
    chatToolDetail = ChatToolDetail(raw: UserDefaults.standard.string(forKey: Self.toolDetailCacheKey))
  }

  func start(client: SupabaseClient, userId: UUID) async {
    session += 1
    self.client = client
    self.userId = userId
    await resume()
  }

  /// Stops only if `userId` is still the account being followed: a sign-out that finishes
  /// after the next sign-in must not stop the new account's settings.
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
        .select("theme, agent_sort, chat_tool_detail")
        .eq("user_id", value: userId.uuidString.lowercased())
        .limit(1)
        .execute()
        .value
      guard revision == liveRevision, session == self.session else { return }
      // No row yet means the user never changed anything: the desktop defaults apply.
      apply(rows.first ?? [:])
    } catch {
      // Keep whatever is showing; a failed read is not a settings change.
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
          case .insert(let action): self?.applyLive(action.record)
          case .update(let action): self?.applyLive(action.record)
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

  private func applyLive(_ row: JSONObject) {
    liveRevision += 1
    apply(row)
  }

  /// Publishes the three settings, only where they changed. A column the row lacks was
  /// never chosen: the desktop default applies.
  private func apply(_ row: JSONObject) {
    let id = ThemeID(raw: row["theme"]?.stringValue)
    if id != themeID {
      themeID = id
      UserDefaults.standard.set(id.rawValue, forKey: Self.themeCacheKey)
    }

    let sort = AgentSortMode(raw: row["agent_sort"]?.stringValue)
    if sort != agentSort {
      agentSort = sort
      UserDefaults.standard.set(sort.rawValue, forKey: Self.sortCacheKey)
    }

    let detail = ChatToolDetail(raw: row["chat_tool_detail"]?.stringValue)
    if detail != chatToolDetail {
      chatToolDetail = detail
      UserDefaults.standard.set(detail.rawValue, forKey: Self.toolDetailCacheKey)
    }
  }
}

/// Which tool calls the chat draws a line for: the desktop's `chatToolDetail` setting
/// (`user_settings.chat_tool_detail`).
enum ChatToolDetail: String, Sendable {
  /// One line per call.
  case all
  /// Only the calls that change files or run commands, and the ones that failed.
  case changes
  /// Each run of calls folded into one line, opened on a tap.
  case grouped

  /// An unknown or missing value is the desktop default.
  init(raw: String?) {
    self = raw.flatMap(Self.init(rawValue:)) ?? .all
  }
}

private struct ChatToolDetailKey: EnvironmentKey {
  static let defaultValue: ChatToolDetail = .all
}

extension EnvironmentValues {
  /// The desktop's `chatToolDetail`, injected at the root with the theme.
  var chatToolDetail: ChatToolDetail {
    get { self[ChatToolDetailKey.self] }
    set { self[ChatToolDetailKey.self] = newValue }
  }
}
