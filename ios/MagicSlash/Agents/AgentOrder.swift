import Foundation

/// How the desktop sidebar sorts its agents (`user_settings.agent_sort`), which the list
/// follows. Same values and default as `AgentSortMode` in desktop/src/types.ts.
enum AgentSortMode: String, CaseIterable, Sendable {
  case recent
  case status
  case repository

  /// An unknown or missing value is the desktop default.
  init(raw: String?) {
    self = raw.flatMap(Self.init(rawValue:)) ?? .recent
  }
}

/// A configured repository, as the desktop names it in `config.repositories`.
struct RepositoryEntry: Equatable, Sendable {
  /// The key the desktop files the repository under, disambiguated like
  /// `toRepositoryRecord` in desktop/src/main/store/CloudStore.ts.
  let key: String
  /// The local path on the user's Mac, or nil when this machine has none.
  let path: String?
}

/// One row of the list, with the repository group it opens when it is the first of it.
struct OrderedAgent: Identifiable {
  let agent: Agent
  /// The repository the agent is filed under in `repository` mode: its first matching
  /// configured repository, or "" for none. `groupKeyOf` on the desktop.
  let groupKey: String

  var id: String { agent.id }
}

/// The sidebar order, a port of `orderTerminals` in
/// desktop/src/renderer/hooks/terminalOrder.ts. Keep the two in step.
enum AgentOrder {
  /// Where each runtime state sits when sorting by status, most demanding first.
  /// `STATE_RANK` on the desktop.
  private static let stateRank: [String: Int] = [
    "waiting": 0,
    "error": 1,
    "working": 2,
    "completed": 3,
    "idle": 4,
  ]

  /// - Parameters:
  ///   - repositories: in the desktop's `config.repositories` order, which decides the
  ///     first match.
  ///   - state: the agent's live runtime state, from a paired Mac. The desktop always
  ///     knows it; the iPhone only does while a Mac is reachable, so an agent with none
  ///     ranks as idle and the list falls back to newest first.
  static func ordered(
    _ agents: [Agent],
    sort: AgentSortMode,
    repositories: [RepositoryEntry],
    state: (Agent) -> String?
  ) -> [OrderedAgent] {
    // The last tie-break is the row id, not the incoming order: the store's order moves
    // with every update, and an agent must keep its place across refreshes. (The desktop
    // falls back on its array order, which is stable within a session.)
    let enriched = agents.enumerated().map { index, agent in
      (index, OrderedAgent(agent: agent, groupKey: groupKey(of: agent, in: repositories)))
    }

    func byNewest(_ a: (Int, OrderedAgent), _ b: (Int, OrderedAgent)) -> Bool {
      let ta = a.1.agent.createdAt ?? 0
      let tb = b.1.agent.createdAt ?? 0
      return ta != tb ? ta > tb : a.1.agent.id < b.1.agent.id
    }

    let sorted: [(Int, OrderedAgent)]
    switch sort {
    case .recent:
      sorted = enriched.sorted(by: byNewest)
    case .status:
      // Ranked once up front: the state comes from the relay and is not free to read.
      let ranks = enriched.map { _, row in stateRank[state(row.agent) ?? "idle"] ?? stateRank["idle"]! }
      sorted = enriched.sorted { a, b in
        let ra = ranks[a.0], rb = ranks[b.0]
        return ra != rb ? ra < rb : byNewest(a, b)
      }
    case .repository:
      // Alphabetical by group, and the agents in no configured repository go last.
      sorted = enriched.sorted { a, b in
        let ka = a.1.groupKey, kb = b.1.groupKey
        if ka != kb {
          if ka.isEmpty { return false }
          if kb.isEmpty { return true }
          return ka.localizedCompare(kb) == .orderedAscending
        }
        return byNewest(a, b)
      }
    }
    return sorted.map(\.1)
  }

  /// The first configured repository whose path starts one of the agent's paths.
  static func groupKey(of agent: Agent, in repositories: [RepositoryEntry]) -> String {
    repositories.first { entry in
      guard let path = entry.path, !path.isEmpty else { return false }
      return agent.repositories.contains { $0.hasPrefix(path) }
    }?.key ?? ""
  }

  /// The group header's label: first letter up, the rest exactly as configured.
  /// `repoLabel` on the desktop.
  static func label(forGroup key: String) -> String {
    key.isEmpty ? "No repository" : key.prefix(1).uppercased() + key.dropFirst()
  }

  /// Names the repositories like the desktop's `toRepositoryRecord`: ordered by
  /// organization name, then name, then id; a name already taken gets the organization
  /// (or "personal") appended, and the id's first characters if that collides too.
  static func entries(
    _ rows: [(id: String, name: String, orgId: String?, path: String?)],
    orgNames: [String: String]
  ) -> [RepositoryEntry] {
    func org(_ id: String?) -> String { id.map { orgNames[$0] ?? $0 } ?? "" }
    let ordered = rows.sorted { a, b in
      let oa = org(a.orgId), ob = org(b.orgId)
      if oa != ob { return oa.localizedCompare(ob) == .orderedAscending }
      if a.name != b.name { return a.name.localizedCompare(b.name) == .orderedAscending }
      return a.id < b.id
    }
    var taken = Set<String>()
    var entries: [RepositoryEntry] = []
    for row in ordered {
      var key = row.name
      if taken.contains(key) {
        let suffix = row.orgId == nil ? "personal" : org(row.orgId)
        key = "\(row.name) (\(suffix))"
        if taken.contains(key) { key = "\(row.name) (\(suffix) · \(row.id.prefix(6)))" }
      }
      taken.insert(key)
      entries.append(RepositoryEntry(key: key, path: row.path))
    }
    return entries
  }
}
