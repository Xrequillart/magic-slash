import Foundation
import Supabase

/// One row of `public.agents`, as the desktop writes it.
///
/// Parsed by hand from the raw JSON rather than through `Decodable`: the row is written
/// by every desktop build ever released, so any field may be missing, null, or carry a
/// value this build has not heard of. Nothing here throws — an unknown enum value
/// becomes nil, and only a row without an id is dropped.
///
/// The column-then-metadata reading mirrors `fromAgentRow` in
/// desktop/src/main/store/CloudStore.ts.
struct Agent: Identifiable, Hashable, Sendable {
  /// The row uuid. Realtime DELETE events carry it, which is why it is the identity
  /// here rather than the desktop's own `app_agent_id`.
  let id: String
  let ownerId: String?
  /// The desktop terminal id: what the relay's snapshots name the agent by.
  let appAgentId: String?
  let name: String
  let title: String
  let type: AgentType
  let status: String
  let ticketId: String?
  let description: String?
  let branchName: String?
  let baseBranch: String?
  /// Repository paths, in attachment order.
  let repositories: [String]
  let repositoryMetadata: [String: RepositoryMetadata]
  let specPath: String?
  let planId: String?
  let planNumber: Int?
  let updatedAt: Date?
  /// When the desktop created the agent, in milliseconds (`__app.tsCreate`): the key the
  /// sidebar orders by. Absent on agents from older desktop builds.
  let createdAt: Double?
  /// When the session was created: the desktop's own stamp, else the row's.
  let createdDate: Date?
  let isArchived: Bool

  init?(row: JSONObject) {
    guard let id = row["id"]?.stringValue, !id.isEmpty else { return nil }
    let metadata = row["metadata"]?.objectValue ?? [:]

    self.id = id
    ownerId = row["owner_id"]?.stringValue
    // Rows written before the column existed only carry it in the jsonb.
    appAgentId = row["app_agent_id"]?.stringValue.nonEmpty
      ?? metadata["__app"]?.objectValue?["id"]?.stringValue.nonEmpty
    name = row["name"]?.stringValue ?? ""
    // `||` in the desktop: an empty column must not beat a real value in the jsonb.
    func pick(_ column: String, _ key: String) -> String? {
      row[column]?.stringValue.nonEmpty ?? metadata[key]?.stringValue.nonEmpty
    }
    ticketId = pick("ticket_id", "ticketId")
    description = pick("description", "description")
    branchName = pick("branch_name", "branchName")
    baseBranch = pick("base_branch", "baseBranch")
    status = pick("status", "status") ?? ""
    // Absent means coder: that is what every agent was before planning existed.
    type = AgentType(rawValue: pick("type", "type") ?? "") ?? .coder
    title = metadata["title"]?.stringValue.nonEmpty ?? name.nonEmpty ?? String(localized: "Untitled agent")

    repositories = (row["repositories"]?.arrayValue ?? []).compactMap { $0.stringValue.nonEmpty }

    var repoMeta: [String: RepositoryMetadata] = [:]
    for (path, value) in metadata["repositoryMetadata"]?.objectValue ?? [:] {
      if let object = value.objectValue {
        repoMeta[path] = RepositoryMetadata(object)
      }
    }
    repositoryMetadata = repoMeta

    specPath = metadata["specPath"]?.stringValue.nonEmpty
    planId = metadata["planId"]?.stringValue.nonEmpty
    planNumber = metadata["planNumber"]?.number.map { Int($0) }
    updatedAt = row["updated_at"]?.stringValue.flatMap(PostgresDate.parse)
    createdAt = metadata["__app"]?.objectValue?["tsCreate"]?.number
    createdDate = createdAt.map { Date(timeIntervalSince1970: $0 / 1000) }
      ?? row["created_at"]?.stringValue.flatMap(PostgresDate.parse)
    isArchived = !(row["archived_at"]?.isNil ?? true)
  }

  /// Every repository worth a card: the attached paths first, in order, then any path
  /// that only survives in the metadata (a PR recorded before the repo was detached).
  var allRepositoryPaths: [String] {
    let extra = repositoryMetadata.keys.filter { !repositories.contains($0) }.sorted()
    return repositories + extra
  }
}

enum AgentType: String, Sendable {
  case coder
  case planner

  var label: String {
    switch self {
    case .coder: String(localized: "Coder")
    case .planner: String(localized: "Planner")
    }
  }
}

/// Per-repository PR snapshot, mirroring `RepositoryMetadata` in desktop/src/types.ts.
/// Only the fields this app shows are read.
struct RepositoryMetadata: Hashable, Sendable {
  enum PRState: String, Sendable { case open, draft, merged, closed }
  enum ReviewStatus: String, Sendable {
    case approved
    case changesRequested = "changes-requested"
    case commented
    case pending
  }

  struct Checks: Hashable, Sendable {
    let total, passed, failed, running, skipped: Int
  }

  struct Check: Hashable, Sendable {
    enum State: String, Sendable { case running, passed, failed, skipped }
    let name: String
    /// nil when the desktop sent a state this build does not know.
    let state: State?
    let url: URL?
  }

  let prUrl: URL?
  let prState: PRState?
  let prReviewStatus: ReviewStatus?
  let prReviewers: [String]
  let prReviewCommentCount: Int?
  let prChecks: Checks?
  let prCheckList: [Check]
  /// nil while GitHub still reports UNKNOWN: render "unknown", never "conflicts".
  let prMergeable: Bool?
  let prMerged: Bool
  let prClosed: Bool

  init(_ object: JSONObject) {
    prUrl = object["prUrl"]?.stringValue.nonEmpty.flatMap(URL.init(string:))
    prState = object["prState"]?.stringValue.flatMap(PRState.init(rawValue:))
    prReviewStatus = object["prReviewStatus"]?.stringValue.flatMap(ReviewStatus.init(rawValue:))
    prReviewers = (object["prReviewers"]?.arrayValue ?? []).compactMap(\.stringValue)
    prReviewCommentCount = object["prReviewCommentCount"]?.number.map { Int($0) }
    prChecks = object["prChecks"]?.objectValue.map { checks in
      func count(_ key: String) -> Int { checks[key]?.number.map { Int($0) } ?? 0 }
      return Checks(
        total: count("total"),
        passed: count("passed"),
        failed: count("failed"),
        running: count("running"),
        skipped: count("skipped")
      )
    }
    prCheckList = (object["prCheckList"]?.arrayValue ?? []).compactMap { item in
      guard let check = item.objectValue, let name = check["name"]?.stringValue else { return nil }
      return Check(
        name: name,
        state: check["state"]?.stringValue.flatMap(Check.State.init(rawValue:)),
        url: check["url"]?.stringValue.flatMap(URL.init(string:))
      )
    }
    prMergeable = object["prMergeable"]?.boolValue
    prMerged = object["prMerged"]?.boolValue ?? false
    prClosed = object["prClosed"]?.boolValue ?? false
  }

  /// The PR's lifecycle state, falling back on the two legacy booleans for rows written
  /// before `prState` existed.
  var effectiveState: PRState? {
    if let prState { return prState }
    if prMerged { return .merged }
    if prClosed { return .closed }
    return prUrl == nil ? nil : .open
  }

  var hasPullRequest: Bool { prUrl != nil || prState != nil }
}

extension AnyJSON {
  /// An integer or a double, as a Double: JSON does not tell the two apart reliably.
  var number: Double? {
    if let intValue { return Double(intValue) }
    return doubleValue
  }
}

extension Optional where Wrapped == String {
  /// nil for nil and for the empty string, which the desktop writes for "unset".
  var nonEmpty: String? {
    guard let self, !self.isEmpty else { return nil }
    return self
  }
}

extension String {
  var nonEmpty: String? { isEmpty ? nil : self }
}

/// Parses the timestamps Postgres hands out, through PostgREST (`…T…+00:00`) or through
/// Realtime (sometimes with a space, microseconds, or no zone at all).
enum PostgresDate {
  static func parse(_ raw: String) -> Date? {
    var text = raw.replacingOccurrences(of: " ", with: "T")

    // Split off the zone, if any, after the time part.
    var zone = "Z"
    if let tIndex = text.firstIndex(of: "T") {
      let timePart = text[tIndex...]
      if timePart.hasSuffix("Z") {
        text.removeLast()
      } else if let signIndex = timePart.lastIndex(where: { $0 == "+" || $0 == "-" }) {
        zone = String(text[signIndex...])
        text = String(text[..<signIndex])
      }
    }
    if zone.count == 3 { zone += ":00" } // "+00" -> "+00:00"

    // Keep at most milliseconds: the ISO 8601 parser rejects microseconds.
    if let dot = text.firstIndex(of: ".") {
      let fraction = text[text.index(after: dot)...].prefix(3)
      text = String(text[..<dot]) + "." + fraction.padding(toLength: 3, withPad: "0", startingAt: 0)
    } else {
      text += ".000"
    }

    return try? Date(text + zone, strategy: Date.ISO8601FormatStyle(includingFractionalSeconds: true))
  }
}
