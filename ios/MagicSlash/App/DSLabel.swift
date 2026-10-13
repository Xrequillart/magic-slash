import SwiftUI

/// The design system's `Label` (design-system/desktop/Label.tsx): a mark and a word on a
/// tinted plate. It NAMES a thing (a ticket, a repository), which is what sets it apart
/// from a status pill. Named `DSLabel` because SwiftUI already has a `Label`.
///
/// Only what the iPhone uses is ported: the `sm` size and the tones a ticket can take.
/// Keep the geometry and the grounds in step with the desktop.
struct DSLabel: View {
  @Environment(\.theme) private var theme

  /// `LabelTone` on the desktop, minus the ones the iPhone does not draw yet.
  enum Tone {
    case neutral
    case github
    case jira
  }

  let text: String
  var tone: Tone = .neutral

  var body: some View {
    // `sm`: 24 pt tall, 6 pt gap, 8 pt sides, 8 pt radius, a 14 pt mark and 12 pt text.
    HStack(spacing: 6) {
      mark
      Text(text)
        .font(.cera(size: 12, .medium))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
    }
    .padding(.horizontal, 8)
    .frame(height: 24)
    .background(ground, in: RoundedRectangle(cornerRadius: 8))
    .fixedSize()
    .accessibilityElement(children: .combine)
  }

  @ViewBuilder
  private var mark: some View {
    switch tone {
    case .github:
      // GitHub's mark is monochrome and takes the label's ink.
      Image(.github)
        .resizable()
        .scaledToFit()
        .frame(width: 14, height: 14)
        .foregroundStyle(theme.ink)
        .accessibilityLabel("GitHub")
    case .jira:
      // Jira's keeps its own blues.
      Image(.jira)
        .resizable()
        .scaledToFit()
        .frame(width: 14, height: 14)
        .accessibilityLabel("Jira")
    case .neutral:
      EmptyView()
    }
  }

  /// GitHub stays on our grey on purpose: a list can afford one loud row, and Jira's
  /// brand blue at 14% is it.
  private var ground: Color {
    switch tone {
    case .neutral, .github: theme.ink.opacity(0.05)
    case .jira: Color(red: 38 / 255, green: 132 / 255, blue: 1).opacity(0.14)
    }
  }
}

extension DSLabel.Tone {
  /// Which tracker a ticket id belongs to, from its shape alone: digits are a GitHub
  /// issue, `ABC-123` a Jira key, anything else gets no mark rather than a wrong one.
  /// `detectTicketProvider` in desktop/src/renderer/components/agent-info-sidebar/utils.ts.
  init(ticketId: String) {
    var bare = ticketId.trimmingCharacters(in: .whitespaces)
    if bare.hasPrefix("#") { bare.removeFirst() }
    bare = bare.trimmingCharacters(in: .whitespaces)
    if !bare.isEmpty, bare.allSatisfy(\.isASCIIDigit) {
      self = .github
    } else if bare.range(of: #"^[a-z][a-z0-9_]*-\d+$"#, options: [.regularExpression, .caseInsensitive]) != nil {
      self = .jira
    } else {
      self = .neutral
    }
  }
}

private extension Character {
  var isASCIIDigit: Bool { isASCII && isNumber }
}
