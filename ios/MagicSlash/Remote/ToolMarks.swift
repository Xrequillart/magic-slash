import SwiftUI

// A tool call's mark on a disc of its product's colour, and a run of them overlapping like
// faces: the desktop's ToolMark and ToolMarkStack (design-system/desktop/ToolMark.tsx).

/// What a tool call wears, from its name alone: Jira's blue ground for a Jira tool, white
/// under the marks drawn for white (Slack, Notion, Figma), and a light grey with the glyph
/// in black for GitHub and for Claude Code's own tools, the wrench for anything else.
///
/// Fixed, not themed: white, grey and ink are the same on every theme, so a run reads the
/// same on the darkest ground as on the lightest. Jira's ground is its label's 14% tint,
/// laid over the thread's ground so nothing shows through it.
struct ToolPlate {
  enum Mark {
    /// A logo that paints itself.
    case logo(ImageResource)
    /// A one-colour mark drawn in the plate's ink: an SF Symbol, or GitHub's template.
    case symbol(String)
    case template(ImageResource)
  }

  let mark: Mark
  let tint: Color

  static let paper = Color.white
  static let grey = Color(red: 228 / 255, green: 228 / 255, blue: 231 / 255)
  static let ink = Color(red: 10 / 255, green: 10 / 255, blue: 11 / 255)
  static let jira = Color(red: 38 / 255, green: 132 / 255, blue: 1).opacity(0.14)

  /// Claude Code's own tools, by the glyph of what they do (the desktop's Lucide picks,
  /// in SF Symbols).
  private static let builtIns: [String: String] = [
    "Bash": "apple.terminal",
    "BashOutput": "apple.terminal",
    "KillShell": "apple.terminal",
    "Read": "doc.text",
    "Edit": "square.and.pencil",
    "MultiEdit": "square.and.pencil",
    "Write": "square.and.pencil",
    "NotebookEdit": "square.and.pencil",
    "Grep": "text.magnifyingglass",
    "Glob": "doc.text.magnifyingglass",
    "WebFetch": "globe",
    "WebSearch": "globe",
    // `Task` is the name older transcripts give the Agent tool.
    "Task": "ellipsis.message",
    "Agent": "ellipsis.message",
    "AskUserQuestion": "questionmark.bubble",
    "TodoWrite": "checklist",
    "Skill": "sparkles",
  ]

  /// MCP tools arrive named `mcp__<server>__<tool>`, so the server is read off the name.
  init(name: String) {
    let parts = name.components(separatedBy: "__")
    let mcp = parts.count >= 3 && parts[0] == "mcp"
    let server = mcp ? parts[1].lowercased() : ""
    let tool = mcp ? parts[2...].joined(separator: "__").lowercased() : ""
    if (server.contains("atlassian") || server.contains("jira")) && !tool.contains("confluence") {
      self.init(mark: .logo(.jira), tint: Self.jira)
    } else if server.contains("notion") {
      self.init(mark: .logo(.notion), tint: Self.paper)
    } else if server.contains("slack") {
      self.init(mark: .logo(.slack), tint: Self.paper)
    } else if server.contains("figma") {
      self.init(mark: .logo(.figma), tint: Self.paper)
    } else if server.contains("github") {
      self.init(mark: .template(.github), tint: Self.grey)
    } else {
      self.init(mark: .symbol(mcp ? "wrench" : Self.builtIns[name] ?? "wrench"), tint: Self.grey)
    }
  }

  private init(mark: Mark, tint: Color) {
    self.mark = mark
    self.tint = tint
  }
}

/// One tool call's disc.
struct ToolMark: View {
  @Environment(\.theme) private var theme
  let name: String

  static let size: CGFloat = 20
  private static let glyph: CGFloat = 12

  var body: some View {
    let plate = ToolPlate(name: name)
    ZStack {
      // The thread's ground under the plate, so a translucent one (Jira's) is a tint of it.
      Circle().fill(theme.bg)
      Circle().fill(plate.tint)
      mark(plate.mark)
    }
    .frame(width: Self.size, height: Self.size)
  }

  @ViewBuilder
  private func mark(_ mark: ToolPlate.Mark) -> some View {
    switch mark {
    case .logo(let resource):
      Image(resource).resizable().scaledToFit().frame(width: Self.glyph, height: Self.glyph)
    case .template(let resource):
      Image(resource).resizable().scaledToFit().frame(width: Self.glyph, height: Self.glyph)
        .foregroundStyle(ToolPlate.ink)
    case .symbol(let name):
      Image(systemName: name).font(.system(size: 10, weight: .medium)).foregroundStyle(ToolPlate.ink)
    }
  }
}

/// A run of tool calls as overlapping discs, one per call, oldest first: only the last
/// `max` are drawn, since the line beside them prints the count. Each disc wears a ring of
/// the thread's ground, so the one on top cuts the one under it instead of drawing over it.
struct ToolMarkStack: View {
  @Environment(\.theme) private var theme
  let names: [String]
  var max = 5

  var body: some View {
    let shown = Array(names.suffix(max))
    HStack(spacing: -6) {
      ForEach(Array(shown.enumerated()), id: \.offset) { _, name in
        ToolMark(name: name)
          .background(Circle().fill(theme.bg).padding(-2))
      }
    }
    .accessibilityHidden(true)
  }
}
