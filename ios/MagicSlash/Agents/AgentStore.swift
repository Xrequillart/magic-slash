import Foundation
import Observation
import Supabase

/// The signed-in user's own, non-archived agents, kept current over Realtime.
///
/// Scoped by `owner_id` and by `owner_id` only, like `readAgentRows` in
/// desktop/src/main/store/CloudStore.ts: RLS lets any org member read the whole org's
/// agents, so this filter is what narrows the list to the user, not a redundancy.
@MainActor
@Observable
final class AgentStore {
  enum LoadState: Equatable {
    case loading
    case loaded
    /// The first read failed and there is nothing to show.
    case failed(String)
  }

  private(set) var agents: [Agent] = []
  private(set) var loadState: LoadState = .loading

  @ObservationIgnored let client: SupabaseClient
  @ObservationIgnored private let userId: String
  @ObservationIgnored private var channel: RealtimeChannelV2?
  @ObservationIgnored private var tasks: [Task<Void, Never>] = []
  /// Realtime changes received while a read is in flight, keyed by agent id (nil = gone).
  /// The read's snapshot can predate them, so they are replayed on top of it.
  @ObservationIgnored private var changesDuringRead: [String: Agent?]?
  /// Bumped by every read, so a read overtaken by a newer one is dropped.
  @ObservationIgnored private var readGeneration = 0

  private static let columns = "id, owner_id, name, ticket_id, description, branch_name, base_branch, status, type, repositories, metadata, updated_at, archived_at"

  init(client: SupabaseClient, userId: UUID) {
    self.client = client
    // Lower-cased: Postgres prints uuids that way, and the Realtime check below compares
    // strings.
    self.userId = userId.uuidString.lowercased()
  }

  /// Subscribes before reading so no change slips between the two. Also called on return
  /// from the background: the socket may have been dropped while suspended and anything
  /// that changed meanwhile was missed, so both are redone.
  func start() async {
    await subscribe()
    await refresh()
  }

  func stop() async {
    await unsubscribe()
  }

  func agent(id: String) -> Agent? {
    agents.first { $0.id == id }
  }

  func refresh() async {
    readGeneration += 1
    let generation = readGeneration
    if changesDuringRead == nil { changesDuringRead = [:] }
    do {
      let rows: [AnyJSON] = try await client
        .from("agents")
        .select(Self.columns)
        .eq("owner_id", value: userId)
        .is("archived_at", value: nil)
        .execute()
        .value
      guard generation == readGeneration else { return }
      // One unreadable row is dropped, never the whole list.
      let parsed = rows.compactMap { $0.objectValue.flatMap(Agent.init(row:)) }
      var byId = Dictionary(parsed.filter(isVisible).map { ($0.id, $0) }) { _, last in last }
      for (id, change) in changesDuringRead ?? [:] { byId[id] = change }
      changesDuringRead = nil
      agents = Self.sorted(Array(byId.values))
      loadState = .loaded
    } catch {
      guard generation == readGeneration else { return }
      changesDuringRead = nil
      // A failed refresh keeps what is on screen; only an empty first load is an error.
      if agents.isEmpty, loadState != .loaded {
        loadState = .failed("Could not load your agents. Pull to try again.")
      }
    }
  }

  // MARK: - Realtime

  private func subscribe() async {
    await unsubscribe()

    // `client.channel` is Realtime V2, whose socket follows the auth token as it is
    // refreshed, so a long-open app keeps receiving after the first hour.
    let channel = client.channel("ios-agents")
    let mine = RealtimePostgresFilter.eq("owner_id", value: userId)
    let inserts = channel.postgresChange(InsertAction.self, table: "agents", filter: mine)
    let updates = channel.postgresChange(UpdateAction.self, table: "agents", filter: mine)
    // No filter on DELETE: Realtime does not apply filters to deletes, and removing an id
    // we do not hold is a no-op.
    let deletes = channel.postgresChange(DeleteAction.self, table: "agents")

    tasks = [
      Task { [weak self] in
        for await action in inserts { self?.upsert(record: action.record) }
      },
      Task { [weak self] in
        for await action in updates { self?.upsert(record: action.record) }
      },
      Task { [weak self] in
        for await action in deletes {
          if let id = action.oldRecord["id"]?.stringValue { self?.remove(id: id) }
        }
      },
    ]
    self.channel = channel
    try? await channel.subscribeWithError()
  }

  private func unsubscribe() async {
    tasks.forEach { $0.cancel() }
    tasks = []
    if let channel {
      await client.removeChannel(channel)
    }
    channel = nil
  }

  private func upsert(record: JSONObject) {
    guard let agent = Agent(row: record) else { return }
    // Re-checked here: the filter already scopes the stream, but an update that archives
    // the agent arrives through it too, and must take the row off the list.
    guard isVisible(agent) else {
      remove(id: agent.id)
      return
    }
    changesDuringRead?[agent.id] = .some(agent)
    var next = agents.filter { $0.id != agent.id }
    next.append(agent)
    agents = Self.sorted(next)
    loadState = .loaded
  }

  private func remove(id: String) {
    changesDuringRead?[id] = .some(nil)
    agents.removeAll { $0.id == id }
  }

  private func isVisible(_ agent: Agent) -> Bool {
    agent.ownerId?.lowercased() == userId && !agent.isArchived
  }

  private static func sorted(_ agents: [Agent]) -> [Agent] {
    agents.sorted { lhs, rhs in
      (lhs.updatedAt ?? .distantPast) > (rhs.updatedAt ?? .distantPast)
    }
  }
}
