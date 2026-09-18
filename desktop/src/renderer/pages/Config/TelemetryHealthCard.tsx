import { useEffect, useState } from 'react'
import { HealthCard } from '@ds/desktop'
import type { TelemetryHealth } from '../../../types'
import { useT } from '../../i18n'

/**
 * Says whether usage recording is actually working.
 *
 * Every link in the chain fails quietly by design — the shell hook ends in `|| true`,
 * the writers swallow errors so telemetry can never break a session, the retry queue
 * drops its oldest entries when full. Individually correct, and together they made an
 * empty dashboard indistinguishable from a broken pipeline. Since those numbers are
 * read to judge adoption, the difference matters, and this is where it is stated.
 *
 * Three states, deliberately distinct: recording off is the USER'S CHOICE and is shown
 * neutrally, never as a fault — dressing a deliberate setting as an error is how a
 * panel like this teaches people to ignore it. That rule is `HealthCard`'s now, in the
 * design system, along with the mark, the tone and the arrangement; what stays here is
 * the read, the mapping onto the three states, and the words.
 */
export function TelemetryHealthCard() {
  const t = useT()
  const [health, setHealth] = useState<TelemetryHealth | null>(null)

  useEffect(() => {
    let cancelled = false
    window.electronAPI.usage
      .getTelemetryHealth()
      .then((h) => { if (!cancelled) setHealth(h) })
      .catch(() => { /* the panel simply does not render */ })
    return () => { cancelled = true }
  }, [])

  if (!health) return null

  const disabled = !health.recordingEnabled
  const degraded = health.issues.length > 0
  const pending = health.queuedEvents + health.spooledSkillRuns

  return (
    <HealthCard
      state={disabled ? 'off' : degraded ? 'degraded' : 'healthy'}
      title={t('settings.about.telemetry.title')}
      message={
        disabled
          ? t('settings.about.telemetry.off')
          : degraded
            ? t('settings.about.telemetry.degraded')
            : t('settings.about.telemetry.healthy')
      }
      details={
        !disabled && degraded
          ? health.issues.map((issue) => t(`settings.about.telemetry.issue.${issue}` as Parameters<typeof t>[0]))
          : undefined
      }
      // Pending work is NOT an issue: it retries by itself. Shown so a user who was
      // offline can see their runs are queued rather than lost — and not shown at all
      // while recording is off, where there is nothing to be behind on.
      note={!disabled && pending > 0 ? t('settings.about.telemetry.pending', { count: String(pending) }) : undefined}
      className="mt-3"
    />
  )
}
