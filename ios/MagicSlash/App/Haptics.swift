import UIKit

/// The tap every button gives back under the finger: a light knock for an ordinary press, a
/// firmer one for what removes something (Forget, Sign out). Called from the action itself,
/// so it reaches the buttons a `ButtonStyle` cannot: the bar's, a dialog's. Silent when the
/// user turned it off in the settings.
@MainActor
enum Haptics {
  static func tap() {
    guard AppPreferences.hapticsEnabled else { return }
    UIImpactFeedbackGenerator(style: .light).impactOccurred()
  }

  static func destructive() {
    guard AppPreferences.hapticsEnabled else { return }
    UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
  }
}
