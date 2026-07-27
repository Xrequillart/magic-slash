'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRequireSession } from '@/lib/session'
import {
  fetchUserSettings,
  updateUserSettings,
  type UserSettings,
  type UserSettingsPatch,
} from '@/lib/settings'
import { AppShell } from '@/components/AppShell'
import { AppSettings } from '@/components/AppSettings'
import { AppStatusSection } from '@/components/AppStatusSection'
import { Card, FullPageLoader } from '@/components/ui'

/**
 * Application page: the desktop app itself — whether it is running, on what
 * version, and how it behaves. Everything below the status card writes to
 * `user_settings`, the same per-user row the desktop reads at launch.
 *
 * The settings on this page are the *app's*, not the website's: the webapp is a
 * fixed light theme in English, so picking a theme or a language here changes
 * the desktop and nothing on screen. Repository settings live on
 * /repository/[id]; who you are lives on /account.
 */
export default function Application() {
  const { session, pending } = useRequireSession()
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
            const saved = await updateUserSettings(userId, p)
            if (saved) store(saved)
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save.')
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
    [userId, store],
  )

  if (pending || !session) return <FullPageLoader />

  return (
    <AppShell email={session.user.email ?? undefined}>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">Application</h1>

      <div className="mt-10 space-y-8">
        <AppStatusSection />

        {settings === null ? (
          <Card className="p-8 text-center text-sm text-muted">Loading…</Card>
        ) : (
          <>
            {saveError && (
              <p className="rounded-xl border border-red/20 bg-red/[0.04] px-3.5 py-2.5 text-xs text-red">
                {saveError}
              </p>
            )}
            <AppSettings settings={settings} onPatch={patch} />
            <p className="text-xs text-muted">
              These settings belong to the desktop app and follow your account onto every machine you sign
              in on. A running app picks them up the next time it starts.
            </p>
          </>
        )}
      </div>
    </AppShell>
  )
}
