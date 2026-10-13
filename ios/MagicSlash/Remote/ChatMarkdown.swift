import SwiftUI

/// What Claude wrote, as it meant it, like the desktop's `ChatMarkdown`
/// (design-system/desktop/ChatMarkdown.tsx): headings, paragraphs, lists and task lists,
/// quotes, rules, fenced code and GitHub tables. Inline styles (bold, italic, code, links)
/// are `AttributedString`'s; the blocks are read here, since Foundation's markdown parser
/// keeps no block structure a `Text` can draw.
///
/// Before the markdown, the message is cut the desktop's way (`splitInsights` in
/// design-system/desktop/chatInsights.ts): a `★ Insight` aside, or a document framed in
/// `━━━` rules, is a card of its own.
struct ChatMarkdownView: View {
  let text: String

  var body: some View {
    let parts = MessagePart.split(text)
    VStack(alignment: .leading, spacing: 12) {
      ForEach(Array(parts.enumerated()), id: \.offset) { _, part in
        switch part {
        case .text(let text): MarkdownBlocks(blocks: MarkdownBlock.parse(text))
        case .insight(let text): InsightCard(text: text)
        case .banner(let title, let text): BannerCard(title: title, text: text)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

// MARK: - Insights and banners

enum MessagePart: Equatable {
  case text(String)
  case insight(String)
  case banner(title: String, text: String)

  /// `★ Insight ─────`, the backticks Claude Code wraps it in optional.
  // A regex literal is never mutated: safe to share.
  nonisolated(unsafe) private static let opener = /^\s*`?\s*★\s*Insight\s*─+\s*`?\s*$/
  nonisolated(unsafe) private static let closer = /^\s*`?\s*─{5,}\s*`?\s*$/
  nonisolated(unsafe) private static let bannerRule = /^\s*━{10,}\s*$/

  /// The message cut into its plain parts, its insights and its banners, in order. An
  /// opener with no closer after it is left as text: a card that swallowed the rest of
  /// the message would hide it.
  static func split(_ text: String) -> [MessagePart] {
    let lines = text.components(separatedBy: "\n")
    var parts: [MessagePart] = []
    var plain: [String] = []
    func flush() {
      let joined = plain.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
      if !joined.isEmpty { parts.append(.text(joined)) }
      plain = []
    }
    func isRule(_ index: Int) -> Bool {
      index < lines.count && lines[index].wholeMatch(of: bannerRule) != nil
    }
    var i = 0
    while i < lines.count {
      let title = i + 1 < lines.count ? lines[i + 1].trimmingCharacters(in: .whitespaces) : ""
      if isRule(i), !title.isEmpty, !isRule(i + 1), isRule(i + 2) {
        flush()
        let close = (i + 3..<lines.count).first(where: isRule) ?? lines.count
        let body = lines[min(i + 3, close)..<close].joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
        parts.append(.banner(title: title, text: body))
        i = close + 1
        continue
      }
      guard lines[i].wholeMatch(of: opener) != nil,
            let end = (i + 1..<lines.count).first(where: { lines[$0].wholeMatch(of: closer) != nil })
      else {
        plain.append(lines[i])
        i += 1
        continue
      }
      flush()
      let inner = lines[(i + 1)..<end].joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
      if !inner.isEmpty { parts.append(.insight(inner)) }
      i = end + 1
    }
    flush()
    return parts
  }
}

/// An insight Claude set apart: `ChatInsightCard`'s accent-tinted aside.
private struct InsightCard: View {
  @Environment(\.theme) private var theme
  let text: String

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      Label("Insight", systemImage: "sparkles")
        .font(.cera(.caption, .medium))
        .foregroundStyle(theme.accent)
      MarkdownBlocks(blocks: MarkdownBlock.parse(text))
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 10)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 12).fill(theme.accent.opacity(0.05)))
    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(theme.accent.opacity(0.25)))
  }
}

/// A document a skill framed in `━━━` rules: `ChatBannerCard`'s titled card.
private struct BannerCard: View {
  @Environment(\.theme) private var theme
  let title: String
  let text: String

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Text(title)
        .font(.cera(.subheadline, .medium))
        .foregroundStyle(theme.ink)
        .lineLimit(2)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.ink.opacity(0.03))
      Rectangle().fill(theme.lineSubtle).frame(height: 1)
      if !text.isEmpty {
        MarkdownBlocks(blocks: MarkdownBlock.parse(text))
          .padding(.horizontal, 14)
          .padding(.vertical, 10)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 12).fill(theme.surface))
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(theme.line))
  }
}

// MARK: - Blocks

/// One block of markdown, as GitHub-flavoured markdown has them.
enum MarkdownBlock: Equatable {
  case heading(level: Int, text: String)
  case paragraph(String)
  case list(ordered: Bool, items: [ListItem])
  case quote(String)
  case code(lang: String?, text: String)
  case table(header: [String], rows: [[String]])
  case rule

  struct ListItem: Equatable {
    /// How deep it sits, 0 for the outermost.
    let depth: Int
    /// The number an ordered item wears, as written.
    let marker: String
    /// `true` or `false` for a task-list item, nil otherwise.
    let checked: Bool?
    let text: String
  }

  // A regex literal is never mutated: safe to share.
  nonisolated(unsafe) private static let headingLine = /^(#{1,6})\s+(.*?)\s*#*\s*$/
  nonisolated(unsafe) private static let bulletLine = /^(\s*)([-*+])\s+(.*)$/
  nonisolated(unsafe) private static let orderedLine = /^(\s*)(\d{1,9})[.)]\s+(.*)$/
  nonisolated(unsafe) private static let taskPrefix = /^\[([ xX])\]\s+(.*)$/
  nonisolated(unsafe) private static let ruleLine = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/
  nonisolated(unsafe) private static let fenceLine = /^\s*(```+|~~~+)\s*([\w+#.-]*)\s*$/
  nonisolated(unsafe) private static let tableSeparator = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/

  static func parse(_ text: String) -> [MarkdownBlock] {
    let lines = text.components(separatedBy: "\n")
    var blocks: [MarkdownBlock] = []
    var paragraph: [String] = []
    func flushParagraph() {
      let joined = paragraph.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
      if !joined.isEmpty { blocks.append(.paragraph(joined)) }
      paragraph = []
    }

    var i = 0
    while i < lines.count {
      let line = lines[i]
      let trimmed = line.trimmingCharacters(in: .whitespaces)

      // Fenced code: everything up to the closing fence, as written.
      if let fence = line.wholeMatch(of: fenceLine) {
        flushParagraph()
        let marker = String(fence.1)
        var body: [String] = []
        i += 1
        while i < lines.count, !lines[i].trimmingCharacters(in: .whitespaces).hasPrefix(marker) {
          body.append(lines[i])
          i += 1
        }
        let lang = String(fence.2)
        blocks.append(.code(lang: lang.isEmpty ? nil : lang, text: body.joined(separator: "\n")))
        i += 1
        continue
      }
      if trimmed.isEmpty {
        flushParagraph()
        i += 1
        continue
      }
      if let heading = line.wholeMatch(of: headingLine) {
        flushParagraph()
        blocks.append(.heading(level: heading.1.count, text: String(heading.2)))
        i += 1
        continue
      }
      if line.wholeMatch(of: ruleLine) != nil {
        // `---` under a paragraph line is a setext heading; Claude writes ATX, so a rule.
        flushParagraph()
        blocks.append(.rule)
        i += 1
        continue
      }
      // A table: a row of cells, then the separator row.
      if trimmed.contains("|"), i + 1 < lines.count, lines[i + 1].wholeMatch(of: tableSeparator) != nil {
        flushParagraph()
        let header = cells(line)
        var rows: [[String]] = []
        i += 2
        while i < lines.count, lines[i].contains("|"), !lines[i].trimmingCharacters(in: .whitespaces).isEmpty {
          var row = cells(lines[i])
          if row.count < header.count { row += Array(repeating: "", count: header.count - row.count) }
          rows.append(Array(row.prefix(header.count)))
          i += 1
        }
        blocks.append(.table(header: header, rows: rows))
        continue
      }
      if trimmed.hasPrefix(">") {
        flushParagraph()
        var quoted: [String] = []
        while i < lines.count, lines[i].trimmingCharacters(in: .whitespaces).hasPrefix(">") {
          let content = lines[i].trimmingCharacters(in: .whitespaces).dropFirst()
          quoted.append(String(content.hasPrefix(" ") ? content.dropFirst() : content))
          i += 1
        }
        blocks.append(.quote(quoted.joined(separator: "\n")))
        continue
      }
      if listItem(line) != nil {
        flushParagraph()
        var items: [ListItem] = []
        let ordered = line.wholeMatch(of: orderedLine) != nil
        while i < lines.count {
          if let item = listItem(lines[i]) {
            items.append(item)
          } else if !lines[i].trimmingCharacters(in: .whitespaces).isEmpty,
                    lines[i].hasPrefix("  "), let last = items.popLast() {
            // A continuation line of the item above.
            items.append(ListItem(depth: last.depth, marker: last.marker, checked: last.checked,
                                  text: last.text + "\n" + lines[i].trimmingCharacters(in: .whitespaces)))
          } else {
            break
          }
          i += 1
        }
        blocks.append(.list(ordered: ordered, items: items))
        continue
      }
      paragraph.append(line)
      i += 1
    }
    flushParagraph()
    return blocks
  }

  private static func listItem(_ line: String) -> ListItem? {
    let indent: Substring, marker: String, rest: Substring
    if let match = line.wholeMatch(of: bulletLine) {
      (indent, marker, rest) = (match.1, "•", match.3)
    } else if let match = line.wholeMatch(of: orderedLine) {
      (indent, marker, rest) = (match.1, "\(match.2).", match.3)
    } else {
      return nil
    }
    let depth = indent.replacingOccurrences(of: "\t", with: "    ").count / 2
    if let task = rest.wholeMatch(of: taskPrefix) {
      return ListItem(depth: depth, marker: marker, checked: task.1 != " ", text: String(task.2))
    }
    return ListItem(depth: depth, marker: marker, checked: nil, text: String(rest))
  }

  /// A table row's cells, its outer pipes dropped and `\|` kept as a pipe.
  private static func cells(_ line: String) -> [String] {
    var row = line.trimmingCharacters(in: .whitespaces)
    if row.hasPrefix("|") { row.removeFirst() }
    if row.hasSuffix("|"), !row.hasSuffix("\\|") { row.removeLast() }
    return row.replacingOccurrences(of: "\\|", with: "\u{0}")
      .components(separatedBy: "|")
      .map { $0.replacingOccurrences(of: "\u{0}", with: "|").trimmingCharacters(in: .whitespaces) }
  }
}

/// The blocks, in the desktop's typography: `PROSE` in ChatMarkdown.tsx.
private struct MarkdownBlocks: View {
  @Environment(\.theme) private var theme
  let blocks: [MarkdownBlock]

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      ForEach(Array(blocks.enumerated()), id: \.offset) { index, block in
        view(for: block)
          // Headings breathe above, as `mt-4` does, except at the top.
          .padding(.top, index > 0 && block.isHeading ? 6 : 0)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private func view(for block: MarkdownBlock) -> some View {
    switch block {
    case .heading(let level, let text):
      InlineText(text: text, font: Self.headingFont(level))
    case .paragraph(let text):
      InlineText(text: text, font: .cera(.body))
    case .list(let ordered, let items):
      VStack(alignment: .leading, spacing: 8) {
        ForEach(Array(items.enumerated()), id: \.offset) { _, item in
          HStack(alignment: .firstTextBaseline, spacing: 8) {
            if let checked = item.checked {
              Image(systemName: checked ? "checkmark.square.fill" : "square")
                .font(.cera(.subheadline))
                .foregroundStyle(checked ? theme.accent : theme.iconMuted)
            } else {
              Text(ordered ? item.marker : (item.depth > 0 ? "◦" : "•"))
                .font(.cera(.body))
                .foregroundStyle(theme.textSecondary)
                .monospacedDigit()
            }
            InlineText(text: item.text, font: .cera(.body))
          }
          .padding(.leading, CGFloat(item.depth) * 18 + 4)
        }
      }
    case .quote(let text):
      HStack(spacing: 10) {
        Rectangle().fill(theme.lineStrong).frame(width: 2)
        InlineText(text: text, font: .cera(.body), color: theme.textSecondary)
      }
      .fixedSize(horizontal: false, vertical: true)
    case .code(let lang, let text):
      CodeBlock(lang: lang, code: text)
    case .table(let header, let rows):
      TableCard(header: header, rows: rows)
    case .rule:
      Rectangle().fill(theme.line).frame(height: 1).padding(.vertical, 6)
    }
  }

  private static func headingFont(_ level: Int) -> Font {
    switch level {
    case 1: .cera(.title3, .bold)
    case 2: .cera(.headline, .semibold)
    default: .cera(.body, .semibold)
    }
  }
}

private extension MarkdownBlock {
  var isHeading: Bool {
    if case .heading = self { return true }
    return false
  }
}

/// A line of inline markdown: bold, italic, links, and inline code in the desktop's blue
/// on a blue tint.
private struct InlineText: View {
  @Environment(\.theme) private var theme
  let text: String
  let font: Font
  var color: Color?

  var body: some View {
    Text(Self.attributed(text, theme: theme))
      .font(font)
      .foregroundStyle(color ?? theme.ink)
      .tint(theme.accent)
      // The desktop's `leading-relaxed`: Cera set solid reads cramped on a phone.
      .lineSpacing(6)
      .textSelection(.enabled)
      .fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)
  }

  static func attributed(_ text: String, theme: ThemeTokens) -> AttributedString {
    let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
    var string = (try? AttributedString(markdown: text, options: options)) ?? AttributedString(text)
    for run in string.runs where run.inlinePresentationIntent?.contains(.code) == true {
      string[run.range].font = .system(.subheadline, design: .monospaced)
      string[run.range].foregroundColor = theme.blue
      string[run.range].backgroundColor = theme.blue.opacity(0.1)
    }
    for run in string.runs where run.inlinePresentationIntent?.contains(.stronglyEmphasized) == true {
      string[run.range].font = .cera(.body, .semibold)
    }
    return string
  }
}

/// A fenced block: the language above, the code scrolling sideways rather than wrapping.
private struct CodeBlock: View {
  @Environment(\.theme) private var theme
  let lang: String?
  let code: String

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      if let lang {
        Text(lang.uppercased())
          .font(.system(size: 10, design: .monospaced))
          .tracking(0.6)
          .foregroundStyle(theme.textSecondary.opacity(0.7))
          .padding(.horizontal, 12)
          .padding(.vertical, 5)
          .frame(maxWidth: .infinity, alignment: .leading)
        Rectangle().fill(theme.lineSubtle).frame(height: 1)
      }
      ScrollView(.horizontal, showsIndicators: false) {
        Text(code)
          .font(.system(.caption, design: .monospaced))
          .foregroundStyle(theme.ink)
          .lineSpacing(3)
          .textSelection(.enabled)
          .padding(.horizontal, 12)
          .padding(.vertical, 10)
      }
    }
    .background(RoundedRectangle(cornerRadius: 10).fill(theme.surface))
    .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(theme.lineSubtle))
  }
}

/// A table Claude wrote, as `ChatTable` draws it: one rounded frame, a tinted header row,
/// and thin rules between the cells. One that fits the thread on single lines stretches to
/// its width; a wider one keeps its cells at most 240 pt, wraps inside them, and scrolls
/// sideways, so a long table never squeezes the chat.
private struct TableCard: View {
  @Environment(\.theme) private var theme
  let header: [String]
  let rows: [[String]]

  var body: some View {
    ViewThatFits(in: .horizontal) {
      grid(stretch: true)
      ScrollView(.horizontal, showsIndicators: false) {
        grid(stretch: false)
      }
    }
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(theme.line))
  }

  private func grid(stretch: Bool) -> some View {
    let widths = stretch ? [] : columnWidths()
    return Grid(alignment: .topLeading, horizontalSpacing: 0, verticalSpacing: 0) {
      GridRow {
        ForEach(Array(header.enumerated()), id: \.offset) { index, cell in
          cellView(cell, column: index, bold: true, width: widths[safe: index])
        }
      }
      .background(theme.surface)
      Rectangle().fill(theme.line).frame(height: 1).gridCellUnsizedAxes(.horizontal)
      ForEach(Array(rows.enumerated()), id: \.offset) { rowIndex, row in
        if rowIndex > 0 {
          Rectangle().fill(theme.lineSubtle).frame(height: 1).gridCellUnsizedAxes(.horizontal)
        }
        GridRow {
          ForEach(Array(row.enumerated()), id: \.offset) { index, cell in
            cellView(cell, column: index, bold: false, width: widths[safe: index])
          }
        }
      }
    }
  }

  @ViewBuilder
  /// `width` is the column's, for the scrolling table; nil stretches it.
  private func cellView(_ text: String, column: Int, bold: Bool, width: CGFloat?) -> some View {
    let label = Text(InlineText.attributed(text, theme: theme))
      .font(.cera(.footnote, bold ? .semibold : .regular))
      .foregroundStyle(theme.ink)
    Group {
      if let width {
        label.frame(width: width, alignment: .leading)
          .fixedSize(horizontal: false, vertical: true)
      } else {
        // Single lines, or `ViewThatFits` would not have picked this one.
        label.lineLimit(1).fixedSize().frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 6)
    .frame(maxHeight: .infinity, alignment: .topLeading)
    .overlay(alignment: .leading) {
      if column > 0 { Rectangle().fill(theme.lineSubtle).frame(width: 1) }
    }
  }

  /// Each column's width in the scrolling table: its widest cell on one line, capped at
  /// 240 pt, so short columns stay narrow and every cell of a column lines up.
  private func columnWidths() -> [CGFloat] {
    header.indices.map { column in
      let cells = [header[column]] + rows.map { $0[safe: column] ?? "" }
      return min(240, cells.map(Self.idealWidth).max() ?? 0)
    }
  }

  /// A cell on one line: its text in Cera, the code spans in the monospaced face
  /// `InlineText` gives them.
  private static func idealWidth(_ text: String) -> CGFloat {
    let body = Cera.uiFont(.footnote, weight: .semibold, size: Cera.size(for: .footnote))
    let code = UIFontMetrics(forTextStyle: .subheadline)
      .scaledFont(for: .monospacedSystemFont(ofSize: Cera.size(for: .subheadline), weight: .regular))
    let width = text.components(separatedBy: "`").enumerated().reduce(CGFloat(0)) { total, part in
      let plain = part.element.replacingOccurrences(of: "**", with: "")
      return total + (plain as NSString).size(withAttributes: [.font: part.offset.isMultiple(of: 2) ? body : code]).width
    }
    return ceil(width) + 2
  }
}

private extension Array {
  subscript(safe index: Int) -> Element? {
    indices.contains(index) ? self[index] : nil
  }
}
