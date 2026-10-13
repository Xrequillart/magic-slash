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
  /// The configured repositories, named as the desktop names them, for the sidebar's
  /// `repository` grouping. Empty until read, and kept as is when a read fails.
  private(set) var repositories: [RepositoryEntry] = []

  @ObservationIgnored let client: SupabaseClient
  /// The account this store belongs to: the screen only shows a store whose owner is the
  /// signed-in user, so a list left over from another account is never visible.
  @ObservationIgnored let ownerId: UUID
  @ObservationIgnored private let userId: String
  /// Set once by `stop()`; a start still in flight then gives up instead of reopening.
  @ObservationIgnored private var stopped = false
  /// Each subscription gets its own channel name, so removing an old channel can never
  /// tear down the one that replaced it.
  @ObservationIgnored private var subscriptionCount = 0
  @ObservationIgnored private var channel: RealtimeChannelV2?
  @ObservationIgnored private var tasks: [Task<Void, Never>] = []
  /// Realtime changes received while a read is in flight, keyed by agent id (nil = gone).
  /// The read's snapshot can predate them, so they are replayed on top of it.
  @ObservationIgnored private var changesDuringRead: [String: Agent?]?
  /// Bumped by every read, so a read overtaken by a newer one is dropped.
  @ObservationIgnored private var readGeneration = 0

  private static let columns = "id, owner_id, app_agent_id, name, ticket_id, description, branch_name, base_branch, status, type, repositories, metadata, updated_at, archived_at"

  init(client: SupabaseClient, userId: UUID) {
    self.client = client
    self.ownerId = userId
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
    stopped = true
    await unsubscribe()
  }

  func agent(id: String) -> Agent? {
    agents.first { $0.id == id }
  }

  func refresh() async {
    // The first time, the groups are read before the agents, so the list does not show
    // ungrouped for a moment and then reshuffle. After that both read at once: the
    // groups already on screen stand in until the new ones land.
    if repositories.isEmpty {
      await refreshRepositories()
      await refreshAgents()
    } else {
      async let repositoriesRead: Void = refreshRepositories()
      async let agentsRead: Void = refreshAgents()
      _ = await (repositoriesRead, agentsRead)
    }
  }

  /// Read like `fetchRepositories` in desktop/src/main/store/CloudStore.ts: no filter,
  /// RLS returns exactly the repositories the desktop sees, and the paths are this
  /// user's own.
  private func refreshRepositories() async {
    do {
      async let repoRows: [JSONObject] = client.from("repositories").select("id, name, org_id").execute().value
      async let pathRows: [JSONObject] = client.from("repository_paths").select("repo_id, path").execute().value
      async let orgRows: [JSONObject] = client.from("organizations").select("id, name").execute().value
      let (repos, paths, orgs) = try await (repoRows, pathRows, orgRows)
      guard !stopped else { return }

      var pathById: [String: String] = [:]
      for row in paths {
        if let id = row["repo_id"]?.stringValue, let path = row["path"]?.stringValue {
          pathById[id] = path
        }
      }
      var orgNames: [String: String] = [:]
      for row in orgs {
        if let id = row["id"]?.stringValue, let name = row["name"]?.stringValue {
          orgNames[id] = name
        }
      }
      let entries = AgentOrder.entries(
        repos.compactMap { row in
          guard let id = row["id"]?.stringValue, let name = row["name"]?.stringValue else { return nil }
          return (id: id, name: name, orgId: row["org_id"]?.stringValue, path: pathById[id])
        },
        orgNames: orgNames
      )
      if entries != repositories { repositories = entries }
    } catch {
      // Keep the groups already known; without any, every agent reads as ungrouped.
    }
  }

  private func refreshAgents() async {
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
      guard generation == readGeneration, !stopped else { return }
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
    // Claimed before awaiting: if another subscribe starts while this one waits for the
    // old channel to go, the newer call owns the subscription and this one steps aside.
    subscriptionCount += 1
    let attempt = subscriptionCount
    await unsubscribe()
    guard !stopped, attempt == subscriptionCount else { return }

    // `client.channel` is Realtime V2, whose socket follows the auth token as it is
    // refreshed, so a long-open app keeps receiving after the first hour.
    let channel = client.channel("ios-agents-\(attempt)")
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

  /// Detaches synchronously, then removes the old channel: nothing set up after this call
  /// returns control can be undone by it.
  private func unsubscribe() async {
    tasks.forEach { $0.cancel() }
    tasks = []
    let old = channel
    channel = nil
    if let old {
      await client.removeChannel(old)
    }
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
