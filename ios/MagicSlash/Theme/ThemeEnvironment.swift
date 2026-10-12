import SwiftUI

private struct ThemeKey: EnvironmentKey {
  static let defaultValue: ThemeTokens = .tokens(for: .fallback)
}

extension EnvironmentValues {
  /// The desktop theme's tokens, injected once at the root by `ThemeStore`.
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
