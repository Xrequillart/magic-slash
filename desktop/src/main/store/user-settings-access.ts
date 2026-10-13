import type { UserSettingsRow } from './user-settings-mapper'

// ---------------------------------------------------------------------------
// Who may write each column of public.user_settings from the iPhone.
//
// The iPhone edits the desktop's settings one column at a time, and only the
// `editable` ones. A column is `sensitive` when changing it from afar would:
//
//  - make the Mac run something (launch mode, quick launch, auto-launched skills,
//    the workflow's chaining, the model and kind of agent it starts);
//  - change what the app is allowed to do on the machine (login item, global
//    shortcut, logging, plan sync);
//  - or describe this Mac's own state (split view, the repositories a board points at).
//
// Sensitive columns are shown on the phone, read-only. RLS does not tell the two
// clients apart, so this list is the guarantee: the Swift side is generated from it
// (ios/settings, `npm run ios:settings`) and the phone's upsert only accepts an
// `EditableSetting`.
//
// The Record is total, so a column added to UserSettingsRow does not compile until
// it is classified here; user-settings-access.test.ts makes a column added by a
// migration alone fail `npm test` too.
// ---------------------------------------------------------------------------

export type SettingAccess = 'editable' | 'sensitive'

/** THE classification. Ordered like UserSettingsRow; the generated Swift keeps this order. */
export const SETTINGS_ACCESS: Record<keyof UserSettingsRow, SettingAccess> = {
  usage_card_enabled: 'editable',
  usage_card_minimized: 'editable',
  agent_context_enabled: 'editable',
  agent_context_minimized: 'editable',
  usage_logs_enabled: 'sensitive',
  info_sidebar_on_create: 'editable',
  plan_sync_enabled: 'sensitive',
  daily_digest_enabled: 'editable',
  split_enabled: 'sensitive',
  split_active: 'sensitive',
  split_new_agent_pane: 'editable',
  default_display_mode: 'editable',
  chat_sticky_prompt: 'editable',
  chat_send_key: 'editable',
  chat_tool_detail: 'editable',
  chat_diffs: 'editable',
  chat_timestamps: 'editable',
  notifications_enabled: 'editable',
  notification_agent_waiting: 'editable',
  notification_agent_completed: 'editable',
  notification_pr_review: 'editable',
  notification_pr_changes_requested: 'editable',
  pr_reviews_enabled: 'editable',
  pr_reviews_poll_interval_ms: 'editable',
  pr_reviews_auto_launch_skills: 'sensitive',
  spotlight_enabled: 'editable',
  spotlight_shortcut: 'sensitive',
  quick_launch_repo: 'sensitive',
  quick_launch_background: 'sensitive',
  quick_launch_launch_mode: 'sensitive',
  quick_settings_enabled: 'editable',
  quick_settings_items: 'editable',
  sidebar_order: 'editable',
  sidebar_hidden: 'editable',
  sidebar_compact: 'editable',
  sidebar_shown: 'editable',
  auto_start_at_login: 'sensitive',
  launch_mode: 'sensitive',
  atlassian_integration_enabled: 'editable',
  theme: 'editable',
  language: 'editable',
  sync_claude_theme: 'editable',
  code_syntax: 'editable',
  code_font_size: 'editable',
  default_agent_type: 'sensitive',
  default_model: 'sensitive',
  confirm_agent_archive: 'editable',
  agent_sort: 'editable',
  tasks_repo: 'sensitive',
  plans_repo: 'sensitive',
  workflow_confirm_chain: 'sensitive',
  workflow_chain_limit: 'sensitive',
  workflow_missing_skill: 'sensitive',
  workflow_run_actions: 'sensitive',
}

const columnsWith = (access: SettingAccess): (keyof UserSettingsRow)[] =>
  (Object.keys(SETTINGS_ACCESS) as (keyof UserSettingsRow)[]).filter((column) => SETTINGS_ACCESS[column] === access)

/** The columns the iPhone may write. */
export const EDITABLE_SETTING_COLUMNS: readonly (keyof UserSettingsRow)[] = columnsWith('editable')

/** The columns the iPhone shows read-only. */
export const SENSITIVE_SETTING_COLUMNS: readonly (keyof UserSettingsRow)[] = columnsWith('sensitive')
