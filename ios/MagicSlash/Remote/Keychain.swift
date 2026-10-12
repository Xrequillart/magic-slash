import Foundation
import Security

/// Generic-password items for the relay: the phone's id and key, and the paired Macs.
///
/// Every item is `WhenUnlockedThisDeviceOnly`: it never leaves this iPhone, not even in an
/// encrypted backup, and is unreadable while the device is locked.
enum Keychain {
  private static let service = "io.poppins.magicslash.relay"

  /// The query that names one item: its class, this service, and the account.
  private static func item(_ account: String) -> [CFString: Any] {
    [kSecClass: kSecClassGenericPassword, kSecAttrService: service, kSecAttrAccount: account]
  }

  static func read(_ account: String) -> Data? {
    let query = item(account).merging([kSecReturnData: true, kSecMatchLimit: kSecMatchLimitOne]) { _, new in new }
    var result: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess else { return nil }
    return result as? Data
  }

  @discardableResult
  static func write(_ data: Data, _ account: String) -> Bool {
    let match = item(account)
    let update: [CFString: Any] = [
      kSecValueData: data,
      kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    let status = SecItemUpdate(match as CFDictionary, update as CFDictionary)
    if status == errSecSuccess { return true }
    guard status == errSecItemNotFound else { return false }
    let add = match.merging(update) { _, new in new }
    return SecItemAdd(add as CFDictionary, nil) == errSecSuccess
  }

  static func delete(_ account: String) {
    SecItemDelete(item(account) as CFDictionary)
  }
}
