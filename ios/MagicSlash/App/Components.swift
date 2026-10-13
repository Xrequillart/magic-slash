import SwiftUI

/// A small tinted capsule: status, type, PR state, review state.
struct Pill: View {
  @Environment(\.theme) private var theme

  let text: String
  let color: Color
  var strength: StatusStrength = .regular

  var body: some View {
    Text(text)
      .font(.cera(.caption, .semibold))
      .lineLimit(1)
      .foregroundStyle(color)
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .background(
        // The desktop Status tones: 10% soft, 20% strong.
        Capsule().fill(color.opacity(strength == .soft ? 0.1 : 0.2))
      )
  }
}

struct StatusPill: View {
  @Environment(\.theme) private var theme
  let status: String

  var body: some View {
    let style = StatusStyle.style(for: status)
    Pill(text: style.label, color: style.tone.color(in: theme), strength: style.strength)
  }
}

struct TypeBadge: View {
  @Environment(\.theme) private var theme
  let type: AgentType

  var body: some View {
    Pill(text: type.label, color: type == .planner ? theme.purple : theme.iconMuted, strength: .soft)
  }
}

/// A titled block of the detail screen.
struct SectionCard<Content: View>: View {
  @Environment(\.theme) private var theme

  let title: String
  @ViewBuilder let content: Content

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(title.uppercased())
        .font(.cera(.caption, .semibold))
        .tracking(0.6)
        .foregroundStyle(theme.textSecondary)
      VStack(alignment: .leading, spacing: 10) {
        content
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(14)
      .background(RoundedRectangle(cornerRadius: 12).fill(theme.surface))
      .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(theme.lineSubtle))
    }
  }
}

/// The explicit "nothing here" line every section falls back to.
struct EmptyLine: View {
  @Environment(\.theme) private var theme
  let text: String

  var body: some View {
    Text(text)
      .font(.cera(.subheadline))
      .foregroundStyle(theme.textSecondary)
      .italic()
  }
}

struct LabeledLine: View {
  @Environment(\.theme) private var theme
  let label: String
  let value: String?
  var monospaced = false

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 12) {
      Text(label)
        .font(.cera(.subheadline))
        .foregroundStyle(theme.textSecondary)
        .frame(width: 96, alignment: .leading)
      if let value {
        Text(value)
          .font(monospaced ? .subheadline.monospaced() : .subheadline)
          .foregroundStyle(theme.ink)
          .textSelection(.enabled)
          .frame(maxWidth: .infinity, alignment: .leading)
      } else {
        EmptyLine(text: "None")
          .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
  }
}

/// A full-screen message, for the states before any data.
struct MessageScreen: View {
  @Environment(\.theme) private var theme

  let systemImage: String
  let title: String
  let message: String

  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: systemImage)
        .font(.system(size: 36))
        .foregroundStyle(theme.iconMuted)
      Text(title)
        .font(.cera(.headline))
        .foregroundStyle(theme.ink)
      Text(message)
        .font(.cera(.subheadline))
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)
    }
    .padding(32)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(theme.bg.ignoresSafeArea())
  }
}

/// The full-screen spinner shown before any data.
struct LoadingScreen: View {
  @Environment(\.theme) private var theme

  var body: some View {
    ProgressView()
      .tint(theme.textSecondary)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(theme.bg.ignoresSafeArea())
  }
}

/// Text field styling shared by the sign-in and code screens.
struct ThemedFieldStyle: ViewModifier {
  @Environment(\.theme) private var theme

  func body(content: Content) -> some View {
    content
      .padding(.horizontal, 14)
      .padding(.vertical, 12)
      .foregroundStyle(theme.ink)
      .background(RoundedRectangle(cornerRadius: 10).fill(theme.surfaceSunken))
      .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(theme.lineField))
  }
}

struct PrimaryButtonStyle: ButtonStyle {
  @Environment(\.theme) private var theme
  @Environment(\.isEnabled) private var isEnabled

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.cera(.body, .semibold))
      .foregroundStyle(theme.onBrand)
      .frame(maxWidth: .infinity)
      .padding(.vertical, 13)
      .background(
        RoundedRectangle(cornerRadius: 10)
          .fill(configuration.isPressed ? theme.accentHover : theme.accent)
      )
      .opacity(isEnabled ? 1 : 0.5)
  }
}
