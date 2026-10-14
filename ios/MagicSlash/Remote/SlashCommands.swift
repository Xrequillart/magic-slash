import SwiftUI

// The `/` commands the composer suggests (PROTOCOL.md §13): the Mac's list, the filter the
// desktop chat's menu uses (design-system/desktop/chatCommandMatch.ts), the menu itself, and
// the field that paints a command in blue once it is written.

/// One command, without its slash: `magic:start`, `compact`.
struct RemoteCommand: Decodable, Sendable, Hashable {
  let name: String
  let description: String?
  let source: String

  /// What it does: the skill's own words, or the app's for a built-in, which the Mac sends
  /// without any so the phone can say it in its language.
  var about: String? {
    description ?? Self.builtIns[name]
  }

  private static let builtIns: [String: String] = [
    "clear": String(localized: "Start a new conversation"),
    "compact": String(localized: "Summarise the conversation to free up context"),
    "context": String(localized: "Show what fills the context"),
    "cost": String(localized: "Show what this session cost"),
    "init": String(localized: "Write a CLAUDE.md for the repository"),
    "review": String(localized: "Review a pull request"),
    "security-review": String(localized: "Review the pending changes for security"),
    "release-notes": String(localized: "Show Claude Code's release notes"),
  ]
}

/// A Mac's `commands` message: its whole list, replacing the last one.
struct RemoteCommandList: Decodable, Sendable {
  let pairingId: String?
  let commands: [RemoteCommand]
  let receivedAt = Date()

  private enum CodingKeys: String, CodingKey {
    case pairingId, commands
  }

  /// A malformed entry is skipped, not the whole list.
  private struct Lenient: Decodable {
    let command: RemoteCommand?
    init(from decoder: any Decoder) throws {
      command = try? RemoteCommand(from: decoder)
    }
  }

  init(from decoder: any Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    pairingId = try? container.decodeIfPresent(String.self, forKey: .pairingId)
    commands = try container.decode([Lenient].self, forKey: .commands).compactMap(\.command)
  }
}

enum SlashCommands {
  /// The `/` word being typed at the end of the prompt: one that opens it or follows a space
  /// or a line break, with nothing after it yet. A path (`src/app`) is not a command.
  static func token(in text: String) -> (range: Range<String.Index>, query: String)? {
    let start = text.lastIndex(where: \.isWhitespace).map(text.index(after:)) ?? text.startIndex
    guard start < text.endIndex, text[start] == "/" else { return nil }
    return (start..<text.endIndex, String(text[text.index(after: start)...]))
  }

  /// The commands matching what follows the slash: names that start with it first, then
  /// names that merely contain it. A plugin command matches on its own name too (`review`
  /// finds `my-plugin:review`).
  static func matches(_ commands: [RemoteCommand], query: String) -> [RemoteCommand] {
    let q = query.lowercased()
    guard !q.isEmpty else { return commands }
    var starts: [RemoteCommand] = []
    var contains: [RemoteCommand] = []
    for command in commands {
      let name = command.name.lowercased()
      let short = name.split(separator: ":").last.map(String.init) ?? name
      if name.hasPrefix(q) || short.hasPrefix(q) { starts.append(command) }
      else if name.contains(q) { contains.append(command) }
    }
    return starts + contains
  }

  /// The ranges of the known commands written in `text`: a `/name` word that opens the
  /// prompt or follows whitespace.
  static func commandRanges(in text: String, known: Set<String>) -> [Range<String.Index>] {
    guard !known.isEmpty, text.contains("/") else { return [] }
    var ranges: [Range<String.Index>] = []
    var index = text.startIndex
    while index < text.endIndex {
      let opens = index == text.startIndex || text[text.index(before: index)].isWhitespace
      guard opens, text[index] == "/" else {
        index = text.index(after: index)
        continue
      }
      let end = text[index...].firstIndex(where: \.isWhitespace) ?? text.endIndex
      if known.contains(String(text[text.index(after: index)..<end])) { ranges.append(index..<end) }
      index = end
    }
    return ranges
  }
}

/// The suggestions over the composer: up to five rows, the name in blue over what it does.
struct SlashCommandMenu: View {
  @Environment(\.theme) private var theme
  let commands: [RemoteCommand]
  let pick: (RemoteCommand) -> Void

  var body: some View {
    ScrollView {
      VStack(spacing: 0) {
        ForEach(commands, id: \.name) { command in
          Button {
            Haptics.tap()
            pick(command)
          } label: {
            VStack(alignment: .leading, spacing: 2) {
              Text(verbatim: "/\(command.name)")
                .font(.cera(.subheadline, .semibold))
                .foregroundStyle(theme.blue)
                .lineLimit(1)
              if let about = command.about {
                Text(verbatim: about)
                  .font(.cera(.caption))
                  .foregroundStyle(theme.textSecondary)
                  .lineLimit(1)
              }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
          }
          .buttonStyle(.plain)
          if command != commands.last {
            Rectangle().fill(theme.lineSubtle).frame(height: 1).padding(.leading, 16)
          }
        }
      }
      .padding(.vertical, 4)
    }
    .scrollBounceBehavior(.basedOnSize)
    .frame(maxHeight: 5 * 54)
    .fixedSize(horizontal: false, vertical: true)
  }
}

/// The prompt's text field, with every known command written in it painted blue.
///
/// A SwiftUI text field takes one colour, so the field always draws its text clear and the
/// same text is laid over it, coloured. Always, not only while a command is written: a field
/// switched from clear back to a colour keeps the characters typed meanwhile clear, and the
/// prompt went invisible once its slash was deleted. Past six lines the field scrolls to
/// keep the caret in view, at the end as one types: the copy shows its last lines then.
struct PromptField: View {
  @Environment(\.theme) private var theme
  @Binding var text: String
  let known: Set<String>

  @State private var fieldHeight: CGFloat = 0
  @State private var copyHeight: CGFloat = 0

  var body: some View {
    TextField(text: $text, prompt: Text("Message Claude").foregroundStyle(theme.textSecondary), axis: .vertical) {
      Text("Message Claude")
    }
    .font(.cera(.body))
    .foregroundStyle(Color.clear)
    .tint(theme.accent)
    .lineLimit(1...6)
    .onGeometryChange(for: CGFloat.self, of: \.size.height) { fieldHeight = $0 }
    .overlay(alignment: .topLeading) {
      Text(colored(SlashCommands.commandRanges(in: text, known: known)))
        .font(.cera(.body))
        .lineSpacing(Self.fieldLeading)
        .fixedSize(horizontal: false, vertical: true)
        .onGeometryChange(for: CGFloat.self, of: \.size.height) { copyHeight = $0 }
        .frame(height: fieldHeight, alignment: copyHeight > fieldHeight + 1 ? .bottomLeading : .topLeading)
        .clipped()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
  }

  /// How far to move the field down so its first line's capitals sit in the middle of the
  /// box, as a button centres its title: the field's line is centred, leading included
  /// (which the field puts under the text), so Cera's capitals ride high in it. From the
  /// font's own metrics, so it holds at every text size.
  static var capCentring: CGFloat {
    let font = Cera.uiFont(.body, weight: .regular, size: Cera.size(for: .body))
    return (font.lineHeight + font.leading) / 2 - (font.ascender - font.capHeight / 2)
  }

  /// The text field lays Cera's lines out with the font's own leading, which a `Text` leaves
  /// out: the copy adds it back, or its second line would ride up over the field's.
  private static var fieldLeading: CGFloat {
    Cera.uiFont(.body, weight: .regular, size: Cera.size(for: .body)).leading
  }

  private func colored(_ ranges: [Range<String.Index>]) -> AttributedString {
    var string = AttributedString(text)
    string.foregroundColor = theme.ink
    for range in ranges {
      guard let lower = AttributedString.Index(range.lowerBound, within: string),
            let upper = AttributedString.Index(range.upperBound, within: string)
      else { continue }
      string[lower..<upper].foregroundColor = theme.blue
    }
    return string
  }
}
