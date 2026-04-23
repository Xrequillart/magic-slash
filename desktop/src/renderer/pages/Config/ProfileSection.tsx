import { useState, useEffect, useCallback } from 'react'
import { User, Pencil, Plus } from 'lucide-react'
import { ProfileOnboardingWizard } from '../../components/ProfileOnboardingWizard'
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </div>
          {profile && (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit profile</span>
            </button>
          )}
        </div>

        {profile ? (
          <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
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
                <span className="px-2 py-0.5 bg-white/5 text-text-secondary text-xs font-medium rounded">
                  {STYLE_LABELS[profile.communication_style] || profile.communication_style}
                </span>
              )}
              {profile.languages?.map((lang) => (
                <span key={lang} className="px-2 py-0.5 bg-white/5 text-text-secondary text-xs font-medium rounded">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowWizard(true)}
            className="w-full py-6 text-center border border-dashed border-border/50 rounded-xl hover:border-text-secondary/50 hover:bg-white/5 transition-colors"
          >
            <User className="w-6 h-6 text-text-secondary/30 mx-auto mb-2" />
            <div className="text-sm text-text-secondary/50 mb-1">No profile configured</div>
            <div className="flex items-center gap-1 justify-center text-xs text-accent/70">
              <Plus className="w-3 h-3" />
              Create profile
            </div>
          </button>
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
