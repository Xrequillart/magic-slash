import SwiftUI

/// Sends a prompt to an agent, or stops its turn, from the phone (PROTOCOL.md §10).
///
/// An idle agent takes the prompt at once; a working one queues it behind the current turn,
/// as the desktop chat does. A waiting agent refuses it, since the text would land in its
/// question: answer that first. Stop shows while the agent works or waits. Each command asks
/// for Face ID, since it is signed on its own.
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
    SectionCard(title: "Prompt") {
      TextField("Message Claude", text: $text, axis: .vertical)
        .font(.cera(.body))
        .lineLimit(1...6)
        .focused($focused)
        .disabled(sending)
        .modifier(ThemedFieldStyle())

      HStack(spacing: 10) {
        if canStop {
          Button {
            stop()
          } label: {
            Label("Stop", systemImage: "stop.fill")
          }
          .buttonStyle(SecondaryButtonStyle())
          .disabled(!runtime.isCurrent || sending)
        }
        Button {
          send()
        } label: {
          Label("Send", systemImage: "arrow.up")
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(!canSend(length: length, sending: sending))
      }

      notices(length: length)
      if let status {
        StatusLine(phase: Self.line(for: status))
      }
    }
    .onChange(of: status) { _, status in
      // Taken by the Mac: the field is free for the next one. A refused prompt stays, to retry.
      if status?.action == .prompt, case .done = status?.phase { text = "" }
    }
  }

  /// Why Send is off, when the user can do something about it.
  @ViewBuilder
  private func notices(length: Int) -> some View {
    if !runtime.isCurrent {
      notice("\(runtime.macName) is offline. Send when it is back, or on the Mac.", systemImage: "wifi.slash")
    } else if runtime.state == "waiting" {
      notice("The agent is waiting on a question: answer it first.", systemImage: "questionmark.bubble")
    }
    if length > Self.maxLength {
      notice("Too long to send from the iPhone: keep it under \(Self.maxLength.formatted()) characters.", systemImage: "text.badge.xmark")
    }
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

  /// Where the last prompt or stop stands, in the words of what was sent.
  private static func line(for status: AgentCommandStatus) -> StatusLine.Phase {
    switch (status.action, status.phase) {
    case (.prompt, .sending): .progress("Sending the prompt…")
    case (.stop, .sending): .progress("Stopping the agent…")
    case (.prompt, .done(queued: true)): .success("Queued: Claude will read it after the current turn.")
    case (.prompt, .done): .success("Prompt sent. The agent works on it on the Mac.")
    case (.stop, .done): .success("Stopped. The agent waits for your next prompt.")
    case (_, .failed(let message)): .failure(message)
    }
  }
}
