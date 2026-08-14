import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Timer } from 'lucide-react'
import type { Config, SkillHours } from '../../../types'
import { useConfig } from '../../hooks/useConfig'
import { useStore } from '../../store'
import { useT } from '../../i18n'
import { hasNeverRun } from '../../utils/skillHours'
import { SkillHoursCard } from './SkillHoursCard'

/**
 * How long this person has spent inside the skills — all time, this week, and when they
 * last used them. Or, when they have turned activity recording off, the panel that says so
 * and offers to turn it back on.
 *
 * ABOVE THE TABS, and that placement is the argument for the component's shape: the tabs
 * below scope the repository list and the skill counts to one organization, while these
 * figures are the VIEWER's own across every scope. A card that changed when you switched
 * tabs would be claiming to be scoped; one that sits above them says it is not, and it
 * does not need `activeScope` passed to it to prove that.
 *
 * The counts beside it answer "is the cycle being used"; this answers "what has it cost",
 * which is the number a person recognises as theirs.
 *
 * WHY THE SETTING GATES THE CARD
 * ---------------------------------------------------------------------------
 * `usageLogsEnabled` is what decides whether a skill run is recorded at all
 * (`main/usage/skill-invocations.ts` returns early on an explicit false). With it off the
 * RPC still answers — with whatever was recorded before it was switched off. Drawing that
 * under "Time spent this week" would be a stale number presented as a current one, which
 * is why the card is gated on the switch rather than on the figures being non-zero.
 *
 * Cheaper here than in the webapp, which has to await a settings row before it may draw
 * anything: the desktop already holds the switch in its local config, so the gate costs no
 * round trip and there is no beat during which the wrong panel could flash.
 */
export function SkillHoursBanner() {
  const { config } = useConfig()
  const { setConfig } = useStore()

  // undefined = still reading, null = the read failed. The first draws placeholders, the
  // second draws nothing: a card of zeros would be a claim, and a failed read has nothing
  // to claim.
  const [hours, setHours] = useState<SkillHours | null | undefined>(undefined)

  /**
   * Recording was off when this page was opened — and stays true after it is switched on
   * here, which is the point. Someone who has never recorded anything has no hours to show
   * the instant they consent, and letting the panel vanish into an empty space would read
   * as the click having done nothing. It hands over to the card when there is finally
   * something in it.
   */
  const [wasOff, setWasOff] = useState(false)

  /**
   * The opt-in panel is showing its confirmation, and keeps the space until it says it is
   * done. Explicit state rather than something read off the switch, because the switch is
   * written the instant the click resolves — see `saved` below.
   */
  const [confirming, setConfirming] = useState(false)

  /**
   * Whether a resolved read should still be applied. A ref rather than an effect-scoped
   * flag: the reload triggered from the opt-in panel starts long after the mount such a
   * flag would belong to. Raised in the effect body as well as at the declaration, so a
   * remount reopens the door the previous unmount closed.
   */
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const loadHours = useCallback(() => {
    setHours(undefined)
    window.electronAPI.usage
      .getSkillHours()
      // A rejection here would leave the placeholders pulsing forever, which is a card
      // that never says it failed. `null` is the state that means exactly that.
      .catch(() => null)
      .then((next) => {
        if (alive.current) setHours(next)
      })
  }, [])

  useEffect(() => {
    loadHours()
  }, [loadHours])

  // The local config is the switch itself, and it is ON by default: only an explicit false
  // opts out, exactly as the three writers read it.
  const recording = config ? config.usageLogsEnabled !== false : undefined

  useEffect(() => {
    if (recording === false) setWasOff(true)
  }, [recording])

  const saved = useCallback(
    (next: Config) => {
      // Straight into the store, on the tick the write resolves. The main process hands the
      // whole config back, and everything else that reads the switch — the Settings page
      // above all — shares this store: holding the new value back for the length of the
      // confirmation below would leave the toggle over there reading "off" about a setting
      // that is already on.
      setConfig(next)
      // Which is why the panel's own confirmation gets a flag rather than being inferred
      // from the switch. It has to survive the switch flipping under it.
      setConfirming(true)
    },
    [setConfig],
  )

  const handedOver = useCallback(() => {
    setConfirming(false)
    loadHours()
  }, [loadHours])

  // Nothing is known yet — not even which of the two panels this is. One beat of empty
  // space beats flashing the hours at someone about to be shown the opt-in instead.
  if (recording === undefined) return null

  const measured = hours != null && !hasNeverRun(hours)

  // Off, still confirming a switch that was just flipped, or flipped a while ago with
  // nothing to show for it yet.
  if (!recording || confirming || (wasOff && !measured)) {
    return <SkillHoursOptIn onSaved={saved} onHandover={handedOver} />
  }

  if (hours === null) return null
  // Never run anything: three em dashes under three headings say nothing worth the space.
  if (hours && hasNeverRun(hours)) return null

  return <SkillHoursCard hours={hours ?? null} />
}

/**
 * What stands where the hours would be when activity recording is off.
 *
 * The switch it flips is the one that decides whether a skill run is logged at all, so
 * with it off the card above has nothing to count and would print a frozen total as if it
 * were current. Hiding it is the honest move; this panel is what makes the hiding legible
 * rather than a hole in the page.
 *
 * IT WRITES THE SETTING ITSELF rather than sending the reader to Settings → Application.
 * One click here is the whole decision, and the detail of what gets recorded stays one
 * page away for anyone who wants to read it before consenting — the note below points at
 * it. The webapp's version of this panel leans an illustration of the card beside the
 * copy; there is no room for that in a modal this size, so the icon carries it.
 */
function SkillHoursOptIn({
  onSaved,
  onHandover,
}: {
  /** The switch is on — fired as soon as the write resolves, with the config it produced. */
  onSaved: (config: Config) => void
  /** The confirmation has been read; the space is the card's now. */
  onHandover: () => void
}) {
  const t = useT()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * The pending handover, held so leaving the page cancels it. Nothing breaks if it fires
   * late — it only re-reads the hours — but a timer nobody can cancel is how a component
   * keeps a dead parent's callback alive for ten seconds.
   */
  const handover = useRef(0)
  useEffect(() => () => window.clearTimeout(handover.current), [])

  async function enable() {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const result = await window.electronAPI.config.setUsageLogsEnabled(true)
      setSaved(true)
      onSaved(result.config)
      /**
       * The HANDOVER is what is held back, not the write. Done on the same tick the click
       * lands, the panel would vanish immediately for anyone with history to show — the
       * hours arrive in a few hundred milliseconds — so "It's on." would be gone before it
       * could be read, and what replaced it looks like a different component, which reads
       * as the page having jumped rather than as the setting having been saved.
       *
       * Ten seconds is the confirmation's own reading time plus room to look away: it says
       * what happens next, which nobody takes in at 300ms.
       */
      handover.current = window.setTimeout(onHandover, 10_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('skillHours.optIn.failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl bg-surface-subtle border border-line-field p-4">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          saved ? 'bg-green/15 text-green' : 'bg-accent/15 text-accent'
        }`}
      >
        {saved ? <Check className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
      </span>

      <h2 className="mt-3 text-sm font-medium text-ink">
        {t(saved ? 'skillHours.optIn.savedTitle' : 'skillHours.optIn.title')}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary max-w-2xl">
        {t(saved ? 'skillHours.optIn.savedBody' : 'skillHours.optIn.body')}
      </p>

      {/* Gone once it has been flipped: a button that would write the value it already
          holds is a second click with nothing behind it. */}
      {!saved && (
        <button
          onClick={enable}
          disabled={saving}
          className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-on-brand hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {t(saving ? 'skillHours.optIn.saving' : 'skillHours.optIn.cta')}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red">{error}</p>}

      {/* Where to read what is actually recorded, and where to undo this. Kept in both
          states: it is most useful to the person who just said yes. */}
      <p className="mt-3 text-[11px] leading-snug text-text-secondary/50 max-w-2xl">
        {t('skillHours.optIn.note')}
      </p>
    </div>
  )
}
