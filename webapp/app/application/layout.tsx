'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useRequireSession } from '@/lib/session'
import {
  fetchUserSettings,
  updateUserSettings,
  type UserSettings,
  type UserSettingsPatch,
} from '@/lib/settings'
import { useT } from '@/lib/i18n/useLanguage'
import { AppShell } from '@/components/AppShell'
import { AppHeaderCard } from '@/components/application/AppHeaderCard'
import { ApplicationTabs, APPLICATION_TABS } from '@/components/application/ApplicationTabs'
import { SettingsProvider } from '@/components/application/SettingsContext'
import { Card, FullPageLoader } from '@/components/ui'
import { TabSweep } from '@/components/TabSweep'

/**
 * Application section: the desktop app itself — whether it is running, on what
 * version, and how it behaves. Everything under the tabs writes to
 * `user_settings`, the same per-user row the desktop reads at launch and follows
 * over Realtime, so a change here reaches a running app without a restart.
 *
 * The settings here are the APP's, not the website's: the webapp is a fixed light
 * theme, so picking a theme changes the desktop and nothing on screen — and the
 * language tab sets the DESKTOP's language, not this page's, which is the account
 * menu's switcher. Repository settings live on /repository/[id]; who you are lives
 * on /account.
 *
 * WHY THE STATE IS IN THE LAYOUT
 * ---------------------------------------------------------------------------
 * One tab is one route, and a Next layout does not remount as its children change.
 * So the row, the fetch and the write queue live here: switching tabs costs no
 * request, and a save started on one tab cannot be interrupted by navigating to
 * another. The pages under it read the settings through context.
 */
export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const { session, pending } = useRequireSession()
  const { t, lang } = useT()
  // One tab is one route here, so the tab on screen is the pathname — the same value
  // the strip highlights by.
  const pathname = usePathname()
  const userId = session?.user.id

  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  /**
   * The freshest known settings, updated synchronously — before any await — so
   * two toggles flipped in quick succession both merge onto the newer value.
   * React state alone can't serve this: it only reflects a change on the next
   * render, so the second would merge onto a stale snapshot and drop the first.
   */
  const latest = useRef<UserSettings | null>(null)

  /**
   * Writes run one at a time, chained onto this promise. Concurrent upserts of
   * the same row could commit out of order, leaving the row on an older value
   * than the one the page shows.
   */
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  /** Sets state and the ref together, so they never disagree. */
  const store = useCallback((next: UserSettings) => {
    latest.current = next
    setSettings(next)
  }, [])

  useEffect(() => {
    if (!session) return
    fetchUserSettings().then(store)
  }, [session, store])

  /**
   * Optimistic save of a single changed setting: the control reflects it
   * immediately, while the write is queued behind any earlier one. State then
   * follows the row the write returns, so it shows what is actually stored.
   * A failure rolls the page back to the row as last known good.
   */
  const patch = useCallback(
    (p: UserSettingsPatch) => {
      const base = latest.current
      if (!userId || !base) return

      store({ ...base, ...p })
      setSaveError(null)

      queue.current = queue.current
        .then(async () => {
          try {
            const saved = await updateUserSettings(userId, p, lang)
            if (saved) store(saved)
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : t('common.saveFailed'))
            // Re-read rather than un-apply the patch: an earlier queued write
            // may have landed since, so the stored row is the only sound state
            // to fall back to.
            store(await fetchUserSettings())
          }
        })
        // Never leave a rejected promise in the queue: every later write chains
        // onto it, so one unexpected rejection would silently stop all of them.
        .catch(() => {})
    },
    [userId, store, lang, t],
  )

  if (pending || !session) return <FullPageLoader />

  return (
    <AppShell email={session.user.email ?? undefined}>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">
        {t('application.title')}
      </h1>

      <div className="mt-8 space-y-6">
        {/* Which app these settings belong to, before any of them. */}
        <AppHeaderCard />
        <ApplicationTabs />

        {settings === null ? (
          <Card className="p-8 text-center text-sm text-muted">{t('common.loading')}</Card>
        ) : (
          <SettingsProvider value={{ settings, patch }}>
            {saveError && (
              <p className="rounded-xl border border-red/20 bg-red/[0.04] px-3.5 py-2.5 text-xs text-red">
                {saveError}
              </p>
            )}
            {/* The routed page travels the way the strip does: a tab further right
                arrives from the right. The wrapper is in the LAYOUT because that is
                what survives the navigation — a page animating itself would be
                mounting, with nothing to know which way it came from. */}
            <TabSweep
              tabKey={pathname}
              order={APPLICATION_TABS.map((tab) => tab.href)}
              className="space-y-8"
            >
              {children}
            </TabSweep>
            <p className="text-xs text-muted">{t('application.footnote')}</p>
          </SettingsProvider>
        )}
      </div>
    </AppShell>
  )
}
