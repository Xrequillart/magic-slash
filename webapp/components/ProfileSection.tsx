'use client'

import { useEffect, useState } from 'react'
import { Pencil, UserRound } from 'lucide-react'
import { ProfileWizard } from '@/components/ProfileWizard'
import { Badge, Card, SectionHeader } from '@/components/ui'
import {
  fetchProfile,
  isProfileComplete,
  LEVEL_LABEL_KEYS,
  ROLE_LABEL_KEYS,
  STYLE_LABEL_KEYS,
  type UserProfile,
} from '@/lib/profile'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * Profile card: a read-only summary of what Claude knows about you. The whole
 * card is the edit affordance — clicking it opens the same wizard the dashboard
 * checklist uses, so there is only one place the profile is ever edited.
 */
export function ProfileSection() {
  const { t } = useT()
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined)
  const [wizardOpen, setWizardOpen] = useState(false)

  useEffect(() => {
    fetchProfile().then(setProfile)
  }, [])

  // `undefined` while loading, `null` when there is no row — collapse both to a
  // single nullable value so the render can narrow on it.
  const p = profile ?? null
  const filled = p !== null && isProfileComplete(p)

  return (
    <section>
      <SectionHeader
        icon={UserRound}
        title={t('profile.title')}
        action={
          filled ? (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Pencil className="h-3 w-3" />
              {t('profile.clickToEdit')}
            </span>
          ) : null
        }
      />

      <button
        onClick={() => setWizardOpen(true)}
        className="block w-full text-left"
        aria-label={filled ? t('profile.editAria') : t('profile.fillAria')}
      >
        <Card className="p-5 transition-colors hover:border-black/10 hover:bg-canvas">
          {profile === undefined ? (
            <p className="text-sm text-muted">{t('common.loading')}</p>
          ) : !filled || p === null ? (
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
                <UserRound className="h-4 w-4 text-brand" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-ink">{t('profile.fillTitle')}</p>
                <p className="mt-0.5 text-xs text-muted">{t('profile.fillHint')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 font-display text-sm font-bold text-brand">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-ink">{p.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {t(LEVEL_LABEL_KEYS[p.technicalLevel])}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge tone="accent">{t(ROLE_LABEL_KEYS[p.role])}</Badge>
                {p.communicationStyle && <Badge>{t(STYLE_LABEL_KEYS[p.communicationStyle])}</Badge>}
                {p.languages.map((lang) => (
                  <Badge key={lang}>{lang}</Badge>
                ))}
              </div>

              {p.freeText && (
                <p className="mt-4 border-t border-black/5 pt-4 text-xs text-muted">{p.freeText}</p>
              )}
            </>
          )}
        </Card>
      </button>

      <ProfileWizard
        open={wizardOpen}
        initial={profile ?? null}
        onClose={() => setWizardOpen(false)}
        onSaved={setProfile}
      />
    </section>
  )
}
