import SwiftUI

/// Sends a prompt to an agent, or stops its turn, from the phone (PROTOCOL.md §10): a field
/// and one round button, in Liquid Glass like the bar's buttons, floating over the chat.
///
/// An idle agent takes the prompt at once; a working one queues it behind the current turn,
/// as the desktop chat does. A waiting agent refuses it, since the text would land in its
/// question: answer that first. The send button springs in with the first character typed;
/// with the field empty, the button stops the turn while the agent works or waits, and is
/// gone otherwise. Each command asks for Face ID, since it is signed
/// on its own.
struct PromptComposer: View {
  @Environment(\.theme) private var theme

  let relay: RelayStore
  let runtime: AgentRuntime
  let appAgentId: String
  /// The reader has scrolled up the thread: the composer draws back, scaled down from its
  /// bottom edge, until they are back at the end or start typing.
  var compact = false

  @State private var text = ""
  @FocusState private var focused: Bool

  /// The Mac refuses a longer prompt (§10), in UTF-16 units as it counts them.
  private static let maxLength = 10_000

  var body: some View {
    let status = relay.commandStatus(for: appAgentId)
    let sending = isSending(status)
    let length = trimmed.utf16.count
    let action = buttonAction(status: status)
    let compact = compact && !focused
    let height: CGFloat = 48
    let margin = ScreenCorners.margin(height: height)
    let menu = focused ? suggestions : []
    VStack(alignment: .leading, spacing: 8) {
      if hasNotice(length: length, status: status) {
        notices(length: length, status: status)
          .padding(.horizontal, 14)
          .padding(.vertical, 10)
          .frame(maxWidth: .infinity, alignment: .leading)
          .liquidGlass(in: RoundedRectangle(cornerRadius: 18), tint: fieldTint)
          .transition(.move(edge: .bottom).combined(with: .opacity))
      }

      HStack(alignment: .bottom, spacing: 8) {
        PromptField(text: $text, known: Set(commands.map(\.name)))
          .focused($focused)
          .disabled(sending)
          .padding(.horizontal, 16)
          .padding(.vertical, 10)
          // Cera sits high on its line: the field's own box is centred, then nudged so
          // its capitals are.
          .offset(y: PromptField.capCentring)
          .frame(maxWidth: .infinity, minHeight: height, alignment: .leading)
          .liquidGlass(in: RoundedRectangle(cornerRadius: height / 2), tint: fieldTint)

        if let action {
          Button {
            Haptics.tap()
            action == .stop ? stop() : send()
          } label: {
            Group {
              if sending {
                ProgressView().tint(action == .stop ? theme.ink : theme.onBrand)
              } else {
                Image(systemName: action == .stop ? "stop.fill" : "arrow.up")
                  .font(.system(size: action == .stop ? 16 : 18, weight: .bold))
              }
            }
            .foregroundStyle(action == .stop ? theme.ink : theme.onBrand)
            .frame(width: height, height: height)
            .contentShape(Circle())
            .liquidGlass(in: Circle(), tint: action == .stop ? fieldTint : theme.accent)
          }
          .buttonStyle(.plain)
          .disabled(action == .stop ? (!runtime.isCurrent || sending) : !canSend(length: length, sending: sending))
          .opacity(buttonDimmed(action, length: length, sending: sending) ? 0.5 : 1)
          .accessibilityLabel(action == .stop ? "Stop" : "Send")
          .transition(.scale(scale: 0.3).combined(with: .opacity))
          .id(action)
        }
      }
      .animation(.spring(response: 0.32, dampingFraction: 0.72), value: action)
    }
    // Over the composer, not in it: the composer's height sets the thread's bottom inset,
    // and a menu in its layout would move the field every time it opens or closes.
    .overlay(alignment: .top) {
      if !menu.isEmpty {
        SlashCommandMenu(commands: menu, pick: complete)
          .liquidGlass(in: RoundedRectangle(cornerRadius: 22, style: .continuous), tint: fieldTint, interactive: false)
          .alignmentGuide(.top) { $0[.bottom] + 8 }
          .transition(.opacity.combined(with: .scale(scale: 0.96, anchor: .bottom)))
      }
    }
    .animation(.snappy(duration: 0.2), value: menu.isEmpty)
    .padding(.horizontal, focused ? 8 : margin)
    // As far from the bottom edge as from the sides, below the home indicator's inset, so
    // the round ends sit on the screen's own corners. Above the keyboard, just clear of it.
    .padding(.bottom, focused ? 8 : ScreenCorners.bottomPadding(margin: margin))
    .scaleEffect(compact ? 0.8 : 1, anchor: .bottom)
    .animation(.spring(response: 0.35, dampingFraction: 0.85), value: compact)
    .animation(.spring(response: 0.35, dampingFraction: 0.85), value: focused)
    .onChange(of: focused) { _, focused in
      if focused { Haptics.tap() }
    }
    .onChange(of: status) { _, status in
      // Taken by the Mac: the field is free for the next one. A refused prompt stays, to retry.
      if status?.action == .prompt, case .done = status?.phase { text = "" }
    }
  }

  /// The Mac's `/` commands (§13), none until it has sent them.
  private var commands: [RemoteCommand] {
    relay.commands(for: appAgentId)
  }

  /// The commands matching the `/` word being typed, while there is one. Gone once the word
  /// names a single command in full: it is written, nothing is left to pick.
  private var suggestions: [RemoteCommand] {
    guard let token = SlashCommands.token(in: text) else { return [] }
    let found = SlashCommands.matches(commands, query: token.query)
    if found.count == 1, found[0].name == token.query { return [] }
    return found
  }

  /// Writes the command picked in place of the `/` word, with the space that ends it.
  private func complete(_ command: RemoteCommand) {
    guard let token = SlashCommands.token(in: text) else { return }
    text.replaceSubrange(token.range, with: "/\(command.name) ")
  }

  /// The glass takes the theme's raised surface, so the field reads as part of the theme
  /// (Midnight's is blue) rather than the system's neutral grey.
  private var fieldTint: Color {
    theme.bgTertiary.opacity(0.7)
  }

  private enum ButtonAction {
    case send, stop
  }

  /// Send as soon as there is text, Stop while the agent works or waits and the field is
  /// empty, nothing otherwise: the field then takes the whole width. A command on its way
  /// keeps its own button, spinning, whatever the field holds.
  private func buttonAction(status: AgentCommandStatus?) -> ButtonAction? {
    if let status, case .sending = status.phase { return status.action == .stop ? .stop : .send }
    if !trimmed.isEmpty { return .send }
    return canStop ? .stop : nil
  }

  private func buttonDimmed(_ action: ButtonAction, length: Int, sending: Bool) -> Bool {
    if sending { return false }
    return action == .stop ? !runtime.isCurrent : !canSend(length: length, sending: sending)
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
    case (.prompt, .sending): .progress(String(localized: "Sending the prompt…"))
    case (.stop, .sending): .progress(String(localized: "Stopping the agent…"))
    case (_, .done): nil
    case (_, .failed(let message)): .failure(message)
    }
  }
}

/// The screen's rounded corners, so a bar along the bottom edge can follow them.
@MainActor
private enum ScreenCorners {
  /// The display's corner radius: UIKit keeps it private, so it is read by key, and is 0 on
  /// a square screen or if the key ever goes away.
  static let radius: CGFloat = {
    (UIScreen.main.value(forKey: "_displayCornerRadius") as? CGFloat) ?? 0
  }()

  /// The padding that puts a bar `margin` from the bottom edge, from inside the safe area:
  /// negative, into the home indicator's strip. Without known corners, just above the strip.
  static func bottomPadding(margin: CGFloat) -> CGFloat {
    guard radius > 0 else { return 8 }
    let inset = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow }
      .first?.safeAreaInsets.bottom ?? 0
    return margin - inset
  }

  /// The gap to keep on the sides and the bottom for a capsule `height` tall to be concentric
  /// with the screen's corners: its round end then shares their centre.
  static func margin(height: CGFloat) -> CGFloat {
    max(radius - height / 2, 12)
  }
}
