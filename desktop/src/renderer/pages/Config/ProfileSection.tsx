import { useState, useEffect, useCallback } from 'react'
import { User } from 'lucide-react'
import { ProfileForm } from './ProfileForm'
import { ProfileFields, draftFromProfile, profileFromDraft, type ProfileDraft } from './ProfileFields'
import { SectionHeader } from './SectionHeader'
import { showToast } from '../../components/Toast'
import { useT } from '../../i18n'
import type { UserProfile } from '../../../types'

/**
 * The profile, editable where it is displayed.
 *
 * It used to be a read-only summary card with an "Edit profile" button that
 * opened the six-step onboarding wizard — so changing one word of the free-text
 * field meant walking through role, level, style and languages again, in a modal,
 * to arrive back where you started. Every field is now its own row here, and a
 * change is written as soon as it is made: pills on click, text on blur. Nothing
 * to submit, like the rest of Settings.
 *
 * The wizard is untouched and still owns FIRST launch (App.tsx opens it when no
 * profile exists) — a first-run walkthrough and a settings panel are two different
 * jobs, and the walkthrough is the one that has to explain itself.
 */
export function ProfileSection() {
  const t = useT()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(null))
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    try {
      const data = await window.electronAPI.profile.get()
      setProfile(data)
      setDraft(draftFromProfile(data))
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  /**
   * Apply a field change, and persist it when it is final.
   *
   * The draft moves first so the pill lights up immediately, and the whole
   * profile is written — `profile.save` takes a complete object, and every field
   * here is already in the draft. A save that fails reverts the draft to the
   * profile we know is on disk rather than leaving the UI claiming a value the
   * skills will never read.
   */
  const handleChange = useCallback(async (patch: Partial<ProfileDraft>, commit: boolean) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (!commit) return

    // Name, role and level are required — a cleared name is an edit in progress,
    // not an instruction to delete the profile, so it is kept on screen unsaved.
    const candidate = profileFromDraft(next)
    if (!candidate) return

    try {
      await window.electronAPI.profile.save(candidate)
      setProfile(candidate)
    } catch (e) {
      setDraft(draftFromProfile(profile))
      showToast(e instanceof Error ? e.message : t('toast.profileSaveFailed'), 'error')
    }
  }, [draft, profile, t])

  if (loading) return null

  return (
    <div>
      <SectionHeader icon={User} title={t('profile.section')} />

      {profile ? (
        <div className="bg-surface border border-line-strong rounded-xl p-4 flex flex-col gap-4">
          <ProfileFields draft={draft} onChange={handleChange} />
          {/* Saving is silent by design — but a draft missing a required field
              saves NOTHING, including the pills clicked after it. Without this
              line, clearing the name turns the whole card into a no-op that
              still looks like it is working. */}
          {!profileFromDraft(draft) && (
            <p className="text-xs text-yellow">{t('profile.form.requiredWarning')}</p>
          )}
        </div>
      ) : (
        /* No profile yet: same fields, but nothing can be written one at a time
           until the required ones are answered — so that path keeps its button. */
        <ProfileForm onSaved={loadProfile} />
      )}
    </div>
  )
}
