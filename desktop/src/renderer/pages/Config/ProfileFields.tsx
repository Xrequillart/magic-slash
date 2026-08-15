import { useEffect, useState } from 'react'
import { useT, ROLE_LABEL_KEYS, LEVEL_LABEL_KEYS, STYLE_LABEL_KEYS, type MessageKey } from '../../i18n'
import type { UserProfile } from '../../../types'
import { INPUT } from '../../theme/controls'

const ROLE_OPTIONS = Object.entries(ROLE_LABEL_KEYS) as [UserProfile['role'], MessageKey][]
const LEVEL_OPTIONS = Object.entries(LEVEL_LABEL_KEYS) as [UserProfile['technical_level'], MessageKey][]
const STYLE_OPTIONS = Object.entries(STYLE_LABEL_KEYS) as [
  NonNullable<UserProfile['communication_style']>,
  MessageKey,
][]
// Endonyms: a language is named in its own language, whatever the interface is
// set to — and these strings are stored in the profile, read back by the skills.
const LANGUAGE_OPTIONS = ['English', 'Français']

/**
 * The profile as the form holds it: every field present, empty rather than
 * absent. `UserProfile` cannot model a half-filled form — role and level are
 * required there — so the draft is its own type and is narrowed on save.
 */
export interface ProfileDraft {
  name: string
  role: UserProfile['role'] | ''
  technical_level: UserProfile['technical_level'] | ''
  communication_style: NonNullable<UserProfile['communication_style']> | ''
  languages: string[]
  freeText: string
}

export function draftFromProfile(profile: UserProfile | null): ProfileDraft {
  return {
    name: profile?.name ?? '',
    role: profile?.role ?? '',
    technical_level: profile?.technical_level ?? '',
    communication_style: profile?.communication_style ?? '',
    languages: profile?.languages ?? [],
    freeText: profile?.freeText ?? '',
  }
}

/** Narrow a draft to a profile, or null when a required field is still empty. */
export function profileFromDraft(draft: ProfileDraft): UserProfile | null {
  if (!draft.name.trim() || !draft.role || !draft.technical_level) return null
  const profile: UserProfile = {
    name: draft.name.trim(),
    role: draft.role,
    technical_level: draft.technical_level,
  }
  if (draft.communication_style) profile.communication_style = draft.communication_style
  if (draft.languages.length > 0) profile.languages = draft.languages
  if (draft.freeText.trim()) profile.freeText = draft.freeText.trim()
  return profile
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
 * One field: label on the left, control on the right — the row shape every other
 * Settings card uses. The controls wrap and stay right-aligned, so a row of six
 * role pills reads as one block rather than drifting across the card.
 */
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 pt-1.5">
        <div className="text-sm font-medium">{label}</div>
        {hint && <p className="text-xs text-text-secondary/50 mt-0.5">{hint}</p>}
      </div>
      <div className="flex flex-wrap justify-end gap-1.5 flex-shrink-0 max-w-[70%]">{children}</div>
    </div>
  )
}

/**
 * Text that edits locally and reports on blur.
 *
 * The profile is saved per field, so a control writing on every keystroke would
 * save six times for "Xavier" — and, worse, would save the intermediate "X" as a
 * name. Local while focused, committed when you leave; while NOT focused it
 * follows the stored value, so a save that fails and reverts is visible.
 */
function useCommittedText(value: string, onCommit: (next: string) => void) {
  const [text, setText] = useState(value)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(value)
  }, [value, focused])

  return {
    value: text,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false)
      if (text !== value) onCommit(text)
    },
  }
}

function CommittedInput({
  value,
  onCommit,
  placeholder,
}: {
  value: string
  onCommit: (next: string) => void
  placeholder: string
}) {
  const bind = useCommittedText(value, onCommit)

  return (
    <input
      type="text"
      {...bind}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      placeholder={placeholder}
      className={`${INPUT} w-52`}
    />
  )
}

/**
 * Every profile field, laid out for a Settings card. Holds no persistence policy:
 * the parent decides whether a change is written immediately (the Account tab,
 * which edits an existing profile) or only when a button is pressed (the initial
 * fill-in, where a profile cannot exist until the required fields are answered).
 *
 * `commit` on a change says "this value is final" — a pill click always is, a
 * keystroke is not.
 */
export function ProfileFields({
  draft,
  onChange,
}: {
  draft: ProfileDraft
  onChange: (patch: Partial<ProfileDraft>, commit: boolean) => void
}) {
  const t = useT()

  const toggleLanguage = (lang: string) => {
    const next = draft.languages.includes(lang)
      ? draft.languages.filter((l) => l !== lang)
      : [...draft.languages, lang]
    onChange({ languages: next }, true)
  }

  return (
    <>
      <Row label={t('profile.form.firstName')}>
        <CommittedInput
          value={draft.name}
          onCommit={(name) => onChange({ name }, true)}
          placeholder={t('profile.form.firstNamePlaceholder')}
        />
      </Row>

      <div className="border-t border-line-subtle" />

      <Row label={t('profile.form.role')}>
        {ROLE_OPTIONS.map(([value, labelKey]) => (
          <Pill key={value} selected={draft.role === value} onClick={() => onChange({ role: value }, true)}>
            {t(labelKey)}
          </Pill>
        ))}
      </Row>

      <div className="border-t border-line-subtle" />

      <Row label={t('profile.form.level')}>
        {LEVEL_OPTIONS.map(([value, labelKey]) => (
          <Pill
            key={value}
            selected={draft.technical_level === value}
            onClick={() => onChange({ technical_level: value }, true)}
          >
            {t(labelKey)}
          </Pill>
        ))}
      </Row>

      <div className="border-t border-line-subtle" />

      <Row label={t('profile.form.style')} hint={t('profile.form.optional')}>
        {STYLE_OPTIONS.map(([value, labelKey]) => (
          <Pill
            key={value}
            selected={draft.communication_style === value}
            onClick={() => onChange({ communication_style: draft.communication_style === value ? '' : value }, true)}
          >
            {t(labelKey)}
          </Pill>
        ))}
      </Row>

      <div className="border-t border-line-subtle" />

      <Row label={t('profile.form.languages')} hint={t('profile.form.optional')}>
        {LANGUAGE_OPTIONS.map((lang) => (
          <Pill key={lang} selected={draft.languages.includes(lang)} onClick={() => toggleLanguage(lang)}>
            {lang}
          </Pill>
        ))}
      </Row>

      <div className="border-t border-line-subtle" />

      {/* The one field that does NOT sit on the right: it is free prose, and a
          textarea squeezed into a control column is a two-word-wide box. Label on
          its own line, field across the full width underneath. */}
      <div>
        <div className="text-sm font-medium">{t('profile.form.freeText')}</div>
        <p className="text-xs text-text-secondary/50 mt-0.5 mb-2">{t('profile.form.optional')}</p>
        <CommittedTextarea
          value={draft.freeText}
          onCommit={(freeText) => onChange({ freeText }, true)}
          placeholder={t('profile.form.freeTextPlaceholder')}
        />
      </div>
    </>
  )
}

/** Same commit-on-blur contract as CommittedInput, for the free-text field. */
function CommittedTextarea({
  value,
  onCommit,
  placeholder,
}: {
  value: string
  onCommit: (next: string) => void
  placeholder: string
}) {
  const bind = useCommittedText(value, onCommit)

  return (
    <textarea
      {...bind}
      placeholder={placeholder}
      rows={3}
      className={`${INPUT} w-full resize-none`}
    />
  )
}
