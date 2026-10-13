import Foundation

/// The iPhone's own settings, kept on the device: the desktop's live in `user_settings` and
/// are changed on the desktop.
enum AppPreferences {
  /// The key `@AppStorage` binds the settings screen's toggle to.
  static let hapticsKey = "app.haptics"

  /// On unless turned off.
  static var hapticsEnabled: Bool {
    UserDefaults.standard.object(forKey: hapticsKey) as? Bool ?? true
  }

  /// "0.4.1 (19)": the version and the build, as TestFlight shows them.
  static var version: String {
    let info = Bundle.main.infoDictionary
    let version = info?["CFBundleShortVersionString"] as? String ?? "?"
    let build = info?["CFBundleVersion"] as? String ?? "?"
    return "\(version) (\(build))"
  }
}
