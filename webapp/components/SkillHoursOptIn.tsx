'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Timer } from 'lucide-react'
import { useSession } from '@/lib/session'
import { updateUserSettings } from '@/lib/settings'
import type { SkillHours } from '@/lib/skillHours'
import { useT } from '@/lib/i18n/useLanguage'
import { Button, Card } from '@/components/ui'
import { SkillHoursCard } from './SkillHoursCard'

/**
 * What stands where the hours would be when activity recording is off.
 *
 * The switch it flips is the one that decides whether a skill run is logged at all
 * (`usage_logs_enabled`, read as `usageLogsEnabled !== false` by
 * `desktop/src/main/usage/skill-invocations.ts`), so with it off the card upstream has
 * nothing to count and would print a frozen total as if it were current. Hiding it is
 * the honest move; this panel is what makes the hiding legible rather than a hole in
 * the page.
 *
 * IT WRITES THE SETTING ITSELF rather than linking to Application → Features. The
 * desktop follows `user_settings` over Realtime, so one click here reaches a running
 * app without a restart, and the detail of what gets recorded stays one tab away for
 * anyone who wants to read it before consenting — the note below points at it.
 *
 * The illustration is the REAL card with sample numbers in it, leaning back the way the
 * landing page's app panels do. Two reasons it is not a drawing: it cannot drift from
 * what actually renders, and what is being sold here is precisely that card.
 */

/**
 * Both figures count up once, on arrival — and they are the SAME climb seen twice.
 *
 * The week starts at nothing and the total starts part-way up, so the eighteen hours
 * that land in the week are the same eighteen the total gains: 119 → 137 beside 0 → 18.
 * That is the whole argument of the panel in one gesture — a week's work, and what it
 * adds to to the pile — and it only holds because one progress value drives both.
 *
 * The total is the one that must not start at zero: a counter winding up from nothing
 * reads as a page loading, where a figure already high enough to be a history reads as
 * one still climbing.
 */
const TOTAL_FROM = 137 - 18
const WEEK_FROM = 0
/** What both counters gain over the run. */
const HOURS_GAINED = 18
/** Long enough that the hours can be read as they pass, rather than blurred through. */
const COUNT_MS = 5000

/**
 * How long the confirmation stays up before the real card takes the space.
 *
 * Without it the panel vanished on the same tick the click landed: for anyone with
 * history to show, the write resolves and the hours arrive in a few hundred
 * milliseconds, so "C'est activé" was gone before it could be read — and what replaced
 * it looks like a different component, which reads as the page having jumped rather
 * than as the setting having been saved.
 *
 * Ten seconds is the confirmation's own reading time plus room to look away: it says
 * what happens next (the hours appear after the next skill run) and that the desktop
 * app needs no restart, which are two facts nobody has time to take in at 300ms.
 */
const HANDOVER_MS = 10_000
export function SkillHoursOptIn({ onEnabled }: { onEnabled: () => void }) {
  const { t, lang } = useT()
  const { session } = useSession()
  const userId = session?.user.id

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * The pending handover, held so leaving the page cancels it. Nothing breaks if it
   * fires late — `onEnabled` only re-reads the hours — but a timer nobody can cancel is
   * how a component keeps a dead parent's callback alive for ten seconds.
   */
  const handover = useRef(0)
  useEffect(() => () => window.clearTimeout(handover.current), [])

  /** How far through the climb both counters are, already eased: 0 at the start, 1 at rest. */
  const [progress, setProgress] = useState(0)

  /**
   * Runs the count once, on mount, and never again — the figures it lands on are the
   * ones the panel is promising, so they have to stay on screen rather than rewind and
   * replay under someone who is reading the sentence next to them.
   *
   * `prefers-reduced-motion` gets the destination immediately. That is not a degraded
   * version of this: the numbers are the message and the movement is the flourish, so
   * the flourish is what goes.
   */
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1)
      return
    }

    // Ease-out, SQUARED rather than cubed. A cubic curve puts about seventy percent of
    // the climb in the first fifth of the run, which at this length is a blur followed
    // by four seconds of a counter that looks stuck — lengthening the run made the
    // curve the thing to fix. Squared still settles on the figure instead of stopping
    // dead on it, while leaving the middle of the climb slow enough to read.
    const ease = (k: number) => 1 - (1 - k) ** 2
    const started = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const k = Math.min(1, (now - started) / COUNT_MS)
      setProgress(ease(k))
      if (k < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  /**
   * The numbers in the illustration. The total and the week are drawn (`stats` below);
   * `lastRunAt` is here because it is part of the shape the card is handed, not because
   * anything shows it.
   *
   * Both durations are the counter above, in seconds — `formatSkillTime` rounds to
   * whole hours, so a fractional value on the way up prints as the hour it has reached
   * and the card ticks 119h, 120h, 121h … with nothing here having to round anything.
   * The week passes through minutes on its way out of zero for a frame or two, which is
   * the same formatter doing the same thing it does for a real first week.
   *
   * The date is taken off the current day rather than pinned to a literal, so "since"
   * stays plausible instead of drifting further into the past with every month the
   * panel ships unchanged.
   *
   * Computed at render, which is safe here because nothing server-renders it: the
   * dashboard paints a loader until the session guard resolves in the browser, so this
   * component's first paint is already client-side. `useMemo` only keeps the dates from
   * moving between renders — the total is deliberately outside it.
   */
  const dates = useMemo(() => {
    const daysAgo = (days: number) =>
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    // No agent name: the illustration does not draw the last-use column at all
    // (`stats` below), so inventing one would only be a fixture nobody sees.
    return { firstMeasuredAt: daysAgo(150), lastRunAt: daysAgo(1), lastRunAgent: null }
  }, [])

  const sample: SkillHours = {
    ...dates,
    totalSeconds: (TOTAL_FROM + HOURS_GAINED * progress) * 3600,
    weekSeconds: (WEEK_FROM + HOURS_GAINED * progress) * 3600,
  }

  async function enable() {
    if (!userId || saving) return
    setSaving(true)
    setError(null)
    try {
      await updateUserSettings(userId, { usageLogsEnabled: true }, lang)
      setSaved(true)
      // Telling the parent is what ENDS this panel: it re-reads the hours, and for
      // anyone who recorded before turning this off, the real card lands and takes the
      // space. Held back so the confirmation is a message rather than a flicker — see
      // HANDOVER_MS.
      handover.current = window.setTimeout(onEnabled, HANDOVER_MS)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="group relative mb-4 overflow-hidden p-6 sm:p-8">
      <div className="flex items-center gap-10">
        <div className="min-w-0 flex-1 lg:max-w-md">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              saved ? 'bg-green/10 text-green' : 'bg-accent/10 text-accent'
            }`}
          >
            {saved ? <Check className="h-5 w-5" /> : <Timer className="h-5 w-5" />}
          </span>

          <h2 className="mt-4 font-display text-2xl font-black leading-tight tracking-tight text-ink">
            {t(saved ? 'skillHours.optIn.savedTitle' : 'skillHours.optIn.title')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t(saved ? 'skillHours.optIn.savedBody' : 'skillHours.optIn.body')}
          </p>

          {/* Gone once it has been flipped: a button that would write the value it
              already holds is a second click with nothing behind it. */}
          {!saved && (
            <div className="mt-5">
              <Button onClick={enable} disabled={saving || !userId}>
                {t(saving ? 'skillHours.optIn.saving' : 'skillHours.optIn.cta')}
              </Button>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-red">{error}</p>}

          {/* Where to read what is actually recorded, and where to undo this. Kept in
              both states: it is most useful to the person who just said yes. */}
          <p className="mt-3 text-[11px] leading-snug text-muted">
            {t('skillHours.optIn.note')}
          </p>
        </div>

        {/*
          The leaning card. Hidden below `lg`: there is no width at which a phone can
          show both it and the sentence it illustrates.

          `perspective` on the container and the rotation on the child, so the lean is
          a real 3D turn rather than a flattened skew. It straightens a little on hover
          — motion-safe only, since it is decoration and someone who asked their system
          for less motion gets it still.

          IT MUST FIT INSIDE ITS OWN BOX. The panel around it clips (`overflow-hidden`,
          which the tilt needs so nothing can escape the card), so anything the
          illustration paints past its layout width is not "bleeding off the frame" —
          it is a corner sliced off. Two things keep it inside: the transform origin
          stays CENTRED, so the near edge of the turn grows towards the middle instead
          of past the right edge, and `scale` shrinks what is painted below the width
          the box reserves. The scale is also what makes it small: the card's own
          padding and type sizes belong to the real one and are not up for negotiation
          here, so the illustration is the same card seen from further away.
        */}
        <div
          aria-hidden
          className="pointer-events-none relative hidden shrink-0 [perspective:1200px] lg:block"
        >
          {/*
            The trail: one broad diagonal band under the card, this section's counterpart
            to the landing page's blob and triangle. `bg-accent/10` IS
            rgb(99 102 241 / 0.1) — the theme's accent is #6366f1, and going through the
            token keeps the band tied to the icon badge above it rather than to a hex
            nobody would think to update.

            Tuned in the browser, transplanted verbatim: 690 × 256 at -60°, with the
            final `translate` applied in the ROTATED frame so it slides the band ALONG
            its own axis rather than down the page. Bigger than the box it is centred on,
            which is the point — the frame cuts it, and a backdrop running past the edge
            reads as a backdrop, where a card doing the same reads as a mistake.

            `z-0` / `z-10` rather than DOM order alone: an absolutely positioned box
            paints above a sibling that is merely in flow, so without the pair the
            backdrop would sit on top of what it backs.
          */}
          <span className="absolute left-1/2 top-1/2 z-0 h-[256px] w-[690px] rounded-full bg-accent/10 [transform:translate(-50%,-50%)_rotate(-60deg)_translate(-24px,54px)]" />

          {/* Wider than it paints, and scaled back down: two figures side by side need
              the room or "Temps passé cette semaine" truncates to an ellipsis, while the
              FOOTPRINT has to stay what it was — the panel is beside a paragraph, not
              instead of it. 460 at 0.72 lands within a few pixels of the single figure
              at 340 × 0.84. */}
          <div className="relative z-10 w-[460px] transition-transform duration-500 [transform:rotateY(-16deg)_rotateX(7deg)_rotate(-2deg)_scale(0.72)] motion-safe:group-hover:[transform:rotateY(-9deg)_rotateX(4deg)_rotate(-1deg)_scale(0.76)]">
            <SkillHoursCard
              hours={sample}
              stats={['total', 'week']}
              className="shadow-[0_16px_36px_-18px_rgba(19,16,48,0.4)]"
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
