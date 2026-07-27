'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Check,
  GitPullRequest,
  Languages,
  Palette,
  Sparkles,
  SquareTerminal,
} from 'lucide-react'
import { Dropdown } from '@/components/Dropdown'
import { ExamplePanel, SettingRow, SettingsCard, Toggle } from '@/components/SettingRow'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui'
import {
  DEFAULTS,
  LANGUAGE_OPTIONS,
  LAUNCH_MODE_OPTIONS,
  POLL_INTERVAL_OPTIONS,
  THEME_OPTIONS,
  type ThemeSwatch,
  type UserSettings,
  type UserSettingsPatch,
} from '@/lib/settings'

/**
 * Every application preference the webapp exposes, in the same order and with
 * the same wording as the desktop app's Settings tabs — Appearance, Language &
 * Region, Features, then Claude Code.
 *
 * Presentational: the page owns the state and the saving. One setting at a time
 * goes through `onPatch`, which is what makes each control save on its own.
 */

const BYPASS = 'bypassPermissions'

/**
 * Miniature of a theme, painted with that theme's own colours rather than the
 * one in use — the point is to show what the desktop is about to look like.
 * Inline styles because these colours are outside the webapp's palette.
 *
 * Ported from `desktop/src/renderer/pages/Config/AppearancePage.tsx`.
 */
function ThemePreview({ swatch }: { swatch: ThemeSwatch }) {
  return (
    <div
      className="h-16 w-full overflow-hidden rounded-lg border"
      style={{ backgroundColor: `rgb(${swatch.bgRgb})`, borderColor: swatch.lineStrong }}
    >
      <div className="h-3 w-full" style={{ backgroundColor: swatch.surface }} />
      <div className="flex h-full gap-1.5 p-2">
        <div className="w-1/4 rounded" style={{ backgroundColor: swatch.surface }} />
        <div className="flex flex-1 flex-col gap-1">
          <span className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: `rgb(${swatch.inkRgb})` }} />
          <span
            className="h-1.5 w-1/2 rounded-full"
            style={{ backgroundColor: `rgb(${swatch.inkRgb} / 0.5)` }}
          />
          <span className="mt-1 h-2 w-2/5 rounded" style={{ backgroundColor: `rgb(${swatch.accentRgb})` }} />
        </div>
      </div>
    </div>
  )
}

export function AppSettings({
  settings,
  onPatch,
}: {
  settings: UserSettings
  onPatch: (patch: UserSettingsPatch) => void
}) {
  /** Held until confirmed: bypass mode is not something to enable by a stray click. */
  const [confirmBypass, setConfirmBypass] = useState(false)

  // A null column means the user never chose, so the desktop applies its own
  // default — show that, never a normalised value.
  const theme = settings.theme ?? DEFAULTS.theme
  const language = settings.language ?? DEFAULTS.language
  const launchMode = settings.launchMode ?? DEFAULTS.launchMode
  const prReviews = settings.prReviewsEnabled ?? DEFAULTS.prReviewsEnabled
  const pollInterval = settings.prReviewsPollIntervalMs ?? DEFAULTS.prReviewsPollIntervalMs

  return (
    <>
      {/* ── Appearance ──────────────────────────────────────────────────────── */}
      <SettingsCard icon={Palette} title="Appearance">
        <div className="py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEME_OPTIONS.map((option) => {
              const active = option.id === theme
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => !active && onPatch({ theme: option.id })}
                  aria-pressed={active}
                  className={`rounded-xl border p-2 text-left transition-colors ${
                    active ? 'border-accent bg-accent/[0.06]' : 'border-black/10 hover:border-black/20'
                  }`}
                >
                  <ThemePreview swatch={option.swatch} />
                  <span className="mt-2 flex items-center gap-1.5">
                    <span className="min-w-0 truncate font-display text-xs font-bold text-ink">
                      {option.label}
                    </span>
                    {active && <Check className="h-3 w-3 shrink-0 text-accent" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted">
            The theme follows your account — every machine you sign in on uses it. Interface scale stays
            on each machine, since it compensates for that screen.
          </p>
        </div>
      </SettingsCard>

      {/* ── Language & Region ───────────────────────────────────────────────── */}
      <SettingsCard icon={Languages} title="Language & Region">
        <SettingRow
          label="Interface language"
          description="The language of the app itself — menus, settings, notifications, and how dates and numbers are written."
        >
          <Dropdown
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={(next) => onPatch({ language: next })}
            className="w-52"
          />
        </SettingRow>
        <div className="pb-5">
          <p className="text-xs text-muted">
            It is not what Claude writes in: commit messages, pull requests and Jira comments follow each{' '}
            <Link href="/organization" className="text-accent hover:underline">
              repository&rsquo;s own language settings
            </Link>
            , and your profile&rsquo;s languages decide how Claude talks to you.
          </p>
        </div>
      </SettingsCard>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <SettingsCard icon={Sparkles} title="Features">
        <SettingRow
          label="Show usage card in sidebar"
          description="Display the connected account and the Session (5h) / Weekly (7d) gauges at the bottom of the sidebar."
        >
          <Toggle
            checked={settings.usageCardEnabled ?? DEFAULTS.usageCardEnabled}
            onChange={(usageCardEnabled) => onPatch({ usageCardEnabled })}
            label="Show usage card in sidebar"
          />
        </SettingRow>
        <SettingRow
          label="Share my usage with my organization"
          description="Off by default. When enabled, your agent activity (tickets, commits, PRs, reviews), the skills you run and an aggregated end-of-session summary (estimated cost, lines added/removed, duration, model) are recorded for your organization, so the Team dashboard reflects your work. No prompts or code are ever sent. When off, nothing is recorded — and you can turn it off at any time."
        >
          <Toggle
            checked={settings.usageLogsEnabled ?? DEFAULTS.usageLogsEnabled}
            onChange={(usageLogsEnabled) => onPatch({ usageLogsEnabled })}
            label="Share my usage with my organization"
          />
        </SettingRow>
        <SettingRow
          label="Daily team digest"
          description="Off by default. When enabled, you get one notification at 9:00 AM summarizing your team’s activity from the last 24 hours (PRs shipped, tickets moved to Done). Nothing is sent when there was no activity."
        >
          <Toggle
            checked={settings.dailyDigestEnabled ?? DEFAULTS.dailyDigestEnabled}
            onChange={(dailyDigestEnabled) => onPatch({ dailyDigestEnabled })}
            label="Daily team digest"
          />
        </SettingRow>
        <SettingRow label="Enable split view" description="Display two agents side by side on wide screens.">
          <Toggle
            checked={settings.splitEnabled ?? DEFAULTS.splitEnabled}
            onChange={(splitEnabled) => onPatch({ splitEnabled })}
            label="Enable split view"
          />
        </SettingRow>
      </SettingsCard>

      {/* ── PR Review Watcher ───────────────────────────────────────────────── */}
      <SettingsCard icon={GitPullRequest} title="PR Review Watcher">
        <SettingRow
          label="Watch PR reviews"
          description="Poll GitHub to track review status on agents’ pull requests."
        >
          <Toggle
            checked={prReviews}
            onChange={(prReviewsEnabled) => onPatch({ prReviewsEnabled })}
            label="Watch PR reviews"
          />
        </SettingRow>
        {prReviews && (
          <>
            <SettingRow label="Polling interval" description="How often the GitHub API is polled.">
              <Dropdown
                value={String(pollInterval)}
                options={POLL_INTERVAL_OPTIONS}
                onChange={(next) => onPatch({ prReviewsPollIntervalMs: Number(next) })}
                className="w-52"
              />
            </SettingRow>
            <SettingRow
              label="Auto-launch skills"
              description="Send /magic:resolve or /magic:done directly to the agent’s terminal. Disabled by default for safety."
            >
              <Toggle
                checked={settings.prReviewsAutoLaunchSkills ?? DEFAULTS.prReviewsAutoLaunchSkills}
                onChange={(prReviewsAutoLaunchSkills) => onPatch({ prReviewsAutoLaunchSkills })}
                label="Auto-launch skills"
              />
            </SettingRow>
          </>
        )}
      </SettingsCard>

      {/* ── Claude Code ─────────────────────────────────────────────────────── */}
      <SettingsCard icon={SquareTerminal} title="Claude Code">
        <SettingRow
          label="Permission mode"
          description="Controls the level of autonomy for all Claude Code agents."
        >
          <Dropdown
            value={launchMode}
            options={LAUNCH_MODE_OPTIONS}
            onChange={(next) => (next === BYPASS ? setConfirmBypass(true) : onPatch({ launchMode: next }))}
            className="w-52"
          />
        </SettingRow>
        {launchMode === BYPASS && (
          <ExamplePanel tone="warning">
            <p className="text-xs text-ink">
              Bypass mode disables all permission checks. Only use it in sandboxed environments with no
              internet access.
            </p>
          </ExamplePanel>
        )}
      </SettingsCard>

      <Modal
        open={confirmBypass}
        onClose={() => setConfirmBypass(false)}
        icon={AlertTriangle}
        title="Enable Bypass mode?"
        tone="danger"
        footer={
          <>
            <Button variant="ghost" className="ml-auto" onClick={() => setConfirmBypass(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onPatch({ launchMode: BYPASS })
                setConfirmBypass(false)
              }}
            >
              I understand, enable Bypass
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Security warning: Bypass mode disables all permission checks. Every agent on every machine you
          sign in on will run commands and edit files without ever asking. Only use in sandboxed
          environments with no internet access.
        </p>
      </Modal>
    </>
  )
}
