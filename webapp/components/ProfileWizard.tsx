'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, UserRound } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { Button, Input, Textarea } from '@/components/ui'
import {
  saveProfile,
  EMPTY_PROFILE,
  ROLE_LABELS,
  LEVEL_LABELS,
  STYLE_LABELS,
  type UserProfile,
  type ProfileRole,
  type ProfileLevel,
  type ProfileStyle,
} from '@/lib/profile'

/**
 * The desktop app's profile onboarding wizard, ported to the webapp's light
 * theme. Same six questions in the same order, so a user who onboarded on one
 * surface recognizes the other.
 */

const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as ProfileRole[]).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}))

const LEVEL_OPTIONS: { value: ProfileLevel; description: string }[] = [
  { value: 'beginner', description: 'New to development or technical concepts' },
  { value: 'intermediate', description: 'Comfortable with code and tooling' },
  { value: 'expert', description: 'Deep technical knowledge and experience' },
]

const STYLE_OPTIONS: { value: ProfileStyle; description: string }[] = [
  { value: 'simple', description: 'Concise answers, minimal jargon' },
  { value: 'technical', description: 'Code-focused, precise terminology' },
  { value: 'detailed', description: 'Thorough explanations with context' },
]

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

  const toggleLanguage = (lang: string) => {
    setProfile((p) => ({
      ...p,
      languages: p.languages.includes(lang) ? p.languages.filter((l) => l !== lang) : [...p.languages, lang],
    }))
  }

  const canAdvance = step !== 1 || profile.name.trim().length > 0

  const finish = useCallback(async () => {
    if (busy || !profile.name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await saveProfile(profile)
      onSaved(profile)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setBusy(false)
    }
  }, [busy, profile, onSaved, onClose])

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={UserRound}
      title={initial?.name.trim() ? 'Edit your profile' : 'Welcome to Magic Slash'}
      footer={
        <>
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} className="mr-auto">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canAdvance} className="ml-auto">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={busy || !profile.name.trim()} className="ml-auto">
              <Check className="h-4 w-4" />
              {busy ? 'Saving…' : 'Finish'}
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
              <StepIntro title="What's your first name?" hint="Claude will use this to personalize responses." />
              <Input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canAdvance) setStep(2)
                }}
                placeholder="Your first name"
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <StepIntro title="What's your role?" hint="Helps Claude adapt the level of detail." />
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(({ value, label }) => {
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
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <StepIntro
                title="Technical level"
                hint="Claude adjusts vocabulary and explanations accordingly."
              />
              <div className="space-y-2">
                {LEVEL_OPTIONS.map(({ value, description }) => (
                  <OptionRow
                    key={value}
                    label={LEVEL_LABELS[value]}
                    description={description}
                    selected={profile.technicalLevel === value}
                    onClick={() => setProfile({ ...profile, technicalLevel: value })}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <StepIntro title="Communication style" hint="Optional — how should Claude communicate?" />
              <div className="space-y-2">
                {STYLE_OPTIONS.map(({ value, description }) => (
                  <OptionRow
                    key={value}
                    label={STYLE_LABELS[value]}
                    description={description}
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
                title="Preferred languages"
                hint="Optional — Claude will communicate in these languages."
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
              <StepIntro title="Anything else?" hint="Optional — anything else Claude should know about you." />
              <Textarea
                value={profile.freeText}
                onChange={(e) => setProfile({ ...profile, freeText: e.target.value })}
                rows={4}
                placeholder="e.g. I prefer short answers, I work on mobile apps…"
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
