import Foundation

/// An agent's conversation as its Mac sends it (PROTOCOL.md §11): the tail of what the desktop
/// chat shows. Every field but the agent id may be missing, and an entry this build cannot
/// read is dropped, never the whole conversation.
struct RemoteChat: Decodable, Sendable {
  let pairingId: String?
  let appAgentId: String
  let generation: Int?
  let entries: [RemoteChatEntry]
  let queue: [RemoteQueuedPrompt]
  let hasEarlier: Bool

  private enum CodingKeys: String, CodingKey {
    case pairingId, appAgentId, generation, entries, queue, hasEarlier
  }

  init(from decoder: any Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    pairingId = (try? container.decodeIfPresent(String.self, forKey: .pairingId)) ?? nil
    appAgentId = try container.decode(String.self, forKey: .appAgentId)
    generation = (try? container.decodeIfPresent(Int.self, forKey: .generation)) ?? nil
    let lossy = (try? container.decodeIfPresent([Lossy<RemoteChatEntry>].self, forKey: .entries)) ?? []
    entries = lossy.compactMap(\.value)
    let queued = (try? container.decodeIfPresent([Lossy<RemoteQueuedPrompt>].self, forKey: .queue)) ?? []
    queue = queued.compactMap(\.value)
    hasEarlier = ((try? container.decodeIfPresent(Bool.self, forKey: .hasEarlier)) ?? nil) ?? false
  }
}

/// One line of the conversation.
enum RemoteChatEntry: Codable, Hashable, Sendable, Identifiable {
  case user(id: String, text: String, at: Date?)
  case assistant(id: String, text: String, cut: Bool)
  /// What a local slash command printed: Claude Code's, not Claude's.
  case notice(id: String, text: String)
  case tool(id: String, name: String, summary: String, status: ToolStatus)

  enum ToolStatus: String, Codable, Sendable {
    case running, done, error
  }

  var id: String {
    switch self {
    case .user(let id, _, _), .assistant(let id, _, _), .notice(let id, _), .tool(let id, _, _, _): id
    }
  }

  private enum CodingKeys: String, CodingKey {
    case kind, id, text, at, cut, name, summary, status
  }

  init(from decoder: any Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    let id = try container.decode(String.self, forKey: .id)
    switch try container.decode(String.self, forKey: .kind) {
    case "user":
      let at = (try? container.decodeIfPresent(Double.self, forKey: .at)) ?? nil
      self = .user(id: id, text: try container.decode(String.self, forKey: .text), at: at.map { Date(timeIntervalSince1970: $0 / 1000) })
    case "assistant":
      let cut = ((try? container.decodeIfPresent(Bool.self, forKey: .cut)) ?? nil) ?? false
      self = .assistant(id: id, text: try container.decode(String.self, forKey: .text), cut: cut)
    case "notice":
      self = .notice(id: id, text: try container.decode(String.self, forKey: .text))
    case "tool":
      let status = (try? container.decode(ToolStatus.self, forKey: .status)) ?? .done
      self = .tool(
        id: id,
        name: try container.decode(String.self, forKey: .name),
        summary: (try? container.decode(String.self, forKey: .summary)) ?? "",
        status: status
      )
    default:
      // A kind this build does not know: `Lossy` drops it.
      throw DecodingError.dataCorruptedError(forKey: .kind, in: container, debugDescription: "unknown kind")
    }
  }

  func encode(to encoder: any Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(id, forKey: .id)
    switch self {
    case .user(_, let text, let at):
      try container.encode("user", forKey: .kind)
      try container.encode(text, forKey: .text)
      try container.encodeIfPresent(at.map { $0.timeIntervalSince1970 * 1000 }, forKey: .at)
    case .assistant(_, let text, let cut):
      try container.encode("assistant", forKey: .kind)
      try container.encode(text, forKey: .text)
      if cut { try container.encode(true, forKey: .cut) }
    case .notice(_, let text):
      try container.encode("notice", forKey: .kind)
      try container.encode(text, forKey: .text)
    case .tool(_, let name, let summary, let status):
      try container.encode("tool", forKey: .kind)
      try container.encode(name, forKey: .name)
      try container.encode(summary, forKey: .summary)
      try container.encode(status, forKey: .status)
    }
  }
}

/// A prompt Claude Code holds until the current turn ends.
struct RemoteQueuedPrompt: Codable, Hashable, Sendable, Identifiable {
  let id: String
  let text: String
}

/// The conversation last accepted for one agent, with the Mac it came from and §6's marks.
struct AgentChat: Equatable, Sendable {
  let macId: String
  let generation: Int
  let epoch: String
  let seq: Int
  let entries: [RemoteChatEntry]
  let queue: [RemoteQueuedPrompt]
  let hasEarlier: Bool
}
