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

  let title: LocalizedStringKey
  @ViewBuilder let content: Content

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(title)
        .textCase(.uppercase)
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

/// A short note that a list row cannot say on its own, in a small card under its section.
struct NoteCard: View {
  @Environment(\.theme) private var theme
  let text: LocalizedStringKey

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 8) {
      Image(systemName: "info.circle")
        .font(.system(size: 12))
        .foregroundStyle(theme.iconMuted)
      Text(text)
        .font(.cera(.caption))
        .foregroundStyle(theme.textSecondary)
        .fixedSize(horizontal: false, vertical: true)
    }
    .padding(12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 10).fill(theme.surfaceSunken))
    .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(theme.lineSubtle))
    .textCase(nil)
  }
}

/// The explicit "nothing here" line every section falls back to.
struct EmptyLine: View {
  @Environment(\.theme) private var theme
  let text: LocalizedStringKey

  var body: some View {
    Text(text)
      .font(.cera(.subheadline))
      .foregroundStyle(theme.textSecondary)
      .italic()
  }
}

struct LabeledLine: View {
  @Environment(\.theme) private var theme
  let label: LocalizedStringKey
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
  let title: LocalizedStringKey
  let message: LocalizedStringKey

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

/// The quiet twin of `PrimaryButtonStyle`, for Deny and Stop.
struct SecondaryButtonStyle: ButtonStyle {
  @Environment(\.theme) private var theme
  @Environment(\.isEnabled) private var isEnabled

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.cera(.body, .semibold))
      .foregroundStyle(theme.ink)
      .frame(maxWidth: .infinity)
      .padding(.vertical, 13)
      .background(
        RoundedRectangle(cornerRadius: 10)
          .fill(configuration.isPressed ? theme.surfaceStrong : theme.surface)
      )
      .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(theme.lineStrong))
      .opacity(isEnabled ? 1 : 0.5)
  }
}

/// Where the last command sent from the phone stands: on its way, taken, or refused and why.
struct StatusLine: View {
  enum Phase: Equatable {
    case progress(String)
    case success(String)
    case failure(String)
  }

  @Environment(\.theme) private var theme
  let phase: Phase

  var body: some View {
    switch phase {
    case .progress(let text):
      HStack(spacing: 8) {
        ProgressView().controlSize(.small).tint(theme.textSecondary)
        Text(text)
          .font(.cera(.footnote))
          .foregroundStyle(theme.textSecondary)
      }
    case .success(let text):
      Label(text, systemImage: "checkmark.circle.fill")
        .font(.cera(.footnote, .semibold))
        .foregroundStyle(theme.green)
    case .failure(let message):
      HStack(alignment: .firstTextBaseline, spacing: 8) {
        Image(systemName: "exclamationmark.triangle.fill")
          .font(.cera(.footnote))
          .foregroundStyle(theme.yellow)
        Text(message)
          .font(.cera(.footnote))
          .foregroundStyle(theme.ink)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
  }
}
