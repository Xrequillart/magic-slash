import { useState, useCallback, useEffect } from 'react'
import { User, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'
import { useT, ROLE_LABEL_KEYS, LEVEL_LABEL_KEYS, STYLE_LABEL_KEYS, type MessageKey } from '../i18n'
import type { UserProfile } from '../../types'
import { INPUT } from '../theme/controls'

interface ProfileOnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  editMode?: boolean
  initialData?: UserProfile
}

// Catalogue keys throughout: module scope is evaluated once at import, so a
// literal here would pin the wizard to whatever language the app booted in.
const ROLE_OPTIONS = Object.entries(ROLE_LABEL_KEYS) as [UserProfile['role'], MessageKey][]

const TECH_LEVEL_OPTIONS: { value: UserProfile['technical_level']; labelKey: MessageKey; descriptionKey: MessageKey }[] = [
  { value: 'beginner', labelKey: LEVEL_LABEL_KEYS.beginner, descriptionKey: 'profile.wizard.level.beginner.help' },
  { value: 'intermediate', labelKey: LEVEL_LABEL_KEYS.intermediate, descriptionKey: 'profile.wizard.level.intermediate.help' },
  { value: 'expert', labelKey: LEVEL_LABEL_KEYS.expert, descriptionKey: 'profile.wizard.level.expert.help' },
]

const COMMUNICATION_STYLE_OPTIONS: { value: NonNullable<UserProfile['communication_style']>; labelKey: MessageKey; descriptionKey: MessageKey }[] = [
  { value: 'simple', labelKey: STYLE_LABEL_KEYS.simple, descriptionKey: 'profile.wizard.style.simple.help' },
  { value: 'technical', labelKey: STYLE_LABEL_KEYS.technical, descriptionKey: 'profile.wizard.style.technical.help' },
  { value: 'detailed', labelKey: STYLE_LABEL_KEYS.detailed, descriptionKey: 'profile.wizard.style.detailed.help' },
]

// Endonyms: a language is named in its own language, whatever the interface is
// set to — and these strings are stored in the profile, read back by the skills.
const LANGUAGE_OPTIONS = ['English', 'Français']

const TOTAL_STEPS = 6

export function ProfileOnboardingWizard({ isOpen, onClose, editMode = false, initialData }: ProfileOnboardingWizardProps) {
  const t = useT()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserProfile['role'] | ''>('')
  const [technicalLevel, setTechnicalLevel] = useState<UserProfile['technical_level'] | ''>('')
  const [communicationStyle, setCommunicationStyle] = useState<UserProfile['communication_style'] | ''>('')
  const [languages, setLanguages] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')

  // Pre-fill in edit mode
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setRole(initialData.role || '')
      setTechnicalLevel(initialData.technical_level || '')
      setCommunicationStyle(initialData.communication_style || '')
      setLanguages(initialData.languages || [])
      setFreeText(initialData.freeText || '')
    }
  }, [initialData])

  const canAdvance = () => {
    switch (step) {
      case 1: return name.trim().length > 0
      case 2: return role !== ''
      case 3: return technicalLevel !== ''
      default: return true
    }
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleFinish = useCallback(async () => {
    if (!name.trim() || !role || !technicalLevel) return

    const profile: UserProfile = {
      name: name.trim(),
      role: role as UserProfile['role'],
      technical_level: technicalLevel as UserProfile['technical_level'],
    }

    if (communicationStyle) {
      profile.communication_style = communicationStyle as UserProfile['communication_style']
    }

    if (languages.length > 0) {
      profile.languages = languages
    }

    if (freeText.trim()) {
      profile.freeText = freeText.trim()
    }

    await window.electronAPI.profile.save(profile)
    onClose()
  }, [name, role, technicalLevel, communicationStyle, languages, freeText, onClose])

  const toggleLanguage = useCallback((lang: string) => {
    setLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }, [])

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-line rounded-xl w-full max-w-md mx-4 animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <User className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-base font-semibold">
              {editMode ? t('profile.wizard.titleEdit') : t('profile.wizard.titleWelcome')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-5 pb-4">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i + 1 <= step ? 'bg-accent' : 'bg-surface-strong'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 pb-5 min-h-[200px]">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">{t('profile.wizard.nameQuestion')}</div>
                <div className="text-xs text-text-secondary/50 mb-3">{t('profile.wizard.nameHelp')}</div>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('profile.form.firstNamePlaceholder')}
                autoFocus
                className={`${INPUT} w-full`}
                onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance()) handleNext() }}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">{t('profile.wizard.roleQuestion')}</div>
                <div className="text-xs text-text-secondary/50 mb-3">{t('profile.wizard.roleHelp')}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(([value, labelKey]) => (
                  <button
                    key={value}
                    onClick={() => setRole(value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      role === value
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : 'bg-surface border-line-field text-text-secondary hover:bg-surface hover:text-ink'
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">{t('profile.wizard.levelQuestion')}</div>
                <div className="text-xs text-text-secondary/50 mb-3">{t('profile.wizard.levelHelp')}</div>
              </div>
              <div className="space-y-2">
                {TECH_LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTechnicalLevel(opt.value)}
                    className={`w-full px-3 py-2.5 text-left rounded-lg border transition-all ${
                      technicalLevel === opt.value
                        ? 'bg-accent/10 border-accent/30'
                        : 'bg-surface border-line-field hover:bg-surface'
                    }`}
                  >
                    <div className={`text-sm font-medium ${technicalLevel === opt.value ? 'text-accent' : 'text-ink'}`}>
                      {t(opt.labelKey)}
                    </div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">{t(opt.descriptionKey)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">{t('profile.wizard.styleQuestion')}</div>
                <div className="text-xs text-text-secondary/50 mb-3">{t('profile.wizard.styleHelp')}</div>
              </div>
              <div className="space-y-2">
                {COMMUNICATION_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCommunicationStyle(prev => prev === opt.value ? '' : opt.value)}
                    className={`w-full px-3 py-2.5 text-left rounded-lg border transition-all ${
                      communicationStyle === opt.value
                        ? 'bg-accent/10 border-accent/30'
                        : 'bg-surface border-line-field hover:bg-surface'
                    }`}
                  >
                    <div className={`text-sm font-medium ${communicationStyle === opt.value ? 'text-accent' : 'text-ink'}`}>
                      {t(opt.labelKey)}
                    </div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">{t(opt.descriptionKey)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">{t('profile.wizard.languagesQuestion')}</div>
                <div className="text-xs text-text-secondary/50 mb-3">{t('profile.wizard.languagesHelp')}</div>
              </div>
              <div className="flex gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                      languages.includes(lang)
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : 'bg-surface border-line-field text-text-secondary hover:bg-surface hover:text-ink'
                    }`}
                  >
                    {languages.includes(lang) && <Check className="w-3.5 h-3.5" />}
                    <span className="text-sm">{lang}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">{t('profile.wizard.freeTextQuestion')}</div>
                <div className="text-xs text-text-secondary/50 mb-3">{t('profile.wizard.freeTextHelp')}</div>
              </div>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder={t('profile.form.freeTextPlaceholder')}
                rows={4}
                className={`${INPUT} w-full resize-none`}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5">
          <div>
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t('common.back')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editMode && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-text-secondary/50 hover:text-text-secondary transition-colors"
              >
                {t('common.skip')}
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent border border-accent/20 rounded-lg hover:bg-accent/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {t('common.next')}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!name.trim() || !role || !technicalLevel}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" />
                {t('profile.wizard.finish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
