import Foundation
import Security

/// Generic-password items for the relay: the phone's id and keys, the paired Macs, and the
/// push keys the notification extension reads.
///
/// An item is `WhenUnlockedThisDeviceOnly` unless its caller says otherwise: it never leaves
/// this iPhone, not even in an encrypted backup, and is unreadable while the device is locked.
/// Without an access group an item lands in the app's default group, where every pairing item
/// has always been; only the push keys pass `sharedGroup`, so the extension can read them.
///
/// Compiled into the app and into the notification extension: Foundation and Security only.
enum Keychain {
  private static let service = "io.poppins.magicslash.relay"

  /// The access group the app and the notification extension share, as both entitlements
  /// files name it: `$(AppIdentifierPrefix)io.poppins.magicslash.shared`. The team prefix is
  /// only known once the build is signed, so it is read back from the `KeychainSharedGroup`
  /// Info.plist key, which the build expands from the same `$(AppIdentifierPrefix)`.
  ///
  /// Nil when the build carries no team (an unsigned Simulator or CI build): the prefix is then
  /// empty, and a group the entitlements do not grant would fail every write. The push keys
  /// then fall back to the default group, readable by the app alone, which is all such a build
  /// can use anyway.
  static let sharedGroup: String? = {
    let suffix = "io.poppins.magicslash.shared"
    guard let value = Bundle.main.object(forInfoDictionaryKey: "KeychainSharedGroup") as? String,
          value.hasSuffix(suffix), value != suffix, !value.hasPrefix("$(")
    else { return nil }
    return value
  }()

  /// The query that names one item: its class, this service, the account and, when given, the
  /// access group.
  private static func item(_ account: String, accessGroup: String?) -> [CFString: Any] {
    var query: [CFString: Any] = [kSecClass: kSecClassGenericPassword, kSecAttrService: service, kSecAttrAccount: account]
    if let accessGroup { query[kSecAttrAccessGroup] = accessGroup }
    return query
  }

  static func read(_ account: String, accessGroup: String? = nil) -> Data? {
    let query = item(account, accessGroup: accessGroup)
      .merging([kSecReturnData: true, kSecMatchLimit: kSecMatchLimitOne]) { _, new in new }
    var result: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess else { return nil }
    return result as? Data
  }

  @discardableResult
  static func write(
    _ data: Data, _ account: String, accessGroup: String? = nil,
    accessible: CFString = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
  ) -> Bool {
    let match = item(account, accessGroup: accessGroup)
    let update: [CFString: Any] = [
      kSecValueData: data,
      kSecAttrAccessible: accessible,
    ]
    let status = SecItemUpdate(match as CFDictionary, update as CFDictionary)
    if status == errSecSuccess { return true }
    guard status == errSecItemNotFound else { return false }
    let add = match.merging(update) { _, new in new }
    return SecItemAdd(add as CFDictionary, nil) == errSecSuccess
  }

  static func delete(_ account: String, accessGroup: String? = nil) {
    SecItemDelete(item(account, accessGroup: accessGroup) as CFDictionary)
  }
}
