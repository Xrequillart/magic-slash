import SwiftUI

/// The iPhone's own settings, kept on the device: the desktop's live in `user_settings` and
/// are changed on the desktop.
enum AppPreferences {
  /// The key `@AppStorage` binds the settings screen's toggle to.
  static let hapticsKey = "app.haptics"

  /// On unless turned off.
  static var hapticsEnabled: Bool {
    UserDefaults.standard.object(forKey: hapticsKey) as? Bool ?? true
  }

  /// The key `@AppStorage` binds the theme picker to. Holds a `ThemeChoice`'s raw value.
  static let themeKey = "app.theme"

  /// The language the app is shown in, in that language ("Français", "English"). iOS picks
  /// it, and the app's page in the Settings app changes it.
  static var languageName: String {
    let code = Bundle.main.preferredLocalizations.first ?? "en"
    let locale = Locale(identifier: code)
    return locale.localizedString(forLanguageCode: code)?.capitalized(with: locale) ?? code
  }

  /// "0.4.1 (19)": the version and the build, as TestFlight shows them.
  static var version: String {
    let info = Bundle.main.infoDictionary
    let version = info?["CFBundleShortVersionString"] as? String ?? "?"
    let build = info?["CFBundleVersion"] as? String ?? "?"
    return "\(version) (\(build))"
  }
}

/// Which theme the iPhone wears: the desktop's (the default), one that follows the iPhone's
/// light or dark appearance, or one picked here.
enum ThemeChoice: Hashable {
  case desktop
  case system
  case fixed(ThemeID)

  init(raw: String) {
    switch raw {
    case "desktop": self = .desktop
    case "system": self = .system
    default: self = ThemeID(rawValue: raw).map(ThemeChoice.fixed) ?? .desktop
    }
  }

  var raw: String {
    switch self {
    case .desktop: "desktop"
    case .system: "system"
    case .fixed(let id): id.rawValue
    }
  }

  /// The theme to draw. Following the iPhone keeps the desktop's theme while it has the
  /// right appearance, and falls back to plain Light or Dark when it does not.
  func resolve(desktop: ThemeID, scheme: ColorScheme) -> ThemeID {
    switch self {
    case .desktop: return desktop
    case .fixed(let id): return id
    case .system:
      let wantsDark = scheme == .dark
      return ThemeTokens.tokens(for: desktop).isDark == wantsDark ? desktop : (wantsDark ? .dark : .light)
    }
  }
}

extension ThemeID {
  /// The name the desktop's theme picker shows.
  var displayName: LocalizedStringResource {
    switch self {
    case .dark: "Dark"
    case .midnight: "Midnight"
    case .espresso: "Espresso"
    case .highContrast: "High contrast"
    case .light: "Light"
    case .mist: "Mist"
    case .sepia: "Sepia"
    case .daylight: "Daylight"
    }
  }
}
