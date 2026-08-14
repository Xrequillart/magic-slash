'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSkillHours } from '@/lib/skills'
import { DEFAULTS, fetchUserSettings } from '@/lib/settings'
import { hasNeverRun, type SkillHours } from '@/lib/skillHours'
import { SkillHoursCard } from './SkillHoursCard'
import { SkillHoursOptIn } from './SkillHoursOptIn'

/**
 * How long this person has spent inside the skills — all time, this week, and when they
 * last used them. Or, when they have turned activity recording off, the panel that says
 * so and offers to turn it back on.
 *
 * ABOVE THE TABS, and that placement is the argument for the component's shape: the
 * tabs below it scope the repository list and the skill counts to one organization,
 * while these figures are the VIEWER's own across every scope. A card that changed when
 * you switched tabs would be claiming to be scoped; one that sits above them says it is
 * not, and it does not need `activeScope` passed to it to prove that.
 *
 * Counts beside it answer "is the cycle being used"; this answers "what has it cost",
 * which is the number a person recognises as theirs.
 *
 * WHY THE SETTING IS READ BEFORE ANYTHING IS DRAWN
 * ---------------------------------------------------------------------------
 * `usage_logs_enabled` is what decides whether a skill run is recorded at all
 * (`desktop/src/main/usage/skill-invocations.ts` returns early on an explicit false).
 * With it off, `skill_hours` still answers — with whatever was recorded before it was
 * switched off. Drawing that under "Time spent this week" would be a stale number
 * presented as a current one, which is why the card is gated on the switch rather than
 * on the figures being non-zero.
 *
 * So this renders NOTHING until the settings row resolves. It costs a beat before the
 * skeleton appears, and it buys never flashing the hours at someone who is about to be
 * shown the opt-in panel instead.
 */
export function SkillHoursBanner() {
  // undefined = still reading, null = the read failed. The first draws placeholders,
  // the second draws nothing: a card of zeros would be a claim, and a failed read has
  // nothing to claim.
  const [hours, setHours] = useState<SkillHours | null | undefined>(undefined)

  /** undefined until the settings row resolves; see the note above on why that gates. */
  const [recording, setRecording] = useState<boolean | undefined>(undefined)

  /**
   * Recording was off when this page was opened — and stays true after it is switched
   * on here, which is the point. Someone who has never recorded anything has no hours
   * to show the instant they consent, and letting the panel vanish into an empty space
   * would read as the click having done nothing. It hands over to the card when there
   * is finally something in it.
   */
  const [wasOff, setWasOff] = useState(false)

  /**
   * Whether a resolved read should still be applied. A ref rather than the effect-scoped
   * `cancelled` flag this used to have: the reload triggered from the opt-in panel starts
   * long after the mount that flag belonged to.
   *
   * RAISED IN THE EFFECT BODY, not just at the declaration. Strict Mode mounts, unmounts
   * and remounts every component in development (`reactStrictMode` is on), so the cleanup
   * below fires once on a component that is about to live: an initial value alone leaves
   * the ref false for the rest of the session and every read lands on a closed door — no
   * settings, no hours, and a banner stuck on "not read yet", which draws nothing at all.
   *
   * Declared before the effect that reads, so on the remount it is true again before
   * anything is fetched.
   */
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const loadHours = useCallback(() => {
    setHours(undefined)
    fetchSkillHours()
      // Same reasoning as the settings read below, one notch less severe: a rejection
      // here would leave the placeholders pulsing forever, which is a card that never
      // says it failed. `null` is the state that means exactly that.
      .catch(() => null)
      .then((next) => {
        if (alive.current) setHours(next)
      })
  }, [])

  useEffect(() => {
    loadHours()
    fetchUserSettings()
      .then((settings) => {
        // Through DEFAULTS, like every other read of a setting in this app: null means
        // the user never chose, and the desktop records by default. Treating null as off
        // would show the panel to every account that has simply never opened the
        // settings, none of which has recording off at all.
        return settings.usageLogsEnabled ?? DEFAULTS.usageLogsEnabled
      })
      // A read that never resolves is the one failure that costs the most here: this
      // component draws NOTHING until the setting is known, so an unhandled rejection
      // would silently delete the card from the dashboard. `fetchUserSettings` already
      // answers a query error with the empty row, so what is left to catch is the client
      // itself failing — and the safe answer to that is the behaviour every account had
      // before this gate existed.
      .catch(() => DEFAULTS.usageLogsEnabled)
      .then((on) => {
        if (!alive.current) return
        setRecording(on)
        if (!on) setWasOff(true)
      })
  }, [loadHours])

  const enabled = useCallback(() => {
    setRecording(true)
    loadHours()
  }, [loadHours])

  if (recording === undefined) return null

  const measured = hours != null && !hasNeverRun(hours)

  // Off, or just switched on and with nothing to show for it yet.
  if (!recording || (wasOff && !measured)) return <SkillHoursOptIn onEnabled={enabled} />

  if (hours === null) return null
  // Never run anything: three em dashes under three headings say nothing worth the
  // space. The dashboard has a checklist for that stage of the account.
  if (hours && hasNeverRun(hours)) return null

  return <SkillHoursCard hours={hours ?? null} className="mb-4" />
}
