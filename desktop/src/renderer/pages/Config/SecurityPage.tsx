import { useCallback, useEffect, useState } from 'react'
import { EmptyState, SettingsCard, type SettingsCardRow } from '@ds/desktop'
import { Chrome, Firefox, Globe, LogOut, MagicSlash, MonitorSmartphone, RefreshCw, Safari, ShieldAlert } from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop/types'
import type { AccountSession } from '../../../types'
import { parseSessionAgent } from '../../../sessionAgent'
import { showToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useLocale, useT, type Translate } from '../../i18n'

/**
 * Security & Access: every device and browser signed in to the account, when each was
 * last used, and a way to sign any of them out but this one.
 *
 * THIS DEVICE IS LISTED AND NOT REVOCABLE HERE. Signing it out is the Account page's
 * sign-out, which also tears the local state down; the server refuses it from here too
 * (`revoke_account_session`).
 *
 * The list is read on mount and after every revoke, never cached: it is a security page,
 * and a row that lingers after its device was signed out elsewhere would be a lie.
 */
export function SecurityPage() {
  const t = useT()
  const locale = useLocale()
  const { status, loading: authLoading } = useAuth()
  const [sessions, setSessions] = useState<AccountSession[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      setSessions(await window.electronAPI.auth.listSessions())
    } catch (error) {
      console.error('[security] could not list sessions:', error)
      setFailed(true)
    }
  }, [])

  const signedIn = status.enabled && status.loggedIn
  useEffect(() => {
    if (signedIn) load()
  }, [signedIn, load])

  const revoke = useCallback(
    async (id: string | 'others') => {
      setRevoking(id)
      try {
        if (id === 'others') await window.electronAPI.auth.revokeOtherSessions()
        else await window.electronAPI.auth.revokeSession(id)
        showToast(t(id === 'others' ? 'security.revokedAll' : 'security.revoked'))
      } catch (error) {
        showToast(error instanceof Error ? error.message : String(error), 'error')
      } finally {
        setRevoking(null)
        await load()
      }
    },
    [load, t],
  )

  if (authLoading) return null
  if (!signedIn) return <EmptyState icon={ShieldAlert}>{t('security.signedOut')}</EmptyState>
  if (failed) {
    return (
      <EmptyState
        icon={ShieldAlert}
        actions={[{ id: 'retry', label: t('security.retry'), icon: RefreshCw, onClick: load }]}
      >
        {t('security.loadFailed')}
      </EmptyState>
    )
  }
  if (!sessions) return <EmptyState busy>{t('security.loading')}</EmptyState>

  const current = sessions.filter((session) => session.isCurrent)
  const others = sessions.filter((session) => !session.isCurrent)

  const row = (session: AccountSession): SettingsCardRow => ({
    id: session.id,
    ...describe(session, t, locale),
    control: session.isCurrent
      ? { kind: 'live', label: t('security.activeNow') }
      : {
          kind: 'button',
          size: 'sm',
          tone: 'danger',
          icon: LogOut,
          children: t('security.revoke'),
          busy: revoking === session.id,
          disabled: revoking !== null,
          onClick: () => revoke(session.id),
        },
  })

  return (
    <div className="flex flex-col gap-8">
      <SettingsCard title={t('security.current')} rows={current.map(row)} note={t('security.geoCredit')} />
      {others.length === 0 ? (
        <EmptyState icon={MonitorSmartphone}>{t('security.noOthers')}</EmptyState>
      ) : (
        <SettingsCard title={t('security.others')} rows={others.map(row)} note={t('security.note')} />
      )}
      {others.length > 1 && (
        <SettingsCard
          rows={[
            {
              id: 'revoke-all',
              label: t('security.revokeAll'),
              hint: t('security.revokeAllHint'),
              control: {
                kind: 'button',
                size: 'sm',
                tone: 'danger',
                icon: LogOut,
                children: t('security.revokeAll'),
                busy: revoking === 'others',
                disabled: revoking !== null,
                onClick: () => revoke('others'),
              },
            },
          ]}
        />
      )}
    </div>
  )
}

function describe(
  session: AccountSession,
  t: Translate,
  locale: string,
): { label: string; mark: { glyph: IconComponent; title: string }; hint: string } {
  const agent = parseSessionAgent(session.userAgent)
  const label =
    agent.kind === 'desktop'
      ? agent.name
        ? t('security.appOn', { name: agent.name })
        : t('security.app')
      : agent.kind === 'browser'
        ? agent.os
          ? t('security.browserOn', { browser: agent.name ?? '', os: agent.os })
          : (agent.name ?? '')
        : t('security.unknown')

  const mark =
    agent.kind === 'desktop'
      ? { glyph: MagicSlash, title: 'Magic Slash' }
      : { glyph: BROWSER_MARKS[agent.name ?? ''] ?? Globe, title: agent.name ?? t('security.unknown') }

  // The session in use says so with its pill, on the right; the others say when.
  const activity = session.isCurrent ? null : t('security.lastActive', { time: relative(session.lastUsedAt, locale) })
  const since = session.createdAt
    ? t('security.signedInOn', {
        date: new Date(session.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
      })
    : null

  const hint = [activity, since, place(session, locale), session.ip].filter(Boolean).join(' · ')
  // "signed in …" is written to follow the activity; on the current row it leads.
  return { label, mark, hint: hint.charAt(0).toLocaleUpperCase(locale) + hint.slice(1) }
}

/** The browsers with a logo of their own; any other one wears a globe. */
const BROWSER_MARKS: Record<string, IconComponent> = { Chrome, Firefox, Safari }

/** "Caen, France", in the interface's language for the country; DB-IP's city as is. */
function place(session: AccountSession, locale: string): string | null {
  const { city, countryCode } = session.location ?? {}
  let country: string | null = null
  if (countryCode) {
    try {
      country = new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode) ?? countryCode
    } catch {
      country = countryCode
    }
  }
  return [city, country].filter(Boolean).join(', ') || null
}

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

function relative(iso: string | null, locale: string): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (!iso) return format.format(0, 'second')
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(0, 'minute')
}
