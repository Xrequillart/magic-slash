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
/// A UIKit text view rather than a SwiftUI field: a SwiftUI field takes one colour, and
/// laying a coloured copy over a clear field never lines up exactly (the two engines break
/// lines differently, and the caret landed mid-word). Here the one text carries its colours.
/// It grows with its text up to six lines, then scrolls.
struct PromptField: View {
  @Environment(\.theme) private var theme
  @Binding var text: String
  @Binding var focused: Bool
  let known: Set<String>
  var editable = true

  var body: some View {
    PromptTextView(text: $text, focused: $focused, known: known, editable: editable, ink: UIColor(theme.ink), command: UIColor(theme.blue), caret: UIColor(theme.accent))
      .overlay(alignment: .topLeading) {
        if text.isEmpty {
          Text("Message Claude")
            .font(.cera(.body))
            .foregroundStyle(theme.textSecondary)
            .lineLimit(1)
            .allowsHitTesting(false)
        }
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
}

/// The text view behind `PromptField`.
private struct PromptTextView: UIViewRepresentable {
  @Binding var text: String
  @Binding var focused: Bool
  let known: Set<String>
  let editable: Bool
  let ink: UIColor
  let command: UIColor
  let caret: UIColor

  static let maxLines = 6

  static var font: UIFont {
    Cera.uiFont(.body, weight: .regular, size: Cera.size(for: .body))
  }

  func makeUIView(context: Context) -> UITextView {
    let view = UITextView()
    view.delegate = context.coordinator
    view.backgroundColor = .clear
    view.textContainerInset = .zero
    view.textContainer.lineFragmentPadding = 0
    view.adjustsFontForContentSizeCategory = true
    view.isScrollEnabled = false
    view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    return view
  }

  func updateUIView(_ view: UITextView, context: Context) {
    context.coordinator.parent = self
    view.tintColor = caret
    view.isEditable = editable
    view.typingAttributes = [.font: Self.font, .foregroundColor: ink]
    if view.text != text {
      // Changed from outside (a command picked, a prompt sent): the caret goes to the end,
      // after what was written for the user.
      view.text = text
      view.selectedRange = NSRange(location: (text as NSString).length, length: 0)
    }
    paint(view)
    // Focus follows the binding, a turn later: becoming first responder mid-update warns.
    if focused != view.isFirstResponder {
      DispatchQueue.main.async {
        if focused, !view.isFirstResponder { view.becomeFirstResponder() }
        else if !focused, view.isFirstResponder { view.resignFirstResponder() }
      }
    }
  }

  func sizeThatFits(_ proposal: ProposedViewSize, uiView view: UITextView, context: Context) -> CGSize? {
    let width = proposal.width ?? 300
    let fits = view.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude)).height
    let cap = Self.height(lines: Self.maxLines, width: width)
    let scrolls = fits > cap + 0.5
    if view.isScrollEnabled != scrolls {
      DispatchQueue.main.async { view.isScrollEnabled = scrolls }
    }
    return CGSize(width: width, height: min(fits, cap))
  }

  /// How tall `lines` lines of the font are, laid out as the view lays them.
  private static func height(lines: Int, width: CGFloat) -> CGFloat {
    let probe = UITextView()
    probe.textContainerInset = .zero
    probe.textContainer.lineFragmentPadding = 0
    probe.font = font
    probe.text = Array(repeating: "M", count: lines).joined(separator: "\n")
    return probe.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude)).height
  }

  /// Ink everywhere, blue on the known commands. Left alone while the keyboard composes
  /// (a dictation, a Japanese input): restyling would cut the composition short.
  private func paint(_ view: UITextView) {
    guard view.markedTextRange == nil else { return }
    let storage = view.textStorage
    let whole = NSRange(location: 0, length: storage.length)
    storage.beginEditing()
    storage.addAttributes([.font: Self.font, .foregroundColor: ink], range: whole)
    for range in SlashCommands.commandRanges(in: view.text, known: known) {
      storage.addAttribute(.foregroundColor, value: command, range: NSRange(range, in: view.text))
    }
    storage.endEditing()
  }

  func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

  final class Coordinator: NSObject, UITextViewDelegate {
    var parent: PromptTextView

    init(parent: PromptTextView) { self.parent = parent }

    func textViewDidChange(_ view: UITextView) {
      parent.text = view.text
      parent.paint(view)
    }

    func textViewDidBeginEditing(_ view: UITextView) {
      if !parent.focused { parent.focused = true }
    }

    func textViewDidEndEditing(_ view: UITextView) {
      if parent.focused { parent.focused = false }
    }
  }
}
