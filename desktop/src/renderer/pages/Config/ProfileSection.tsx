import { useState, useEffect, useCallback } from 'react'
import { User, Pencil } from 'lucide-react'
import { ProfileOnboardingWizard } from '../../components/ProfileOnboardingWizard'
import { ProfileForm } from './ProfileForm'
import { SectionHeader } from './SectionHeader'
import { ROLE_LABELS, LEVEL_LABELS, STYLE_LABELS, type UserProfile } from '../../../types'

export function ProfileSection() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const data = await window.electronAPI.profile.get()
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleWizardClose = useCallback(() => {
    setShowWizard(false)
    loadProfile()
  }, [loadProfile])

  if (loading) return null

  return (
    <>
      <div>
        <SectionHeader
          icon={User}
          title="Profile"
          action={profile && (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit profile</span>
            </button>
          )}
        />

        {profile ? (
          <div className="bg-surface border border-line-strong rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-accent">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium">{profile.name}</div>
                <div className="text-xs text-text-secondary/50 mt-0.5">
                  {LEVEL_LABELS[profile.technical_level] || profile.technical_level}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded">
                {ROLE_LABELS[profile.role] || profile.role}
              </span>
              {profile.communication_style && (
                <span className="px-2 py-0.5 bg-surface text-text-secondary text-xs font-medium rounded">
                  {STYLE_LABELS[profile.communication_style] || profile.communication_style}
                </span>
              )}
              {profile.languages?.map((lang) => (
                <span key={lang} className="px-2 py-0.5 bg-surface text-text-secondary text-xs font-medium rounded">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* No profile → fill it in right here rather than behind a wizard. */
          <ProfileForm onSaved={loadProfile} />
        )}
      </div>

      <ProfileOnboardingWizard
        isOpen={showWizard}
        onClose={handleWizardClose}
        editMode={profile !== null}
        initialData={profile || undefined}
      />
    </>
  )
}
