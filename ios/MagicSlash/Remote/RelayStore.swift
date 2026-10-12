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
  let macName: String
  /// When the phone accepted that snapshot (its own clock; the Mac's for an old cache).
  let updatedAt: Date
  /// False when the Mac is offline: this is the last known state, not the current one.
  let isCurrent: Bool
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

  private(set) var macs: [PairedMac] = []
  private(set) var snapshots: [String: AcceptedSnapshot] = [:]
  private(set) var keyState: KeyState = .idle
  /// Set when pairings were lost to a key that no longer opens (new Face ID enrolment), until
  /// the next successful pairing.
  private(set) var needsRepair: Bool
  private(set) var pairing: Pairing?
  /// Ticks every few seconds, so `isOnline` turns false on its own when the Mac goes quiet.
  private(set) var now = Date()
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
    endPairing()
    await unsubscribe()
  }

  /// Drops every key from memory: on the way to the background, and on sign-out. The next
  /// `start()` asks for Face ID again. A pairing still in progress is cancelled with its key:
  /// an approval that lands later must not put a key back in memory without Face ID.
  func lock() {
    lockGeneration += 1
    pairKeys = [:]
    cancelPendingPairing()
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
      try await keys.unlock(reason: "Unlock the encrypted link to your Mac.", createIfMissing: false)
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
      if rejoin, !wasUnlocked { await refreshSubscription() }
    } catch {
      switch error {
      case .invalidated: invalidate()
      case .locked(let message): keyState = .locked(message)
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
    SnapshotCache.save(snapshots, userId: userId)
    if macs.isEmpty { keyState = .idle }
    Task { await refreshSubscription() }
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
      return fail("This code expired. Your Mac shows a fresh one: scan it again.")
    }

    let keys = DeviceKeys.shared
    let key: SymmetricKey
    let phonePub: Data
    do {
      try await keys.unlock(reason: "Link this iPhone to \(offer.name).", createIfMissing: true)
      phonePub = try keys.publicKey()
      let shared = try keys.sharedSecret(with: offer.pub)
      key = RelayCrypto.deriveKey(shared: shared, macId: offer.macId, phoneId: keys.phoneId)
    } catch {
      switch error {
      case .invalidated:
        // The key was made under another face: start over with a new identity.
        invalidate()
        return fail("Face ID changed since this iPhone was set up. Scan the code again.")
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
      return fail("Could not reach the relay. Check your connection and try again.")
    }

    let phoneId = keys.phoneId
    let epoch = UUID().uuidString.lowercased()
    pairingEpoch = epoch
    let body: [String: String] = ["token": offer.tokenText, "name": UIDevice.current.name]
    let aad = RelayCrypto.aad(type: "pair-request", from: phoneId, to: offer.macId, epoch: epoch, seq: 1)
    guard let plain = try? JSONEncoder().encode(body),
          let box = try? RelayCrypto.seal(plain, key: key, aad: aad)
    else { return fail("Could not encrypt the request.") }

    let envelope: JSONObject = [
      "v": .integer(1),
      "type": .string("pair-request"),
      "from": .string(phoneId),
      "to": .string(offer.macId),
      "epoch": .string(epoch),
      "seq": .integer(1),
      "box": .string(box.base64EncodedString()),
      "phonePub": .string(phonePub.base64EncodedString()),
    ]
    await channel.broadcast(event: "relay", message: envelope)
    guard generation == pairingGeneration else { return }

    let code = RelayCrypto.pairingCode(token: offer.token, macPublic: offer.pub, phonePublic: phonePub)
    pairing?.phase = .waiting(code: code)
    pairingTimer = Task { [weak self] in
      try? await Task.sleep(for: Self.pairingTimeout)
      guard !Task.isCancelled, let self, generation == self.pairingGeneration,
            case .waiting = self.pairing?.phase
      else { return }
      self.pairing?.phase = .failed("Your Mac did not answer. Check that remote access is still on, then scan its code again.")
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
      pairing?.phase = .failed("The pairing was cancelled when Magic Slash left the screen. Scan your Mac's code again.")
    default:
      break
    }
  }

  // MARK: - Realtime

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
    if let token = try? await client.auth.session.accessToken {
      await client.realtimeV2.setAuth(token)
    }
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
    tasks = [
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
    do {
      try await channel.subscribeWithError()
    } catch {
      return
    }
    guard !stopped, attempt == subscriptionCount else { return }
    // Presence carries no payload: it is clear text (§2).
    await channel.track(state: [:])
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
    for (key, value) in leaves {
      presence[key]?.remove(value.ref)
      if presence[key]?.isEmpty == true { presence[key] = nil }
    }
    for (key, value) in joins {
      presence[key, default: []].insert(value.ref)
    }
  }

  private func startTicker() {
    ticker?.cancel()
    ticker = Task { [weak self] in
      while !Task.isCancelled {
        try? await Task.sleep(for: .seconds(5))
        guard !Task.isCancelled, let self else { return }
        self.now = Date()
      }
    }
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
    default: break
    }
  }

  private func receiveState(_ envelope: Envelope) {
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
    case "expired": "The code expired before your Mac received the request. Scan the fresh one."
    case "used": "This code was already used. Scan the fresh one your Mac shows."
    case "declined": "The pairing was declined on your Mac."
    default: "Your Mac refused the pairing."
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
