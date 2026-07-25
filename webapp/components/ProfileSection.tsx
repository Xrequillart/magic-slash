'use client'

import { useEffect, useState } from 'react'
import { Pencil, UserRound } from 'lucide-react'
import { ProfileWizard } from '@/components/ProfileWizard'
import { Badge, Card, SectionHeader } from '@/components/ui'
import {
  fetchProfile,
  isProfileComplete,
  LEVEL_LABELS,
  ROLE_LABELS,
  STYLE_LABELS,
  type UserProfile,
} from '@/lib/profile'

/**
 * Profile card: a read-only summary of what Claude knows about you. The whole
 * card is the edit affordance — clicking it opens the same wizard the dashboard
 * checklist uses, so there is only one place the profile is ever edited.
 */
export function ProfileSection() {
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
        title="Profile"
        action={
          filled ? (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Pencil className="h-3 w-3" />
              Click to edit
            </span>
          ) : null
        }
      />

      <button
        onClick={() => setWizardOpen(true)}
        className="block w-full text-left"
        aria-label={filled ? 'Edit your profile' : 'Fill in your profile'}
      >
        <Card className="p-5 transition-colors hover:border-black/10 hover:bg-canvas">
          {profile === undefined ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : !filled || p === null ? (
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10">
                <UserRound className="h-4 w-4 text-brand" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-ink">Fill in your profile</p>
                <p className="mt-0.5 text-xs text-muted">
                  A few questions so Claude adapts its tone and depth to how you work.
                </p>
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
                  <p className="mt-0.5 text-xs text-muted">{LEVEL_LABELS[p.technicalLevel]}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge tone="accent">{ROLE_LABELS[p.role]}</Badge>
                {p.communicationStyle && (
                  <Badge>{STYLE_LABELS[p.communicationStyle]}</Badge>
                )}
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
