import UIKit
import UserNotifications

/// The UIKit side SwiftUI has no word for: the APNs token, and the notifications shown or
/// tapped while the app runs (PROTOCOL.md §14).
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  /// Read by `RootView`, which hands it to the agent list.
  let router = NotificationRouter()

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Set before the launch ends, so the tap that opened the app is delivered here too.
    UNUserNotificationCenter.current().delegate = self
    return true
  }

  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    PushRegistration.didReceive(token: deviceToken)
  }

  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: any Error) {
    // The Simulator without a push setup, or a build signed without the capability.
    RelayLog.shared.add("no push token: \(error.localizedDescription)")
  }

  // MARK: - UNUserNotificationCenterDelegate

  /// Never while the app is open: the user is watching their agents live, and the list shows
  /// which one waits or is done. Nor kept in the Notification Center, where it would only
  /// repeat what they already saw.
  nonisolated func userNotificationCenter(
    _ center: UNUserNotificationCenter, willPresent notification: UNNotification
  ) async -> UNNotificationPresentationOptions {
    []
  }

  /// A tap opens the agent the extension named. The generic fallback names none: the app just
  /// opens on its list.
  nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
    let info = response.notification.request.content.userInfo
    guard let appAgentId = info["appAgentId"] as? String,
          let macId = info["macId"] as? String
    else { return }
    await MainActor.run { router.open(appAgentId: appAgentId, macId: macId) }
  }
}

/// Asking for permission and for a token.
enum PushAuthorization {
  /// Asks once the user has something to be notified about: signed in with a paired Mac.
  /// iOS shows its prompt only the first time; after that this just reads the answer. Granted,
  /// the app registers for remote notifications, which hands over a token on every launch.
  @MainActor
  static func requestAndRegister() async {
    let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    let status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    guard granted || status == .authorized || status == .provisional || status == .ephemeral else { return }
    UIApplication.shared.registerForRemoteNotifications()
  }
}
