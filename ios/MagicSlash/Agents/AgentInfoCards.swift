import SwiftUI
import UIKit

// The agent info sheet: what the desktop's info column holds (SidebarAgentCoderInfo.tsx),
// read only, laid out for the phone. Glass cards over a soft wash of the theme's colours,
// type at the phone's sizes, and touch targets a thumb can hit.

// MARK: Shell

/// The sheet's ground: the theme's background, lit by blurred patches of its accent and two
/// of its hues, so the glass cards over it have something to bend.
struct InfoBackdrop: View {
  @Environment(\.theme) private var theme

  var body: some View {
    theme.bg
      .overlay {
        GeometryReader { geo in
          let width = geo.size.width
          ZStack {
            Circle()
              .fill(theme.accent.opacity(0.32))
              .frame(width: width * 0.9)
              .blur(radius: 90)
              .position(x: width * 0.1, y: 40)
            Circle()
              .fill(theme.purple.opacity(0.22))
              .frame(width: width * 0.8)
              .blur(radius: 100)
              .position(x: width * 0.95, y: geo.size.height * 0.45)
            Circle()
              .fill(theme.cyan.opacity(0.16))
              .frame(width: width * 0.8)
              .blur(radius: 100)
              .position(x: width * 0.15, y: geo.size.height * 0.9)
          }
        }
      }
      .ignoresSafeArea()
  }
}

/// A card of the sheet: Liquid Glass tinted with the theme's raised surface, 24 pt corners.
struct InfoCard<Content: View>: View {
  @Environment(\.theme) private var theme
  var spacing: CGFloat = 14
  @ViewBuilder let content: Content

  var body: some View {
    VStack(alignment: .leading, spacing: spacing) {
      content
    }
    .padding(18)
    .frame(maxWidth: .infinity, alignment: .leading)
    .liquidGlass(in: RoundedRectangle(cornerRadius: 24, style: .continuous), tint: theme.bgTertiary.opacity(0.35), interactive: false)
  }
}

/// A card's heading: a small mark and an upper-case caption, as iOS titles its groups.
struct InfoHeading<Trailing: View>: View {
  @Environment(\.theme) private var theme
  let title: LocalizedStringKey
  let systemImage: String
  @ViewBuilder var trailing: Trailing

  var body: some View {
    HStack(spacing: 8) {
      Image(systemName: systemImage)
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(theme.icon)
      Text(title)
        .textCase(.uppercase)
        .font(.cera(.caption, .semibold))
        .tracking(0.6)
        .foregroundStyle(theme.textSecondary)
      Spacer(minLength: 8)
      trailing
    }
  }
}

extension InfoHeading where Trailing == EmptyView {
  init(title: LocalizedStringKey, systemImage: String) {
    self.init(title: title, systemImage: systemImage) { EmptyView() }
  }
}

// MARK: Chips

/// A capsule chip: a mark and a short text, 28 pt tall.
struct InfoLabel: View {
  @Environment(\.theme) private var theme

  enum Mark {
    case none
    case symbol(String)
    case github
    case jira
    case claudeCode
  }

  let text: Text
  var mark: Mark = .none
  /// Paints the mark and tints the ground, as a repository's colour does.
  var color: Color?

  var body: some View {
    HStack(spacing: 6) {
      markView
      text
        .font(.cera(.footnote, .medium))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .monospacedDigit()
    }
    .padding(.horizontal, 10)
    .frame(height: 28)
    .background(ground, in: Capsule())
  }

  @ViewBuilder
  private var markView: some View {
    switch mark {
    case .none:
      EmptyView()
    case .symbol(let name):
      Image(systemName: name)
        .font(.system(size: 12, weight: .semibold))
        .foregroundStyle(color ?? theme.icon)
        .frame(width: 16, height: 16)
    case .github:
      Image(.github).resizable().scaledToFit().frame(width: 15, height: 15).foregroundStyle(theme.ink)
    case .jira:
      Image(.jira).resizable().scaledToFit().frame(width: 15, height: 15)
    case .claudeCode:
      ClaudeCodeMark().frame(width: 16, height: 16)
    }
  }

  private var ground: Color {
    if let color { return color.opacity(0.16) }
    switch mark {
    case .jira: return Color(red: 38 / 255, green: 132 / 255, blue: 1).opacity(0.16)
    case .claudeCode: return ClaudeCodeMascot.coral.opacity(0.16)
    default: return theme.ink.opacity(0.07)
    }
  }
}

extension InfoLabel.Mark {
  init(ticketTone: DSLabel.Tone) {
    switch ticketTone {
    case .github: self = .github
    case .jira: self = .jira
    case .neutral: self = .none
    }
  }
}

/// The agent's status in its tone: a 28 pt capsule with a dot.
struct StatusChip: View {
  @Environment(\.theme) private var theme
  let status: String

  var body: some View {
    let style = StatusStyle.style(for: status)
    let color = status.isEmpty ? theme.textSecondary : style.tone.color(in: theme)
    HStack(spacing: 6) {
      Circle().fill(color).frame(width: 6, height: 6)
      Text(style.label)
        .font(.cera(.footnote, .semibold))
        .lineLimit(1)
    }
    .foregroundStyle(color)
    .padding(.horizontal, 10)
    .frame(height: 28)
    .background(Capsule().fill(color.opacity(status.isEmpty ? 0.1 : 0.16)))
  }
}

/// A capsule gauge: green, orange past the warning threshold, red past the danger one.
struct InfoProgressBar: View {
  @Environment(\.theme) private var theme
  let value: Double
  var height: CGFloat = 8
  let warning: Double
  let danger: Double

  var body: some View {
    GeometryReader { geo in
      let tone = Self.tone(value, warning: warning, danger: danger, theme: theme)
      ZStack(alignment: .leading) {
        Capsule().fill(theme.ink.opacity(0.08))
        Capsule()
          .fill(LinearGradient(colors: [tone.opacity(0.7), tone], startPoint: .leading, endPoint: .trailing))
          .frame(width: max(geo.size.width * min(max(value, 0), 100) / 100, value > 0 ? height : 0))
      }
    }
    .frame(height: height)
    .animation(.easeOut(duration: 0.5), value: value)
  }

  static func tone(_ value: Double, warning: Double, danger: Double, theme: ThemeTokens) -> Color {
    value >= danger ? theme.red : value >= warning ? theme.orange : theme.green
  }
}

// MARK: Context

/// Claude Code and its model, how much of the context is used, then the cost so far.
struct ContextInfoCard: View {
  @Environment(\.theme) private var theme
  let usage: RemoteUsage?

  private static let warning = 40.0
  private static let danger = 70.0

  var body: some View {
    let percent = usage?.contextPercent ?? 0
    let tone = InfoProgressBar.tone(percent, warning: Self.warning, danger: Self.danger, theme: theme)
    InfoCard {
      HStack(spacing: 8) {
        InfoLabel(text: Text(verbatim: "Claude Code"), mark: .claudeCode)
        if let model = usage?.model {
          InfoLabel(text: Text(verbatim: model), mark: .symbol("cpu"))
        }
        Spacer(minLength: 0)
      }
      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .firstTextBaseline) {
          Text(verbatim: "\(Int(percent.rounded()))%")
            .font(.cera(size: 34, .bold))
            .monospacedDigit()
            .foregroundStyle(tone)
            .contentTransition(.numericText())
          Text("of the context used")
            .font(.cera(.subheadline))
            .foregroundStyle(theme.textSecondary)
          Spacer(minLength: 8)
          if let cost = usage?.costUsd {
            Text(cost.formatted(.currency(code: "USD")))
              .font(.cera(.subheadline, .semibold))
              .monospacedDigit()
              .foregroundStyle(theme.ink)
          }
        }
        InfoProgressBar(value: percent, warning: Self.warning, danger: Self.danger)
      }
    }
  }
}

/// Claude Code's plan limits: the five-hour session and the seven-day window, each a gauge
/// with its reset.
struct LimitsInfoCard: View {
  @Environment(\.theme) private var theme
  let usage: RemoteUsage

  private static let warning = 65.0
  private static let danger = 85.0

  var body: some View {
    InfoCard(spacing: 16) {
      InfoHeading(title: "Limits", systemImage: "hourglass")
      bar(label: "Session", percent: usage.fiveHourPercent, resetsAt: usage.fiveHourResetsAt)
      bar(label: "Weekly", percent: usage.sevenDayPercent, resetsAt: usage.sevenDayResetsAt)
    }
  }

  private func bar(label: LocalizedStringKey, percent: Double?, resetsAt: Double?) -> some View {
    let value = percent ?? 0
    return VStack(spacing: 8) {
      HStack(alignment: .firstTextBaseline, spacing: 6) {
        Text(label)
          .font(.cera(.subheadline, .medium))
          .foregroundStyle(theme.ink)
        if let resetsAt, case let reset = Self.reset(Date(timeIntervalSince1970: resetsAt)), !reset.isEmpty {
          Text(verbatim: "· \(reset)")
            .font(.cera(.footnote))
            .foregroundStyle(theme.textSecondary)
        }
        Spacer()
        Text(verbatim: "\(Int(value.rounded()))%")
          .font(.cera(.subheadline, .semibold))
          .monospacedDigit()
          .foregroundStyle(InfoProgressBar.tone(value, warning: Self.warning, danger: Self.danger, theme: theme))
      }
      InfoProgressBar(value: value, warning: Self.warning, danger: Self.danger)
    }
  }

  /// "2h14" within the day, the weekday and time beyond it.
  private static func reset(_ date: Date) -> String {
    let left = date.timeIntervalSinceNow
    guard left > 0 else { return "" }
    if left < 24 * 3600 {
      let hours = Int(left) / 3600
      let minutes = (Int(left) % 3600) / 60
      return hours > 0 ? String(format: "%dh%02d", hours, minutes) : "\(minutes) min"
    }
    return date.formatted(.dateTime.weekday(.abbreviated).hour().minute())
  }
}

// MARK: Title

/// The ticket and the status, then the title and the description.
struct TitleInfoCard: View {
  @Environment(\.theme) private var theme
  let agent: Agent

  var body: some View {
    InfoCard(spacing: 12) {
      HStack(spacing: 8) {
        if let ticket = agent.ticketId {
          InfoLabel(text: Text(verbatim: ticket), mark: InfoLabel.Mark(ticketTone: DSLabel.Tone(ticketId: ticket)))
        } else {
          InfoLabel(text: Text("No ticket"), mark: .symbol("ticket"))
        }
        Spacer(minLength: 8)
        StatusChip(status: agent.status)
      }

      VStack(alignment: .leading, spacing: 6) {
        Text(verbatim: agent.title)
          .font(.cera(.title3, .bold))
          .foregroundStyle(theme.ink)
          .textSelection(.enabled)
        Group {
          if let description = agent.description, !description.isEmpty {
            Text(verbatim: description)
              .foregroundStyle(theme.textSecondary)
              .textSelection(.enabled)
          } else {
            Text("No description")
              .italic()
              .foregroundStyle(theme.textSecondary.opacity(0.6))
          }
        }
        .font(.cera(.subheadline))
        .lineSpacing(3)
      }
    }
  }
}

// MARK: Repository

/// A repository: its name in its colour, its branch against its base, and its pull request.
struct RepositoryInfoCard: View {
  @Environment(\.theme) private var theme
  let path: String
  let index: Int
  let agent: Agent

  /// `PROJECT_COLORS` (design-system/desktop/palette.ts), by position, as on the desktop.
  private static let palette: [Color] = {
    let hexes: [Int] = [0x3B82F6, 0x10B981, 0xF59E0B, 0xEF4444, 0x8B5CF6, 0xEC4899, 0x06B6D4, 0xF97316, 0x6366F1]
    return hexes.map { hex -> Color in
      let red = Double((hex >> 16) & 0xFF) / 255
      let green = Double((hex >> 8) & 0xFF) / 255
      let blue = Double(hex & 0xFF) / 255
      return Color(red: red, green: green, blue: blue)
    }
  }()

  var body: some View {
    let color = Self.palette[index % Self.palette.count]
    InfoCard {
      HStack(spacing: 12) {
        Image(systemName: "folder.fill")
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(color)
          .frame(width: 34, height: 34)
          .background(color.opacity(0.16), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        VStack(alignment: .leading, spacing: 1) {
          Text(verbatim: Self.repoName(path))
            .font(.cera(.headline))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          Text("Repository")
            .font(.cera(.caption))
            .foregroundStyle(theme.textSecondary)
        }
      }
      if let branch = agent.branchName {
        BranchRow(branch: branch, base: agent.baseBranch)
      }
      if let meta = agent.repositoryMetadata[path], meta.hasPullRequest {
        PullRequestInfo(meta: meta)
      }
    }
  }

  static func repoName(_ path: String) -> String {
    let trimmed = path.hasSuffix("/") ? String(path.dropLast()) : path
    return trimmed.split(separator: "/").last.map(String.init) ?? path
  }
}

/// The working branch in green with its copy button, and the base it started from.
private struct BranchRow: View {
  @Environment(\.theme) private var theme
  let branch: String
  let base: String?
  @State private var copied = false

  var body: some View {
    HStack(spacing: 10) {
      Image(systemName: "arrow.triangle.branch")
        .font(.system(size: 14, weight: .semibold))
        .foregroundStyle(theme.green)
        .frame(width: 20)
      VStack(alignment: .leading, spacing: 2) {
        Text(verbatim: branch)
          .font(.cera(.subheadline, .medium))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .truncationMode(.middle)
        if let base, base != branch {
          Text("from \(base)")
            .font(.cera(.caption))
            .foregroundStyle(theme.textSecondary)
            .lineLimit(1)
            .truncationMode(.middle)
        }
      }
      Spacer(minLength: 4)
      Button {
        Haptics.tap()
        UIPasteboard.general.string = branch
        copied = true
        Task {
          try? await Task.sleep(for: .seconds(1.5))
          copied = false
        }
      } label: {
        Image(systemName: copied ? "checkmark" : "doc.on.doc")
          .font(.system(size: 13, weight: .semibold))
          .foregroundStyle(copied ? theme.green : theme.icon)
          .frame(width: 36, height: 36)
          .background(theme.ink.opacity(0.07), in: Circle())
          .contentShape(Circle())
          .contentTransition(.symbolEffect(.replace))
      }
      .buttonStyle(.plain)
      .accessibilityLabel("Copy branch name")
    }
    .padding(.leading, 12)
    .padding(.trailing, 6)
    .padding(.vertical, 6)
    .background(theme.ink.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
  }
}

// MARK: Pull request

/// The pull request, inset in its repository's card: a header that opens it, then one row
/// per fact: comments, checks, mergeable, merged.
private struct PullRequestInfo: View {
  @Environment(\.theme) private var theme
  @Environment(\.openURL) private var openURL
  let meta: RepositoryMetadata

  @State private var commentsOpen = false
  @State private var checksOpen: Bool

  init(meta: RepositoryMetadata) {
    self.meta = meta
    let checks = meta.prChecks
    _checksOpen = State(initialValue: (checks?.failed ?? 0) > 0 || (checks?.running ?? 0) > 0)
  }

  var body: some View {
    VStack(spacing: 0) {
      header
      bands
    }
    .background(theme.ink.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
  }

  // MARK: Header

  private var header: some View {
    Button {
      guard let url = meta.prUrl else { return }
      Haptics.tap()
      openURL(url)
    } label: {
      HStack(spacing: 10) {
        Image(systemName: stateIcon)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(stateColor)
          .frame(width: 20)
        VStack(alignment: .leading, spacing: 2) {
          (prNumber.map { Text(verbatim: "PR #\($0)") } ?? Text("Pull request"))
            .font(.cera(.subheadline, .semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          if let slug {
            Text(verbatim: slug)
              .font(.cera(.caption))
              .foregroundStyle(theme.textSecondary)
              .lineLimit(1)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        badge
        if meta.prUrl != nil {
          Image(systemName: "arrow.up.right")
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(theme.iconMuted)
        }
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 12)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
  }

  /// The review verdict while the PR is open and has one, its state otherwise.
  private var badge: some View {
    let (label, color): (String, Color?) = {
      if meta.effectiveState == .open, let review = meta.prReviewStatus {
        switch review {
        case .approved: return (String(localized: "Approved"), theme.green)
        case .changesRequested: return (String(localized: "Changes requested"), theme.red)
        case .commented: return (String(localized: "Commented"), theme.blue)
        case .pending: return (String(localized: "Review pending"), theme.yellow)
        }
      }
      switch meta.effectiveState {
      case .open: return (String(localized: "Open"), theme.green)
      case .draft: return (String(localized: "Draft"), nil)
      case .merged: return (String(localized: "Merged"), theme.purple)
      case .closed: return (String(localized: "Closed"), theme.red)
      case .none: return (String(localized: "Open"), nil)
      }
    }()
    return Text(verbatim: label)
      .font(.cera(.caption, .semibold))
      .foregroundStyle(color ?? theme.textSecondary)
      .padding(.horizontal, 10)
      .frame(height: 24)
      .background((color?.opacity(0.16) ?? theme.ink.opacity(0.08)), in: Capsule())
      .fixedSize()
  }

  private var stateIcon: String {
    switch meta.effectiveState {
    case .merged: "arrow.triangle.merge"
    case .closed: "xmark.circle"
    default: "arrow.triangle.pull"
    }
  }

  private var stateColor: Color {
    switch meta.effectiveState {
    case .open: theme.green
    case .draft, .none: theme.textSecondary
    case .merged: theme.purple
    case .closed: theme.red
    }
  }

  /// `owner/repo` and the number, from a GitHub PR URL.
  private var urlParts: [String] {
    meta.prUrl?.pathComponents.filter { $0 != "/" } ?? []
  }

  private var slug: String? {
    urlParts.count >= 2 ? "\(urlParts[0])/\(urlParts[1])" : nil
  }

  private var prNumber: String? {
    urlParts.count >= 4 && urlParts[2] == "pull" ? urlParts[3] : nil
  }

  // MARK: Bands

  @ViewBuilder
  private var bands: some View {
    if let comments = meta.prReviewCommentCount, comments > 0 || !meta.prReviewers.isEmpty {
      band {
        Band(
          systemImage: "bubble.left.and.bubble.right",
          tone: theme.blue,
          muted: true,
          label: "Comments",
          isOpen: meta.prReviewers.isEmpty ? nil : $commentsOpen
        ) {
          Text("\(comments) comments")
            .font(.cera(.footnote))
            .monospacedDigit()
            .foregroundStyle(theme.textSecondary)
        } content: {
          HStack(alignment: .top, spacing: 8) {
            Image(systemName: "person.2")
              .font(.system(size: 12))
              .foregroundStyle(theme.icon)
              .frame(width: 20)
            Text(verbatim: meta.prReviewers.joined(separator: ", "))
              .font(.cera(.footnote))
              .foregroundStyle(theme.textSecondary)
          }
        }
      }
    }
    checksBand
    if meta.effectiveState == .open || meta.effectiveState == .draft {
      band { mergeableBand }
    }
    if meta.effectiveState == .merged {
      band {
        Band(systemImage: "checkmark.circle", tone: theme.purple, muted: true, label: "Merged") {
          EmptyView()
        } content: {
          EmptyView()
        }
      }
    }
  }

  @ViewBuilder
  private var checksBand: some View {
    let summary = meta.prChecks
    let total = summary?.total ?? 0
    band {
      if let summary, total > 0 {
        let (icon, tone, muted): (String, Color, Bool) =
          summary.failed > 0 ? ("xmark.circle", theme.red, false)
          : summary.running > 0 ? ("arrow.trianglehead.2.clockwise", theme.blue, false)
          : ("checkmark.circle", theme.green, true)
        Band(systemImage: icon, tone: tone, muted: muted, label: "Checks", isOpen: meta.prCheckList.isEmpty ? nil : $checksOpen) {
          HStack(spacing: 6) {
            ChecksRing(summary: summary)
            Text("\(summary.passed)/\(summary.total) passed")
              .font(.cera(.footnote))
              .monospacedDigit()
              .foregroundStyle(theme.textSecondary)
          }
        } content: {
          VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(meta.prCheckList.enumerated()), id: \.offset) { _, check in
              HStack(spacing: 8) {
                Image(systemName: Self.checkIcon(check.state))
                  .font(.system(size: 12, weight: .medium))
                  .foregroundStyle(checkColor(check.state))
                  .frame(width: 20)
                Text(verbatim: check.name)
                  .font(.cera(.footnote))
                  .foregroundStyle(theme.textSecondary)
                  .lineLimit(1)
              }
            }
          }
        }
      } else {
        Band(systemImage: "minus.circle", tone: theme.textSecondary, muted: true, label: "No checks") {
          EmptyView()
        } content: {
          EmptyView()
        }
      }
    }
  }

  @ViewBuilder
  private var mergeableBand: some View {
    switch meta.prMergeable {
    case .some(true):
      Band(systemImage: "checkmark.circle", tone: theme.green, muted: true, label: "Mergeable") { EmptyView() } content: { EmptyView() }
    case .some(false):
      Band(systemImage: "exclamationmark.triangle", tone: theme.red, muted: false, label: "Conflicts") { EmptyView() } content: { EmptyView() }
    case .none:
      Band(systemImage: "circle", tone: theme.textSecondary, muted: true, label: "Mergeability unknown") { EmptyView() } content: { EmptyView() }
    }
  }

  /// Each row under a hairline, inset past the icons as iOS lists draw theirs.
  private func band<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
    VStack(spacing: 0) {
      Rectangle().fill(theme.lineSubtle).frame(height: 1).padding(.leading, 42)
      content()
    }
  }

  private func checkColor(_ state: RepositoryMetadata.Check.State?) -> Color {
    switch state {
    case .passed: theme.green
    case .failed: theme.red
    case .running: theme.blue
    case .skipped, .none: theme.iconMuted
    }
  }

  private static func checkIcon(_ state: RepositoryMetadata.Check.State?) -> String {
    switch state {
    case .passed: "checkmark.circle"
    case .failed: "xmark.circle"
    case .running: "arrow.trianglehead.2.clockwise"
    case .skipped, .none: "minus.circle"
    }
  }
}

/// A 44 pt row: its mark in the row's tone, its label, a detail on the right, and a chevron
/// when it folds open.
private struct Band<Detail: View, Content: View>: View {
  @Environment(\.theme) private var theme
  let systemImage: String
  let tone: Color
  let muted: Bool
  let label: LocalizedStringKey
  var isOpen: Binding<Bool>?
  @ViewBuilder let detail: Detail
  @ViewBuilder let content: Content

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      Button {
        guard let isOpen else { return }
        Haptics.tap()
        withAnimation(.snappy(duration: 0.25)) { isOpen.wrappedValue.toggle() }
      } label: {
        HStack(spacing: 10) {
          Image(systemName: systemImage)
            .font(.system(size: 14, weight: .medium))
            .foregroundStyle(tone)
            .frame(width: 20)
          Text(label)
            .font(.cera(.subheadline, .medium))
            .foregroundStyle(muted ? theme.ink : tone)
            .lineLimit(1)
          Spacer(minLength: 4)
          detail
          if let isOpen {
            Image(systemName: "chevron.right")
              .font(.system(size: 11, weight: .bold))
              .foregroundStyle(theme.iconMuted)
              .rotationEffect(.degrees(isOpen.wrappedValue ? 90 : 0))
          }
        }
        .frame(minHeight: 44)
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .disabled(isOpen == nil)

      if isOpen?.wrappedValue == true {
        content
          .padding(.bottom, 12)
          .transition(.opacity.combined(with: .move(edge: .top)))
      }
    }
    .padding(.horizontal, 12)
  }
}

/// The checks' ring: passed, skipped, running and failed arcs, in that order.
private struct ChecksRing: View {
  @Environment(\.theme) private var theme
  let summary: RepositoryMetadata.Checks

  var body: some View {
    let total = max(Double(summary.total), 1)
    let parts: [(Double, Color)] = [
      (Double(summary.passed), theme.green),
      (Double(summary.skipped), theme.iconMuted),
      (Double(summary.running), theme.blue),
      (Double(summary.failed), theme.red),
    ]
    ZStack {
      Circle().stroke(theme.ink.opacity(0.1), lineWidth: 3)
      ForEach(Array(parts.enumerated()), id: \.offset) { index, part in
        let start = parts.prefix(index).reduce(0) { $0 + $1.0 } / total
        Circle()
          .trim(from: start, to: start + part.0 / total)
          .stroke(part.1, lineWidth: 3)
      }
    }
    .rotationEffect(.degrees(-90))
    .frame(width: 14, height: 14)
  }
}

// MARK: Spec

/// The plan behind a planner agent: its number and status over its title, then the spec.
struct SpecInfoCard<Body: View>: View {
  @Environment(\.theme) private var theme
  let planNumber: Int?
  let status: String?
  let title: String?
  @ViewBuilder let content: Body

  var body: some View {
    InfoCard(spacing: 14) {
      HStack(spacing: 8) {
        if let planNumber {
          InfoLabel(text: Text(verbatim: "Plan #\(planNumber)"), mark: .symbol("book.closed"))
        } else {
          InfoLabel(text: Text("No plan"), mark: .symbol("book.closed"))
        }
        Spacer(minLength: 8)
        if let status {
          Text(verbatim: status)
            .font(.cera(.footnote, .semibold))
            .foregroundStyle(theme.cyan)
            .padding(.horizontal, 10)
            .frame(height: 28)
            .background(Capsule().fill(theme.cyan.opacity(0.16)))
        }
      }
      Text(verbatim: title ?? String(localized: "Untitled plan"))
        .font(.cera(.title3, .bold))
        .foregroundStyle(theme.ink)
      Rectangle().fill(theme.lineSubtle).frame(height: 1)
      content
        .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}
