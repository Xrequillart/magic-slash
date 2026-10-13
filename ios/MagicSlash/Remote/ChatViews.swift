import SwiftUI

/// The conversation of one agent, as the desktop chat shows it (PROTOCOL.md §11): the user's
/// prompts on the right, Claude's answers across the page, tool calls as one quiet line each,
/// and the prompts still queued at the end.
struct ChatTranscriptView: View {
  @Environment(\.theme) private var theme
  let chat: AgentChat

  var body: some View {
    LazyVStack(alignment: .leading, spacing: 12) {
      if chat.hasEarlier {
        Text("Earlier messages are on the Mac")
          .font(.cera(.caption))
          .foregroundStyle(theme.textSecondary)
          .frame(maxWidth: .infinity)
          .padding(.bottom, 4)
      }
      ForEach(chat.entries) { entry in
        ChatEntryView(entry: entry)
      }
      ForEach(chat.queue) { queued in
        UserBubble(text: queued.text, queued: true)
      }
    }
  }
}

private struct ChatEntryView: View {
  @Environment(\.theme) private var theme
  let entry: RemoteChatEntry

  var body: some View {
    switch entry {
    case .user(_, let text, _):
      UserBubble(text: text, queued: false)
    case .assistant(_, let text, let cut):
      VStack(alignment: .leading, spacing: 6) {
        MessageText(text: text)
        if cut {
          Label("Cut: the rest is on the Mac", systemImage: "scissors")
            .font(.cera(.caption))
            .foregroundStyle(theme.textSecondary)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    case .notice(_, let text):
      Text(text)
        .font(.system(.caption, design: .monospaced))
        .foregroundStyle(theme.textSecondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 10).fill(theme.surfaceSunkenSoft))
    case .tool(_, let name, let summary, let status):
      ToolLine(name: name, summary: summary, status: status)
    }
  }
}

/// A prompt the user sent, or one Claude Code still holds (dashed, "Queued").
private struct UserBubble: View {
  @Environment(\.theme) private var theme
  let text: String
  let queued: Bool

  var body: some View {
    VStack(alignment: .trailing, spacing: 4) {
      Text(text)
        .font(.cera(.body))
        .foregroundStyle(theme.ink)
        .textSelection(.enabled)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
          RoundedRectangle(cornerRadius: 18)
            .fill(queued ? theme.surfaceSubtle : theme.accent.opacity(0.18))
        )
        .overlay {
          if queued {
            RoundedRectangle(cornerRadius: 18)
              .strokeBorder(theme.lineStrong, style: StrokeStyle(lineWidth: 1, dash: [4, 3]))
          }
        }
      if queued {
        Label("Queued", systemImage: "clock")
          .font(.cera(.caption2, .semibold))
          .foregroundStyle(theme.textSecondary)
      }
    }
    .frame(maxWidth: .infinity, alignment: .trailing)
    .padding(.leading, 48)
  }
}

/// One tool call: what ran and on what, with its outcome.
private struct ToolLine: View {
  @Environment(\.theme) private var theme
  let name: String
  let summary: String
  let status: RemoteChatEntry.ToolStatus

  var body: some View {
    HStack(alignment: .center, spacing: 8) {
      Group {
        switch status {
        case .running:
          ProgressView().controlSize(.mini).tint(theme.yellow)
        case .done:
          Image(systemName: "checkmark.circle.fill").foregroundStyle(theme.green)
        case .error:
          Image(systemName: "xmark.circle.fill").foregroundStyle(theme.red)
        }
      }
      .font(.cera(.caption))
      .frame(width: 16)
      Text(name)
        .font(.cera(.footnote, .semibold))
        .foregroundStyle(theme.ink)
      if !summary.isEmpty {
        Text(summary)
          .font(.system(.footnote, design: .monospaced))
          .foregroundStyle(theme.textSecondary)
          .lineLimit(2)
          .truncationMode(.middle)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(RoundedRectangle(cornerRadius: 10).fill(theme.surfaceSubtle))
    .accessibilityElement(children: .combine)
  }
}

/// Claude's markdown: inline styles through `AttributedString`, and fenced code blocks drawn
/// apart in a monospaced box, since inline-only parsing would leave their fences showing.
private struct MessageText: View {
  @Environment(\.theme) private var theme
  let text: String

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      ForEach(Array(Self.segments(text).enumerated()), id: \.offset) { _, segment in
        if segment.isCode {
          ScrollView(.horizontal, showsIndicators: false) {
            Text(segment.text)
              .font(.system(.footnote, design: .monospaced))
              .foregroundStyle(theme.ink)
              .textSelection(.enabled)
              .padding(10)
          }
          .background(RoundedRectangle(cornerRadius: 10).fill(theme.surfaceSunken))
        } else {
          Text(Self.inline(segment.text))
            .font(.cera(.body))
            .foregroundStyle(theme.ink)
            .tint(theme.accent)
            .textSelection(.enabled)
        }
      }
    }
  }

  private struct Segment {
    let text: String
    let isCode: Bool
  }

  private static func segments(_ text: String) -> [Segment] {
    var segments: [Segment] = []
    var current: [Substring] = []
    var inCode = false
    func flush() {
      let joined = current.joined(separator: "\n")
      let trimmed = inCode ? joined : joined.trimmingCharacters(in: .newlines)
      if !trimmed.isEmpty { segments.append(Segment(text: trimmed, isCode: inCode)) }
      current = []
    }
    for line in text.split(separator: "\n", omittingEmptySubsequences: false) {
      if line.trimmingCharacters(in: .whitespaces).hasPrefix("```") {
        flush()
        inCode.toggle()
      } else {
        current.append(line)
      }
    }
    flush()
    return segments
  }

  private static func inline(_ text: String) -> AttributedString {
    let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
    return (try? AttributedString(markdown: text, options: options)) ?? AttributedString(text)
  }
}

// MARK: - Liquid Glass

extension View {
  /// Liquid Glass on iOS 26, like the system bar's buttons; a thin material before it.
  @ViewBuilder
  func liquidGlass<S: Shape>(in shape: S, tint: Color? = nil) -> some View {
    if #available(iOS 26, *) {
      glassEffect(tint.map { Glass.regular.tint($0).interactive() } ?? Glass.regular.interactive(), in: shape)
    } else {
      background(shape.fill(.ultraThinMaterial))
        .background(shape.fill(tint?.opacity(0.85) ?? .clear))
    }
  }
}
