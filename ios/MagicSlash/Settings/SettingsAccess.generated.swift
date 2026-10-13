// GENERATED from desktop/src/main/store/user-settings-access.ts by `npm run ios:settings`. Do not hand-edit.
// `npm test` fails when this file no longer matches the desktop classification.

/// A user_settings column the phone may write. The only key its upsert accepts.
enum EditableSetting: String, CaseIterable, Sendable {
  case usageCardEnabled = "usage_card_enabled"
  case usageCardMinimized = "usage_card_minimized"
  case agentContextEnabled = "agent_context_enabled"
  case agentContextMinimized = "agent_context_minimized"
  case infoSidebarOnCreate = "info_sidebar_on_create"
  case dailyDigestEnabled = "daily_digest_enabled"
  case splitNewAgentPane = "split_new_agent_pane"
  case defaultDisplayMode = "default_display_mode"
  case chatStickyPrompt = "chat_sticky_prompt"
  case chatSendKey = "chat_send_key"
  case chatToolDetail = "chat_tool_detail"
  case chatDiffs = "chat_diffs"
  case chatTimestamps = "chat_timestamps"
  case notificationsEnabled = "notifications_enabled"
  case notificationAgentWaiting = "notification_agent_waiting"
  case notificationAgentCompleted = "notification_agent_completed"
  case notificationPrReview = "notification_pr_review"
  case notificationPrChangesRequested = "notification_pr_changes_requested"
  case prReviewsEnabled = "pr_reviews_enabled"
  case prReviewsPollIntervalMs = "pr_reviews_poll_interval_ms"
  case spotlightEnabled = "spotlight_enabled"
  case quickSettingsEnabled = "quick_settings_enabled"
  case quickSettingsItems = "quick_settings_items"
  case sidebarOrder = "sidebar_order"
  case sidebarHidden = "sidebar_hidden"
  case sidebarCompact = "sidebar_compact"
  case sidebarShown = "sidebar_shown"
  case atlassianIntegrationEnabled = "atlassian_integration_enabled"
  case theme
  case language
  case syncClaudeTheme = "sync_claude_theme"
  case codeSyntax = "code_syntax"
  case codeFontSize = "code_font_size"
  case confirmAgentArchive = "confirm_agent_archive"
  case agentSort = "agent_sort"
}

/// A user_settings column the phone shows read-only: it makes the Mac run something,
/// changes what the app may do on it, or is that Mac's own state.
enum SensitiveSetting: String, CaseIterable, Sendable {
  case usageLogsEnabled = "usage_logs_enabled"
  case planSyncEnabled = "plan_sync_enabled"
  case splitEnabled = "split_enabled"
  case splitActive = "split_active"
  case prReviewsAutoLaunchSkills = "pr_reviews_auto_launch_skills"
  case spotlightShortcut = "spotlight_shortcut"
  case quickLaunchRepo = "quick_launch_repo"
  case quickLaunchBackground = "quick_launch_background"
  case quickLaunchLaunchMode = "quick_launch_launch_mode"
  case autoStartAtLogin = "auto_start_at_login"
  case launchMode = "launch_mode"
  case defaultAgentType = "default_agent_type"
  case defaultModel = "default_model"
  case tasksRepo = "tasks_repo"
  case plansRepo = "plans_repo"
  case workflowConfirmChain = "workflow_confirm_chain"
  case workflowChainLimit = "workflow_chain_limit"
  case workflowMissingSkill = "workflow_missing_skill"
  case workflowRunActions = "workflow_run_actions"
}

/// The values a closed-set editable column may hold, in the desktop's order. Anything
/// else reads as unset on the Mac. A list column holds several, each at most once.
enum SettingChoices {
  static let splitNewAgentPane: [String] = ["focused", "left", "right"]
  static let defaultDisplayMode: [String] = ["terminal", "chat"]
  static let chatSendKey: [String] = ["enter", "mod-enter"]
  static let chatToolDetail: [String] = ["all", "changes", "grouped"]
  static let chatDiffs: [String] = ["collapsed", "preview", "full"]
  static let chatTimestamps: [String] = ["never", "hover", "always"]
  static let quickSettingsItems: [String] = ["notifications", "quick-launch", "usage-card", "agent-context", "split-view", "pr-watcher", "plan-sync", "activity", "claude-theme", "archive-confirm", "info-panel", "quick-launch-background", "daily-digest"]
  static let sidebarOrder: [String] = ["plans", "tasks", "skills", "repositories", "settings", "account"]
  static let sidebarHidden: [String] = ["plans", "tasks", "skills", "repositories", "settings", "account"]
  static let sidebarShown: [String] = ["plans", "tasks", "skills", "repositories", "settings", "account"]
  static let theme: [String] = ["dark", "midnight", "espresso", "high-contrast", "light", "mist", "sepia", "daylight"]
  static let language: [String] = ["en", "fr"]
  static let codeSyntax: [String] = ["auto", "github", "github-high-contrast", "one", "vscode", "catppuccin", "rose-pine", "night-owl", "solarized", "gruvbox", "everforest", "kanagawa", "vitesse", "ayu", "material", "min"]
  static let codeFontSize: [Int] = [11, 12, 13, 14, 15, 16]
  static let agentSort: [String] = ["recent", "status", "repository"]
}
