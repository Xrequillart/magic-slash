import { useState, useCallback } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { showToast } from '../../components/Toast'
import { ProfileFields, draftFromProfile, profileFromDraft, type ProfileDraft } from './ProfileFields'
import { useT } from '../../i18n'

/**
 * Profile form for an account that has none yet, so the Account tab can be filled
 * in place instead of sending the user to the wizard.
 *
 * Same fields as the editor above it — it renders the very same component — but a
 * different save policy, and that difference is the reason this file still
 * exists: a profile needs a name, a role and a level, so there is nothing to
 * write until all three are answered. Hence one explicit Save, disabled until the
 * draft is a valid profile. Once saved, the section switches to per-field editing
 * and this form is never shown again.
 */
export function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const t = useT()
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(null))
  const [saving, setSaving] = useState(false)

  const profile = profileFromDraft(draft)

  const handleChange = useCallback((patch: Partial<ProfileDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!profile || saving) return
    setSaving(true)
    try {
      await window.electronAPI.profile.save(profile)
      showToast(t('toast.profileSaved'), 'success')
      onSaved()
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.profileSaveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }, [profile, saving, onSaved, t])

  return (
    <div className="bg-surface border border-line-strong rounded-xl p-4 flex flex-col gap-4">
      <p className="text-xs text-text-secondary/60">
        {t('profile.form.intro')}
      </p>

      <ProfileFields draft={draft} onChange={handleChange} />

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!profile || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {t('profile.form.save')}
        </button>
      </div>
    </div>
  )
}
