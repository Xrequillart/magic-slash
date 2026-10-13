import SwiftUI
import UIKit

// The desktop's agent info column (design-system/desktop/SidebarAgentCoderInfo.tsx), card
// for card, read only: the iPhone shows what the desktop edits. Geometry and grounds follow
// the design system's classes, noted beside each value.

// MARK: Shell

extension ThemeTokens {
  /// `RAISED_PLATE` (design-system/desktop/plate.ts): the tertiary ground mixed toward ink
  /// by the theme's plate lift. The ground of every card in the column.
  var raisedPlate: Color {
    let base = UIColor(bgTertiary)
    let toward = UIColor(ink)
    var (r1, g1, b1, a1): (CGFloat, CGFloat, CGFloat, CGFloat) = (0, 0, 0, 0)
    var (r2, g2, b2, a2): (CGFloat, CGFloat, CGFloat, CGFloat) = (0, 0, 0, 0)
    base.getRed(&r1, green: &g1, blue: &b1, alpha: &a1)
    toward.getRed(&r2, green: &g2, blue: &b2, alpha: &a2)
    let t = CGFloat(plateLift)
    return Color(.sRGB, red: r1 + (r2 - r1) * t, green: g1 + (g2 - g1) * t, blue: b1 + (b2 - b1) * t)
  }
}

/// `Card ground="raised"`: 12 pt radius, no border, no shadow.
struct InfoCard<Content: View>: View {
  @Environment(\.theme) private var theme
  var padding: CGFloat = 16
  var spacing: CGFloat = 8
  @ViewBuilder let content: Content

  var body: some View {
    VStack(alignment: .leading, spacing: spacing) {
      content
    }
    .padding(padding)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(theme.raisedPlate, in: RoundedRectangle(cornerRadius: 12))
  }
}

// MARK: Chips

/// The design system's `Label` (Label.tsx) at `sm`: 24 pt tall, 8 pt sides, 6 pt gap,
/// 8 pt radius, 12 pt text, 14 pt mark.
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
  /// Paints the mark and tints the ground at 12%, as a repository's colour does.
  var color: Color?

  var body: some View {
    HStack(spacing: 6) {
      markView
      text
        .font(.cera(size: 12, .medium))
        .foregroundStyle(theme.ink)
        .lineLimit(1)
        .monospacedDigit()
    }
    .padding(.horizontal, 8)
    .frame(height: 24)
    .background(ground, in: RoundedRectangle(cornerRadius: 8))
  }

  @ViewBuilder
  private var markView: some View {
    switch mark {
    case .none:
      EmptyView()
    case .symbol(let name):
      Image(systemName: name)
        .font(.system(size: 12, weight: .medium))
        .foregroundStyle(color ?? theme.iconMuted)
        .frame(width: 14, height: 14)
    case .github:
      Image(.github).resizable().scaledToFit().frame(width: 14, height: 14).foregroundStyle(theme.ink)
    case .jira:
      Image(.jira).resizable().scaledToFit().frame(width: 14, height: 14)
    case .claudeCode:
      ClaudeCodeMark().frame(width: 14, height: 14)
    }
  }

  private var ground: Color {
    if let color { return color.opacity(0.12) }
    switch mark {
    case .jira: return Color(red: 38 / 255, green: 132 / 255, blue: 1).opacity(0.14)
    case .claudeCode: return ClaudeCodeMascot.coral.opacity(0.14)
    default: return theme.ink.opacity(0.05)
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

/// `Status` at `sm` (Status.tsx): a 24 pt capsule, 10 pt sides, 12 pt text.
struct StatusChip: View {
  @Environment(\.theme) private var theme
  let status: String

  var body: some View {
    let style = StatusStyle.style(for: status)
    let color = style.tone.color(in: theme)
    let neutral = status.isEmpty
    Text(style.label)
      .font(.cera(size: 12, .medium))
      .lineLimit(1)
      .foregroundStyle(neutral ? theme.textSecondary : color)
      .padding(.horizontal, 10)
      .frame(height: 24)
      .background(
        Capsule().fill(neutral ? theme.surfaceStrong : color.opacity(style.strength == .soft ? 0.1 : 0.2))
      )
  }
}

/// `ProgressBar` (ProgressBar.tsx): a capsule track and fill, green, orange past the
/// warning threshold, red past the danger one.
struct InfoProgressBar: View {
  @Environment(\.theme) private var theme
  let value: Double
  var height: CGFloat = 6
  var track: Color?
  let warning: Double
  let danger: Double

  var body: some View {
    GeometryReader { geo in
      ZStack(alignment: .leading) {
        Capsule().fill(track ?? theme.surface)
        Capsule()
          .fill(Self.tone(value, warning: warning, danger: danger, theme: theme))
          .frame(width: geo.size.width * min(max(value, 0), 100) / 100)
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

/// `ContextAgentCard`: Claude Code and its model, the context gauge, then the cost.
struct ContextInfoCard: View {
  @Environment(\.theme) private var theme
  let usage: RemoteUsage?

  private static let warning = 40.0
  private static let danger = 70.0

  var body: some View {
    let percent = usage?.contextPercent ?? 0
    InfoCard {
      HStack(spacing: 6) {
        InfoLabel(text: Text(verbatim: "Claude Code"), mark: .claudeCode)
        if let model = usage?.model {
          InfoLabel(text: Text(verbatim: model), mark: .symbol("cpu"))
        }
      }
      VStack(spacing: 6) {
        HStack {
          HStack(spacing: 6) {
            Image(systemName: "gauge.with.dots.needle.33percent")
              .font(.system(size: 12))
              .foregroundStyle(theme.icon)
              .frame(width: 14, height: 14)
            Text("Context")
              .font(.cera(size: 12, .medium))
              .foregroundStyle(theme.textSecondary)
          }
          Spacer()
          Text(verbatim: "\(Int(percent.rounded()))%")
            .font(.cera(size: 12, .medium))
            .monospacedDigit()
            .foregroundStyle(InfoProgressBar.tone(percent, warning: Self.warning, danger: Self.danger, theme: theme))
        }
        InfoProgressBar(value: percent, track: theme.surfaceSunken, warning: Self.warning, danger: Self.danger)
      }
      .padding(8)
      if let cost = usage?.costUsd {
        InfoLabel(text: Text(cost.formatted(.currency(code: "USD"))), mark: .symbol("dollarsign"))
      }
    }
  }
}

/// `UsageClaudeCodeCard` (the desktop's sidebar foot): the five-hour session and the
/// seven-day window, each a bar with its reset.
struct LimitsInfoCard: View {
  @Environment(\.theme) private var theme
  let usage: RemoteUsage

  private static let warning = 65.0
  private static let danger = 85.0

  var body: some View {
    InfoCard(padding: 12) {
      InfoLabel(text: Text(verbatim: "Claude Code"), mark: .claudeCode)
        .padding(.bottom, 2)
      VStack(spacing: 8) {
        bar(label: "Session", percent: usage.fiveHourPercent, resetsAt: usage.fiveHourResetsAt)
        bar(label: "Weekly", percent: usage.sevenDayPercent, resetsAt: usage.sevenDayResetsAt)
      }
    }
  }

  private func bar(label: LocalizedStringKey, percent: Double?, resetsAt: Double?) -> some View {
    let value = percent ?? 0
    return VStack(spacing: 4) {
      HStack(spacing: 6) {
        Text(label)
          .font(.cera(size: 12, .medium))
          .foregroundStyle(theme.textSecondary)
          .opacity(0.6)
        Spacer()
        if let resetsAt {
          Text(Self.reset(Date(timeIntervalSince1970: resetsAt)))
            .font(.cera(size: 11, .medium))
            .foregroundStyle(theme.textSecondary.opacity(0.35))
        }
        Text(verbatim: "\(Int(value.rounded()))%")
          .font(.cera(size: 12, .semibold))
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

/// `TitleAgentCard`: the ticket and the status, then the title and the description.
struct TitleInfoCard: View {
  @Environment(\.theme) private var theme
  let agent: Agent

  var body: some View {
    InfoCard(spacing: 0) {
      HStack(spacing: 8) {
        if let ticket = agent.ticketId {
          InfoLabel(text: Text(verbatim: ticket), mark: InfoLabel.Mark(ticketTone: DSLabel.Tone(ticketId: ticket)))
        } else {
          InfoLabel(text: Text("No ticket"), mark: .symbol("ticket"))
        }
        Spacer(minLength: 8)
        StatusChip(status: agent.status)
      }
      .padding(.bottom, 12)

      Text(verbatim: agent.title)
        .font(.cera(size: 14, .semibold))
        .foregroundStyle(theme.ink)
        .lineSpacing(1)
        .padding(.horizontal, 8)
        .textSelection(.enabled)

      Group {
        if let description = agent.description, !description.isEmpty {
          Text(verbatim: description)
            .foregroundStyle(theme.ink.opacity(0.7))
            .textSelection(.enabled)
        } else {
          Text("No description")
            .italic()
            .foregroundStyle(theme.textSecondary.opacity(0.4))
        }
      }
      .font(.cera(size: 12, .medium))
      .lineSpacing(7.5)
      .padding(.horizontal, 8)
      .padding(.top, 4)
    }
  }
}

// MARK: Repository

/// `RepositoryCard`: the repository, its branch against its base, and its pull request.
struct RepositoryInfoCard: View {
  @Environment(\.theme) private var theme
  let path: String
  let index: Int
  let agent: Agent

  /// `PROJECT_COLORS` (design-system/desktop/palette.ts), by position.
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
    InfoCard {
      InfoLabel(
        text: Text(verbatim: Self.repoName(path)),
        mark: .symbol("folder"),
        color: Self.palette[index % Self.palette.count]
      )
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

/// `BranchCard`: the base branch, an arrow, and the working branch in green with its copy
/// button.
private struct BranchRow: View {
  @Environment(\.theme) private var theme
  let branch: String
  let base: String?
  @State private var copied = false

  var body: some View {
    HStack(spacing: 6) {
      if let base, base != branch {
        chip(base, color: theme.textSecondary)
        Image(systemName: "arrow.right")
          .font(.system(size: 10, weight: .semibold))
          .foregroundStyle(theme.iconMuted)
      }
      HStack(spacing: 6) {
        chipContent(branch, color: theme.green)
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
            .font(.system(size: 10, weight: .semibold))
            .foregroundStyle(copied ? theme.green : theme.icon)
            .frame(width: 20, height: 20)
            .contentShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Copy branch name")
      }
      .padding(.leading, 8)
      .padding(.trailing, 4)
      .padding(.vertical, 4)
      .background(theme.ink.opacity(0.05), in: RoundedRectangle(cornerRadius: 8))
      .frame(maxWidth: .infinity)
    }
  }

  private func chip(_ name: String, color: Color) -> some View {
    chipContent(name, color: color)
      .padding(.horizontal, 8)
      // As tall as the working branch's chip beside it, whose copy button sets it.
      .frame(height: 28)
      .background(theme.ink.opacity(0.05), in: RoundedRectangle(cornerRadius: 8))
  }

  private func chipContent(_ name: String, color: Color) -> some View {
    HStack(spacing: 6) {
      Image(systemName: "arrow.triangle.branch")
        .font(.system(size: 12, weight: .medium))
        .frame(width: 14, height: 14)
      Text(verbatim: name)
        .font(.cera(size: 12, .medium))
        .lineLimit(1)
        .truncationMode(.middle)
    }
    .foregroundStyle(color)
  }
}

// MARK: Pull request

/// `PullRequestCard`: an inset block at the foot of the repository card. A header that
/// opens the PR, then one band per fact: comments, checks, mergeable, merged.
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
    .background(theme.ink.opacity(0.05), in: RoundedRectangle(cornerRadius: 8))
    .clipShape(RoundedRectangle(cornerRadius: 8))
  }

  // MARK: Header

  private var header: some View {
    Button {
      guard let url = meta.prUrl else { return }
      Haptics.tap()
      openURL(url)
    } label: {
      HStack(spacing: 8) {
        Image(systemName: stateIcon)
          .font(.system(size: 14, weight: .medium))
          .foregroundStyle(stateColor)
          .frame(width: 16)
        VStack(alignment: .leading, spacing: 0) {
          (prNumber.map { Text(verbatim: "PR #\($0)") } ?? Text("Pull request"))
            .font(.cera(size: 12, .medium))
            .foregroundStyle(theme.ink.opacity(0.9))
            .lineLimit(1)
          if let slug {
            Text(verbatim: slug)
              .font(.cera(size: 10, .medium))
              .foregroundStyle(theme.textSecondary.opacity(0.5))
              .lineLimit(1)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        badge
      }
      .padding(8)
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
      .font(.cera(size: 10, .semibold))
      .foregroundStyle(color ?? theme.textSecondary)
      .padding(.horizontal, 8)
      .frame(height: 20)
      .background((color?.opacity(0.1) ?? theme.surfaceStrong), in: RoundedRectangle(cornerRadius: 8))
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
            .font(.cera(size: 10, .medium))
            .monospacedDigit()
            .foregroundStyle(theme.textSecondary.opacity(0.6))
        } content: {
          HStack(alignment: .top, spacing: 6) {
            Image(systemName: "person.2")
              .font(.system(size: 10))
              .foregroundStyle(theme.icon)
              .padding(.top, 1)
            Text(verbatim: meta.prReviewers.joined(separator: ", "))
              .font(.cera(size: 10, .medium))
              .foregroundStyle(theme.textSecondary.opacity(0.7))
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
              .font(.cera(size: 10, .medium))
              .monospacedDigit()
              .foregroundStyle(theme.textSecondary.opacity(0.6))
          }
        } content: {
          VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(meta.prCheckList.enumerated()), id: \.offset) { _, check in
              HStack(spacing: 6) {
                Image(systemName: Self.checkIcon(check.state))
                  .font(.system(size: 10, weight: .medium))
                  .foregroundStyle(checkColor(check.state))
                  .frame(width: 12)
                Text(verbatim: check.name)
                  .font(.cera(size: 10, .medium))
                  .foregroundStyle(theme.textSecondary.opacity(0.7))
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

  /// Each band under a 1 pt `line-subtle` rule.
  private func band<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
    VStack(spacing: 0) {
      Rectangle().fill(theme.lineSubtle).frame(height: 1)
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

/// `CollapsibleLine`: a 36 pt row, its mark in the band's tone, its label, a detail on the
/// right, and a chevron when it folds open.
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
        withAnimation(.easeOut(duration: 0.2)) { isOpen.wrappedValue.toggle() }
      } label: {
        HStack(spacing: 8) {
          Image(systemName: systemImage)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(tone)
            .frame(width: 16)
          Text(label)
            .font(.cera(size: 12, .medium))
            .foregroundStyle(muted ? theme.textSecondary.opacity(0.7) : tone)
            .lineLimit(1)
          Spacer(minLength: 4)
          detail
          if let isOpen {
            Image(systemName: "chevron.down")
              .font(.system(size: 10, weight: .semibold))
              .foregroundStyle(theme.icon)
              .rotationEffect(.degrees(isOpen.wrappedValue ? 0 : -90))
          }
        }
        .frame(height: 36)
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .disabled(isOpen == nil)

      if isOpen?.wrappedValue == true {
        content
          .padding(.bottom, 10)
          .transition(.opacity)
      }
    }
    .padding(.horizontal, 12)
    .background(isOpen?.wrappedValue == true ? theme.surface : .clear)
  }
}

/// The checks' ring: passed, skipped, running and failed arcs, in that order, on a
/// `line-subtle` track.
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
      Circle().stroke(theme.lineSubtle, lineWidth: 2.6)
      ForEach(Array(parts.enumerated()), id: \.offset) { index, part in
        let start = parts.prefix(index).reduce(0) { $0 + $1.0 } / total
        Circle()
          .trim(from: start, to: start + part.0 / total)
          .stroke(part.1, lineWidth: 2.6)
      }
    }
    .rotationEffect(.degrees(-90))
    .frame(width: 12, height: 12)
  }
}

// MARK: Spec

/// `SpecCard` (planner agents): the plan and its status over the title, then the spec
/// itself under a rule.
struct SpecInfoCard<Body: View>: View {
  @Environment(\.theme) private var theme
  let planNumber: Int?
  let status: String?
  let title: String?
  @ViewBuilder let content: Body

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      VStack(alignment: .leading, spacing: 12) {
        HStack(spacing: 8) {
          if let planNumber {
            InfoLabel(text: Text(verbatim: "Plan #\(planNumber)"))
          } else {
            InfoLabel(text: Text("No plan"), mark: .symbol("book.closed"))
          }
          Spacer(minLength: 8)
          if let status {
            Text(verbatim: status)
              .font(.cera(size: 12, .medium))
              .foregroundStyle(theme.cyan)
              .padding(.horizontal, 10)
              .frame(height: 24)
              .background(Capsule().fill(theme.cyan.opacity(0.1)))
          }
        }
        Text(verbatim: title ?? String(localized: "Untitled plan"))
          .font(.cera(size: 14, .semibold))
          .foregroundStyle(theme.ink)
          .padding(.horizontal, 8)
      }
      .padding(16)
      Rectangle().fill(theme.line).frame(height: 1)
      content
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .background(theme.raisedPlate, in: RoundedRectangle(cornerRadius: 12))
  }
}
