'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, UserRound } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { Button, Input, Textarea } from '@/components/ui'
import {
  saveProfile,
  EMPTY_PROFILE,
  ROLE_LABEL_KEYS,
  LEVEL_LABEL_KEYS,
  STYLE_LABEL_KEYS,
  type UserProfile,
  type ProfileRole,
  type ProfileLevel,
  type ProfileStyle,
} from '@/lib/profile'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The desktop app's profile onboarding wizard, ported to the webapp's light
 * theme. Same six questions in the same order, so a user who onboarded on one
 * surface recognizes the other.
 */

const ROLES = Object.keys(ROLE_LABEL_KEYS) as ProfileRole[]

const LEVEL_OPTIONS: { value: ProfileLevel; descriptionKey: MessageKey }[] = [
  { value: 'beginner', descriptionKey: 'profile.wizard.level.beginner.hint' },
  { value: 'intermediate', descriptionKey: 'profile.wizard.level.intermediate.hint' },
  { value: 'expert', descriptionKey: 'profile.wizard.level.expert.hint' },
]

const STYLE_OPTIONS: { value: ProfileStyle; descriptionKey: MessageKey }[] = [
  { value: 'simple', descriptionKey: 'profile.wizard.style.simple.hint' },
  { value: 'technical', descriptionKey: 'profile.wizard.style.technical.hint' },
  { value: 'detailed', descriptionKey: 'profile.wizard.style.detailed.hint' },
]

/**
 * Autonyms, and NOT translated: these strings are the profile VALUE that gets stored
 * and handed to Claude, so they have to read the same whichever language the wizard
 * happens to be in.
 */
const LANGUAGE_OPTIONS = ['English', 'Français']

const TOTAL_STEPS = 6

/** Shared shell for the one-per-line option buttons on steps 3 and 4. */
function OptionRow({
  label,
  description,
  selected,
  onClick,
}: {
  label: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
        selected ? 'border-accent bg-accent/[0.06]' : 'border-black/10 hover:bg-canvas'
      }`}
    >
      <div className={`text-sm font-medium ${selected ? 'text-accent' : 'text-ink'}`}>{label}</div>
      <div className="mt-0.5 text-xs text-muted">{description}</div>
    </button>
  )
}

function StepIntro({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-4">
      <div className="font-display text-base font-bold text-ink">{title}</div>
      <div className="mt-0.5 text-xs text-muted">{hint}</div>
    </div>
  )
}

export function ProfileWizard({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean
  /** Existing profile to pre-fill, when the user is editing rather than onboarding. */
  initial?: UserProfile | null
  onClose: () => void
  onSaved: (profile: UserProfile) => void
}) {
  const { t, lang } = useT()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<UserProfile>(initial ?? EMPTY_PROFILE)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset to the first step every time the modal is (re)opened, and pick up any
  // profile that loaded after the first render.
  useEffect(() => {
    if (!open) return
    setStep(1)
    setError(null)
    setProfile(initial ?? EMPTY_PROFILE)
  }, [open, initial])

  /**
   * `spoken` is a PROFILE value ("English", "Français") — the languages Claude should
   * talk to this person in. Named apart from `lang` above, which is the language this
   * wizard is currently written in; the two are unrelated and were one shadowed
   * variable away from being confused.
   */
  const toggleLanguage = (spoken: string) => {
    setProfile((p) => ({
      ...p,
      languages: p.languages.includes(spoken)
        ? p.languages.filter((l) => l !== spoken)
        : [...p.languages, spoken],
    }))
  }

  const canAdvance = step !== 1 || profile.name.trim().length > 0

  const finish = useCallback(async () => {
    if (busy || !profile.name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await saveProfile(profile, lang)
      onSaved(profile)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.wizard.failed'))
    } finally {
      setBusy(false)
    }
  }, [busy, profile, onSaved, onClose, t, lang])

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={UserRound}
      title={
        initial?.name.trim() ? t('profile.wizard.titleEdit') : t('profile.wizard.titleWelcome')
      }
      footer={
        <>
          {step > 1 && (
            <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep(step - 1)} className="mr-auto">
              {t('common.back')}
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canAdvance} className="ml-auto">
              {t('common.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button icon={Check} onClick={finish} disabled={busy || !profile.name.trim()} className="ml-auto">
              {busy ? t('common.saving') : t('common.finish')}
            </Button>
          )}
        </>
      }
    >
      <div>
        <div className="flex items-center gap-1.5 pb-5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i < step ? 'bg-brand' : 'bg-black/[0.08]'}`}
            />
          ))}
        </div>

        <div className="min-h-[236px]">
          {step === 1 && (
            <div>
              <StepIntro
                title={t('profile.wizard.nameQuestion')}
                hint={t('profile.wizard.nameHint')}
              />
              <Input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canAdvance) setStep(2)
                }}
                placeholder={t('profile.wizard.namePlaceholder')}
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <StepIntro
                title={t('profile.wizard.roleQuestion')}
                hint={t('profile.wizard.roleHint')}
              />
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((value) => {
                  const on = profile.role === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setProfile({ ...profile, role: value })}
                      className={`rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                        on ? 'border-accent bg-accent/[0.06] text-accent' : 'border-black/10 text-muted hover:bg-canvas hover:text-ink'
                      }`}
                    >
                      {t(ROLE_LABEL_KEYS[value])}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <StepIntro
                title={t('profile.wizard.levelQuestion')}
                hint={t('profile.wizard.levelHint')}
              />
              <div className="space-y-2">
                {LEVEL_OPTIONS.map(({ value, descriptionKey }) => (
                  <OptionRow
                    key={value}
                    label={t(LEVEL_LABEL_KEYS[value])}
                    description={t(descriptionKey)}
                    selected={profile.technicalLevel === value}
                    onClick={() => setProfile({ ...profile, technicalLevel: value })}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <StepIntro
                title={t('profile.wizard.styleQuestion')}
                hint={t('profile.wizard.styleHint')}
              />
              <div className="space-y-2">
                {STYLE_OPTIONS.map(({ value, descriptionKey }) => (
                  <OptionRow
                    key={value}
                    label={t(STYLE_LABEL_KEYS[value])}
                    description={t(descriptionKey)}
                    selected={profile.communicationStyle === value}
                    onClick={() =>
                      setProfile((p) => ({
                        ...p,
                        communicationStyle: p.communicationStyle === value ? null : value,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <StepIntro
                title={t('profile.wizard.languagesQuestion')}
                hint={t('profile.wizard.languagesHint')}
              />
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const on = profile.languages.includes(lang)
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                        on ? 'border-accent bg-accent/[0.06] text-accent' : 'border-black/10 text-muted hover:bg-canvas hover:text-ink'
                      }`}
                    >
                      {on && <Check className="h-3.5 w-3.5" />}
                      {lang}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 6 && (
            <div>
              <StepIntro
                title={t('profile.wizard.freeTextQuestion')}
                hint={t('profile.wizard.freeTextHint')}
              />
              <Textarea
                value={profile.freeText}
                onChange={(e) => setProfile({ ...profile, freeText: e.target.value })}
                rows={4}
                placeholder={t('profile.wizard.freeTextPlaceholder')}
                className="resize-none"
              />
            </div>
          )}

          {error && <p className="mt-3 text-xs text-red">{error}</p>}
        </div>
      </div>
    </Modal>
  )
}
