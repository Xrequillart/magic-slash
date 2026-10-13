import SwiftUI

/// An agent's pending question, answered from the phone (PROTOCOL.md §5, §10).
///
/// One question with a single choice sends on tap; a multi-select question, or several asked
/// at once, collect the picks and send them together. A permission offers Allow and Deny. Each
/// answer asks for Face ID, since it is signed on its own. A question the Mac cannot answer
/// remotely, or one from a Mac that is offline, shows without a working choice.
///
/// Its picks are local state: give it `.id(question.token)` so a new question starts clean.
struct QuestionCard: View {
  @Environment(\.theme) private var theme

  let relay: RelayStore
  let runtime: AgentRuntime
  let question: RemoteQuestion
  let appAgentId: String

  /// Picked option indexes, per question index.
  @State private var picks: [Int: Set<Int>] = [:]

  var body: some View {
    let status = relay.answerStatus(for: appAgentId, token: question.token)
    SectionCard(title: question.isPermission ? "Permission" : "Question") {
      ForEach(Array(question.questions.enumerated()), id: \.offset) { index, item in
        if index > 0 { Divider().overlay(theme.lineSubtle) }
        itemView(item, index: index, status: status)
      }
      if question.isAnswerable {
        footer(status: status)
      } else {
        Label("Answer this one on the Mac.", systemImage: "laptopcomputer")
          .font(.cera(.footnote))
          .foregroundStyle(theme.textSecondary)
      }
    }
  }

  // MARK: Questions

  private func itemView(_ item: RemoteQuestion.Item, index: Int, status: AnswerStatus?) -> some View {
    VStack(alignment: .leading, spacing: 8) {
      if let header = item.header {
        Pill(text: header, color: theme.blue, strength: .soft)
      }
      Text(item.prompt)
        .font(.cera(.body))
        .foregroundStyle(theme.ink)
        .textSelection(.enabled)
        .frame(maxWidth: .infinity, alignment: .leading)
      if question.isPermission, let preview = question.preview {
        // What the permission is about: the prompt is only the notification's one-liner.
        ScrollView(.horizontal) {
          Text(preview)
            .font(.caption.monospaced())
            .foregroundStyle(theme.textSecondary)
            .textSelection(.enabled)
            .fixedSize(horizontal: true, vertical: false)
            .padding(10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 10).fill(theme.surfaceSunken))
      }
      if !question.isPermission {
        ForEach(Array(item.options.enumerated()), id: \.offset) { optionIndex, option in
          if question.isAnswerable {
            optionRow(option, item: item, index: index, optionIndex: optionIndex)
          } else {
            // Shown for reading only: the choice is made on the Mac.
            OptionLabel(option: option, mark: nil)
          }
        }
        .disabled(!canAnswer(status))
      }
    }
  }

  @ViewBuilder
  private func optionRow(_ option: RemoteQuestion.Option, item: RemoteQuestion.Item, index: Int, optionIndex: Int) -> some View {
    if sendsOnTap {
      Button {
        send(.option(optionIndex))
      } label: {
        OptionLabel(option: option, mark: "chevron.right")
      }
      .buttonStyle(OptionButtonStyle(selected: false))
    } else {
      let selected = picks[index]?.contains(optionIndex) ?? false
      Button {
        toggle(optionIndex, in: index, multiple: item.multiSelect)
      } label: {
        OptionLabel(option: option, mark: Self.mark(selected: selected, multiple: item.multiSelect))
      }
      .buttonStyle(OptionButtonStyle(selected: selected))
      .accessibilityAddTraits(selected ? .isSelected : [])
    }
  }

  // MARK: Footer

  @ViewBuilder
  private func footer(status: AnswerStatus?) -> some View {
    if question.isPermission {
      HStack(spacing: 10) {
        Button("Deny") { send(.deny) }
          .buttonStyle(SecondaryButtonStyle())
        Button("Allow") { send(.option(0)) }
          .buttonStyle(PrimaryButtonStyle())
      }
      .disabled(!canAnswer(status))
    } else if !sendsOnTap {
      Button("Send") {
        if let choice = pickedChoice { send(choice) }
      }
      .buttonStyle(PrimaryButtonStyle())
      .disabled(!canAnswer(status) || pickedChoice == nil)
    }
    if !runtime.isCurrent, status?.phase != .done {
      Label("\(runtime.macName) is offline. Answer when it is back, or on the Mac.", systemImage: "wifi.slash")
        .font(.cera(.footnote))
        .foregroundStyle(theme.textSecondary)
    }
    if let status {
      StatusLine(phase: Self.line(for: status.phase))
    }
  }

  // MARK: Answering

  /// One question with a single choice: a tap is the answer.
  private var sendsOnTap: Bool {
    question.questions.count == 1 && !question.questions[0].multiSelect
  }

  private func canAnswer(_ status: AnswerStatus?) -> Bool {
    guard runtime.isCurrent else { return false }
    switch status?.phase {
    case .sending, .done: return false
    case .failed, nil: return true
    }
  }

  /// What the picks answer, or nil until every question has one.
  private var pickedChoice: AnswerChoice? {
    let items = question.questions
    let sets = items.indices.map { picks[$0] ?? [] }
    guard !sets.isEmpty, sets.allSatisfy({ !$0.isEmpty }) else { return nil }
    if items.count == 1 {
      return .options(sets[0].sorted())
    }
    // One label per question; a multi-select one spells its picks as Claude Code does.
    let labels = zip(items, sets).map { item, set in
      set.sorted().compactMap { item.options.indices.contains($0) ? item.options[$0].label : nil }
        .joined(separator: ", ")
    }
    return .answers(labels)
  }

  private func toggle(_ optionIndex: Int, in index: Int, multiple: Bool) {
    Haptics.tap()
    var set = picks[index] ?? []
    if set.contains(optionIndex) {
      set.remove(optionIndex)
    } else if multiple {
      set.insert(optionIndex)
    } else {
      set = [optionIndex]
    }
    picks[index] = set
  }

  private func send(_ choice: AnswerChoice) {
    Haptics.tap()
    let relay = relay
    let macId = runtime.macId
    let appAgentId = appAgentId
    let token = question.token
    Task { await relay.answer(macId: macId, appAgentId: appAgentId, token: token, choice: choice) }
  }

  /// Where the last answer stands: on its way, taken, or refused and why.
  private static func line(for phase: AnswerStatus.Phase) -> StatusLine.Phase {
    switch phase {
    case .sending: .progress("Sending the answer…")
    case .done: .success("Answer sent. The agent resumes on the Mac.")
    case .failed(let message): .failure(message)
    }
  }

  private static func mark(selected: Bool, multiple: Bool) -> String {
    if multiple { return selected ? "checkmark.square.fill" : "square" }
    return selected ? "largecircle.fill.circle" : "circle"
  }
}

/// An option's label and description, with a trailing mark when it can be picked.
private struct OptionLabel: View {
  @Environment(\.theme) private var theme
  let option: RemoteQuestion.Option
  let mark: String?

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 10) {
      VStack(alignment: .leading, spacing: 3) {
        Text(option.label)
          .font(.cera(.subheadline, .semibold))
          .foregroundStyle(theme.ink)
        if let description = option.description {
          Text(description)
            .font(.cera(.footnote))
            .foregroundStyle(theme.textSecondary)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .multilineTextAlignment(.leading)
      if let mark {
        Image(systemName: mark)
          .font(.cera(.footnote, .semibold))
          .foregroundStyle(theme.iconMuted)
      }
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 10)
    .background(RoundedRectangle(cornerRadius: 10).fill(theme.surfaceSunken))
  }
}

private struct OptionButtonStyle: ButtonStyle {
  @Environment(\.theme) private var theme
  @Environment(\.isEnabled) private var isEnabled
  let selected: Bool

  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .overlay(
        RoundedRectangle(cornerRadius: 10)
          .strokeBorder(selected ? theme.accent : theme.lineField, lineWidth: selected ? 1.5 : 1)
      )
      .opacity(configuration.isPressed ? 0.7 : isEnabled ? 1 : 0.5)
      .contentShape(RoundedRectangle(cornerRadius: 10))
  }
}
