import SwiftUI

/// Sends a prompt to an agent, or stops its turn, from the phone (PROTOCOL.md §10): a field
/// and one round button, in Liquid Glass like the bar's buttons, floating over the chat.
///
/// An idle agent takes the prompt at once; a working one queues it behind the current turn,
/// as the desktop chat does. A waiting agent refuses it, since the text would land in its
/// question: answer that first. The button stops the turn while the agent works or waits and
/// the field is empty, and sends otherwise. Each command asks for Face ID, since it is signed
/// on its own.
struct PromptComposer: View {
  @Environment(\.theme) private var theme

  let relay: RelayStore
  let runtime: AgentRuntime
  let appAgentId: String

  @State private var text = ""
  @FocusState private var focused: Bool

  /// The Mac refuses a longer prompt (§10), in UTF-16 units as it counts them.
  private static let maxLength = 10_000

  var body: some View {
    let status = relay.commandStatus(for: appAgentId)
    let sending = isSending(status)
    let length = trimmed.utf16.count
    let stops = canStop && trimmed.isEmpty
    VStack(alignment: .leading, spacing: 8) {
      if hasNotice(length: length, status: status) {
        notices(length: length, status: status)
          .padding(.horizontal, 14)
          .padding(.vertical, 10)
          .frame(maxWidth: .infinity, alignment: .leading)
          .liquidGlass(in: RoundedRectangle(cornerRadius: 18))
          .transition(.move(edge: .bottom).combined(with: .opacity))
      }

      HStack(alignment: .bottom, spacing: 8) {
        TextField("Message Claude", text: $text, axis: .vertical)
          .font(.cera(.body))
          .foregroundStyle(theme.ink)
          .tint(theme.accent)
          .lineLimit(1...6)
          .focused($focused)
          .disabled(sending)
          .padding(.horizontal, 16)
          .padding(.vertical, 12)
          .frame(minHeight: 48)
          .liquidGlass(in: RoundedRectangle(cornerRadius: 24))

        Button {
          stops ? stop() : send()
        } label: {
          Group {
            if sending {
              ProgressView().tint(theme.onBrand)
            } else {
              Image(systemName: stops ? "stop.fill" : "arrow.up")
                .font(.system(size: stops ? 16 : 18, weight: .bold))
            }
          }
          .foregroundStyle(stops ? theme.ink : theme.onBrand)
          .frame(width: 48, height: 48)
          .contentShape(Circle())
          .liquidGlass(in: Circle(), tint: stops ? nil : theme.accent)
        }
        .buttonStyle(.plain)
        .disabled(stops ? (!runtime.isCurrent || sending) : !canSend(length: length, sending: sending))
        .opacity(buttonDimmed(stops: stops, length: length, sending: sending) ? 0.5 : 1)
        .accessibilityLabel(stops ? "Stop" : "Send")
      }
    }
    .sensoryFeedback(.impact(weight: .light), trigger: status?.commandId)
    .onChange(of: status) { _, status in
      // Taken by the Mac: the field is free for the next one. A refused prompt stays, to retry.
      if status?.action == .prompt, case .done = status?.phase { text = "" }
    }
  }

  private func buttonDimmed(stops: Bool, length: Int, sending: Bool) -> Bool {
    if sending { return false }
    return stops ? !runtime.isCurrent : !canSend(length: length, sending: sending)
  }

  /// Why Send is off, when the user can do something about it, and where the last command
  /// stands until the chat itself shows it.
  @ViewBuilder
  private func notices(length: Int, status: AgentCommandStatus?) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      if !runtime.isCurrent {
        notice("\(runtime.macName) is offline. Send when it is back, or on the Mac.", systemImage: "wifi.slash")
      } else if runtime.state == "waiting" {
        notice("The agent is waiting on a question: answer it first.", systemImage: "questionmark.bubble")
      }
      if length > Self.maxLength {
        notice("Too long to send from the iPhone: keep it under \(Self.maxLength.formatted()) characters.", systemImage: "text.badge.xmark")
      }
      if let status, let phase = Self.line(for: status) {
        StatusLine(phase: phase)
      }
    }
  }

  private func hasNotice(length: Int, status: AgentCommandStatus?) -> Bool {
    !runtime.isCurrent || runtime.state == "waiting" || length > Self.maxLength
      || status.flatMap(Self.line(for:)) != nil
  }

  private func notice(_ text: String, systemImage: String) -> some View {
    Label(text, systemImage: systemImage)
      .font(.cera(.footnote))
      .foregroundStyle(theme.textSecondary)
  }

  // MARK: Sending

  private var trimmed: String {
    text.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  /// A turn is under way, or a question holds it: Esc interrupts either.
  private var canStop: Bool {
    runtime.state == "working" || runtime.state == "waiting"
  }

  private func isSending(_ status: AgentCommandStatus?) -> Bool {
    if case .sending = status?.phase { return true }
    return false
  }

  private func canSend(length: Int, sending: Bool) -> Bool {
    runtime.isCurrent
      && runtime.state != "waiting"
      && length > 0
      && length <= Self.maxLength
      && !sending
  }

  private func send() {
    let relay = relay
    let macId = runtime.macId
    let appAgentId = appAgentId
    let prompt = trimmed
    focused = false
    Task { await relay.prompt(macId: macId, appAgentId: appAgentId, text: prompt) }
  }

  private func stop() {
    let relay = relay
    let macId = runtime.macId
    let appAgentId = appAgentId
    Task { await relay.stop(macId: macId, appAgentId: appAgentId) }
  }

  /// Where the last prompt or stop stands, in the words of what was sent. Nil once the Mac
  /// took it: the conversation shows the prompt, its place in the queue, or the stop.
  private static func line(for status: AgentCommandStatus) -> StatusLine.Phase? {
    switch (status.action, status.phase) {
    case (.prompt, .sending): .progress("Sending the prompt…")
    case (.stop, .sending): .progress("Stopping the agent…")
    case (_, .done): nil
    case (_, .failed(let message)): .failure(message)
    }
  }
}
