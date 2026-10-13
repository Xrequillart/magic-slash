import SwiftUI
import UIKit

/// Cera Pro, the desktop's face (design-system/desktop/Text.tsx), at the system's text
/// styles so Dynamic Type still scales it.
///
/// Four files, as on the desktop: Light, Medium, Bold and Black. There is no upright
/// Regular, so regular and medium both draw Medium, and semibold and bold both draw Bold,
/// which is the same folding the desktop does (400 = 500, 600 = 700).
///
/// Monospaced text (ids, codes, figures in columns) keeps the system face: Cera has no
/// monospaced cut.
enum Cera {
  static func name(for weight: Font.Weight) -> String {
    switch weight {
    case .ultraLight, .thin, .light: "CeraPro-Light"
    case .semibold, .bold: "CeraPro-Bold"
    case .heavy, .black: "CeraPro-Black"
    default: "CeraPro-Medium"
    }
  }

  /// The point size each text style has at the default Dynamic Type setting.
  static func size(for style: Font.TextStyle) -> CGFloat {
    switch style {
    case .largeTitle: 34
    case .title: 28
    case .title2: 22
    case .title3: 20
    case .headline, .body: 17
    case .callout: 16
    case .subheadline: 15
    case .footnote: 13
    case .caption: 12
    case .caption2: 11
    default: 17
    }
  }

  static func uiFont(_ style: UIFont.TextStyle, weight: Font.Weight, size: CGFloat) -> UIFont {
    let base = UIFont(name: name(for: weight), size: size) ?? .systemFont(ofSize: size)
    return UIFontMetrics(forTextStyle: style).scaledFont(for: base)
  }

  /// Navigation bar titles in Cera too: they are UIKit's, not a SwiftUI `Text`.
  @MainActor
  static func applyToNavigationBars() {
    let appearance = UINavigationBar.appearance()
    appearance.titleTextAttributes = [.font: uiFont(.headline, weight: .bold, size: 17)]
    appearance.largeTitleTextAttributes = [.font: uiFont(.largeTitle, weight: .bold, size: 34)]
  }
}

extension Font {
  /// Cera Pro at a text style. `.headline` is bold by default, like the system's.
  static func cera(_ style: TextStyle, _ weight: Weight? = nil) -> Font {
    let resolved = weight ?? (style == .headline ? .semibold : .regular)
    return .custom(Cera.name(for: resolved), size: Cera.size(for: style), relativeTo: style)
  }

  /// Cera Pro at a fixed size, for the few places that pin one (the splash, the label).
  static func cera(size: CGFloat, _ weight: Weight = .regular) -> Font {
    .custom(Cera.name(for: weight), fixedSize: size)
  }
}
