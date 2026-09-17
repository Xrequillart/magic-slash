import { useState, useEffect, useCallback } from 'react'
import { ProfileCard, SectionHeader } from '@ds/desktop'
import { Pencil, User } from '@ds/desktop/icons'
import { ProfileFieldModal, type ProfileField } from './ProfileFieldModal'
import { showToast } from '../../components/Toast'
import { draftFromProfile, profileFromDraft, type ProfileDraft } from '../../utils/profileDraft'
import { useT, ROLE_LABEL_KEYS, LEVEL_LABEL_KEYS, STYLE_LABEL_KEYS, type Translate } from '../../i18n'
import type { UserProfile } from '../../../types'

/**
 * The profile: what the /magic:* skills read to decide how to talk to you.
 *
 * THE DRAWING IS `ProfileCard` NOW, and with it went the last of the in-place editing.
 * Every field used to be a control sitting in the card — a row of pills per question, a
 * text input pinned right, a textarea across the bottom — each writing on click or on
 * blur. Pleasant to use, unreadable to scan: six controls stacked in a card are six
 * controls whether or not you came to change one, and the values you came to READ were
 * whichever pill happened to be lit. The card is a table of values now and the editing
 * is behind a modal, which is the order a settings page is read in.
 *
 * ONE CARD FOR BOTH STATES, where there used to be two components. `ProfileForm` existed
 * because a profile with no name, role or level cannot be written at all, so the
 * no-profile case needed an explicit Save that the per-field editor could not offer.
 * That reasoning survives; the second component does not. Every row still writes on its
 * own, a draft that cannot be narrowed simply writes NOTHING, and the card says so in a
 * line under the table — so filling in an empty profile is: set three rows, and the
 * third one saves all of them. The difference between the two states is `intro` and a
 * warning, which is to say: data.
 *
 * THE WIZARD IS UNTOUCHED and still owns FIRST launch (`App.tsx` opens it when no
 * profile exists). A first-run walkthrough and a settings panel are two different jobs,
 * and the walkthrough is the one that has to explain itself.
 */

/**
 * The value column, per field — and every one of them can be empty, which is the whole
 * of what this function decides.
 *
 * AN ABSENCE IS NAMED RATHER THAN BLANK. A row whose value cell is empty reads as a
 * rendering fault; a row that says "Not set" reads as a fact about the profile, and it
 * is the one that tells somebody there is something here worth filling in. `unset` is
 * what then draws it quiet, so the placeholder cannot be mistaken for an answer.
 *
 * FREE TEXT GETS ITS OWN WORDING, because "Not set" is the language of a field with
 * options and this one is prose. Languages likewise: "None chosen" is what an empty
 * multi-select means, where "Not set" would suggest a single answer nobody gave.
 */
function valueOf(field: ProfileField, draft: ProfileDraft, t: Translate): { value: string; unset: boolean } {
  const set = (value: string) => ({ value, unset: false })
  const none = (key: Parameters<Translate>[0]) => ({ value: t(key), unset: true })

  switch (field) {
    case 'name':
      return draft.name.trim() ? set(draft.name.trim()) : none('profile.form.notSet')
    case 'role':
      return draft.role ? set(t(ROLE_LABEL_KEYS[draft.role])) : none('profile.form.notSet')
    case 'technical_level':
      return draft.technical_level ? set(t(LEVEL_LABEL_KEYS[draft.technical_level])) : none('profile.form.notSet')
    case 'communication_style':
      return draft.communication_style
        ? set(t(STYLE_LABEL_KEYS[draft.communication_style]))
        : none('profile.form.notSet')
    case 'languages':
      // Joined rather than listed as chips: this is the value COLUMN of a table, and a
      // cell that grew a row of pills would break the band every other row sits in.
      return draft.languages.length > 0 ? set(draft.languages.join(', ')) : none('profile.form.noLanguages')
    case 'freeText':
      return draft.freeText.trim() ? set(draft.freeText.trim()) : none('profile.form.freeTextEmpty')
  }
}

export function ProfileSection() {
  const t = useT()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(null))
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<ProfileField | null>(null)
  const [saving, setSaving] = useState(false)

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
   * Apply one field's edit, and persist the whole profile when it can be.
   *
   * THE DRAFT MOVES EITHER WAY, even when nothing can be written yet: the three required
   * fields have to be answerable in any order, and a draft that refused to hold the
   * second one until the third arrived would make the card lose an edit the reader
   * watched themselves make.
   *
   * THE WHOLE PROFILE IS WRITTEN, not the field — `profile.save` takes a complete object
   * and the draft already holds every value. A save that FAILS reverts the draft to what
   * is known to be on disk, rather than leaving the card showing a value the skills will
   * never read.
   *
   * The modal closes on the way in and not on the way out, so a failure lands on a card
   * that has already gone back to its stored values with a toast over it, rather than on
   * a modal still showing the edit that did not take.
   */
  const handleSave = useCallback(async (patch: Partial<ProfileDraft>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    setEditing(null)

    const candidate = profileFromDraft(next)
    if (!candidate) return

    setSaving(true)
    try {
      await window.electronAPI.profile.save(candidate)
      setProfile(candidate)
    } catch (e) {
      setDraft(draftFromProfile(profile))
      showToast(e instanceof Error ? e.message : t('toast.profileSaveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }, [draft, profile, t])

  if (loading) return null

  // NO "optional" UNDER THE THREE THAT ARE. The hint was a second line on half the
  // rows, which cost the table its even banding to say something the placeholder
  // already says better: a field reading "Not set" with nothing insisting on it IS an
  // optional field, and the card's warning line is what names the three that are not.
  const FIELDS: { field: ProfileField; label: Parameters<Translate>[0] }[] = [
    { field: 'name', label: 'profile.form.firstName' },
    { field: 'role', label: 'profile.form.role' },
    { field: 'technical_level', label: 'profile.form.level' },
    { field: 'communication_style', label: 'profile.form.style' },
    { field: 'languages', label: 'profile.form.languages' },
    { field: 'freeText', label: 'profile.form.freeText' },
  ]

  return (
    <div>
      <SectionHeader icon={User} title={t('profile.section')} />

      <ProfileCard
        // Only while there is nothing yet: once the rows carry values they say what this
        // is far better than a sentence above them can.
        intro={profile ? undefined : t('profile.form.intro')}
        // Shown for exactly as long as the draft cannot be narrowed. Without it, an
        // empty profile accepts edit after edit and keeps none of them, while looking
        // like a card that is working.
        warning={profileFromDraft(draft) ? undefined : t('profile.form.requiredWarning')}
        rows={FIELDS.map(({ field, label }) => ({
          id: field,
          label: t(label),
          ...valueOf(field, draft, t),
          actions: [{
            id: `edit-${field}`,
            label: t('common.edit'),
            icon: Pencil,
            disabled: saving,
            onClick: () => setEditing(field),
          }],
        }))}
      />

      <ProfileFieldModal
        field={editing}
        draft={draft}
        saving={saving}
        onCancel={() => setEditing(null)}
        onSave={handleSave}
      />
    </div>
  )
}
