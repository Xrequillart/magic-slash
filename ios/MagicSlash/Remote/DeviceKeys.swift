import CryptoKit
import Foundation
@preconcurrency import LocalAuthentication
import Security

/// Why the phone's key cannot be used right now.
enum DeviceKeyError: Error, Equatable {
  /// Face ID was cancelled or did not match: trying again may work.
  case locked(String)
  /// The key is gone or no longer opens (Face ID enrolment changed, or the key was never
  /// made on this device): every pairing it held is dead and has to be made again.
  case invalidated
  /// This iPhone cannot hold the key at all (no Face ID set up, no Secure Enclave).
  case unavailable(String)
}

/// The phone's relay identity: `phoneId` and one P-256 key-agreement key (PROTOCOL.md §3).
///
/// The private key lives in the Secure Enclave, behind `[.privateKeyUsage, .biometryCurrentSet]`:
/// it never leaves the chip, each use needs Face ID, and enrolling a new face kills it. The
/// Keychain only holds the enclave's wrapped blob (`dataRepresentation`), which is useless on
/// any other device.
///
/// One `LAContext` is evaluated per foreground session, so a single Face ID prompt unlocks
/// every ECDH that session needs. `lock()` drops it when the app goes to the background.
///
/// The Simulator has no Secure Enclave: DEBUG Simulator builds use a software key kept in the
/// Keychain instead. That path is compiled out of every other build.
@MainActor
final class DeviceKeys {
  static let shared = DeviceKeys()

  private static let phoneIdAccount = "phone-id"
  private static let keyAccount = "device-key"

  /// Lower-case UUID, as the protocol requires.
  private(set) var phoneId: String
  private var context: LAContext?
  private var unlocked = false
  /// Bumped by `lock()`: a Face ID answer that lands after it does not unlock anything.
  private var lockGeneration = 0

  private init() {
    phoneId = Self.loadOrCreatePhoneId()
  }

  var hasKey: Bool { Keychain.read(Self.keyAccount) != nil }

  /// The public point, X9.63 (65 bytes). Readable without Face ID.
  func publicKey() throws(DeviceKeyError) -> Data {
    try privateKey(context: nil).publicKey.x963Representation
  }

  /// Asks for Face ID once, then keeps the authenticated context until `lock()`.
  /// `createIfMissing` is for pairing: anywhere else, a missing key means the pairings are
  /// dead.
  func unlock(reason: String, createIfMissing: Bool) async throws(DeviceKeyError) {
    if unlocked, hasKey { return }
    if !hasKey {
      guard createIfMissing else { throw .invalidated }
      try createKey()
    }

    #if DEBUG && targetEnvironment(simulator)
      unlocked = true
    #else
      let context = LAContext()
      context.localizedReason = reason
      var policyError: NSError?
      guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &policyError) else {
        throw Self.mapped(policyError)
      }
      let access = try Self.accessControl()
      let generation = lockGeneration
      do {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
          Self.evaluate(context, access: access, reason: reason) { ok, error in
            if ok {
              continuation.resume()
            } else {
              continuation.resume(throwing: error ?? LAError(.authenticationFailed))
            }
          }
        }
      } catch {
        throw Self.mapped(error)
      }
      guard generation == lockGeneration else {
        context.invalidate()
        throw .locked("Face ID was cancelled.")
      }
      self.context = context
      unlocked = true
    #endif
  }

  /// ECDH with a Mac's public point. Needs `unlock` first.
  func sharedSecret(with peer: Data) throws(DeviceKeyError) -> SharedSecret {
    guard unlocked else { throw .locked("Unlock with Face ID first.") }
    guard let peerKey = try? P256.KeyAgreement.PublicKey(x963Representation: peer) else {
      throw .unavailable("The Mac's key is not valid.")
    }
    let key = try privateKey(context: context)
    do {
      return try key.sharedSecretFromKeyAgreement(with: peerKey)
    } catch {
      // Face ID already passed for this context, so a refusal here is the enclave saying the
      // key itself is dead: a new face was enrolled since it was made.
      throw .invalidated
    }
  }

  /// Forgets the authenticated context. The next use asks for Face ID again.
  func lock() {
    lockGeneration += 1
    context?.invalidate()
    context = nil
    unlocked = false
  }

  /// Deletes the key and draws a new phone id: what follows an invalidated key, since no
  /// Mac can read this phone's old identity anymore.
  func reset() {
    lock()
    Keychain.delete(Self.keyAccount)
    Keychain.delete(Self.phoneIdAccount)
    phoneId = Self.loadOrCreatePhoneId()
  }

  // MARK: - Key storage

  #if DEBUG && targetEnvironment(simulator)
    // Simulator only: a software key in the Keychain stands in for the Secure Enclave.

    private func createKey() throws(DeviceKeyError) {
      let key = P256.KeyAgreement.PrivateKey()
      guard Keychain.write(key.rawRepresentation, Self.keyAccount) else {
        throw .unavailable("Could not store the key in the Keychain.")
      }
    }

    private func privateKey(context: LAContext?) throws(DeviceKeyError) -> P256.KeyAgreement.PrivateKey {
      guard let data = Keychain.read(Self.keyAccount),
            let key = try? P256.KeyAgreement.PrivateKey(rawRepresentation: data)
      else { throw .invalidated }
      return key
    }
  #else
    private func createKey() throws(DeviceKeyError) {
      guard SecureEnclave.isAvailable else {
        throw .unavailable("This iPhone has no Secure Enclave.")
      }
      let access = try Self.accessControl()
      let key: SecureEnclave.P256.KeyAgreement.PrivateKey
      do {
        key = try SecureEnclave.P256.KeyAgreement.PrivateKey(accessControl: access)
      } catch {
        throw .unavailable("Could not create a key in the Secure Enclave. Make sure Face ID is set up.")
      }
      guard Keychain.write(key.dataRepresentation, Self.keyAccount) else {
        throw .unavailable("Could not store the key in the Keychain.")
      }
    }

    private func privateKey(context: LAContext?) throws(DeviceKeyError) -> SecureEnclave.P256.KeyAgreement.PrivateKey {
      guard let data = Keychain.read(Self.keyAccount),
            let key = try? SecureEnclave.P256.KeyAgreement.PrivateKey(dataRepresentation: data, authenticationContext: context)
      else { throw .invalidated }
      return key
    }
  #endif

  private static func accessControl() throws(DeviceKeyError) -> SecAccessControl {
    var error: Unmanaged<CFError>?
    guard let access = SecAccessControlCreateWithFlags(
      nil,
      kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
      [.privateKeyUsage, .biometryCurrentSet],
      &error
    ) else {
      error?.release()
      throw .unavailable("Could not set up the key's access control.")
    }
    return access
  }

  /// Nonisolated with an explicitly `@Sendable` reply: LocalAuthentication calls back on a
  /// queue of its own, which must never meet a closure inferred as main-actor isolated.
  nonisolated private static func evaluate(
    _ context: LAContext,
    access: SecAccessControl,
    reason: String,
    reply: @escaping @Sendable (Bool, (any Error)?) -> Void
  ) {
    context.evaluateAccessControl(access, operation: .useKeyKeyExchange, localizedReason: reason, reply: reply)
  }

  private static func mapped(_ error: (any Error)?) -> DeviceKeyError {
    guard let error = error as? LAError else { return .locked("Face ID did not confirm.") }
    switch error.code {
    case .biometryNotEnrolled, .biometryNotAvailable, .passcodeNotSet:
      return .unavailable("Set up Face ID on this iPhone to follow your Mac.")
    case .biometryLockout:
      return .locked("Face ID is locked. Unlock your iPhone with its passcode, then try again.")
    case .userCancel, .appCancel, .systemCancel, .userFallback:
      return .locked("Face ID was cancelled.")
    default:
      return .locked("Face ID did not confirm.")
    }
  }

  private static func loadOrCreatePhoneId() -> String {
    if let data = Keychain.read(phoneIdAccount), let id = String(data: data, encoding: .utf8), UUID(uuidString: id) != nil {
      return id.lowercased()
    }
    let id = UUID().uuidString.lowercased()
    Keychain.write(Data(id.utf8), phoneIdAccount)
    return id
  }
}
