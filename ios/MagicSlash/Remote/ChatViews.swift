import SwiftUI

/// The conversation of one agent, drawn as the desktop chat draws it (`ChatView` in
/// design-system/desktop/ChatView.tsx): the user's prompts in tinted bubbles on the right,
/// Claude's answers as markdown across the page, tool calls as quiet one-line rows kept,
/// filtered or folded as the desktop's `chatToolDetail` setting says, and the prompts
/// still queued at the end.
struct ChatTranscriptView: View {
  @Environment(\.theme) private var theme
  @Environment(\.chatToolDetail) private var toolDetail
  let chat: AgentChat

  var body: some View {
    // Not lazy: the Mac sends at most 80 entries, and a lazy stack's estimated heights made
    // the scroll to the end land below the thread, on an empty screen, after each update.
    VStack(alignment: .leading, spacing: 12) {
      if chat.hasEarlier {
        Text("Earlier messages are on the Mac")
          .font(.cera(.caption))
          .foregroundStyle(theme.textSecondary)
          .frame(maxWidth: .infinity)
          .padding(.bottom, 4)
      }
      ForEach(ChatLine.shape(chat.entries, detail: toolDetail)) { line in
        switch line {
        case .entry(let entry): ChatEntryView(entry: entry)
        case .group(_, let tools): ToolGroup(tools: tools)
        }
      }
      ForEach(chat.queue) { queued in
        UserBubble(text: queued.text, queued: true)
      }
    }
  }
}

/// A line of the thread: an entry, or a run of tool calls folded into one.
enum ChatLine: Identifiable {
  case entry(RemoteChatEntry)
  case group(id: String, tools: [ToolCall])

  struct ToolCall: Identifiable, Equatable {
    let id: String
    let name: String
    let summary: String
    let status: RemoteChatEntry.ToolStatus
  }

  var id: String {
    switch self {
    case .entry(let entry): entry.id
    case .group(let id, _): id
    }
  }

  /// The tools whose line `changes` keeps: they change files or run commands.
  private static let changeTools: Set<String> = ["Edit", "MultiEdit", "Write", "NotebookEdit", "Bash"]

  /// `shapeEntries` in ChatView.tsx: every call, only the ones that change something (or
  /// failed), or each run of two calls or more as one line.
  static func shape(_ entries: [RemoteChatEntry], detail: ChatToolDetail) -> [ChatLine] {
    switch detail {
    case .all:
      return entries.map(ChatLine.entry)
    case .changes:
      return entries.filter { entry in
        guard case .tool(_, let name, _, let status) = entry else { return true }
        return changeTools.contains(name) || status == .error
      }.map(ChatLine.entry)
    case .grouped:
      var lines: [ChatLine] = []
      var run: [ToolCall] = []
      func flush() {
        if run.count == 1, let only = run.first {
          lines.append(.entry(.tool(id: only.id, name: only.name, summary: only.summary, status: only.status)))
        } else if run.count > 1 {
          lines.append(.group(id: "group-\(run[0].id)", tools: run))
        }
        run = []
      }
      for entry in entries {
        if case .tool(let id, let name, let summary, let status) = entry {
          run.append(ToolCall(id: id, name: name, summary: summary, status: status))
        } else {
          flush()
          lines.append(.entry(entry))
        }
      }
      flush()
      return lines
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
        ChatMarkdownView(text: text)
        if cut {
          Label("Cut: the rest is on the Mac", systemImage: "scissors")
            .font(.cera(.caption))
            .foregroundStyle(theme.textSecondary)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    case .notice(_, let text):
      NoticeLine(text: text)
    case .tool(_, let name, let summary, let status):
      ToolLine(name: name, summary: summary, status: status)
    }
  }
}

/// A prompt the user sent, or one Claude Code still holds (dashed, "Queued"): the
/// desktop's `bg-accent/10` bubble, at most 80% of the width.
private struct UserBubble: View {
  @Environment(\.theme) private var theme
  let text: String
  let queued: Bool

  var body: some View {
    VStack(alignment: .trailing, spacing: 4) {
      Text(text)
        .font(.cera(.body))
        .foregroundStyle(theme.ink)
        .lineSpacing(6)
        .textSelection(.enabled)
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(
          RoundedRectangle(cornerRadius: 18)
            .fill(queued ? theme.surfaceSubtle : theme.accent.opacity(0.1))
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
    // `max-w-[80%]`: a short prompt hugs its text, a long one wraps at four fifths.
    .frame(maxWidth: .infinity, alignment: .trailing)
    .padding(.leading, 56)
  }
}

/// What a local slash command printed: `NoticeLine`, an info mark and monospaced text on
/// a faint ground.
private struct NoticeLine: View {
  @Environment(\.theme) private var theme
  let text: String

  var body: some View {
    HStack(alignment: .top, spacing: 8) {
      Image(systemName: "info.circle")
        .font(.system(size: 13))
        .foregroundStyle(theme.icon)
        .padding(.top, 1)
      Text(text)
        .font(.system(size: 11, design: .monospaced))
        .foregroundStyle(theme.textSecondary)
        .textSelection(.enabled)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(RoundedRectangle(cornerRadius: 10).fill(theme.ink.opacity(0.05)))
  }
}

/// How a call, or a run of them, is going: a spinner while running, the red alert when it
/// failed, the green check once done.
private struct ToolStatusMark: View {
  @Environment(\.theme) private var theme
  let status: RemoteChatEntry.ToolStatus

  var body: some View {
    Group {
      switch status {
      case .running:
        ProgressView().controlSize(.mini).tint(theme.textSecondary)
      case .error:
        Image(systemName: "exclamationmark.circle").foregroundStyle(theme.red)
      case .done:
        Image(systemName: "checkmark").foregroundStyle(theme.green)
      }
    }
    .font(.system(size: 12, weight: .semibold))
    .frame(width: 16, height: 16)
  }
}

/// One tool call, on one line, as `ToolLine` draws it: its status, the wrench, the tool's
/// name, and the argument that says what it did.
private struct ToolLine: View {
  @Environment(\.theme) private var theme
  let name: String
  let summary: String
  let status: RemoteChatEntry.ToolStatus

  var body: some View {
    HStack(spacing: 8) {
      ToolStatusMark(status: status)
      Image(systemName: "wrench")
        .font(.system(size: 10))
        .foregroundStyle(theme.icon)
      Text(name)
        .font(.cera(.footnote, .medium))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .layoutPriority(1)
      Text(summary)
        .font(.system(.caption, design: .monospaced))
        .foregroundStyle(theme.textSecondary.opacity(0.7))
        .lineLimit(1)
        .truncationMode(.middle)
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
  }
}

/// "Claude is working…" under the thread while a turn runs, as the desktop chat shows it: the
/// wave in a tool line's mark column, at its height.
struct WorkingLine: View {
  @Environment(\.theme) private var theme

  var body: some View {
    HStack(spacing: 8) {
      WaveLoader(size: 14)
        .foregroundStyle(theme.accent)
      Text("Claude is working…")
        .font(.cera(.footnote))
        .foregroundStyle(theme.textSecondary.opacity(0.7))
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .frame(maxWidth: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
  }
}

/// A run of tool calls on one line (`toolDetail: grouped`): how many, which tools, and how
/// the run is going. A tap opens it on its own lines.
private struct ToolGroup: View {
  @Environment(\.theme) private var theme
  let tools: [ChatLine.ToolCall]
  @State private var open = false

  private var status: RemoteChatEntry.ToolStatus {
    if tools.contains(where: { $0.status == .running }) { return .running }
    if tools.contains(where: { $0.status == .error }) { return .error }
    return .done
  }

  private var names: String {
    var seen = Set<String>()
    return tools.map(\.name).filter { seen.insert($0).inserted }.joined(separator: ", ")
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Button {
        Haptics.tap()
        withAnimation(.snappy(duration: 0.2)) { open.toggle() }
      } label: {
        HStack(spacing: 8) {
          ToolStatusMark(status: status)
          Image(systemName: "wrench")
            .font(.system(size: 10))
            .foregroundStyle(theme.icon)
          Text("\(tools.count) actions")
            .font(.cera(.footnote, .medium))
            .foregroundStyle(theme.ink)
            .layoutPriority(1)
          Text(names)
            .font(.system(.caption, design: .monospaced))
            .foregroundStyle(theme.textSecondary.opacity(0.7))
            .lineLimit(1)
            .frame(maxWidth: .infinity, alignment: .leading)
          Image(systemName: "chevron.right")
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(theme.icon)
            .rotationEffect(.degrees(open ? 90 : 0))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .accessibilityValue(open ? "Expanded" : "Collapsed")

      if open {
        VStack(alignment: .leading, spacing: 0) {
          ForEach(tools) { tool in
            ToolLine(name: tool.name, summary: tool.summary, status: tool.status)
          }
        }
        .padding(.leading, 8)
        .overlay(alignment: .leading) {
          Rectangle().fill(theme.lineSubtle).frame(width: 1)
        }
        .padding(.leading, 20)
        .transition(.opacity)
      }
    }
  }
}

/// The empty session, as the desktop shows it: the robot, "Claude Code", and one line.
struct ChatEmptyState: View {
  @Environment(\.theme) private var theme

  var body: some View {
    VStack(spacing: 20) {
      ClaudeCodeMascot(greeting: String(localized: "Hello!"))
        .frame(width: 96, height: 96)
      VStack(spacing: 6) {
        Text("Claude Code")
          .font(.cera(.body, .medium))
          .foregroundStyle(theme.ink)
        Text("Nothing said yet in this session.")
          .font(.cera(.subheadline))
          .foregroundStyle(theme.textSecondary.opacity(0.6))
          .multilineTextAlignment(.center)
      }
    }
    .frame(maxWidth: .infinity)
    .padding(.horizontal, 24)
  }
}

// MARK: - Liquid Glass

extension View {
  /// Liquid Glass on iOS 26, like the system bar's buttons; a thin material before it.
  /// `interactive` makes it answer the touch, which a control wants and a card does not.
  @ViewBuilder
  func liquidGlass<S: Shape>(in shape: S, tint: Color? = nil, interactive: Bool = true) -> some View {
    if #available(iOS 26, *) {
      let glass = tint.map { Glass.regular.tint($0) } ?? Glass.regular
      glassEffect(glass.interactive(interactive), in: shape)
    } else {
      background(shape.fill(.ultraThinMaterial))
        .background(shape.fill(tint?.opacity(0.85) ?? .clear))
    }
  }
}
