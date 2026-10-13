import SwiftUI

/// Label and tone of a runtime state, after `stateLabel` in
/// desktop/src/renderer/pages/TrayPopover/index.tsx (`agentState.*` in desktop/src/i18n/en.ts).
enum RuntimeStyle {
  static func label(_ state: String) -> String {
    switch state {
    case "working": "Working"
    case "waiting": "Waiting for input"
    case "idle": "Idle"
    case "completed": "Completed"
    case "error": "Error"
    // A state this build does not know still shows, as sent.
    default: state
    }
  }

  static func tone(_ state: String) -> StatusTone {
    switch state {
    case "working": .yellow
    case "waiting": .orange
    case "completed": .green
    case "error": .red
    default: .neutral
    }
  }
}

/// The agent's runtime state. A last known state (Mac offline) is dimmed and marked with a
/// clock, so it never reads as the current one.
struct RuntimePill: View {
  @Environment(\.theme) private var theme
  let runtime: AgentRuntime

  var body: some View {
    let color = RuntimeStyle.tone(runtime.state).color(in: theme)
    HStack(spacing: 4) {
      if !runtime.isCurrent {
        Image(systemName: "clock.arrow.circlepath")
          .font(.caption2.weight(.semibold))
      }
      Text(RuntimeStyle.label(runtime.state))
        .font(.caption.weight(.semibold))
        .lineLimit(1)
    }
    .foregroundStyle(color)
    .padding(.horizontal, 8)
    .padding(.vertical, 3)
    .background(Capsule().fill(color.opacity(runtime.isCurrent ? 0.2 : 0.08)))
    .overlay {
      if !runtime.isCurrent {
        Capsule().strokeBorder(color.opacity(0.35), style: StrokeStyle(lineWidth: 1, dash: [3, 2]))
      }
    }
    .opacity(runtime.isCurrent ? 1 : 0.6)
    .accessibilityElement(children: .ignore)
    .accessibilityLabel(runtime.isCurrent
      ? RuntimeStyle.label(runtime.state)
      : "Last known: \(RuntimeStyle.label(runtime.state))")
  }
}

/// Above the agent list: each paired Mac online or not, and anything blocking the relay
/// (Face ID to confirm, pairings to redo).
struct MacPresenceBanner: View {
  @Environment(\.theme) private var theme

  let relay: RelayStore
  let onPair: () -> Void

  var body: some View {
    let statuses = relay.statuses()
    if !statuses.isEmpty || relay.needsRepair {
      VStack(alignment: .leading, spacing: 10) {
        if relay.needsRepair {
          notice(
            icon: "faceid",
            text: "Face ID changed on this iPhone, so its Macs were unpaired. Pair your Mac again.",
            action: ("Pair a Mac", onPair)
          )
        }
        keyNotice
        ForEach(statuses) { status in
          MacLine(status: status, now: relay.now)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 10)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(theme.bg)
      .overlay(alignment: .bottom) {
        Rectangle().fill(theme.lineSubtle).frame(height: 1)
      }
    }
  }

  @ViewBuilder
  private var keyNotice: some View {
    switch relay.keyState {
    case .locked(let message):
      notice(icon: "lock", text: message, action: ("Unlock", { Task { await relay.unlock() } }))
    case .unavailable(let message):
      notice(icon: "exclamationmark.triangle", text: message, action: nil)
    case .unlocking:
      HStack(spacing: 8) {
        ProgressView().controlSize(.small).tint(theme.textSecondary)
        Text("Unlocking the link to your Mac…")
          .font(.footnote)
          .foregroundStyle(theme.textSecondary)
      }
    case .idle, .unlocked:
      EmptyView()
    }
  }

  private func notice(icon: String, text: String, action: (String, () -> Void)?) -> some View {
    HStack(alignment: .firstTextBaseline, spacing: 8) {
      Image(systemName: icon)
        .font(.footnote)
        .foregroundStyle(theme.yellow)
      Text(text)
        .font(.footnote)
        .foregroundStyle(theme.ink)
        .frame(maxWidth: .infinity, alignment: .leading)
      if let action {
        Button(action.0, action: action.1)
          .font(.footnote.weight(.semibold))
          .foregroundStyle(theme.accent)
      }
    }
  }
}

/// One paired Mac: name, and whether it is online right now.
struct MacLine: View {
  @Environment(\.theme) private var theme
  let status: RelayStore.MacStatus
  let now: Date

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 8) {
      Circle()
        .fill(status.isOnline ? theme.green : theme.textSecondary.opacity(0.5))
        .frame(width: 8, height: 8)
        .alignmentGuide(.firstTextBaseline) { $0[.bottom] - 1 }
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 6) {
          Image(systemName: "laptopcomputer")
            .font(.footnote)
            .foregroundStyle(theme.iconMuted)
          Text(status.name)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          Spacer(minLength: 4)
          Text(status.isOnline ? "Online" : "Offline")
            .font(.footnote.weight(.semibold))
            .foregroundStyle(status.isOnline ? theme.green : theme.textSecondary)
        }
        if !status.isOnline {
          Text(offlineDetail)
            .font(.caption)
            .foregroundStyle(theme.textSecondary)
        }
      }
    }
    .accessibilityElement(children: .combine)
  }

  private var offlineDetail: String {
    guard let last = status.lastUpdate else { return "Waiting for the Mac to send its state." }
    let ago = last.formatted(.relative(presentation: .named, unitsStyle: .wide))
    return "Showing the last known state, from \(ago)."
  }
}

/// The detail screen's live block: runtime state, and whether it is current.
struct LiveSection: View {
  @Environment(\.theme) private var theme
  let runtime: AgentRuntime?
  let hasPairedMac: Bool

  var body: some View {
    SectionCard(title: "Live") {
      if let runtime {
        HStack(spacing: 6) {
          RuntimePill(runtime: runtime)
          Spacer(minLength: 4)
          Text(runtime.isCurrent ? "Current" : "Last known state")
            .font(.caption.weight(.semibold))
            .foregroundStyle(runtime.isCurrent ? theme.green : theme.textSecondary)
        }
        LabeledLine(label: "Mac", value: runtime.macName)
        LabeledLine(label: "Updated", value: runtime.updatedAt.formatted(.relative(presentation: .named, unitsStyle: .wide)))
        if !runtime.isCurrent {
          EmptyLine(text: "\(runtime.macName) is offline. This state may have changed since.")
        }
      } else if hasPairedMac {
        EmptyLine(text: "Not running on a paired Mac right now")
      } else {
        EmptyLine(text: "Pair a Mac from the account menu to follow this agent live")
      }
    }
  }
}

/// Claude Code's status line figures for the agent, as its Mac last reported them.
struct UsageSection: View {
  let runtime: AgentRuntime?

  var body: some View {
    SectionCard(title: "Usage") {
      if let usage = runtime?.usage {
        LabeledLine(label: "Cost", value: usage.costUsd.map { $0.formatted(.currency(code: "USD")) })
        LabeledLine(label: "Context", value: usage.contextPercent.map(Self.percent))
        LabeledLine(label: "Model", value: usage.model)
        LabeledLine(label: "5h limit", value: Self.limit(usage.fiveHourPercent, usage.fiveHourResetsAt))
        LabeledLine(label: "7d limit", value: Self.limit(usage.sevenDayPercent, usage.sevenDayResetsAt))
        if runtime?.isCurrent == false {
          EmptyLine(text: "Last known figures")
        }
      } else {
        EmptyLine(text: "No usage reported yet")
      }
    }
  }

  private static func percent(_ value: Double) -> String {
    "\(Int(value.rounded()))%"
  }

  /// `12%, resets 14:00`, with the day when the reset is not within the next 24 hours.
  private static func limit(_ percent: Double?, _ resetsAt: Double?) -> String? {
    let reset = resetsAt.map { Date(timeIntervalSince1970: $0) }
    let resetText = reset.map { date -> String in
      let soon = date.timeIntervalSinceNow < 24 * 3600
      let time = soon
        ? date.formatted(date: .omitted, time: .shortened)
        : date.formatted(.dateTime.weekday(.abbreviated).hour().minute())
      return "resets \(time)"
    }
    switch (percent.map(Self.percent), resetText) {
    case let (p?, r?): return "\(p), \(r)"
    case let (p?, nil): return p
    case let (nil, r?): return r
    case (nil, nil): return nil
    }
  }
}
