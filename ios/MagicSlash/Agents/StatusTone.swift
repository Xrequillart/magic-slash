import SwiftUI

// Mirrors STATUS_CATALOGUE in
// desktop/src/renderer/components/agent-info-sidebar/StatusPill.tsx; keep in sync.
// Labels come from the `statusPill.*` keys of desktop/src/i18n/en.ts.
//
// Neutral is reserved for an empty status and for one this build does not know: no
// known status may wear it.

enum StatusTone: Sendable {
  case neutral, orange, cyan, yellow, green, accent, blue, red, teal, purple

  func color(in theme: ThemeTokens) -> Color {
    switch self {
    case .neutral: theme.textSecondary
    case .orange: theme.orange
    case .cyan: theme.cyan
    case .yellow: theme.yellow
    case .green: theme.green
    case .accent: theme.accent
    case .blue: theme.blue
    case .red: theme.red
    case .teal: theme.teal
    case .purple: theme.purple
    }
  }
}

/// `soft` is the lighter fill that holds apart two statuses sharing a hue.
enum StatusStrength: Sendable {
  case regular, soft
}

struct StatusStyle: Sendable {
  let label: String
  let tone: StatusTone
  let strength: StatusStrength

  private static let catalogue: [String: StatusStyle] = [
    "": .init(label: "no status", tone: .neutral, strength: .regular),
    "planning": .init(label: "planning", tone: .orange, strength: .soft),
    "planned": .init(label: "planned", tone: .cyan, strength: .soft),
    "in progress": .init(label: "in progress", tone: .yellow, strength: .regular),
    "committed": .init(label: "committed", tone: .cyan, strength: .regular),
    "ready for PR": .init(label: "ready for PR", tone: .orange, strength: .regular),
    "PR created": .init(label: "PR created", tone: .green, strength: .regular),
    "CI green": .init(label: "CI green", tone: .accent, strength: .regular),
    "in review": .init(label: "in review", tone: .blue, strength: .regular),
    "changes requested": .init(label: "changes requested", tone: .red, strength: .regular),
    "Review addressed": .init(label: "review addressed", tone: .teal, strength: .regular),
    "PR merged": .init(label: "PR merged", tone: .purple, strength: .regular),
  ]

  /// An unknown status keeps its own text and wears neutral.
  static func style(for status: String) -> StatusStyle {
    catalogue[status] ?? StatusStyle(label: status, tone: .neutral, strength: .regular)
  }
}
