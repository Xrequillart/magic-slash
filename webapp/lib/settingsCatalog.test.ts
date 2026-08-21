import { describe, expect, it } from 'vitest'
import { SETTING_DEFAULTS, SETTING_GROUPS, type AdminUserSettings } from './settingsCatalog'

/**
 * Guards the two tables that the back-office reads `user_settings` through.
 *
 * Both are hand-maintained lists keyed on `AdminUserSettings`, and both fail
 * SILENTLY in the direction that matters: add a column to the interface and the
 * console simply stops mentioning it, with nothing on screen saying a setting is
 * missing. TypeScript catches the reverse (a key that no longer exists) and cannot
 * catch this one, because "every key appears somewhere in an array of arrays" is not
 * something a type can state.
 *
 * `EVERY_FIELD` is the one place the field list is written out. It is deliberately
 * NOT derived from the groups — deriving it from the thing under test would make
 * these assertions tautologies. Adding a setting means editing this array too, and
 * that is the point: the edit is the reminder.
 */
const EVERY_FIELD: (keyof AdminUserSettings)[] = [
  'theme',
  'language',
  'syncClaudeTheme',
  'launchMode',
  'usageCardEnabled',
  'usageCardMinimized',
  'agentContextEnabled',
  'agentContextMinimized',
  'usageLogsEnabled',
  'planSyncEnabled',
  'notificationsEnabled',
  'notificationAgentWaiting',
  'notificationAgentCompleted',
  'notificationPrReview',
  'notificationPrChangesRequested',
  'dailyDigestEnabled',
  'splitEnabled',
  'splitActive',
  'prReviewsEnabled',
  'prReviewsPollIntervalMs',
  'prReviewsAutoLaunchSkills',
  'spotlightEnabled',
  'spotlightShortcut',
  'autoStartAtLogin',
  'atlassianIntegrationEnabled',
]

describe('SETTING_GROUPS', () => {
  const grouped = SETTING_GROUPS.flatMap((group) => group.fields.map((f) => f.field))

  it('shows every setting exactly once', () => {
    expect([...grouped].sort()).toEqual([...EVERY_FIELD].sort())
  })

  it('never shows the same setting in two groups', () => {
    // Duplication is the failure the sort above cannot distinguish from a miss: a
    // field listed twice and another omitted keeps the length identical.
    expect(new Set(grouped).size).toBe(grouped.length)
  })

  it('gives every group a title and at least one field', () => {
    for (const group of SETTING_GROUPS) {
      expect(group.title.trim()).not.toBe('')
      expect(group.fields.length).toBeGreaterThan(0)
    }
  })
})

describe('SETTING_DEFAULTS', () => {
  it('has a default for every setting', () => {
    // An unset column renders as "par défaut (x)". A missing entry here renders as
    // "par défaut (undefined)" — a claim about the app's behaviour that is not just
    // wrong but visibly broken.
    for (const field of EVERY_FIELD) {
      expect(SETTING_DEFAULTS[field], `no default for ${field}`).toBeDefined()
    }
  })
})
