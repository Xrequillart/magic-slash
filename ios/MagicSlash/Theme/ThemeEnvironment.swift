import SwiftUI

private struct ThemeKey: EnvironmentKey {
  static let defaultValue: ThemeTokens = .tokens(for: .fallback)
}

extension EnvironmentValues {
  /// The desktop theme's tokens, injected once at the root by `DesktopSettingsStore`.
  var theme: ThemeTokens {
    get { self[ThemeKey.self] }
    set { self[ThemeKey.self] = newValue }
  }
}

extension View {
  /// Applies a theme to a subtree: the tokens for our own views, and the matching
  /// light or dark scheme for the system's (navigation bars, lists, keyboards).
  func themed(_ tokens: ThemeTokens) -> some View {
    environment(\.theme, tokens)
      .preferredColorScheme(tokens.isDark ? .dark : .light)
      .tint(tokens.accent)
  }
}

/// Wears the theme the iPhone's own setting picks (`ThemeChoice`). Following the iPhone
/// leaves the colour scheme to the system and reads it back, so the tokens can follow it.
struct ThemeRoot<Content: View>: View {
  @AppStorage(AppPreferences.themeKey) private var choiceRaw = "desktop"
  let desktop: ThemeID
  @ViewBuilder var content: Content

  var body: some View {
    let choice = ThemeChoice(raw: choiceRaw)
    if choice == .system {
      SystemThemed(desktop: desktop) { content }
    } else {
      content.themed(.tokens(for: choice.resolve(desktop: desktop, scheme: .light)))
    }
  }
}

private struct SystemThemed<Content: View>: View {
  @Environment(\.colorScheme) private var scheme
  let desktop: ThemeID
  @ViewBuilder var content: Content

  var body: some View {
    let tokens = ThemeTokens.tokens(for: ThemeChoice.system.resolve(desktop: desktop, scheme: scheme))
    content
      .environment(\.theme, tokens)
      .tint(tokens.accent)
      .preferredColorScheme(nil)
  }
}
