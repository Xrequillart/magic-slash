import CryptoKit
import Foundation
import UserNotifications

/// Opens the box a Mac sealed for this phone (PROTOCOL.md §14) and shows its text in place of
/// the generic alert APNs carried.
///
/// The server only relays `ms.macId` and `ms.box`; the text never reaches it. Anything that
/// does not check out (no key for that Mac, a box that does not open, a kind that does not
/// match, a stale or replayed `sentAt`) leaves the generic alert, which names nothing.
///
/// Shares `RelayCrypto.swift`, `Keychain.swift` and `PushKeys.swift` with the app. Everything
/// here is synchronous and quick (one Keychain read, at most two AES-GCM opens), so the
/// handler is called before `didReceive` returns, well inside the extension's 30 s.
final class NotificationService: UNNotificationServiceExtension {
  /// §14: a box older than this on the phone's clock is shown as the generic alert.
  static let maxAge: Int64 = 15 * 60 * 1000

  private static let kinds = ["waiting", "completed"]

  /// What the Mac sealed: rendered by the Mac, as its own notifications are.
  private struct Payload: Decodable {
    let kind: String
    let appAgentId: String
    let title: String
    let body: String
    /// The Mac's clock, epoch milliseconds.
    let sentAt: Int64
  }

  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var fallback: UNNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    let generic = Self.generic(request.content)
    fallback = generic
    deliver(Self.decrypted(request.content) ?? generic)
  }

  /// Should iOS cut the extension short, the generic alert goes out rather than nothing.
  override func serviceExtensionTimeWillExpire() {
    if let fallback { deliver(fallback) }
  }

  /// Hands the content over once: a second call would be ignored by iOS anyway.
  private func deliver(_ content: UNNotificationContent) {
    guard let handler = contentHandler else { return }
    contentHandler = nil
    handler(content)
  }

  /// The alert as APNs sent it, with the generic wording spelled out in case the app bundle's
  /// localization keys were not resolved.
  private static func generic(_ original: UNNotificationContent) -> UNNotificationContent {
    guard let content = original.mutableCopy() as? UNMutableNotificationContent else { return original }
    content.title = String(localized: "push.fallback.title")
    content.body = String(localized: "push.fallback.body")
    return content
  }

  /// The Mac's text, or nil when the box does not pass every check of §14.
  private static func decrypted(_ original: UNNotificationContent) -> UNNotificationContent? {
    guard let ms = original.userInfo["ms"] as? [String: Any],
          let macId = (ms["macId"] as? String)?.lowercased(),
          let box = (ms["box"] as? String).flatMap({ Data(base64Encoded: $0) }),
          let pushKey = PushKeys.load(macId: macId)
    else { return nil }

    // The kind is not in the clear: the one the box opens under is it, and the box must
    // agree, or the server presented one kind as the other.
    var opened: Payload?
    for kind in kinds {
      let aad = RelayCrypto.pushAAD(macId: macId, phoneId: pushKey.phoneId, pairingId: pushKey.pairingId, kind: kind)
      guard let plain = RelayCrypto.openPush(box, pushKey: pushKey.symmetricKey, aad: aad) else { continue }
      guard let payload = try? JSONDecoder().decode(Payload.self, from: plain), payload.kind == kind else { return nil }
      opened = payload
      break
    }
    guard let payload = opened else { return nil }

    // Shown once, never ordered: recent on the phone's clock, and newer than the last one
    // accepted from that Mac.
    let now = Int64((Date().timeIntervalSince1970 * 1000).rounded())
    guard now - payload.sentAt <= maxAge else { return nil }
    if let last = PushKeys.lastSentAt(macId: macId), payload.sentAt <= last { return nil }
    PushKeys.setLastSentAt(payload.sentAt, macId: macId)

    guard let content = original.mutableCopy() as? UNMutableNotificationContent else { return nil }
    content.title = payload.title
    content.body = payload.body
    var info = content.userInfo
    info["appAgentId"] = payload.appAgentId
    info["macId"] = macId
    content.userInfo = info
    // One thread per agent, so a Mac's agents do not stack into a single pile.
    content.threadIdentifier = "\(macId).\(payload.appAgentId)"
    return content
  }
}
