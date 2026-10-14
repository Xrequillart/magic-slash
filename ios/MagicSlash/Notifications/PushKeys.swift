import CryptoKit
import Foundation
import Security

/// The push key of one pairing (PROTOCOL.md §14), with the ids the notification extension
/// rebuilds the box's AAD from.
struct PushKey: Codable, Equatable, Sendable {
  /// 32 random bytes, standard base64 in the stored JSON.
  let key: Data
  /// Lower-case uuids, as the AAD wants them.
  let phoneId: String
  let pairingId: String

  var symmetricKey: SymmetricKey { SymmetricKey(data: key) }
}

/// The push keys, one per paired Mac, in the Keychain group the app and the notification
/// extension share (`Keychain.sharedGroup`). Compiled into both targets.
///
/// `AfterFirstUnlockThisDeviceOnly` and no biometric access control: the extension runs with
/// the phone locked in a pocket, and cannot ask for Face ID. That is the whole reason a push key
/// exists apart from the pair key: it only ever opens notifications (§14).
///
/// Beside each key, the last `sentAt` the extension accepted from that Mac, its anti-replay
/// mark, in the same group.
enum PushKeys {
  private static func keyAccount(_ macId: String) -> String { "push-key.\(macId.lowercased())" }
  private static func seenAccount(_ macId: String) -> String { "push-seen.\(macId.lowercased())" }
  private static var accessible: CFString { kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly }

  static func load(macId: String) -> PushKey? {
    guard let data = Keychain.read(keyAccount(macId), accessGroup: Keychain.sharedGroup) else { return nil }
    return try? JSONDecoder().decode(PushKey.self, from: data)
  }

  /// The key for this pairing: the stored one when it was drawn for the same phone and
  /// pairing, a fresh one otherwise (a new pairing with the same Mac draws a new key, §14).
  /// Nil only when the Keychain refuses the write.
  static func ensure(macId: String, phoneId: String, pairingId: String) -> PushKey? {
    let phoneId = phoneId.lowercased()
    let pairingId = pairingId.lowercased()
    if let stored = load(macId: macId), stored.phoneId == phoneId, stored.pairingId == pairingId, stored.key.count == 32 {
      return stored
    }
    let fresh = PushKey(key: SymmetricKey(size: .bits256).withUnsafeBytes { Data($0) }, phoneId: phoneId, pairingId: pairingId)
    guard let data = try? JSONEncoder().encode(fresh),
          Keychain.write(data, keyAccount(macId), accessGroup: Keychain.sharedGroup, accessible: accessible)
    else { return nil }
    // A new key starts a new run of notifications: the old mark belonged to the old pairing.
    Keychain.delete(seenAccount(macId), accessGroup: Keychain.sharedGroup)
    return fresh
  }

  /// On forget, revocation, invalidation and sign-out: the extension can no longer open
  /// anything from that Mac.
  static func delete(macId: String) {
    Keychain.delete(keyAccount(macId), accessGroup: Keychain.sharedGroup)
    Keychain.delete(seenAccount(macId), accessGroup: Keychain.sharedGroup)
  }

  /// The last `sentAt` (Mac clock, epoch ms) accepted from that Mac, nil before the first.
  static func lastSentAt(macId: String) -> Int64? {
    guard let data = Keychain.read(seenAccount(macId), accessGroup: Keychain.sharedGroup),
          let text = String(data: data, encoding: .utf8)
    else { return nil }
    return Int64(text)
  }

  static func setLastSentAt(_ sentAt: Int64, macId: String) {
    Keychain.write(Data(String(sentAt).utf8), seenAccount(macId), accessGroup: Keychain.sharedGroup, accessible: accessible)
  }
}
