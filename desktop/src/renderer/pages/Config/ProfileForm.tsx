import { useState, useCallback } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { showToast } from '../../components/Toast'
import { useT, ROLE_LABEL_KEYS, LEVEL_LABEL_KEYS, STYLE_LABEL_KEYS, type MessageKey } from '../../i18n'
import type { UserProfile } from '../../../types'

const ROLE_OPTIONS = Object.entries(ROLE_LABEL_KEYS) as [UserProfile['role'], MessageKey][]
const LEVEL_OPTIONS = Object.entries(LEVEL_LABEL_KEYS) as [UserProfile['technical_level'], MessageKey][]
const STYLE_OPTIONS = Object.entries(STYLE_LABEL_KEYS) as [
  NonNullable<UserProfile['communication_style']>,
  MessageKey,
][]
// Endonyms: a language is named in its own language, whatever the interface is
// set to — and these strings are stored in the profile, read back by the skills.
const LANGUAGE_OPTIONS = ['English', 'Français']

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-ink mb-1.5">
        {label}
        {hint && <span className="ml-1.5 font-normal text-text-secondary/50">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
        selected
          ? 'bg-accent/10 border-accent/30 text-accent'
          : 'bg-surface border-line-field text-text-secondary hover:bg-surface-strong hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Single-screen profile form, used when no profile exists yet so the Account tab
 * can be filled in place. The 6-step ProfileOnboardingWizard stays the entry
 * point for first launch and for editing — this is the same fields, flattened.
 */
export function ProfileForm({ onSaved }: { onSaved: () => void }) {
  const t = useT()
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserProfile['role'] | ''>('')
  const [technicalLevel, setTechnicalLevel] = useState<UserProfile['technical_level'] | ''>('')
  const [communicationStyle, setCommunicationStyle] = useState<UserProfile['communication_style'] | ''>('')
  const [languages, setLanguages] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [saving, setSaving] = useState(false)

  // Name, role and level are what the /magic:* skills actually branch on.
  const canSave = name.trim().length > 0 && role !== '' && technicalLevel !== ''

  const toggleLanguage = useCallback((lang: string) => {
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]))
  }, [])

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const profile: UserProfile = {
        name: name.trim(),
        role: role as UserProfile['role'],
        technical_level: technicalLevel as UserProfile['technical_level'],
      }
      if (communicationStyle) profile.communication_style = communicationStyle as UserProfile['communication_style']
      if (languages.length > 0) profile.languages = languages
      if (freeText.trim()) profile.freeText = freeText.trim()

      await window.electronAPI.profile.save(profile)
      showToast(t('toast.profileSaved'), 'success')
      onSaved()
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.profileSaveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }, [canSave, saving, name, role, technicalLevel, communicationStyle, languages, freeText, onSaved])

  return (
    <div className="bg-surface border border-line-strong rounded-xl p-4 flex flex-col gap-4">
      <p className="text-xs text-text-secondary/60">
        {t('profile.form.intro')}
      </p>

      <Field label={t('profile.form.firstName')}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('profile.form.firstNamePlaceholder')}
          className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
        />
      </Field>

      <Field label={t('profile.form.role')}>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_OPTIONS.map(([value, labelKey]) => (
            <Pill key={value} selected={role === value} onClick={() => setRole(value)}>
              {t(labelKey)}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label={t('profile.form.level')}>
        <div className="flex flex-wrap gap-1.5">
          {LEVEL_OPTIONS.map(([value, labelKey]) => (
            <Pill
              key={value}
              selected={technicalLevel === value}
              onClick={() => setTechnicalLevel(value)}
            >
              {t(labelKey)}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label={t('profile.form.style')} hint={t('profile.form.optional')}>
        <div className="flex flex-wrap gap-1.5">
          {STYLE_OPTIONS.map(([value, labelKey]) => (
            <Pill
              key={value}
              selected={communicationStyle === value}
              onClick={() => setCommunicationStyle((prev) => (prev === value ? '' : value))}
            >
              {t(labelKey)}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label={t('profile.form.languages')} hint={t('profile.form.optional')}>
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_OPTIONS.map((lang) => (
            <Pill key={lang} selected={languages.includes(lang)} onClick={() => toggleLanguage(lang)}>
              {lang}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label={t('profile.form.freeText')} hint={t('profile.form.optional')}>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder={t('profile.form.freeTextPlaceholder')}
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30 resize-none"
        />
      </Field>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {t('profile.form.save')}
        </button>
      </div>
    </div>
  )
}
