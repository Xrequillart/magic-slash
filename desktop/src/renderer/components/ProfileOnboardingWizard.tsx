import { useState, useCallback, useEffect } from 'react'
import { User, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'
import { ROLE_LABELS, LEVEL_LABELS, STYLE_LABELS, type UserProfile } from '../../types'

interface ProfileOnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  editMode?: boolean
  initialData?: UserProfile
}

const ROLE_OPTIONS = (Object.entries(ROLE_LABELS) as [UserProfile['role'], string][]).map(
  ([value, label]) => ({ value, label })
)

const TECH_LEVEL_OPTIONS: { value: UserProfile['technical_level']; label: string; description: string }[] = [
  { value: 'beginner', label: LEVEL_LABELS.beginner, description: 'New to development or technical concepts' },
  { value: 'intermediate', label: LEVEL_LABELS.intermediate, description: 'Comfortable with code and tooling' },
  { value: 'expert', label: LEVEL_LABELS.expert, description: 'Deep technical knowledge and experience' },
]

const COMMUNICATION_STYLE_OPTIONS: { value: NonNullable<UserProfile['communication_style']>; label: string; description: string }[] = [
  { value: 'simple', label: STYLE_LABELS.simple, description: 'Concise answers, minimal jargon' },
  { value: 'technical', label: STYLE_LABELS.technical, description: 'Code-focused, precise terminology' },
  { value: 'detailed', label: STYLE_LABELS.detailed, description: 'Thorough explanations with context' },
]

const LANGUAGE_OPTIONS = ['English', 'Français']

const TOTAL_STEPS = 6

export function ProfileOnboardingWizard({ isOpen, onClose, editMode = false, initialData }: ProfileOnboardingWizardProps) {
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-white/10 rounded-xl w-full max-w-md mx-4 backdrop-blur-2xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <User className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-base font-semibold">
              {editMode ? 'Edit Profile' : 'Welcome to Magic Slash'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-colors"
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
                i + 1 <= step ? 'bg-accent' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 pb-5 min-h-[200px]">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">What's your first name?</div>
                <div className="text-xs text-text-secondary/50 mb-3">Claude will use this to personalize responses</div>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
                autoFocus
                className="w-full px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
                onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance()) handleNext() }}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">What's your role?</div>
                <div className="text-xs text-text-secondary/50 mb-3">Helps Claude adapt the level of detail</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRole(opt.value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      role === opt.value
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : 'bg-white/[0.06] backdrop-blur-md border-white/[0.08] text-text-secondary hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Technical level</div>
                <div className="text-xs text-text-secondary/50 mb-3">Claude adjusts vocabulary and explanations accordingly</div>
              </div>
              <div className="space-y-2">
                {TECH_LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTechnicalLevel(opt.value)}
                    className={`w-full px-3 py-2.5 text-left rounded-lg border transition-all ${
                      technicalLevel === opt.value
                        ? 'bg-accent/10 border-accent/30'
                        : 'bg-white/[0.06] backdrop-blur-md border-white/[0.08] hover:bg-white/5'
                    }`}
                  >
                    <div className={`text-sm font-medium ${technicalLevel === opt.value ? 'text-accent' : 'text-white'}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Communication style</div>
                <div className="text-xs text-text-secondary/50 mb-3">Optional - how should Claude communicate?</div>
              </div>
              <div className="space-y-2">
                {COMMUNICATION_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCommunicationStyle(prev => prev === opt.value ? '' : opt.value)}
                    className={`w-full px-3 py-2.5 text-left rounded-lg border transition-all ${
                      communicationStyle === opt.value
                        ? 'bg-accent/10 border-accent/30'
                        : 'bg-white/[0.06] backdrop-blur-md border-white/[0.08] hover:bg-white/5'
                    }`}
                  >
                    <div className={`text-sm font-medium ${communicationStyle === opt.value ? 'text-accent' : 'text-white'}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Preferred languages</div>
                <div className="text-xs text-text-secondary/50 mb-3">Optional - Claude will communicate in these languages</div>
              </div>
              <div className="flex gap-2">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => toggleLanguage(lang)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                      languages.includes(lang)
                        ? 'bg-accent/10 border-accent/30 text-accent'
                        : 'bg-white/[0.06] backdrop-blur-md border-white/[0.08] text-text-secondary hover:bg-white/5 hover:text-white'
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
                <div className="text-sm font-medium mb-1">Anything else?</div>
                <div className="text-xs text-text-secondary/50 mb-3">Optional - anything else Claude should know about you</div>
              </div>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="e.g., I prefer short answers, I work on mobile apps..."
                rows={4}
                className="w-full px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30 resize-none"
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
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editMode && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-text-secondary/50 hover:text-text-secondary transition-colors"
              >
                Skip
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent border border-accent/20 rounded-lg hover:bg-accent/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!name.trim() || !role || !technicalLevel}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" />
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
