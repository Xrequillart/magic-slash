import { EDITABLE_SETTING_COLUMNS, SENSITIVE_SETTING_COLUMNS } from '../../desktop/src/main/store/user-settings-access'
import type { UserSettingsRow } from '../../desktop/src/main/store/user-settings-mapper'
import {
  AGENT_DISPLAY_MODES,
  AGENT_SORT_MODES,
  CHAT_DIFF_DISPLAYS,
  CHAT_SEND_KEYS,
  CHAT_TIMESTAMPS,
  CHAT_TOOL_DETAILS,
  CODE_FONT_SIZES,
  CODE_SYNTAX_CHOICES,
  LANGUAGE_IDS,
  QUICK_SETTING_IDS,
  SIDEBAR_PAGE_IDS,
  SPLIT_NEW_AGENT_PANES,
  THEME_IDS,
} from '../../desktop/src/types'

/**
 * Renders `ios/MagicSlash/Settings/SettingsAccess.generated.swift` from the desktop's
 * classification of the user_settings columns (SETTINGS_ACCESS), so the iPhone can only
 * name a column the desktop allows it to write: its upsert takes an `EditableSetting`.
 *
 * Pure, like renderSwiftTheme: it returns the file as a string, and the test next to it is
 * both the generator (`npm run ios:settings` runs it with `-u`) and the drift guard.
 */

/**
 * The values each closed-set column may hold, from the very lists the desktop's
 * validators check (user-settings-mapper.ts re-validates every one on read). A value
 * outside them would read as unset on the Mac, so the phone offers nothing else. The
 * list columns hold several of these, each at most once.
 */
const CHOICES: Partial<Record<keyof UserSettingsRow, readonly (string | number)[]>> = {
  split_new_agent_pane: SPLIT_NEW_AGENT_PANES,
  default_display_mode: AGENT_DISPLAY_MODES,
  chat_send_key: CHAT_SEND_KEYS,
  chat_tool_detail: CHAT_TOOL_DETAILS,
  chat_diffs: CHAT_DIFF_DISPLAYS,
  chat_timestamps: CHAT_TIMESTAMPS,
  quick_settings_items: QUICK_SETTING_IDS,
  sidebar_order: SIDEBAR_PAGE_IDS,
  sidebar_hidden: SIDEBAR_PAGE_IDS,
  sidebar_shown: SIDEBAR_PAGE_IDS,
  theme: THEME_IDS,
  language: LANGUAGE_IDS,
  code_syntax: CODE_SYNTAX_CHOICES,
  code_font_size: CODE_FONT_SIZES,
  agent_sort: AGENT_SORT_MODES,
}

/** `notification_pr_review` → `notificationPrReview`. */
export function swiftCaseName(column: string): string {
  return column.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}

function enumCase(column: string): string {
  const name = swiftCaseName(column)
  return name === column ? `  case ${name}` : `  case ${name} = "${column}"`
}

function swiftArray(values: readonly (string | number)[], column: string): string {
  if (values.every((value) => typeof value === 'number')) return `[Int] = [${values.join(', ')}]`
  if (values.every((value) => typeof value === 'string')) {
    return `[String] = [${values.map((value) => JSON.stringify(value)).join(', ')}]`
  }
  throw new Error(`Setting "${column}": its choices mix strings and numbers`)
}

export function renderSwiftSettings(): string {
  const out: string[] = []
  const line = (text = '') => out.push(text)

  line('// GENERATED from desktop/src/main/store/user-settings-access.ts by `npm run ios:settings`. Do not hand-edit.')
  line('// `npm test` fails when this file no longer matches the desktop classification.')
  line()
  line('/// A user_settings column the phone may write. The only key its upsert accepts.')
  line('enum EditableSetting: String, CaseIterable, Sendable {')
  for (const column of EDITABLE_SETTING_COLUMNS) line(enumCase(column))
  line('}')
  line()
  line('/// A user_settings column the phone shows read-only: it makes the Mac run something,')
  line('/// changes what the app may do on it, or is that Mac\'s own state.')
  line('enum SensitiveSetting: String, CaseIterable, Sendable {')
  for (const column of SENSITIVE_SETTING_COLUMNS) line(enumCase(column))
  line('}')
  line()
  line('/// The values a closed-set editable column may hold, in the desktop\'s order. Anything')
  line('/// else reads as unset on the Mac. A list column holds several, each at most once.')
  line('enum SettingChoices {')
  for (const column of EDITABLE_SETTING_COLUMNS) {
    const values = CHOICES[column]
    if (values) line(`  static let ${swiftCaseName(column)}: ${swiftArray(values, column)}`)
  }
  line('}')

  return `${out.join('\n')}\n`
}
