import CryptoKit
import Foundation
import Observation
import Supabase
import UIKit

/// What a Mac last said about one agent.
struct AgentRuntime: Equatable, Sendable {
  /// `TerminalState`: idle, working, waiting, completed or error.
  let state: String
  let usage: RemoteUsage?
  /// The pending question, nil when there is none (PROTOCOL.md §5).
  let question: RemoteQuestion?
  /// The Mac that reported it: the one an answer goes to.
  let macId: String
  let macName: String
  /// When the phone accepted that snapshot (its own clock; the Mac's for an old cache).
  let updatedAt: Date
  /// False when the Mac is offline: this is the last known state, not the current one.
  let isCurrent: Bool
}

/// An answer to a pending question, as a `command` carries it in `choice` (PROTOCOL.md §10).
enum AnswerChoice: Equatable, Sendable, Encodable {
  /// One option, or Allow (index 0) for a permission.
  case option(Int)
  /// The options picked in a multi-select question.
  case options([Int])
  /// One label per question, for a question asked several at once.
  case answers([String])
  /// Deny a permission.
  case deny

  private enum CodingKeys: String, CodingKey {
    case kind, index, indexes, answers
  }

  func encode(to encoder: any Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    switch self {
    case .option(let index):
      try container.encode("option", forKey: .kind)
      try container.encode(index, forKey: .index)
    case .options(let indexes):
      try container.encode("options", forKey: .kind)
      try container.encode(indexes, forKey: .indexes)
    case .answers(let answers):
      try container.encode("answers", forKey: .kind)
      try container.encode(answers, forKey: .answers)
    case .deny:
      try container.encode("deny", forKey: .kind)
    }
  }
}

/// Where the phone's answer to one question stands, for the card that sent it.
struct AnswerStatus: Equatable, Sendable {
  enum Phase: Equatable, Sendable {
    /// Face ID, then waiting for the Mac's `command-result`.
    case sending
    /// The Mac took it: the agent resumes.
    case done
    /// Not answered: the message says why, and whether trying again can help.
    case failed(String)
  }

  /// The question token it answers: a newer question starts with no status.
  let token: String
  let phase: Phase
}

/// Where the phone's last prompt or stop for one agent stands, for the composer that sent it.
struct AgentCommandStatus: Equatable, Sendable {
  enum Action: Equatable, Sendable {
    case prompt
    case stop
  }

  enum Phase: Equatable, Sendable {
    /// Face ID, then waiting for the Mac's `command-result`.
    case sending
    /// The Mac took it. `queued`: a prompt that reached a working agent, which reads it after
    /// the current turn.
    case done(queued: Bool)
    /// Not done: the message says why, and whether trying again can help.
    case failed(String)
  }

  /// The command it reports on: a late result for an earlier one never replaces it.
  let commandId: String
  let action: Action
  let phase: Phase
}

/// The QR a Mac shows while pairing (PROTOCOL.md §7, step 1), checked field by field.
struct PairingOffer: Equatable, Sendable {
  enum Problem: Error, Equatable {
    case notMagicSlash
    case expired
  }

  let macId: String
  let name: String
  let pub: Data
  /// The 32 token bytes, and the base64url text the box carries back.
  let token: Data
  let tokenText: String
  let expiresAt: Date

  init(qr text: String, now: Date = Date()) throws(Problem) {
    guard let data = text.trimmingCharacters(in: .whitespacesAndNewlines).data(using: .utf8),
          let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
          (object["v"] as? NSNumber)?.intValue == 1,
          let macId = (object["macId"] as? String).flatMap(UUID.init(uuidString:)),
          let pubText = object["pub"] as? String,
          let pub = Data(base64Encoded: pubText),
          (try? P256.KeyAgreement.PublicKey(x963Representation: pub)) != nil,
          let tokenText = object["token"] as? String,
          let token = Data(base64URLEncoded: tokenText), token.count == 32,
          let exp = (object["exp"] as? NSNumber)?.doubleValue
    else { throw .notMagicSlash }

    let expiresAt = Date(timeIntervalSince1970: exp / 1000)
    guard expiresAt > now else { throw .expired }

    self.macId = macId.uuidString.lowercased()
    self.name = cleanMacName(object["name"] as? String) ?? "Mac"
    self.pub = pub
    self.token = token
    self.tokenText = tokenText
    self.expiresAt = expiresAt
  }
}

/// The end-to-end encrypted relay from the paired Macs (desktop/src/main/remote/PROTOCOL.md).
///
/// Joins the account's private channel `relay:<userId>`, announces itself in presence as
/// `phone:<phoneId>`, and opens the `state` snapshots each paired Mac seals for this phone.
/// Supabase only carries the boxes: it never sees a state or a usage figure.
///
/// The pair keys are derived once per foreground session, after one Face ID prompt, and only
/// ever held in memory: `lock()` drops them when the app goes to the background.
@MainActor
@Observable
final class RelayStore {
  enum KeyState: Equatable {
    /// No paired Mac, or not unlocked yet this session.
    case idle
    case unlocking
    case unlocked
    /// Face ID was cancelled or failed: a tap can try again.
    case locked(String)
    /// This iPhone cannot hold the key.
    case unavailable(String)
  }

  enum PairingPhase: Equatable {
    case preparing
    /// The request is out: the user approves on the Mac, checking both show `code`.
    case waiting(code: String)
    case accepted(macName: String)
    case rejected(String)
    case failed(String)
  }

  struct Pairing: Equatable {
    let offer: PairingOffer
    var phase: PairingPhase
  }

  /// A Mac as the list shows it.
  struct MacStatus: Identifiable, Equatable {
    let mac: PairedMac
    let isOnline: Bool
    /// When the last accepted snapshot was received (phone clock), nil when none ever arrived.
    let lastUpdate: Date?

    var id: String { mac.macId }
    var name: String { mac.name }
  }

  /// §6: a Mac whose last snapshot is older than this is offline, presence or not. The Mac
  /// sends one at least every 30 s.
  static let freshness: TimeInterval = 75
  /// How long the phone waits for the Mac's answer once its request is out.
  static let pairingTimeout: Duration = .seconds(180)
  /// How long the phone waits for a `command-result` before calling the Mac unreachable.
  static let commandTimeout: Duration = .seconds(15)

  private(set) var macs: [PairedMac] = []
  private(set) var snapshots: [String: AcceptedSnapshot] = [:]
  private(set) var keyState: KeyState = .idle
  /// Set when pairings were lost to a key that no longer opens (new Face ID enrolment), until
  /// the next successful pairing.
  private(set) var needsRepair: Bool
  private(set) var pairing: Pairing?
  /// Ticks every few seconds, so `isOnline` turns false on its own when the Mac goes quiet.
  private(set) var now = Date()
  /// The last answer sent per agent (`appAgentId`), until the next one.
  private(set) var answers: [String: AnswerStatus] = [:]
  /// The last prompt or stop sent per agent (`appAgentId`), until the next one.
  private(set) var agentCommands: [String: AgentCommandStatus] = [:]
  /// The conversation each agent's Mac last sent (§11), by `appAgentId`. Memory only.
  private(set) var chats: [String: AgentChat] = [:]
  /// The `/` commands each Mac last sent (§13), by `macId`. Memory only.
  private(set) var commandLists: [String: RemoteCommandList] = [:]
  /// Presence refs per key: one Mac may briefly hold two connections while its relay restarts.
  private var presence: [String: Set<String>] = [:]

  @ObservationIgnored let ownerId: UUID
  @ObservationIgnored private let client: SupabaseClient
  @ObservationIgnored private let userId: String
  @ObservationIgnored private var stopped = false
  @ObservationIgnored private var subscriptionCount = 0
  @ObservationIgnored private var channel: RealtimeChannelV2?
  @ObservationIgnored private var tasks: [Task<Void, Never>] = []
  @ObservationIgnored private var ticker: Task<Void, Never>?
  @ObservationIgnored private var pairKeys: [String: SymmetricKey] = [:]
  @ObservationIgnored private var pairingKey: SymmetricKey?
  @ObservationIgnored private var pairingPhonePub: Data?
  /// The `epoch` of the `pair-request` still waiting for an answer: only a `pair-accepted`
  /// carrying it as `requestEpoch` answers it (§6, §7 step 5).
  @ObservationIgnored private var pairingEpoch: String?
  @ObservationIgnored private var pairingTimer: Task<Void, Never>?
  @ObservationIgnored private var pairingGeneration = 0
  /// Bumped by `lock()`, so an unlock that was waiting on Face ID when the app left the
  /// foreground does not put keys back in memory.
  @ObservationIgnored private var lockGeneration = 0
  /// This phone's own sending session for commands (§4): one epoch per store, and a seq that
  /// only grows within it, across Macs.
  @ObservationIgnored private let commandEpoch = UUID().uuidString.lowercased()
  @ObservationIgnored private var commandSeq = 0
  /// Commands sent and not answered yet, by `commandId`. Only these may get a `command-result`.
  @ObservationIgnored private var pendingCommands: [String: PendingCommand] = [:]

  private struct PendingCommand {
    let macId: String
    let pairingId: String
    let appAgentId: String
    let kind: CommandKind
    let target: CommandTarget
    let timeout: Task<Void, Never>
  }

  /// Every removal of a relay channel, chained across stores. The topic is fixed and
  /// `client.channel` hands back whatever channel is still registered under it, so a new one
  /// may only be made once the previous removal has finished, whoever started it.
  private static var removals: Task<Void, Never>?

  init(client: SupabaseClient, userId: UUID) {
    self.client = client
    ownerId = userId
    self.userId = userId.uuidString.lowercased()
    needsRepair = UserDefaults.standard.bool(forKey: Self.needsRepairKey(self.userId))
  }

  // MARK: - Lifecycle

  /// Loads the paired Macs and the cached snapshots, unlocks the key (Face ID) and joins the
  /// channel. Also called on return from the background, where the socket may have died.
  func start() async {
    guard !stopped else { return }
    var known = PairedMacs.load(userId: userId)
    // A pairing saved before its `pairingId` was kept cannot tell its own revocation from a
    // replayed one (§6): drop it and ask for a new pairing.
    if known.contains(where: { $0.pairingId == nil }) {
      known.removeAll { $0.pairingId == nil }
      PairedMacs.save(known, userId: userId)
      setNeedsRepair(true)
    }
    macs = known
    // Only what was cached for the current pairing of each Mac.
    let pairings = Dictionary(known.map { ($0.macId, $0.pairingId) }, uniquingKeysWith: { _, last in last })
    snapshots = SnapshotCache.load(userId: userId).filter { entry in
      guard let pairingId = pairings[entry.key] ?? nil else { return false }
      return entry.value.snapshot.pairingId == pairingId
    }
    startTicker()
    // Unlocked before joining: joining is what makes the Macs send a snapshot, and one
    // that arrives before the keys cannot be read.
    await unlock(rejoin: false)
    guard !stopped else { return }
    await refreshSubscription()
  }

  func stop() async {
    stopped = true
    ticker?.cancel()
    ticker = nil
    pairKeys = [:]
    chats = [:]
    commandLists = [:]
    endPairing()
    abandonPendingCommands()
    await unsubscribe()
  }

  /// Drops every key from memory: on the way to the background, and on sign-out. The next
  /// `start()` asks for Face ID again. A pairing still in progress is cancelled with its key:
  /// an approval that lands later must not put a key back in memory without Face ID.
  func lock() {
    log("keys locked (background)")
    lockGeneration += 1
    pairKeys = [:]
    cancelPendingPairing()
    // A `command-result` can no longer be opened without the keys.
    abandonPendingCommands()
    DeviceKeys.shared.lock()
    if keyState == .unlocked || keyState == .unlocking { keyState = .idle }
    ticker?.cancel()
    ticker = nil
  }

  /// Face ID, then the pair key of every paired Mac. A no-op without a paired Mac.
  /// `rejoin` makes a retry rejoin the channel, so the Macs send a snapshot that can now be
  /// read instead of waiting for their next heartbeat.
  func unlock(rejoin: Bool = true) async {
    guard !stopped, !macs.isEmpty else {
      keyState = .idle
      return
    }
    guard keyState != .unlocking else { return }
    let wasUnlocked = keyState == .unlocked
    keyState = .unlocking
    let generation = lockGeneration
    let keys = DeviceKeys.shared
    do {
      try await keys.unlock(reason: String(localized: "Unlock the encrypted link to your Mac."), createIfMissing: false)
      guard !stopped, generation == lockGeneration else { return }
      let phoneId = keys.phoneId
      let phonePub = try keys.publicKey()
      // A pairing made under another identity (the key was reset since) can never open
      // anything again: drop it rather than wait forever on it.
      let stale = macs.filter { $0.phoneId != phoneId || $0.phonePub != phonePub }
      if !stale.isEmpty {
        setMacs(macs.filter { $0.phoneId == phoneId && $0.phonePub == phonePub })
        for mac in stale { snapshots[mac.macId] = nil }
        SnapshotCache.save(snapshots, userId: userId)
        setNeedsRepair(true)
      }
      var derived: [String: SymmetricKey] = [:]
      for mac in macs {
        let shared = try keys.sharedSecret(with: mac.pub)
        derived[mac.macId] = RelayCrypto.deriveKey(shared: shared, macId: mac.macId, phoneId: phoneId)
      }
      pairKeys = derived
      keyState = macs.isEmpty ? .idle : .unlocked
      log("keys unlocked")
      // Keys that just opened read the next snapshot: ask for one now.
      if rejoin, !wasUnlocked { await refreshSubscription() } else { await requestState() }
    } catch {
      switch error {
      case .invalidated: invalidate()
      case .locked(let message):
        keyState = .locked(message)
        log("unlock refused: \(message)")
      case .unavailable(let message): keyState = .unavailable(message)
      }
    }
  }

  // MARK: - Reading

  func statuses() -> [MacStatus] {
    macs.map { mac in
      MacStatus(mac: mac, isOnline: isOnline(mac.macId), lastUpdate: snapshots[mac.macId]?.lastHeard)
    }
  }

  /// §6: present on the channel and heard from within 75 s, on the phone's clock.
  func isOnline(_ macId: String) -> Bool {
    guard !(presence["mac:\(macId)"]?.isEmpty ?? true),
          let last = snapshots[macId]?.receivedAt
    else { return false }
    return now.timeIntervalSince(last) < Self.freshness
  }

  /// The agent's state as its Mac last reported it, or nil when no paired Mac knows it. Should
  /// two Macs report the same id, the newest snapshot wins.
  func runtime(for appAgentId: String?) -> AgentRuntime? {
    guard let appAgentId else { return nil }
    var best: AgentRuntime?
    for mac in macs {
      guard let accepted = snapshots[mac.macId],
            let agent = accepted.snapshot.agents.first(where: { $0.appAgentId == appAgentId })
      else { continue }
      let updatedAt = accepted.lastHeard
      if let best, best.updatedAt >= updatedAt { continue }
      best = AgentRuntime(
        state: agent.state,
        usage: agent.usage,
        question: agent.question,
        macId: mac.macId,
        macName: mac.name,
        updatedAt: updatedAt,
        isCurrent: isOnline(mac.macId)
      )
    }
    return best
  }

  /// Local only (PROTOCOL.md §8): the Mac keeps sealing for this phone until revoked there.
  func forget(_ macId: String) {
    setMacs(macs.filter { $0.macId != macId })
    pairKeys[macId] = nil
    snapshots[macId] = nil
    chats = chats.filter { $0.value.macId != macId }
    commandLists[macId] = nil
    SnapshotCache.save(snapshots, userId: userId)
    if macs.isEmpty { keyState = .idle }
    Task { await refreshSubscription() }
  }

  // MARK: - Conversation

  /// How often the session's screen renews its lease on the conversation (§11): well inside
  /// the Mac's 45 s, so one lost request costs nothing.
  static let chatRenewal: Duration = .seconds(15)

  /// How old a Mac's `/` commands may get before the next request asks for them again (§13).
  static let commandListAge: TimeInterval = 5 * 60

  /// The `/` commands to suggest for an agent: its Mac's, or every paired Mac's while none
  /// reports the agent yet.
  func commands(for appAgentId: String) -> [RemoteCommand] {
    if let macId = runtime(for: appAgentId)?.macId { return commandLists[macId]?.commands ?? [] }
    return commandLists.values.first?.commands ?? []
  }

  private struct ChatRequest: Encodable {
    let pairingId: String
    let appAgentId: String
    let commands: Bool?
  }

  /// Asks for an agent's conversation, and to be sent every change of it for the next 45 s
  /// (§11). To the Mac that reports the agent, or to every paired Mac when none does yet: the
  /// others drop it. Not a command: no signature, no Face ID, so it runs on every renewal.
  func requestChat(appAgentId: String) async {
    guard !stopped, let channel, channel.status == .subscribed else { return }
    let targets = runtime(for: appAgentId).map { [$0.macId] } ?? macs.map(\.macId)
    let phoneId = DeviceKeys.shared.phoneId
    for macId in targets {
      guard let key = pairKeys[macId],
            let pairingId = macs.first(where: { $0.macId == macId })?.pairingId
      else { continue }
      commandSeq += 1
      // The `/` commands ride along until a fresh list is in (§13).
      let stale = commandLists[macId].map { Date().timeIntervalSince($0.receivedAt) > Self.commandListAge } ?? true
      let body = ChatRequest(pairingId: pairingId, appAgentId: appAgentId, commands: stale ? true : nil)
      guard let envelope = Self.sealedEnvelope(
        type: "chat-request", from: phoneId, to: macId, epoch: commandEpoch, seq: commandSeq, body: body, key: key
      ) else { continue }
      await channel.broadcast(event: "relay", message: envelope)
    }
  }

  // MARK: - Pairing

  /// Steps 2 and 4 of §7: Face ID, the pair key, the `pair-request`, and the code. The Mac's
  /// answer arrives in `receive`.
  func beginPairing(_ offer: PairingOffer) async {
    pairingGeneration += 1
    let generation = pairingGeneration
    pairingTimer?.cancel()
    pairingKey = nil
    pairingPhonePub = nil
    pairingEpoch = nil
    pairing = Pairing(offer: offer, phase: .preparing)

    func fail(_ message: String) {
      guard generation == pairingGeneration else { return }
      pairing?.phase = .failed(message)
    }

    guard offer.expiresAt > Date() else {
      return fail(String(localized: "This code expired. Your Mac shows a fresh one: scan it again."))
    }

    let keys = DeviceKeys.shared
    let key: SymmetricKey
    let phonePub: Data
    let signPub: Data
    do {
      try await keys.unlock(reason: String(localized: "Link this iPhone to \(offer.name)."), createIfMissing: true)
      phonePub = try keys.publicKey()
      // Made once, then kept across pairings: the other Macs already hold its public half.
      try keys.ensureSigningKey()
      signPub = try keys.signPub()
      let shared = try keys.sharedSecret(with: offer.pub)
      key = RelayCrypto.deriveKey(shared: shared, macId: offer.macId, phoneId: keys.phoneId)
    } catch {
      switch error {
      case .invalidated:
        // The key was made under another face: start over with a new identity.
        invalidate()
        return fail(String(localized: "Face ID changed since this iPhone was set up. Scan the code again."))
      case .locked(let message), .unavailable(let message):
        return fail(message)
      }
    }
    guard generation == pairingGeneration, !stopped else { return }
    pairingKey = key
    pairingPhonePub = phonePub

    // The channel may not be joined yet (first pairing), or may be from before the unlock.
    if channel == nil || channel?.status != .subscribed {
      await subscribe()
    }
    guard generation == pairingGeneration, !stopped else { return }
    guard let channel, channel.status == .subscribed else {
      return fail(String(localized: "Could not reach the relay. Check your connection and try again."))
    }

    let phoneId = keys.phoneId
    let epoch = UUID().uuidString.lowercased()
    pairingEpoch = epoch
    let body: [String: String] = [
      "token": offer.tokenText,
      "name": UIDevice.current.name,
      "signPub": signPub.base64EncodedString(),
    ]
    guard var envelope = Self.sealedEnvelope(
      type: "pair-request", from: phoneId, to: offer.macId, epoch: epoch, seq: 1, body: body, key: key
    ) else { return fail(String(localized: "Could not encrypt the request.")) }
    envelope["phonePub"] = .string(phonePub.base64EncodedString())
    // Over REST, not the socket just joined: the server says whether it took the request,
    // so the code only shows once the Mac can actually receive it.
    do {
      try await channel.httpSend(event: "relay", message: envelope)
    } catch {
      return fail(String(localized: "Could not send the request to your Mac (\(error.localizedDescription)). Scan its code again."))
    }
    guard generation == pairingGeneration else { return }

    let code = RelayCrypto.pairingCode(token: offer.token, macPublic: offer.pub, phonePublic: phonePub)
    pairing?.phase = .waiting(code: code)
    pairingTimer = Task { [weak self] in
      try? await Task.sleep(for: Self.pairingTimeout)
      guard !Task.isCancelled, let self, generation == self.pairingGeneration,
            case .waiting = self.pairing?.phase
      else { return }
      self.pairing?.phase = .failed(String(localized: "Your Mac did not answer. Check that remote access is still on, then scan its code again."))
    }
  }

  /// Closes the pairing screen's session, whatever stage it reached.
  func endPairing() {
    invalidatePairingWork()
    guard pairing != nil else { return }
    pairing = nil
    if macs.isEmpty, !stopped { Task { await refreshSubscription() } }
  }

  /// Makes every piece of pairing work in flight stale (a Face ID prompt, a broadcast, the
  /// timeout) and drops the pair key it was waiting with.
  private func invalidatePairingWork() {
    pairingGeneration += 1
    pairingTimer?.cancel()
    pairingTimer = nil
    pairingKey = nil
    pairingPhonePub = nil
    pairingEpoch = nil
  }

  /// On `lock()`: a pairing not answered yet ends here, and its screen says so. A finished
  /// one keeps its outcome on screen.
  private func cancelPendingPairing() {
    invalidatePairingWork()
    switch pairing?.phase {
    case .preparing, .waiting:
      pairing?.phase = .failed(String(localized: "The pairing was cancelled when Magic Slash left the screen. Scan your Mac's code again."))
    default:
      break
    }
  }

  // MARK: - Commands

  /// The status of the last answer sent to the question `token` of an agent, nil when none.
  func answerStatus(for appAgentId: String, token: String) -> AnswerStatus? {
    guard let status = answers[appAgentId], status.token == token else { return nil }
    return status
  }

  /// The status of the last prompt or stop sent to an agent, nil when none.
  func commandStatus(for appAgentId: String) -> AgentCommandStatus? {
    agentCommands[appAgentId]
  }

  /// Answers an agent's pending question (PROTOCOL.md §10): Face ID signs the payload, the
  /// pair key seals it, and the Mac's `command-result` lands in `answers`.
  func answer(macId: String, appAgentId: String, token: String, choice: AnswerChoice) async {
    // Only an answer to this same question is in the way: one still in flight for an earlier
    // question must not leave a newer one's buttons doing nothing until it settles.
    if let current = answers[appAgentId], current.token == token, case .sending = current.phase { return }
    await send(.answer(token: token, choice: choice), macId: macId, appAgentId: appAgentId)
  }

  /// Sends a prompt to an agent (§10). The Mac submits it to an idle agent, queues it behind a
  /// working one's turn, and refuses it while a question waits. The result lands in
  /// `agentCommands`.
  func prompt(macId: String, appAgentId: String, text: String) async {
    if case .sending = agentCommands[appAgentId]?.phase { return }
    await send(.prompt(text: text), macId: macId, appAgentId: appAgentId)
  }

  /// Interrupts a working or waiting agent's turn (§10), as Esc does on the Mac.
  func stop(macId: String, appAgentId: String) async {
    if case .sending = agentCommands[appAgentId]?.phase { return }
    await send(.stop, macId: macId, appAgentId: appAgentId)
  }

  /// What the phone asks of an agent, and what each action carries on top of the common fields.
  private enum Command {
    case answer(token: String, choice: AnswerChoice)
    case prompt(text: String)
    case stop

    var kind: CommandKind {
      switch self {
      case .answer: .answer
      case .prompt: .prompt
      case .stop: .stop
      }
    }

    /// Only a prompt or a stop quotes the Mac's `bootId`: an answer is already bound to the
    /// question's token.
    var needsBootId: Bool {
      if case .answer = self { return false }
      return true
    }
  }

  /// A command's `action` (§10), without what it carries.
  private enum CommandKind: String {
    case answer, prompt, stop
  }

  /// Which status a command's outcome lands in.
  private enum CommandTarget {
    /// `answers`, for the question it answers.
    case answer(token: String)
    /// `agentCommands`, for as long as this command is the agent's last one.
    case agent(AgentCommandStatus.Action, commandId: String)
  }

  /// How a command stands, whatever its target: the agent's phase, the richer of the two.
  private typealias CommandOutcome = AgentCommandStatus.Phase

  /// The one path every command takes (§10): checks, Face ID signs the payload, the pair key
  /// seals it, and the `command-result` (or the timeout) settles it in its target.
  private func send(_ command: Command, macId: String, appAgentId: String) async {
    let commandId = UUID().uuidString.lowercased()
    let target: CommandTarget = switch command {
    case .answer(let token, _): .answer(token: token)
    case .prompt: .agent(.prompt, commandId: commandId)
    case .stop: .agent(.stop, commandId: commandId)
    }
    let wording = Wording(kind: command.kind)
    func fail(_ message: String) {
      record(target, appAgentId: appAgentId, .failed(message))
    }

    guard let mac = macs.first(where: { $0.macId == macId }), let pairingId = mac.pairingId else {
      return fail(String(localized: "This Mac is no longer paired."))
    }
    guard pairKeys[macId] != nil else {
      return fail(String(localized: "Unlock the link to your Mac with Face ID first."))
    }
    guard isOnline(macId) else {
      return fail(wording.offline(mac.name))
    }
    let keys = DeviceKeys.shared
    // Paired before commands existed: no Mac holds a key to check this phone's signature.
    guard keys.hasSigningKey else { return fail(wording.repair) }
    // A Mac that does not say which launch it is cannot tell a prompt meant for it from one
    // replayed after a restart: it would refuse it anyway.
    let bootId = snapshots[macId]?.snapshot.bootId
    if command.needsBootId, bootId == nil {
      return fail(String(localized: "Not sent: \(mac.name) runs a version of Magic Slash that can't take this yet. Update the desktop app."))
    }

    record(target, appAgentId: appAgentId, .sending)
    let generation = lockGeneration
    let phoneId = keys.phoneId
    var payloadFields = CommandPayload(
      v: 1,
      action: command.kind.rawValue,
      macId: macId,
      phoneId: phoneId,
      pairingId: pairingId,
      commandId: commandId,
      issuedAt: Int64((Date().timeIntervalSince1970 * 1000).rounded()),
      appAgentId: appAgentId
    )
    switch command {
    case .answer(let token, let choice):
      payloadFields.token = token
      payloadFields.choice = choice
    case .prompt(let text):
      payloadFields.text = text
      payloadFields.bootId = bootId
    case .stop:
      payloadFields.bootId = bootId
    }
    // Serialized once: the signature covers these exact bytes, and the Mac checks them as
    // they arrive, with no canonical form on either side.
    guard let payloadData = try? JSONEncoder().encode(payloadFields),
          let payload = String(data: payloadData, encoding: .utf8)
    else { return fail(String(localized: "Could not prepare \(wording.nounPhrase).")) }

    let signature: Data
    do {
      signature = try await keys.sign(Data(payload.utf8), reason: wording.signReason(mac.name))
    } catch {
      guard generation == lockGeneration, !stopped else { return fail(Self.notSentMessage) }
      switch error {
      case .locked(let message), .unavailable(let message):
        return fail(message)
      case .invalidated:
        // The key died with a new Face ID enrolment: so did every pairing.
        invalidate()
        return fail(String(localized: "Face ID changed since this iPhone was paired. Pair your Mac again to \(wording.verb)."))
      }
    }
    // Locked while Face ID was up: the keys are gone, and nothing was sent.
    guard generation == lockGeneration, !stopped else { return fail(Self.notSentMessage) }
    guard let key = pairKeys[macId], let channel, channel.status == .subscribed else {
      return fail(String(localized: "Could not reach the relay. Check your connection and try again."))
    }

    commandSeq += 1
    let seq = commandSeq
    let body = ["payload": payload, "sig": signature.base64EncodedString()]
    guard let envelope = Self.sealedEnvelope(
      type: "command", from: phoneId, to: macId, epoch: commandEpoch, seq: seq, body: body, key: key
    ) else { return fail(String(localized: "Could not encrypt \(wording.nounPhrase).")) }
    // Registered before the broadcast, so a reply that is quicker than the await still finds it.
    let timeout = Task { [weak self] in
      try? await Task.sleep(for: Self.commandTimeout)
      guard !Task.isCancelled, let self,
            let pending = self.pendingCommands.removeValue(forKey: commandId)
      else { return }
      self.settle(pending, .failed(String(localized: "\(mac.name) did not answer: it may be unreachable. Check the Mac, then try again.")))
    }
    pendingCommands[commandId] = PendingCommand(
      macId: macId, pairingId: pairingId, appAgentId: appAgentId, kind: command.kind, target: target,
      timeout: timeout
    )
    await channel.broadcast(event: "relay", message: envelope)
  }

  /// What a `command` box signs (§10). Field order is the encoder's, and a field left nil is
  /// left out rather than sent as null: the bytes are signed as sent, never rebuilt.
  private struct CommandPayload: Encodable {
    let v: Int
    let action: String
    let macId: String
    let phoneId: String
    let pairingId: String
    let commandId: String
    let issuedAt: Int64
    let appAgentId: String
    var token: String?
    var choice: AnswerChoice?
    var text: String?
    var bootId: String?
  }

  private static let notSentMessage = String(localized: "Not sent: Magic Slash left the screen. Try again.")

  /// The words a command's messages use, so each says what was actually sent.
  private struct Wording {
    let kind: CommandKind

    /// The noun with its article, as the messages use it: "the answer", "la réponse".
    var nounPhrase: String {
      switch kind {
      case .answer: String(localized: "the answer")
      case .prompt: String(localized: "the prompt")
      case .stop: String(localized: "the stop")
      }
    }

    /// What pairing again lets the user do.
    var verb: String {
      switch kind {
      case .answer: String(localized: "answer")
      case .prompt: String(localized: "send prompts")
      case .stop: String(localized: "stop agents")
      }
    }

    var repair: String { String(localized: "Pair this iPhone with the Mac again to \(verb) from it.") }

    func offline(_ macName: String) -> String {
      switch kind {
      case .answer: String(localized: "\(macName) is offline. Answer when it is back, or on the Mac.")
      case .prompt: String(localized: "\(macName) is offline. Send it when the Mac is back.")
      case .stop: String(localized: "\(macName) is offline. Stop the agent on the Mac.")
      }
    }

    func signReason(_ macName: String) -> String {
      switch kind {
      case .answer: String(localized: "Answer \(macName)'s agent.")
      case .prompt: String(localized: "Send a prompt to \(macName)'s agent.")
      case .stop: String(localized: "Stop \(macName)'s agent.")
      }
    }

    /// A refusal's `reason` (§10), as the card or the composer shows it.
    func refusal(_ reason: String?) -> String {
      switch (kind, reason) {
      case (_, "re-pair"): repair
      case (.answer, "stale"): String(localized: "Already answered on the Mac, or expired.")
      case (.answer, "unsupported"): String(localized: "Answer this one on the Mac.")
      case (.answer, "busy"), (.answer, "write-failed"): String(localized: "Your Mac could not take the answer. Try again, or check the Mac.")
      case (.answer, "invalid"): String(localized: "Your Mac does not accept this answer. Answer it on the Mac.")
      case (.prompt, "stale"): String(localized: "This agent is no longer available on the Mac.")
      case (.prompt, "busy"): String(localized: "The agent is waiting on a question: answer it first.")
      case (.prompt, "unsupported"):
        String(localized: "This command needs the Mac's terminal: shell (!) and interactive slash commands can't be sent from the iPhone.")
      case (.prompt, "write-failed"): String(localized: "Your Mac could not write to the agent's terminal. Try again, or check the Mac.")
      case (.prompt, "invalid"): String(localized: "Your Mac does not accept this prompt. Send it from the Mac.")
      case (.stop, "stale"): String(localized: "Nothing to stop: the agent isn't working.")
      case (.stop, "busy"), (.stop, "write-failed"): String(localized: "Your Mac could not stop the agent. Try again, or stop it on the Mac.")
      case (.stop, "unsupported"), (.stop, "invalid"): String(localized: "Your Mac does not accept this stop. Stop the agent on the Mac.")
      // A signature, identifier, launch or clock mismatch: the clock is the one a user can fix.
      case (_, "rejected"):
        String(localized: "Your Mac refused \(nounPhrase). Check that the iPhone and the Mac show the same time, or pair again.")
      default: String(localized: "Your Mac refused \(nounPhrase).")
      }
    }
  }

  /// Commands still waiting when the keys go: their result can no longer be read. The command
  /// may well have reached the Mac, so the status says to look there.
  private func abandonPendingCommands() {
    for pending in pendingCommands.values {
      pending.timeout.cancel()
      settle(pending, .failed(String(localized: "Magic Slash left the screen before your Mac confirmed. Check the Mac.")))
    }
    pendingCommands = [:]
  }

  /// Writes a command's outcome into its target's status.
  private func record(_ target: CommandTarget, appAgentId: String, _ outcome: CommandOutcome) {
    switch target {
    case .answer(let token):
      let phase: AnswerStatus.Phase = switch outcome {
      case .sending: .sending
      case .done: .done
      case .failed(let message): .failed(message)
      }
      answers[appAgentId] = AnswerStatus(token: token, phase: phase)
    case .agent(let action, let commandId):
      agentCommands[appAgentId] = AgentCommandStatus(commandId: commandId, action: action, phase: outcome)
    }
  }

  // MARK: - Realtime

  /// Whether a reconnect asked for by hand is under way.
  private(set) var reconnecting = false

  /// The connection log's lines (`RelayLog`), the SDK's among them.
  var events: [String] { RelayLog.shared.events }

  func log(_ event: String) {
    RelayLog.shared.add(event)
  }

  /// The user's "Reconnect": Face ID if the keys are locked, then a fresh join of the
  /// channel, which makes every Mac send a new snapshot.
  func reconnect() async {
    guard !reconnecting, !stopped else { return }
    reconnecting = true
    defer { reconnecting = false }
    log("reconnect by hand")
    if keyState != .unlocked, !macs.isEmpty {
      await unlock(rejoin: false)
    }
    await refreshSubscription()
  }

  private var wantsChannel: Bool { !macs.isEmpty || pairing != nil }

  private func refreshSubscription() async {
    if wantsChannel {
      await subscribe()
    } else {
      await unsubscribe()
    }
  }

  private func subscribe() async {
    // Claimed before awaiting: a newer call owns the subscription and this one steps aside.
    subscriptionCount += 1
    let attempt = subscriptionCount
    // The private topic is authorized from the JWT the socket holds: hand it the current
    // one rather than rely on the auth listener having run already.
    await authorizeSocket(forceRefresh: false)
    await unsubscribe()
    guard !stopped, attempt == subscriptionCount else { return }

    let presenceKey = "phone:\(DeviceKeys.shared.phoneId)"
    let channel = client.channel("relay:\(userId)") {
      $0.isPrivate = true
      $0.presence.key = presenceKey
    }
    // Streams before subscribing: callbacks added after the join are not part of it.
    let messages = channel.broadcastStream(event: "relay")
    let presenceChanges = channel.presenceChange()
    let statuses = channel.statusChange
    tasks = [
      // A channel that was joined and dropped, while the app stays open, is joined again
      // here: otherwise only a return to the foreground would. Our own removal cancels this
      // task first, so it never answers it.
      Task { [weak self] in
        var joined = false
        for await status in statuses {
          self?.log("channel \(status)")
          if status == .subscribed { joined = true; continue }
          guard joined, status == .unsubscribed else { continue }
          try? await Task.sleep(for: .seconds(2))
          guard !Task.isCancelled, let self, !self.stopped, attempt == self.subscriptionCount else { return }
          // In a task of its own: the rejoin cancels this one (`unsubscribe` cancels `tasks`),
          // and a join awaited from here would be cancelled with it. The server drops a
          // private channel whose token it no longer accepts (`phx_error`): a fresh one
          // first, or the next join meets the same fate.
          Task {
            await self.authorizeSocket(forceRefresh: true)
            await self.refreshSubscription()
          }
          return
        }
      },
      Task { [weak self] in
        for await message in messages { self?.receive(message) }
      },
      Task { [weak self] in
        for await change in presenceChanges {
          self?.applyPresence(joins: change.joins, leaves: change.leaves)
        }
      },
    ]
    self.channel = channel
    log("join the relay")
    joining = true
    lastJoinAttempt = Date()
    do {
      try await channel.subscribeWithError()
      joining = false
    } catch {
      joining = false
      log("join failed: \(error.localizedDescription)")
      return
    }
    guard !stopped, attempt == subscriptionCount else { return }
    // No presence of our own (§12): Realtime's `track` timed out for the phone's key and the
    // server closed the channel each time. The Macs are asked for a snapshot instead.
    await requestState()
  }

  /// Asks every paired Mac for a snapshot now (§12), rather than waiting for its heartbeat.
  /// A Mac whose key is not unlocked yet is skipped: its snapshot could not be read.
  func requestState() async {
    guard !stopped, let channel, channel.status == .subscribed else { return }
    let phoneId = DeviceKeys.shared.phoneId
    for mac in macs {
      guard let key = pairKeys[mac.macId], let pairingId = mac.pairingId else { continue }
      commandSeq += 1
      guard let envelope = Self.sealedEnvelope(
        type: "state-request", from: phoneId, to: mac.macId, epoch: commandEpoch, seq: commandSeq,
        body: ["pairingId": pairingId], key: key
      ) else { continue }
      await channel.broadcast(event: "relay", message: envelope)
    }
  }

  /// Detaches synchronously, then removes the channel, after any removal still in flight.
  private func unsubscribe() async {
    tasks.forEach { $0.cancel() }
    tasks = []
    presence = [:]
    let old = channel
    channel = nil
    let previous = Self.removals
    let client = client
    let removal = Task {
      await previous?.value
      if let old { await client.removeChannel(old) }
    }
    Self.removals = removal
    await removal.value
  }

  private func applyPresence(joins: [String: PresenceV2], leaves: [String: PresenceV2]) {
    for key in leaves.keys where key.hasPrefix("mac:") { log("presence leave \(macLabel(key))") }
    for key in joins.keys where key.hasPrefix("mac:") { log("presence join \(macLabel(key))") }
    for (key, value) in leaves {
      presence[key]?.remove(value.ref)
      if presence[key]?.isEmpty == true { presence[key] = nil }
    }
    for (key, value) in joins {
      presence[key, default: []].insert(value.ref)
    }
  }

  @ObservationIgnored private var lastOnline: [String: Bool] = [:]

  /// Each Mac going offline or back, with why: no presence on the channel, or no snapshot
  /// for too long.
  private func logOnlineChanges() {
    for mac in macs {
      let online = isOnline(mac.macId)
      guard lastOnline[mac.macId] != online else { continue }
      lastOnline[mac.macId] = online
      if online {
        log("\(mac.name) online")
      } else {
        let present = !(presence["mac:\(mac.macId)"]?.isEmpty ?? true)
        let age = snapshots[mac.macId]?.receivedAt.map { Int(now.timeIntervalSince($0)) }
        log("\(mac.name) offline: \(present ? "present" : "no presence"), last snapshot \(age.map { "\($0) s ago" } ?? "never")")
      }
    }
  }

  /// A presence key's Mac by name when it is paired, by the start of its id otherwise.
  private func macLabel(_ key: String) -> String {
    let id = String(key.dropFirst(4))
    return macs.first(where: { $0.macId == id })?.name ?? String(id.prefix(8))
  }

  /// Hands the socket a token the server will accept for the private channel. The SDK
  /// pauses its own refresh whenever the app leaves the foreground (Face ID included), so
  /// the stored token can be past its expiry when the relay joins: refreshed when it has
  /// under a minute left, or always when the server just dropped the channel.
  /// Back from the background, the socket the SDK holds is not to be trusted: one suspended
  /// with the screen locked can still read as connected while nothing goes through it (the
  /// SDK only notices after two missed heartbeats, about a minute), or be part way through a
  /// reconnect whose backoff grew while the network was down (up to 30 s a step). Either
  /// way every join waits on it. Dropped here, so the joins that follow open a fresh one.
  static func restartSocket(_ client: SupabaseClient) async {
    let realtime = client.realtimeV2
    RelayLog.shared.add("socket \(realtime.status) on return, starting a fresh one")
    realtime.disconnect(reason: "foreground")
    // `disconnect` closes the old socket on a task of its own: let it land before a join
    // asks for a connection, or the join could be handed the socket being closed.
    try? await Task.sleep(for: .milliseconds(200))
  }

  func authorizeSocket(forceRefresh: Bool) async {
    var session = try? await client.auth.session
    let remaining = session.map { $0.expiresAt - Date().timeIntervalSince1970 } ?? 0
    if forceRefresh || remaining < 60 {
      session = try? await client.auth.refreshSession()
      log(session == nil ? "token refresh failed" : "token refreshed")
    }
    guard let session else {
      log("no session for the relay")
      return
    }
    log("token valid for \(Int(session.expiresAt - Date().timeIntervalSince1970)) s")
    await client.realtimeV2.setAuth(session.accessToken)
  }

  /// A join in flight, and when the last one started: the supervisor leaves both alone.
  @ObservationIgnored private var joining = false
  @ObservationIgnored private var lastJoinAttempt = Date.distantPast

  /// Every tick while the app is open: a channel that should be joined and is not (a join
  /// that failed or timed out, a socket that came back without it) is joined again. A join
  /// that fails is otherwise never retried, and the phone stays off the relay until the app
  /// goes to the background and back.
  private func superviseChannel() {
    guard wantsChannel, !stopped, !joining, Date().timeIntervalSince(lastJoinAttempt) > 8 else { return }
    if let channel, channel.status == .subscribed { return }
    log("channel not joined (\(channel.map { "\($0.status)" } ?? "none")), joining again")
    Task { await subscribe() }
  }

  private func startTicker() {
    ticker?.cancel()
    ticker = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(for: .seconds(5))
        guard !Task.isCancelled, let self else { return }
        self.now = Date()
        self.logOnlineChanges()
        self.superviseChannel()
      }
    }
  }

  // MARK: - Sending

  /// An envelope (§4) whose box seals `body` under `key`, bound to its own header: the mirror
  /// of `Envelope.open(with:)`. Nil when the body does not encode or seal.
  private static func sealedEnvelope(
    type: String, from: String, to: String, epoch: String, seq: Int,
    body: some Encodable, key: SymmetricKey
  ) -> JSONObject? {
    let aad = RelayCrypto.aad(type: type, from: from, to: to, epoch: epoch, seq: seq)
    guard let plain = try? JSONEncoder().encode(body),
          let box = try? RelayCrypto.seal(plain, key: key, aad: aad)
    else { return nil }
    return [
      "v": .integer(1),
      "type": .string(type),
      "from": .string(from),
      "to": .string(to),
      "epoch": .string(epoch),
      "seq": .integer(seq),
      "box": .string(box.base64EncodedString()),
    ]
  }

  // MARK: - Receiving

  private struct Envelope {
    let type: String
    let from: String
    let to: String
    let epoch: String
    let seq: Int
    let box: Data?
    let reason: String?

    init?(_ object: JSONObject?) {
      guard let object, object["v"]?.number == 1,
            let type = object["type"]?.stringValue,
            let from = object["from"]?.stringValue,
            let to = object["to"]?.stringValue,
            let epoch = object["epoch"]?.stringValue,
            let seq = object["seq"]?.number, seq >= 1, seq == seq.rounded(), seq < 9_007_199_254_740_992
      else { return nil }
      self.type = type
      self.from = from
      self.to = to
      self.epoch = epoch
      self.seq = Int(seq)
      box = object["box"]?.stringValue.flatMap { Data(base64Encoded: $0) }
      reason = object["reason"]?.stringValue
    }

    func open(with key: SymmetricKey) -> Data? {
      guard let box else { return nil }
      let aad = RelayCrypto.aad(type: type, from: from, to: to, epoch: epoch, seq: seq)
      return RelayCrypto.open(box, key: key, aad: aad)
    }
  }

  private func receive(_ message: JSONObject) {
    // The broadcast frame wraps the envelope in its own `payload`.
    guard let envelope = Envelope(message["payload"]?.objectValue),
          envelope.to == DeviceKeys.shared.phoneId
    else { return }
    switch envelope.type {
    case "state": receiveState(envelope)
    case "revoked": receiveRevoked(envelope)
    case "pair-accepted": receivePairAccepted(envelope)
    case "pair-rejected": receivePairRejected(envelope)
    case "command-result": receiveCommandResult(envelope)
    case "chat": receiveChat(envelope)
    case "commands": receiveCommands(envelope)
    default: break
    }
  }

  private func receiveState(_ envelope: Envelope) {
    if pairKeys[envelope.from] == nil, macs.contains(where: { $0.macId == envelope.from }) {
      log("snapshot from \(macLabel("mac:\(envelope.from)")) dropped: keys locked")
    }
    guard let key = pairKeys[envelope.from],
          let plain = envelope.open(with: key),
          let snapshot = try? JSONDecoder().decode(RelaySnapshot.self, from: plain),
          let mac = macs.first(where: { $0.macId == envelope.from }),
          let pairingId = mac.pairingId,
          // §6: a snapshot sealed for another pairing is a replay of an older one.
          snapshot.pairingId == pairingId,
          let generation = snapshot.generation, generation >= 0
    else { return }
    // §6: a replayed or overtaken snapshot never replaces a newer one. `sentAt` is the Mac's
    // clock and is never compared.
    if let last = snapshots[envelope.from],
       !last.isSuperseded(byGeneration: generation, epoch: envelope.epoch, seq: envelope.seq) {
      return
    }
    now = Date()
    if let last = snapshots[envelope.from]?.receivedAt, now.timeIntervalSince(last) > 45 {
      log("snapshot from \(mac.name) after \(Int(now.timeIntervalSince(last))) s")
    }
    snapshots[envelope.from] = AcceptedSnapshot(
      generation: generation, epoch: envelope.epoch, seq: envelope.seq, snapshot: snapshot, receivedAt: now
    )
    if let name = cleanMacName(snapshot.macName),
       let index = macs.firstIndex(where: { $0.macId == envelope.from }), macs[index].name != name {
      var renamed = macs
      renamed[index].name = name
      setMacs(renamed)
    }
    SnapshotCache.save(snapshots, userId: userId)
  }

  /// §11: from a paired Mac, for its current pairing, and newer by §6's rule than the last
  /// conversation that Mac sent for the same agent.
  private func receiveChat(_ envelope: Envelope) {
    guard let key = pairKeys[envelope.from],
          let plain = envelope.open(with: key),
          let chat = try? JSONDecoder().decode(RemoteChat.self, from: plain),
          let mac = macs.first(where: { $0.macId == envelope.from }),
          let pairingId = mac.pairingId, chat.pairingId == pairingId,
          let generation = chat.generation, generation >= 0
    else { return }
    if let last = chats[chat.appAgentId], last.macId == envelope.from {
      let newer = generation != last.generation
        ? generation > last.generation
        : envelope.epoch == last.epoch && envelope.seq > last.seq
      guard newer else { return }
    }
    chats[chat.appAgentId] = AgentChat(
      macId: envelope.from, generation: generation, epoch: envelope.epoch, seq: envelope.seq,
      entries: chat.entries, queue: chat.queue, hasEarlier: chat.hasEarlier
    )
  }

  /// The `/` commands a Mac suggests (§13): from a paired Mac, for its saved pairing, replacing
  /// whatever it sent before. Not ordered: one list is as good as the next.
  private func receiveCommands(_ envelope: Envelope) {
    guard let key = pairKeys[envelope.from],
          let plain = envelope.open(with: key),
          let list = try? JSONDecoder().decode(RemoteCommandList.self, from: plain),
          let pairingId = macs.first(where: { $0.macId == envelope.from })?.pairingId,
          list.pairingId == pairingId
    else { return }
    commandLists[envelope.from] = list
  }

  /// Not part of §6's ordering: only a `commandId` still pending counts, and only once.
  private func receiveCommandResult(_ envelope: Envelope) {
    guard let key = pairKeys[envelope.from],
          let plain = envelope.open(with: key),
          let body = (try? JSONSerialization.jsonObject(with: plain)) as? [String: Any],
          let commandId = body["commandId"] as? String,
          let pending = pendingCommands[commandId],
          // From the Mac it went to, for the pairing it was sent under, which is still the
          // saved one: a result recorded from an older pairing opens with the same key (§6).
          pending.macId == envelope.from,
          let pairingId = body["pairingId"] as? String,
          pairingId == pending.pairingId,
          macs.first(where: { $0.macId == envelope.from })?.pairingId == pairingId,
          let ok = body["ok"] as? Bool
    else { return }
    pendingCommands[commandId] = nil
    pending.timeout.cancel()
    guard ok else {
      return settle(pending, .failed(Wording(kind: pending.kind).refusal(body["reason"] as? String)))
    }
    // Only a prompt that reached a working agent is queued: anything else ran now.
    settle(pending, .done(queued: body["queued"] as? Bool == true))
  }

  /// Records how a sent command ended, unless the agent's status already belongs to a newer
  /// question or command: a late reply or timeout for an earlier one must not overwrite it.
  private func settle(_ pending: PendingCommand, _ outcome: CommandOutcome) {
    switch pending.target {
    case .answer(let token):
      if let current = answers[pending.appAgentId], current.token != token { return }
    case .agent(_, let commandId):
      guard agentCommands[pending.appAgentId]?.commandId == commandId else { return }
    }
    record(pending.target, appAgentId: pending.appAgentId, outcome)
  }

  private func receiveRevoked(_ envelope: Envelope) {
    // Only a box that opens counts: anyone on the channel could send the header. And only
    // one naming this pairing: the same key opens a `revoked` recorded from an older one (§6, §8).
    guard let key = pairKeys[envelope.from],
          let plain = envelope.open(with: key),
          let body = (try? JSONSerialization.jsonObject(with: plain)) as? [String: Any],
          let pairingId = body["pairingId"] as? String,
          let mac = macs.first(where: { $0.macId == envelope.from }),
          mac.pairingId == pairingId
    else { return }
    forget(envelope.from)
  }

  private func receivePairAccepted(_ envelope: Envelope) {
    // Only an answer to the request still pending: `lock()` and `endPairing()` drop the key
    // and the epoch, and the same key opens a `pair-accepted` recorded from an older pairing,
    // which carries that pairing's request epoch instead (§6, §7 step 5).
    guard !stopped, let pairing, case .waiting = pairing.phase,
          envelope.from == pairing.offer.macId,
          let key = pairingKey, let phonePub = pairingPhonePub, let requestEpoch = pairingEpoch,
          let plain = envelope.open(with: key),
          let body = (try? JSONSerialization.jsonObject(with: plain)) as? [String: Any],
          body["requestEpoch"] as? String == requestEpoch,
          let pairingId = body["pairingId"] as? String,
          !pairingId.isEmpty, pairingId == pairingId.lowercased()
    else { return }
    let name = cleanMacName(body["macName"] as? String) ?? pairing.offer.name

    let mac = PairedMac(
      macId: pairing.offer.macId,
      name: name,
      pub: pairing.offer.pub,
      pairedAt: Date(),
      pairingId: pairingId,
      phoneId: envelope.to,
      phonePub: phonePub
    )
    setMacs(macs.filter { $0.macId != mac.macId } + [mac])
    // Whatever was cached for this Mac came from an older pairing.
    snapshots[mac.macId] = nil
    SnapshotCache.save(snapshots, userId: userId)
    pairKeys[mac.macId] = key
    keyState = .unlocked
    setNeedsRepair(false)
    // The request is answered: nothing else may answer it again.
    invalidatePairingWork()
    self.pairing?.phase = .accepted(macName: name)
    // Rejoin so the new Mac, which only now knows this phone, sends its first snapshot.
    Task { await refreshSubscription() }
  }

  private func receivePairRejected(_ envelope: Envelope) {
    // Clear text and forgeable (§4): the worst it can do is cancel this screen.
    guard let pairing, case .waiting = pairing.phase, envelope.from == pairing.offer.macId else { return }
    invalidatePairingWork()
    let message = switch envelope.reason {
    case "expired": String(localized: "The code expired before your Mac received the request. Scan the fresh one.")
    case "used": String(localized: "This code was already used. Scan the fresh one your Mac shows.")
    case "declined": String(localized: "The pairing was declined on your Mac.")
    default: String(localized: "Your Mac refused the pairing.")
    }
    self.pairing?.phase = .rejected(message)
  }

  // MARK: - Persistence

  private func setMacs(_ next: [PairedMac]) {
    macs = next
    PairedMacs.save(next, userId: userId)
  }

  /// The key no longer opens: every pairing it held is dead. A fresh identity replaces it,
  /// and the user is told to pair again.
  private func invalidate() {
    DeviceKeys.shared.reset()
    pairKeys = [:]
    let hadMacs = !macs.isEmpty
    setMacs([])
    snapshots = [:]
    chats = [:]
    commandLists = [:]
    SnapshotCache.save([:], userId: userId)
    keyState = .idle
    if hadMacs { setNeedsRepair(true) }
  }

  private func setNeedsRepair(_ value: Bool) {
    needsRepair = value
    UserDefaults.standard.set(value, forKey: Self.needsRepairKey(userId))
  }

  private static func needsRepairKey(_ userId: String) -> String { "relay.needsRepair.\(userId)" }
}

/// A Mac's name as shown: trimmed, nil when empty, and bounded like the desktop's NAME_MAX.
private func cleanMacName(_ raw: String?) -> String? {
  raw?.trimmingCharacters(in: .whitespacesAndNewlines).nonEmpty.map { String($0.prefix(64)) }
}
