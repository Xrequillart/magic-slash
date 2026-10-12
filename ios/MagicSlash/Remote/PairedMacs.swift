import Foundation

/// A Mac this phone was paired with (PROTOCOL.md §7, step 5), saved only on `pair-accepted`.
struct PairedMac: Codable, Hashable, Sendable, Identifiable {
  /// Lower-case UUID.
  let macId: String
  var name: String
  /// The Mac's P-256 public point, X9.63.
  let pub: Data
  /// When this phone saved the pairing, on its own clock: for display only.
  let pairedAt: Date
  /// The `pairingId` from `pair-accepted`: the name of this pairing (PROTOCOL.md §6). A
  /// `revoked` or a `state` must carry it. Nil in a record saved before it existed:
  /// `RelayStore` drops such a pairing and asks for a new one, since it could tell neither a
  /// real revocation nor a replay.
  let pairingId: String?
  /// The phone identity this pairing was made with. A pairing whose identity is no longer
  /// the phone's (the key was reset since) can never open a box again.
  let phoneId: String
  let phonePub: Data

  var id: String { macId }
}

/// The paired Macs of one account, in the Keychain (this device only).
enum PairedMacs {
  private static func account(_ userId: String) -> String { "paired-macs.\(userId.lowercased())" }

  static func load(userId: String) -> [PairedMac] {
    guard let data = Keychain.read(account(userId)) else { return [] }
    return (try? JSONDecoder().decode([PairedMac].self, from: data)) ?? []
  }

  static func save(_ macs: [PairedMac], userId: String) {
    if macs.isEmpty {
      Keychain.delete(account(userId))
    } else if let data = try? JSONEncoder().encode(macs) {
      Keychain.write(data, account(userId))
    }
  }
}

// MARK: - Snapshots

/// A Mac's complete state snapshot (PROTOCOL.md §5). Every field but the agent id and state
/// may be missing: a newer or older desktop must never make the whole snapshot unreadable.
struct RelaySnapshot: Codable, Hashable, Sendable {
  /// The pairing this snapshot was sealed for (§6). Nil only in a cache written before it
  /// existed: `RelayStore` drops a live snapshot without it.
  let pairingId: String?
  /// The Mac's relay generation, which orders snapshots across its restarts (§6).
  let generation: Int?
  /// Epoch milliseconds, on the Mac's clock: for display only, never compared (§6).
  let sentAt: Double
  let macName: String?
  let agents: [RemoteAgent]

  var sentDate: Date { Date(timeIntervalSince1970: sentAt / 1000) }

  init(from decoder: any Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    pairingId = (try? container.decodeIfPresent(String.self, forKey: .pairingId)) ?? nil
    generation = (try? container.decodeIfPresent(Int.self, forKey: .generation)) ?? nil
    sentAt = try container.decode(Double.self, forKey: .sentAt)
    macName = try? container.decodeIfPresent(String.self, forKey: .macName)
    // One unreadable agent is dropped, never the whole snapshot.
    let lossy = (try? container.decodeIfPresent([Lossy<RemoteAgent>].self, forKey: .agents)) ?? []
    agents = lossy.compactMap(\.value)
  }
}

struct RemoteAgent: Codable, Hashable, Sendable {
  let appAgentId: String
  let title: String?
  /// `TerminalState`. Kept as a string: a state this build does not know still shows.
  let state: String
  let usage: RemoteUsage?

  init(from decoder: any Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    appAgentId = try container.decode(String.self, forKey: .appAgentId)
    state = try container.decode(String.self, forKey: .state)
    title = try? container.decodeIfPresent(String.self, forKey: .title)
    usage = try? container.decodeIfPresent(RemoteUsage.self, forKey: .usage)
  }
}

/// Claude Code's status line figures. Any of them may be null.
struct RemoteUsage: Codable, Hashable, Sendable {
  let costUsd: Double?
  let contextPercent: Double?
  let model: String?
  let fiveHourPercent: Double?
  /// Epoch seconds, as Claude Code reports them.
  let fiveHourResetsAt: Double?
  let sevenDayPercent: Double?
  let sevenDayResetsAt: Double?

  init(from decoder: any Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    func number(_ key: CodingKeys) -> Double? { (try? container.decodeIfPresent(Double.self, forKey: key)) ?? nil }
    costUsd = number(.costUsd)
    contextPercent = number(.contextPercent)
    model = (try? container.decodeIfPresent(String.self, forKey: .model)) ?? nil
    fiveHourPercent = number(.fiveHourPercent)
    fiveHourResetsAt = number(.fiveHourResetsAt)
    sevenDayPercent = number(.sevenDayPercent)
    sevenDayResetsAt = number(.sevenDayResetsAt)
  }
}

/// Decodes an element or yields nil, so one bad element does not fail its array.
private struct Lossy<Value: Codable & Sendable>: Codable, Sendable {
  let value: Value?

  init(from decoder: any Decoder) throws {
    value = try? Value(from: decoder)
  }

  func encode(to encoder: any Encoder) throws {
    try value.encode(to: encoder)
  }
}

/// The last snapshot accepted from one Mac, with what PROTOCOL.md §6 compares the next one
/// against.
struct AcceptedSnapshot: Codable, Hashable, Sendable {
  /// -1 in a cache written before it existed, so any new snapshot supersedes it.
  let generation: Int
  let epoch: String
  let seq: Int
  let snapshot: RelaySnapshot
  /// When this phone accepted it, on the PHONE's clock: what the 75 s rule and every "from X
  /// ago" measure (§6), so a Mac whose clock is off cannot look online or offline. Nil in a
  /// cache written before it existed: such a snapshot is never current.
  let receivedAt: Date?

  /// When it was last heard of, for display: the phone's clock, or the Mac's for an old cache.
  var lastHeard: Date { receivedAt ?? snapshot.sentDate }

  init(generation: Int, epoch: String, seq: Int, snapshot: RelaySnapshot, receivedAt: Date) {
    self.generation = generation
    self.epoch = epoch
    self.seq = seq
    self.snapshot = snapshot
    self.receivedAt = receivedAt
  }

  init(from decoder: any Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    generation = (try? container.decodeIfPresent(Int.self, forKey: .generation)) ?? -1
    epoch = try container.decode(String.self, forKey: .epoch)
    seq = try container.decode(Int.self, forKey: .seq)
    snapshot = try container.decode(RelaySnapshot.self, forKey: .snapshot)
    receivedAt = (try? container.decodeIfPresent(Date.self, forKey: .receivedAt)) ?? nil
  }

  /// §6: a greater generation, or the same generation and epoch and a greater seq. Never the
  /// Mac's clock, so a Mac whose clock moves backward keeps updating.
  func isSuperseded(byGeneration generation: Int, epoch: String, seq: Int) -> Bool {
    if generation != self.generation { return generation > self.generation }
    return epoch == self.epoch && seq > self.seq
  }
}

/// The last accepted snapshot per Mac, cached so a relaunch shows the last known state.
///
/// One file per account in Application Support, under complete file protection: it is
/// unreadable while the iPhone is locked, and excluded from backups.
enum SnapshotCache {
  private static func url(userId: String) -> URL? {
    guard let base = try? FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
    ) else { return nil }
    return base.appendingPathComponent("relay", isDirectory: true)
      .appendingPathComponent("snapshots-\(userId.lowercased()).json")
  }

  static func load(userId: String) -> [String: AcceptedSnapshot] {
    guard let url = url(userId: userId), let data = try? Data(contentsOf: url) else { return [:] }
    return (try? JSONDecoder().decode([String: AcceptedSnapshot].self, from: data)) ?? [:]
  }

  static func save(_ snapshots: [String: AcceptedSnapshot], userId: String) {
    guard var url = url(userId: userId) else { return }
    if snapshots.isEmpty {
      try? FileManager.default.removeItem(at: url)
      return
    }
    guard let data = try? JSONEncoder().encode(snapshots) else { return }
    try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try? data.write(to: url, options: [.atomic, .completeFileProtection])
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try? url.setResourceValues(values)
  }
}
