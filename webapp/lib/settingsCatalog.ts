import type { UserSettings } from './settings'

/**
 * What the settings ARE: their shape, their defaults, and how the back-office groups
 * them. No I/O — `lib/settings.ts` reads and writes them, `lib/admin.ts` exposes the
 * admin-only view of them, and both import from here.
 *
 * THE SPLIT IS LOAD-BEARING, not tidiness. `lib/settingsCatalog.test.ts` asserts that
 * these tables cover every column, and the root vitest suite runs with the ROOT
 * node_modules only — the webapp's dependencies are never installed in CI. A test that
 * imported `lib/admin.ts` therefore failed to resolve `@supabase/supabase-js` two
 * modules deep, though its assertions touch nothing but plain objects. Pure data lives
 * here so it can be tested without a Supabase client on the other end of it.
 *
 * `UserSettings` is imported as a TYPE, which esbuild erases: nothing at runtime links
 * this module back to the one that talks to the network.
 */

/**
 * What the desktop app falls back to for an unset column, so the controls here
 * show the same state the app is actually in.
 *
 * Source of truth: `desktop/src/renderer/pages/Config/index.tsx` (the `??`
 * chain where the Application tab reads the config) and `DEFAULT_THEME` /
 * `DEFAULT_LANGUAGE` in `desktop/src/types.ts`.
 */
export const DEFAULTS = {
  theme: 'dark',
  // `?? true` in AppearancePage: an unreadable transcript would read as a bug
  // rather than as a feature nobody switched on.
  syncClaudeTheme: true,
  language: 'en',
  usageCardEnabled: true,
  // `=== true` in SidebarUsageCard / the agent card, so anything else is expanded.
  usageCardMinimized: false,
  agentContextEnabled: true,
  agentContextMinimized: false,
  usageLogsEnabled: true,
  // ON, and stated here rather than inferred: the desktop's plan-sync path
  // short-circuits on `=== false`, so a user who never chose gets their
  // /magic:plan specs synced.
  planSyncEnabled: true,
  // All five read `!== false` where the notification is produced (the master at
  // the sink in the main process, the four kinds at their sender): absent has to
  // describe the behaviour every existing install already has.
  notificationsEnabled: true,
  notificationAgentWaiting: true,
  notificationAgentCompleted: true,
  notificationPrReview: true,
  notificationPrChangesRequested: true,
  dailyDigestEnabled: false,
  splitEnabled: false,
  // The `?? true` the Application tab reads it with, in
  // desktop/src/renderer/pages/Config/index.tsx.
  spotlightEnabled: true,
  prReviewsEnabled: true,
  prReviewsPollIntervalMs: 60_000,
  prReviewsAutoLaunchSkills: false,
  launchMode: 'default',
} as const

/**
 * All 25 `user_settings` columns, as the desktop app stores them. Every one is
 * nullable and NULL is a third state distinct from false — it means the user
 * never chose, and the app applies its own default. Nothing here normalises a
 * null away: "never chose" is exactly what a support question needs to see.
 *
 * Extends the 21 fields `lib/settings.ts` already names (the ones the webapp lets
 * a user edit) rather than restating them, so a column rename is one edit and not
 * two camelCase lists that must silently agree. The 4 added below are the ones
 * `UserSettings` deliberately omits: per-machine properties and transient view
 * state, which the back-office reports precisely because it cannot edit them.
 */
export interface AdminUserSettings extends UserSettings {
  splitActive: boolean | null
  spotlightShortcut: string | null
  autoStartAtLogin: boolean | null
  atlassianIntegrationEnabled: boolean | null
}

/**
 * What the desktop app does with each setting the user never chose — so the console
 * can say "par défaut (on)" instead of just "jamais choisi", which tells an operator
 * that a column is null without telling them what the app is therefore doing.
 *
 * Extends `DEFAULTS` (lib/settings.ts) rather than restating it: those twenty-one are
 * the ones the webapp itself can edit, and their defaults are already documented
 * there. The four below are the admin-only columns, each verified against the line in
 * the desktop app that resolves the unset value — cited, because a default invented
 * here would be a confident lie in the one tool used to answer "why is it behaving
 * like that":
 *
 *  * splitActive — the store's initial state.
 *    desktop/src/renderer/store/index.ts
 *  * spotlightShortcut — the `?? 'Control+Space'` the Application tab reads with.
 *    desktop/src/renderer/pages/Config/index.tsx
 *  * autoStartAtLogin — applied only when set, and the OS default for a freshly
 *    installed app is not to open at login. desktop/src/main/index.ts
 *  * atlassianIntegrationEnabled — INFERRED, not read: nothing in the desktop app
 *    defaults it, so an absent flag simply means the integration was never set up.
 *    Stated as false on that basis and not on a `??` somewhere.
 */
export const SETTING_DEFAULTS: Record<keyof AdminUserSettings, string | number | boolean> = {
  ...DEFAULTS,
  splitActive: false,
  spotlightShortcut: 'Control+Space',
  autoStartAtLogin: false,
  atlassianIntegrationEnabled: false,
}

export interface SettingGroup {
  /** The feature, named as the desktop app names it. */
  title: string
  fields: { field: keyof AdminUserSettings; label: string }[]
}

/**
 * The twenty-five settings, grouped by FEATURE, in reading order. Also the field
 * allowlist — a column absent from here is a column the console does not show.
 *
 * The groups and their titles are the desktop app's own sections, verbatim and in its
 * own order: "Usage card", "Split View", "Spotlight", "Background App", "Activity
 * recording", "Daily digest", "PR Review Watcher" are the SectionHeaders of its
 * Application tab, and Appearance and Launch mode are where the rest live (desktop/src/renderer/pages/Config/index.tsx,
 * titles from desktop/src/i18n/en.ts). That is the point of grouping them this way
 * rather than by a tidier taxonomy invented here: an operator reads this card while
 * someone describes the screen in front of them, and the two now use the same words
 * for the same box.
 *
 * "Integrations" is the one group with no counterpart in the app — the Atlassian flag
 * is written by the installer and toggled over IPC, and no settings section owns it.
 *
 * Labels drop the feature name the group already carries: "Usage card / Enabled"
 * rather than "Usage card / Usage card". Inside a titled box the row names the
 * option, not the feature.
 */
export const SETTING_GROUPS: SettingGroup[] = [
  {
    title: 'Appearance',
    fields: [
      { field: 'theme', label: 'Theme' },
      { field: 'language', label: 'Interface language' },
      { field: 'syncClaudeTheme', label: 'Sync Claude Code theme' },
    ],
  },
  {
    title: 'Launch mode',
    fields: [{ field: 'launchMode', label: 'Claude Code launch' }],
  },
  {
    title: 'Usage card',
    fields: [
      { field: 'usageCardEnabled', label: 'Enabled' },
      { field: 'usageCardMinimized', label: 'Minimized' },
    ],
  },
  {
    // The right sidebar's counterpart to the usage card. Its own group rather than
    // rows appended to that one: they are two panels on two sides of the window,
    // and the Appearance tab shows them side by side without merging them either.
    title: 'Agent context',
    fields: [
      { field: 'agentContextEnabled', label: 'Enabled' },
      { field: 'agentContextMinimized', label: 'Minimized' },
    ],
  },
  {
    // The master switch is deliberately first: it is what decides whether the four
    // below are doing anything at all, and reading them in the other order invites
    // "agent waiting is on, so why is it silent?".
    title: 'Notifications',
    fields: [
      { field: 'notificationsEnabled', label: 'Enabled' },
      { field: 'notificationAgentWaiting', label: 'Agent waiting' },
      { field: 'notificationAgentCompleted', label: 'Agent finished' },
      { field: 'notificationPrReview', label: 'PR review status changed' },
      { field: 'notificationPrChangesRequested', label: 'Changes requested on your PR' },
    ],
  },
  {
    title: 'Split View',
    fields: [
      { field: 'splitEnabled', label: 'Enabled' },
      { field: 'splitActive', label: 'Currently active' },
    ],
  },
  {
    title: 'Spotlight',
    fields: [
      { field: 'spotlightEnabled', label: 'Enabled' },
      { field: 'spotlightShortcut', label: 'Shortcut' },
    ],
  },
  {
    title: 'Background App',
    fields: [{ field: 'autoStartAtLogin', label: 'Start at login' }],
  },
  {
    // The "(on by default)" this label used to carry is gone: the value column now
    // prints the default itself, for every row rather than for the one that was
    // surprising enough to annotate by hand.
    title: 'Activity recording',
    fields: [{ field: 'usageLogsEnabled', label: 'Enabled' }],
  },
  {
    // Its own group rather than a second row under "Activity recording": that one
    // is anonymous telemetry, this one uploads the TEXT of a document. Reading the
    // two as one switch is exactly the confusion to avoid.
    title: 'Plan sync',
    fields: [{ field: 'planSyncEnabled', label: 'Enabled' }],
  },
  {
    title: 'Daily digest',
    fields: [{ field: 'dailyDigestEnabled', label: 'Enabled' }],
  },
  {
    title: 'PR Review Watcher',
    fields: [
      { field: 'prReviewsEnabled', label: 'Enabled' },
      { field: 'prReviewsPollIntervalMs', label: 'Poll interval' },
      { field: 'prReviewsAutoLaunchSkills', label: 'Auto-launch skills' },
    ],
  },
  {
    title: 'Integrations',
    fields: [{ field: 'atlassianIntegrationEnabled', label: 'Atlassian' }],
  },
]
