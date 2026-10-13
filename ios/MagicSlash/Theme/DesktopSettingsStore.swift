import Foundation
import Observation
import Supabase
import SwiftUI

/// The desktop settings, read from `user_settings` and kept current over Realtime. The
/// iPhone follows three of them itself (the theme, how the sidebar sorts the agents, and
/// which tool calls the chat draws a line for), and the settings screen shows the whole row
/// and edits its editable columns.
///
/// The theme and the sort are remembered on the device so the sign-in screen and the first
/// frame after launch already wear them, instead of flashing the fallback.
///
/// An edit shows at once and is written in the background (`set`). Until the server
/// confirms it, the column is pending: a row read or received meanwhile updates every other
/// column but leaves that one alone, so a Realtime event sent just before the write, or a
/// read that raced it, cannot flick the control back. A failed write restores the column
/// alone, to what the server is known to hold.
@MainActor
@Observable
final class DesktopSettingsStore {
  private(set) var themeID: ThemeID
  private(set) var agentSort: AgentSortMode
  private(set) var chatToolDetail: ChatToolDetail
  /// Every classified column of the row, as last read, received or set. A column that is
  /// missing or `.null` was never chosen: the desktop default applies.
  private(set) var values: JSONObject = [:]
  /// Whether the row has been read for the account being followed.
  private(set) var isLoaded = false

  var tokens: ThemeTokens { .tokens(for: themeID) }

  @ObservationIgnored private var client: SupabaseClient?
  @ObservationIgnored private var userId: UUID?
  @ObservationIgnored private var channel: RealtimeChannelV2?
  @ObservationIgnored private var tasks: [Task<Void, Never>] = []
  /// Bumped by every Realtime change and every edit, so a read that started before one is
  /// not applied over it.
  @ObservationIgnored private var liveRevision = 0
  /// Bumped by every start and stop, so work begun for one account never lands after the
  /// next account has taken over.
  @ObservationIgnored private var session = 0
  /// Each subscription gets its own channel name, so removing an old channel can never
  /// tear down the one that replaced it.
  @ObservationIgnored private var subscriptionCount = 0
  /// The edits whose own Realtime event has not come back yet, by column.
  @ObservationIgnored private var pending: [EditableSetting: PendingWrite] = [:]
  @ObservationIgnored private var writeCount = 0
  /// The last write queued for each column. Writes to one column go out in edit order, so
  /// an earlier pick can never reach the server after a later one.
  @ObservationIgnored private var writeQueues: [EditableSetting: Task<Void, Never>] = [:]

  private struct PendingWrite {
    /// Tells this write from a later edit of the same column.
    let id: Int
    let value: AnyJSON
    /// What the server is known to hold, restored if the write fails: the value before
    /// the edit, then the column of any row seen while the write was in flight (the
    /// server's word), or an earlier edit of it once confirmed.
    var fallback: AnyJSON
    /// The value the edit replaced on the server. Once the write is confirmed, a row still
    /// carrying it is older than the write.
    var replaced: AnyJSON
    /// The server took it. Until its echo arrives, a row still carrying `replaced` is
    /// older than the write and is not applied; any other value is newer and wins.
    var confirmed = false
    /// Its own echo came back before the server answered: the answer settles it at once.
    var echoed = false
    /// A row newer than that early echo, applied once the answer has settled the edit.
    var newer: AnyJSON?
  }

  private static let themeCacheKey = "lastThemeID"
  private static let sortCacheKey = "lastAgentSort"
  private static let toolDetailCacheKey = "lastChatToolDetail"
  /// The whole row the desktop shares: what the iPhone may edit and what it only shows.
  private static let columnNames = EditableSetting.allCases.map(\.rawValue)
    + SensitiveSetting.allCases.map(\.rawValue)
  private static let columns = columnNames.joined(separator: ", ")

  init() {
    themeID = ThemeID(raw: UserDefaults.standard.string(forKey: Self.themeCacheKey))
    agentSort = AgentSortMode(raw: UserDefaults.standard.string(forKey: Self.sortCacheKey))
    chatToolDetail = ChatToolDetail(raw: UserDefaults.standard.string(forKey: Self.toolDetailCacheKey))
  }

  func start(client: SupabaseClient, userId: UUID) async {
    session += 1
    self.client = client
    self.userId = userId
    reset()
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
    reset()
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

  /// Reads the row again; also the settings screen's pull to refresh.
  func refresh() async {
    guard let client, let userId else { return }
    let revision = liveRevision
    let session = session
    do {
      let rows: [JSONObject] = try await client
        .from("user_settings")
        .select(Self.columns)
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

  // MARK: - Reading

  /// The column's value, or nil when it was never chosen.
  func value(_ column: EditableSetting) -> AnyJSON? {
    stored(column.rawValue)
  }

  func value(_ column: SensitiveSetting) -> AnyJSON? {
    stored(column.rawValue)
  }

  func bool(_ column: EditableSetting) -> Bool? {
    value(column)?.boolValue
  }

  func string(_ column: EditableSetting) -> String? {
    value(column)?.stringValue
  }

  func int(_ column: EditableSetting) -> Int? {
    switch value(column) {
    case .integer(let number): number
    case .double(let number): Int(number)
    default: nil
    }
  }

  func strings(_ column: EditableSetting) -> [String]? {
    value(column)?.arrayValue?.compactMap(\.stringValue)
  }

  private func stored(_ key: String) -> AnyJSON? {
    guard let value = values[key], !value.isNil else { return nil }
    return value
  }

  // MARK: - Writing

  /// Shows `value` at once (a theme re-themes the whole app on this call), then writes it.
  /// See the type's comment for what happens until the server answers.
  func set(_ column: EditableSetting, _ value: AnyJSON) {
    guard let client, let userId else { return }
    let current = values[column.rawValue] ?? .null
    guard pending[column] != nil || !Self.same(current, value) else { return }

    writeCount += 1
    let id = writeCount
    // An edit over an unconfirmed one keeps what the server held before both; over a
    // confirmed one, the server holds that edit.
    let earlier = pending[column]
    pending[column] = PendingWrite(
      id: id,
      value: value,
      fallback: earlier.map { $0.confirmed ? $0.value : $0.fallback } ?? current,
      replaced: earlier.map { $0.confirmed ? $0.value : $0.replaced } ?? current
    )
    // A read already in flight predates this edit: it must not land over it.
    liveRevision += 1
    var next = values
    next[column.rawValue] = value
    install(next)

    let session = session
    let previous = writeQueues[column]
    writeQueues[column] = Task { [weak self] in
      await previous?.value
      // A later edit of this column replaced this one before it went out: that one is sent.
      guard let self, session == self.session, self.pending[column]?.id == id else { return }
      do {
        try await SettingsWriter.write(column, value, client: client, userId: userId)
        guard session == self.session else { return }
        self.confirm(column, id: id, value: value)
      } catch {
        guard session == self.session else { return }
        self.fail(column, id: id)
      }
    }
  }

  private func confirm(_ column: EditableSetting, id: Int, value: AnyJSON) {
    guard var write = pending[column] else { return }
    if write.id == id {
      guard write.echoed else {
        write.confirmed = true
        pending[column] = write
        return
      }
      pending[column] = nil
      if let newer = write.newer {
        var next = values
        next[column.rawValue] = newer
        install(next)
      }
    } else {
      // A later edit is still in flight: should it fail, the server now holds this value,
      // and any row seen so far predates it.
      write.fallback = value
      write.replaced = value
      pending[column] = write
    }
  }

  /// Restores the column alone, unless a later edit of it owns the column now.
  private func fail(_ column: EditableSetting, id: Int) {
    guard let write = pending[column], write.id == id else { return }
    pending[column] = nil
    var next = values
    next[column.rawValue] = write.fallback
    install(next)
  }

  // MARK: - Applying rows

  private func applyLive(_ row: JSONObject) {
    liveRevision += 1
    apply(row)
  }

  /// Takes a whole row: a column it lacks was never chosen. A pending column keeps the
  /// edit until the server confirms its write, then until a row carries anything but the
  /// value it replaced (its own echo included).
  private func apply(_ row: JSONObject) {
    var next = values
    for key in Self.columnNames {
      let incoming = row[key] ?? .null
      if let column = EditableSetting(rawValue: key), var write = pending[column] {
        if write.confirmed {
          // The echo, or a value newer than the one the edit replaced.
          if Self.same(incoming, write.replaced) { continue }
          pending[column] = nil
          next[key] = incoming
        } else {
          // Not sent yet, or not answered: only its own write settles it, even when an
          // older row happens to carry the same value. A row carrying the edit's own value
          // (its echo, ahead of the answer) is not the value it replaced.
          if Self.same(incoming, write.value) {
            write.echoed = true
            write.newer = nil
          } else if write.echoed {
            write.newer = incoming
          }
          // Every row is the server's latest word, so a failed write restores it.
          write.fallback = incoming
          pending[column] = write
        }
        continue
      }
      next[key] = incoming
    }
    isLoaded = true
    install(next)
  }

  /// Publishes the row, and the three settings the app follows, only where they changed.
  private func install(_ next: JSONObject) {
    if next != values { values = next }

    let id = ThemeID(raw: next["theme"]?.stringValue)
    if id != themeID {
      themeID = id
      UserDefaults.standard.set(id.rawValue, forKey: Self.themeCacheKey)
    }

    let sort = AgentSortMode(raw: next["agent_sort"]?.stringValue)
    if sort != agentSort {
      agentSort = sort
      UserDefaults.standard.set(sort.rawValue, forKey: Self.sortCacheKey)
    }

    let detail = ChatToolDetail(raw: next["chat_tool_detail"]?.stringValue)
    if detail != chatToolDetail {
      chatToolDetail = detail
      UserDefaults.standard.set(detail.rawValue, forKey: Self.toolDetailCacheKey)
    }
  }

  /// Forgets the previous account's row and edits. The theme and sort stay as they are
  /// until the next row replaces them, as before.
  private func reset() {
    values = [:]
    pending = [:]
    writeQueues = [:]
    isLoaded = false
  }

  /// Equal values, counting 13 and 13.0 as one: Postgres numbers can come back either way.
  private static func same(_ a: AnyJSON, _ b: AnyJSON) -> Bool {
    switch (a, b) {
    case (.integer(let x), .double(let y)), (.double(let y), .integer(let x)):
      Double(x) == y
    default:
      a == b
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
