import Supabase
import SwiftUI

/// The desktop's settings, from the account menu. The editable ones have their control
/// and apply on the Mac live (the theme re-themes this screen too). The sensitive ones,
/// which decide what an agent may do on the Mac, are listed at the end as plain text: the
/// iPhone has no way to change them.
///
/// A value never chosen shows the desktop's default, as the desktop does.
struct SettingsView: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss

  let settings: DesktopSettingsStore

  var body: some View {
    NavigationStack {
      List {
        if !settings.isLoaded {
          Section {
            HStack(spacing: 10) {
              ProgressView().controlSize(.small).tint(theme.textSecondary)
              Text("Reading your settings…")
                .font(.cera(.subheadline))
                .foregroundStyle(theme.textSecondary)
            }
            .listRowBackground(theme.surface)
          }
        }

        Group {
          appearance
          notifications
          chat
          sidebar
          agents
          integrations
        }
        .disabled(!settings.isLoaded)

        managedOnMac
      }
      .font(.cera(.body))
      .tint(theme.accent)
      .scrollContentBackground(.hidden)
      .background(theme.bg.ignoresSafeArea())
      .refreshable { await settings.refresh() }
      .task { if !settings.isLoaded { await settings.refresh() } }
      .navigationTitle("Settings")
      .navigationBarTitleDisplayMode(.inline)
      .toolbarBackground(theme.bg, for: .navigationBar)
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("Done") { dismiss() }
            .foregroundStyle(theme.accent)
        }
      }
    }
  }

  // MARK: - Sections

  private var appearance: some View {
    section("Appearance") {
      Picker("Theme", selection: Binding(
        get: { settings.themeID },
        set: { settings.set(.theme, .string($0.rawValue)) }
      )) {
        ForEach(ThemeID.allCases, id: \.self) { id in
          Text(Self.themeName(id)).tag(id)
        }
      }
      toggle("Follow Claude Code's theme", .syncClaudeTheme, default: true)
      choice("Language", .language, SettingChoices.language, default: "en")
      choice("Code syntax", .codeSyntax, SettingChoices.codeSyntax, default: "auto")
      Picker("Code font size", selection: Binding(
        get: { settings.int(.codeFontSize) ?? 12 },
        set: { settings.set(.codeFontSize, .integer($0)) }
      )) {
        ForEach(SettingChoices.codeFontSize, id: \.self) { size in
          Text("\(size) pt").tag(size)
        }
      }
    }
  }

  private var notifications: some View {
    let enabled = settings.bool(.notificationsEnabled) ?? true
    return section("Notifications") {
      toggle("Notifications", .notificationsEnabled, default: true)
      Group {
        toggle("Agent waiting for you", .notificationAgentWaiting, default: true)
        toggle("Agent finished", .notificationAgentCompleted, default: true)
        toggle("Review requested", .notificationPrReview, default: true)
        toggle("Changes requested", .notificationPrChangesRequested, default: true)
      }
      .disabled(!enabled)
      toggle("Daily digest", .dailyDigestEnabled, default: false)
    }
  }

  private var chat: some View {
    section("Chat view") {
      choice("Send with", .chatSendKey, SettingChoices.chatSendKey, default: "enter")
      choice("Tool calls", .chatToolDetail, SettingChoices.chatToolDetail, default: "all")
      choice("Diffs", .chatDiffs, SettingChoices.chatDiffs, default: "collapsed")
      choice("Timestamps", .chatTimestamps, SettingChoices.chatTimestamps, default: "never")
      toggle("Keep the prompt in view", .chatStickyPrompt, default: true)
    }
  }

  private var sidebar: some View {
    section("Sidebar") {
      toggle("Compact", .sidebarCompact, default: false)
      toggle("Usage card", .usageCardEnabled, default: true)
      toggle("Agent context card", .agentContextEnabled, default: true)
      toggle("Quick settings", .quickSettingsEnabled, default: true)
    }
  }

  private var agents: some View {
    section("Agents") {
      Picker("Sort by", selection: Binding(
        get: { settings.agentSort },
        set: { settings.set(.agentSort, .string($0.rawValue)) }
      )) {
        ForEach(AgentSortMode.allCases, id: \.self) { mode in
          Text(Self.label(mode.rawValue)).tag(mode)
        }
      }
      choice("Open new agents in", .defaultDisplayMode, SettingChoices.defaultDisplayMode, default: "terminal")
      toggle("Show the info panel on create", .infoSidebarOnCreate, default: true)
      toggle("Confirm before archiving", .confirmAgentArchive, default: true)
    }
  }

  private var integrations: some View {
    section("Integrations") {
      toggle("Watch pull request reviews", .prReviewsEnabled, default: true)
      toggle("Jira and Confluence", .atlassianIntegrationEnabled, default: true)
      toggle("Spotlight", .spotlightEnabled, default: true)
    }
  }

  /// Read-only on purpose: no control of any kind, only the value.
  private var managedOnMac: some View {
    Section {
      ForEach(SensitiveSetting.allCases, id: \.self) { column in
        HStack(alignment: .firstTextBaseline, spacing: 12) {
          Text(Self.sensitiveName(column))
            .foregroundStyle(theme.ink)
          Spacer(minLength: 8)
          Text(Self.display(settings.value(column)))
            .font(.cera(.subheadline))
            .foregroundStyle(theme.textSecondary)
            .multilineTextAlignment(.trailing)
            .lineLimit(2)
        }
        .listRowBackground(theme.surface)
      }
    } header: {
      Text("Managed on your Mac")
        .foregroundStyle(theme.textSecondary)
    } footer: {
      Text("These decide what agents may do on your Mac, so they only change there.")
        .foregroundStyle(theme.textSecondary)
    }
  }

  // MARK: - Rows

  private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
    Section {
      content()
        .foregroundStyle(theme.ink)
        .listRowBackground(theme.surface)
    } header: {
      Text(title)
        .foregroundStyle(theme.textSecondary)
    }
  }

  private func toggle(_ title: String, _ column: EditableSetting, default fallback: Bool) -> some View {
    Toggle(title, isOn: Binding(
      get: { settings.bool(column) ?? fallback },
      set: { settings.set(column, .bool($0)) }
    ))
  }

  /// A closed set of strings, shown with `label`'s wording.
  private func choice(
    _ title: String,
    _ column: EditableSetting,
    _ options: [String],
    default fallback: String
  ) -> some View {
    Picker(title, selection: Binding(
      get: { settings.string(column).flatMap { options.contains($0) ? $0 : nil } ?? fallback },
      set: { settings.set(column, .string($0)) }
    )) {
      ForEach(options, id: \.self) { option in
        Text(Self.label(option)).tag(option)
      }
    }
  }

  // MARK: - Wording

  private static let labels: [String: String] = [
    "en": "English",
    "fr": "Français",
    "auto": "Match the theme",
    "enter": "Enter",
    "mod-enter": "⌘ Enter",
    "all": "All",
    "changes": "Changes only",
    "grouped": "Grouped",
    "collapsed": "Collapsed",
    "preview": "Preview",
    "full": "Full",
    "never": "Never",
    "hover": "On hover",
    "always": "Always",
    "terminal": "Terminal",
    "chat": "Chat",
    "recent": "Most recent",
    "status": "Status",
    "repository": "Repository",
    "rose-pine": "Rosé Pine",
    "night-owl": "Night Owl",
    "vscode": "Visual Studio",
  ]

  /// The desktop's wording where it is known, the value made readable otherwise.
  private static func label(_ value: String) -> String {
    labels[value] ?? readable(value)
  }

  private static func themeName(_ id: ThemeID) -> String {
    id == .highContrast ? "High contrast" : readable(id.rawValue)
  }

  private static func readable(_ value: String) -> String {
    let words = value.replacingOccurrences(of: "_", with: " ").replacingOccurrences(of: "-", with: " ")
    return words.prefix(1).uppercased() + words.dropFirst()
  }

  /// Exhaustive, so a column newly classified sensitive does not build until it is named.
  private static func sensitiveName(_ column: SensitiveSetting) -> String {
    switch column {
    case .launchMode: "Launch mode"
    case .quickLaunchLaunchMode: "Quick launch mode"
    case .quickLaunchRepo: "Quick launch repository"
    case .quickLaunchBackground: "Quick launch in background"
    case .prReviewsAutoLaunchSkills: "Auto-launch review skills"
    case .workflowRunActions: "Run workflow actions"
    case .workflowConfirmChain: "Confirm workflow chains"
    case .workflowMissingSkill: "Missing workflow skill"
    case .workflowChainLimit: "Workflow chain limit"
    case .defaultModel: "Default model"
    case .defaultAgentType: "Default agent type"
    case .autoStartAtLogin: "Open at login"
    case .spotlightShortcut: "Spotlight shortcut"
    case .usageLogsEnabled: "Usage logs"
    case .planSyncEnabled: "Plan sync"
    case .splitActive: "Split view open"
    case .splitEnabled: "Split view"
    case .tasksRepo: "Tasks repository"
    case .plansRepo: "Plans repository"
    }
  }

  /// A value as plain text. Never chosen reads "Not set": the desktop applies its default.
  private static func display(_ value: AnyJSON?) -> String {
    switch value {
    case nil, .null: "Not set"
    case .bool(let on): on ? "On" : "Off"
    case .integer(let number): "\(number)"
    case .double(let number): number.formatted()
    case .string(let text): text.isEmpty ? "Not set" : text
    case .array(let items):
      items.isEmpty ? "None" : items.map { display($0) }.joined(separator: ", ")
    case .object: "Set"
    }
  }
}
