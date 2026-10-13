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

/// The phone's relay identity: `phoneId`, one P-256 key-agreement key, and one P-256 signing
/// key for commands (PROTOCOL.md §3, §10).
///
/// The private key lives in the Secure Enclave, behind `[.privateKeyUsage, .biometryCurrentSet]`:
/// it never leaves the chip, each use needs Face ID, and enrolling a new face kills it. The
/// Keychain only holds the enclave's wrapped blob (`dataRepresentation`), which is useless on
/// any other device.
///
/// One `LAContext` is evaluated per foreground session, so a single Face ID prompt unlocks
/// every ECDH that session needs. `lock()` drops it when the app goes to the background.
/// The signing key never shares it: each `sign` evaluates a context of its own, so every
/// command the phone sends asks for Face ID.
///
/// The Simulator has no Secure Enclave: DEBUG Simulator builds use a software key kept in the
/// Keychain instead. That path is compiled out of every other build.
@MainActor
final class DeviceKeys {
  static let shared = DeviceKeys()

  private static let phoneIdAccount = "phone-id"
  private static let keyAccount = "device-key"
  private static let signingKeyAccount = "signing-key"

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
  /// False on a phone paired before commands existed, until its next pairing.
  var hasSigningKey: Bool { Keychain.read(Self.signingKeyAccount) != nil }

  /// The public point, X9.63 (65 bytes). Readable without Face ID.
  func publicKey() throws(DeviceKeyError) -> Data {
    try privateKey(context: nil).publicKey.x963Representation
  }

  /// The signing key's public point, X9.63 (65 bytes), as `pair-request` carries it.
  /// Readable without Face ID.
  func signPub() throws(DeviceKeyError) -> Data {
    try signingKey(context: nil).publicKey.x963Representation
  }

  /// For pairing: makes the signing key if this phone has none yet. Never replaces one, since
  /// every Mac paired before holds its public half (§3).
  func ensureSigningKey() throws(DeviceKeyError) {
    if !hasSigningKey { try createSigningKey() }
  }

  /// Signs `data` (ECDSA P-256 / SHA-256) and returns `rawRepresentation`, `r‖s`, 64 bytes.
  /// Evaluates a fresh `LAContext` every time: one Face ID prompt per command, whatever the
  /// session already unlocked.
  func sign(_ data: Data, reason: String) async throws(DeviceKeyError) -> Data {
    guard hasSigningKey else { throw .invalidated }
    #if DEBUG && targetEnvironment(simulator)
      let key = try signingKey(context: nil)
      do {
        return try key.signature(for: data).rawRepresentation
      } catch {
        throw .invalidated
      }
    #else
      let context = try await authenticate(operation: .useKeySign, reason: reason)
      // Used once, then dropped: the next command asks again.
      defer { context.invalidate() }
      let key = try signingKey(context: context)
      do {
        return try key.signature(for: data).rawRepresentation
      } catch {
        // Face ID passed for this very context: a refusal is the enclave saying the key died
        // with a new enrolment, as for `sharedSecret`.
        throw .invalidated
      }
    #endif
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
      context = try await authenticate(operation: .useKeyKeyExchange, reason: reason)
      unlocked = true
    #endif
  }

  #if !(DEBUG && targetEnvironment(simulator))
    /// One Face ID prompt for `operation`, returning the evaluated context. A `lock()` that
    /// lands while the prompt is up wins: the context is dropped and nothing unlocks.
    private func authenticate(operation: LAAccessControlOperation, reason: String) async throws(DeviceKeyError) -> LAContext {
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
          Self.evaluate(context, access: access, operation: operation, reason: reason) { ok, error in
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
      return context
    }
  #endif

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

  /// Deletes both keys and draws a new phone id: what follows an invalidated key, since no
  /// Mac can read this phone's old identity anymore.
  func reset() {
    lock()
    Keychain.delete(Self.keyAccount)
    Keychain.delete(Self.signingKeyAccount)
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

    private func createSigningKey() throws(DeviceKeyError) {
      let key = P256.Signing.PrivateKey()
      guard Keychain.write(key.rawRepresentation, Self.signingKeyAccount) else {
        throw .unavailable("Could not store the key in the Keychain.")
      }
    }

    private func signingKey(context: LAContext?) throws(DeviceKeyError) -> P256.Signing.PrivateKey {
      guard let data = Keychain.read(Self.signingKeyAccount),
            let key = try? P256.Signing.PrivateKey(rawRepresentation: data)
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

    private func createSigningKey() throws(DeviceKeyError) {
      guard SecureEnclave.isAvailable else {
        throw .unavailable("This iPhone has no Secure Enclave.")
      }
      let access = try Self.accessControl()
      let key: SecureEnclave.P256.Signing.PrivateKey
      do {
        key = try SecureEnclave.P256.Signing.PrivateKey(accessControl: access)
      } catch {
        throw .unavailable("Could not create a key in the Secure Enclave. Make sure Face ID is set up.")
      }
      guard Keychain.write(key.dataRepresentation, Self.signingKeyAccount) else {
        throw .unavailable("Could not store the key in the Keychain.")
      }
    }

    private func signingKey(context: LAContext?) throws(DeviceKeyError) -> SecureEnclave.P256.Signing.PrivateKey {
      guard let data = Keychain.read(Self.signingKeyAccount),
            let key = try? SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: data, authenticationContext: context)
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
    operation: LAAccessControlOperation,
    reason: String,
    reply: @escaping @Sendable (Bool, (any Error)?) -> Void
  ) {
    context.evaluateAccessControl(access, operation: operation, localizedReason: reason, reply: reply)
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
