import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react'
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
 * panel like this teaches people to ignore it.
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

  const Icon = disabled ? MinusCircle : degraded ? AlertTriangle : CheckCircle2
  // Theme tokens, not Tailwind's numbered scale: a fixed colour survives a theme
  // switch and stops being readable on half of them (see themes.test.ts).
  const tone = disabled ? 'text-text-secondary/60' : degraded ? 'text-yellow' : 'text-green'

  return (
    <div className="bg-surface border border-line-strong rounded-xl p-4 mt-3">
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone}`} />
        <div className="min-w-0">
          <div className="font-medium text-sm">{t('settings.about.telemetry.title')}</div>
          <div className="text-xs text-text-secondary/70 mt-1">
            {disabled
              ? t('settings.about.telemetry.off')
              : degraded
                ? t('settings.about.telemetry.degraded')
                : t('settings.about.telemetry.healthy')}
          </div>

          {!disabled && degraded && (
            <ul className="mt-2 space-y-1.5">
              {health.issues.map((issue) => (
                <li key={issue} className="text-xs text-text-secondary/70 flex gap-1.5">
                  <span aria-hidden className="text-yellow">•</span>
                  <span>{t(`settings.about.telemetry.issue.${issue}` as Parameters<typeof t>[0])}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Pending work is NOT an issue: it retries by itself. Shown so a user who
              was offline can see their runs are queued rather than lost. */}
          {!disabled && health.queuedEvents + health.spooledSkillRuns > 0 && (
            <div className="text-xs text-text-secondary/50 mt-2">
              {t('settings.about.telemetry.pending', {
                count: String(health.queuedEvents + health.spooledSkillRuns),
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
