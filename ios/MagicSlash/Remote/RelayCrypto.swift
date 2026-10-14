import CryptoKit
import Foundation

/// The relay's cryptography, byte for byte what `desktop/src/main/remote/crypto.ts` does in
/// Node. `desktop/src/main/remote/PROTOCOL.md` is the contract and `relay-vectors.json` next
/// to it pins it: `ios/relay/main.swift` replays that fixture against this file.
///
/// Pure functions over CryptoKit types, with no Secure Enclave and no Keychain, so the check
/// script can compile this file alone on macOS. Where the private key comes from is
/// `DeviceKeys`' business; this file only ever sees a `SharedSecret`.
enum RelayCrypto {
  static let hkdfInfo = Data("magic-slash relay v1".utf8)

  /// The AES-256 key a Mac and one phone share: HKDF-SHA256 over the ECDH secret, salt
  /// `macId‖phoneId` (lower-case UUID strings, UTF-8).
  static func deriveKey(shared: SharedSecret, macId: String, phoneId: String) -> SymmetricKey {
    let salt = Data((macId.lowercased() + phoneId.lowercased()).utf8)
    return shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: salt, sharedInfo: hkdfInfo, outputByteCount: 32)
  }

  /// `v1|type|from|to|epoch|seq` in UTF-8: what the GCM tag authenticates beside the box.
  static func aad(type: String, from: String, to: String, epoch: String, seq: Int) -> Data {
    Data("v1|\(type)|\(from)|\(to)|\(epoch)|\(seq)".utf8)
  }

  /// AES-256-GCM as `combined`: nonce(12) ‖ ciphertext ‖ tag(16).
  static func seal(_ plaintext: Data, key: SymmetricKey, aad: Data, nonce: AES.GCM.Nonce = AES.GCM.Nonce()) throws -> Data {
    let box = try AES.GCM.seal(plaintext, using: key, nonce: nonce, authenticating: aad)
    guard let combined = box.combined else { throw CryptoKitError.incorrectParameterSize }
    return combined
  }

  /// Nil on any failure: a wrong key, a tampered box or header, a truncated payload.
  static func open(_ combined: Data, key: SymmetricKey, aad: Data) -> Data? {
    guard let box = try? AES.GCM.SealedBox(combined: combined) else { return nil }
    return try? AES.GCM.open(box, using: key, authenticating: aad)
  }

  /// `push-v1|macId|phoneId|pairingId|kind` in UTF-8, ids lower-cased: binds a push box to
  /// one pairing and one kind (`waiting` or `completed`), so the server that relays it can
  /// neither hand it to another phone nor change what it announces.
  static func pushAAD(macId: String, phoneId: String, pairingId: String, kind: String) -> Data {
    Data("push-v1|\(macId.lowercased())|\(phoneId.lowercased())|\(pairingId.lowercased())|\(kind)".utf8)
  }

  /// A push box: `seal`'s layout under the pairing's 32-byte push key, which the phone draws
  /// and the notification extension reads without biometry. The app never seals one; this is
  /// here so the check script proves the layout matches Node's.
  static func sealPush(_ plaintext: Data, pushKey: SymmetricKey, aad: Data, nonce: AES.GCM.Nonce = AES.GCM.Nonce()) throws -> Data {
    guard pushKey.bitCount == 256 else { throw CryptoKitError.incorrectKeySize }
    return try seal(plaintext, key: pushKey, aad: aad, nonce: nonce)
  }

  /// Nil on any failure, like `open`; a key that is not 32 bytes is one.
  static func openPush(_ combined: Data, pushKey: SymmetricKey, aad: Data) -> Data? {
    guard pushKey.bitCount == 256 else { return nil }
    return open(combined, key: pushKey, aad: aad)
  }

  /// Whether `signature` (CryptoKit's `rawRepresentation`, `r‖s`, 64 bytes) is an ECDSA
  /// P-256 / SHA-256 signature of `message` by `publicKey` (X9.63). The phone never needs to
  /// verify a command; this is here so the check script proves Node accepts what CryptoKit
  /// signs, and the reverse.
  static func verify(signature: Data, message: Data, publicKey: Data) -> Bool {
    guard let key = try? P256.Signing.PublicKey(x963Representation: publicKey),
          let sig = try? P256.Signing.ECDSASignature(rawRepresentation: signature) else { return false }
    return key.isValidSignature(sig, for: message)
  }

  /// The 4-digit code both screens show: SHA-256(token ‖ macPub ‖ phonePub), first 4 bytes
  /// as a big-endian UInt32, mod 10000, zero-padded.
  static func pairingCode(token: Data, macPublic: Data, phonePublic: Data) -> String {
    var hasher = SHA256()
    hasher.update(data: token)
    hasher.update(data: macPublic)
    hasher.update(data: phonePublic)
    let bytes = Array(hasher.finalize())
    let value = UInt32(bytes[0]) << 24 | UInt32(bytes[1]) << 16 | UInt32(bytes[2]) << 8 | UInt32(bytes[3])
    return String(format: "%04u", value % 10000)
  }
}

extension Data {
  /// Base64url without padding, the encoding of the QR token.
  init?(base64URLEncoded string: String) {
    var s = string.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    while s.count % 4 != 0 { s += "=" }
    self.init(base64Encoded: s)
  }
}
