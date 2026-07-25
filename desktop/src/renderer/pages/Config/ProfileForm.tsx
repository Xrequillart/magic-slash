import { useState, useCallback } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { ROLE_LABELS, LEVEL_LABELS, STYLE_LABELS, type UserProfile } from '../../../types'
import { showToast } from '../../components/Toast'

const ROLE_OPTIONS = (Object.entries(ROLE_LABELS) as [UserProfile['role'], string][]).map(
  ([value, label]) => ({ value, label })
)
const LEVEL_OPTIONS = (Object.entries(LEVEL_LABELS) as [UserProfile['technical_level'], string][]).map(
  ([value, label]) => ({ value, label })
)
const STYLE_OPTIONS = (Object.entries(STYLE_LABELS) as [NonNullable<UserProfile['communication_style']>, string][]).map(
  ([value, label]) => ({ value, label })
)
const LANGUAGE_OPTIONS = ['English', 'Français']

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-white mb-1.5">
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
          : 'bg-white/[0.06] border-white/[0.08] text-text-secondary hover:bg-white/10 hover:text-white'
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
      showToast('Profile saved', 'success')
      onSaved()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }, [canSave, saving, name, role, technicalLevel, communicationStyle, languages, freeText, onSaved])

  return (
    <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 flex flex-col gap-4">
      <p className="text-xs text-text-secondary/60">
        No profile yet. Claude uses it to adapt its vocabulary, level of detail and language to you.
      </p>

      <Field label="First name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
        />
      </Field>

      <Field label="Role">
        <div className="flex flex-wrap gap-1.5">
          {ROLE_OPTIONS.map((opt) => (
            <Pill key={opt.value} selected={role === opt.value} onClick={() => setRole(opt.value)}>
              {opt.label}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Technical level">
        <div className="flex flex-wrap gap-1.5">
          {LEVEL_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              selected={technicalLevel === opt.value}
              onClick={() => setTechnicalLevel(opt.value)}
            >
              {opt.label}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Communication style" hint="optional">
        <div className="flex flex-wrap gap-1.5">
          {STYLE_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              selected={communicationStyle === opt.value}
              onClick={() => setCommunicationStyle((prev) => (prev === opt.value ? '' : opt.value))}
            >
              {opt.label}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Languages" hint="optional">
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_OPTIONS.map((lang) => (
            <Pill key={lang} selected={languages.includes(lang)} onClick={() => toggleLanguage(lang)}>
              {lang}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Anything else" hint="optional">
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="e.g., I prefer short answers, I work on mobile apps..."
          rows={3}
          className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30 resize-none"
        />
      </Field>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save profile
        </button>
      </div>
    </div>
  )
}
