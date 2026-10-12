import { useEffect, useState } from 'react'
import { Button, Input } from '@ds/desktop'
import { Check } from '@ds/desktop/icons'
import { Modal } from '../../components/Modal'
import { useT, ROLE_LABEL_KEYS, LEVEL_LABEL_KEYS, STYLE_LABEL_KEYS, type MessageKey } from '../../i18n'
import type { ProfileDraft } from '../../utils/profileDraft'
import type { UserProfile } from '../../../types'

const ROLE_OPTIONS = Object.entries(ROLE_LABEL_KEYS) as [UserProfile['role'], MessageKey][]
const LEVEL_OPTIONS = Object.entries(LEVEL_LABEL_KEYS) as [UserProfile['technical_level'], MessageKey][]
const STYLE_OPTIONS = Object.entries(STYLE_LABEL_KEYS) as [
  NonNullable<UserProfile['communication_style']>,
  MessageKey,
][]

/**
 * Endonyms: a language is named in its OWN language, whatever the interface is set to.
 * These strings are stored in the profile and read back by the skills, so translating
 * them would mean a profile that says something different depending on which language
 * the card happened to be open in when it was saved.
 */
const LANGUAGE_OPTIONS = ['English', 'Français']

/** Which row was pressed. One modal, six bodies — see the note on the component. */
export type ProfileField = keyof ProfileDraft

/**
 * Editing ONE profile field.
 *
 * ONE MODAL AND NOT SIX, which is the whole reason this file is short. The six fields
 * differ only in what sits between the title and the buttons — a text box, a row of
 * options, a textarea — and six modals would be six copies of the same frame, the same
 * footer and the same cancel semantics, drifting apart one field at a time. `field`
 * picks the body; everything around it is written once.
 *
 * IT EDITS A COPY AND REPORTS ON SAVE. The card behind it writes through to the server
 * as soon as it is told, so a modal that reported every keystroke would save six times
 * for "Xavier" and would store the intermediate "X" as somebody's name. Cancel therefore
 * costs nothing: the draft never left this component.
 *
 * THE VALUE IS RESEEDED WHEN IT OPENS, not held from the last time. A modal closed on
 * Cancel and reopened must show what is STORED rather than the edit that was abandoned,
 * and keying the effect on `field` alone would miss a reopen of the same row.
 */
export function ProfileFieldModal({
  field,
  draft,
  saving,
  onCancel,
  onSave,
}: {
  /** The row being edited, or null when the modal is closed. */
  field: ProfileField | null
  draft: ProfileDraft
  /** A write is in flight: the button spins and a second press is blocked. */
  saving?: boolean
  onCancel: () => void
  onSave: (patch: Partial<ProfileDraft>) => void
}) {
  const t = useT()

  // One state per SHAPE rather than one per field: every body is either a string or a
  // list of them, so two pieces of state cover all six.
  const [text, setText] = useState('')
  const [choice, setChoice] = useState<string>('')
  const [list, setList] = useState<string[]>([])

  useEffect(() => {
    if (!field) return
    setText(field === 'name' ? draft.name : field === 'freeText' ? draft.freeText : '')
    setChoice(
      field === 'role' ? draft.role
        : field === 'technical_level' ? draft.technical_level
          : field === 'communication_style' ? draft.communication_style
            : '',
    )
    setList(field === 'languages' ? draft.languages : [])
    // `draft` is deliberately absent from the deps: reseeding on every keystroke the
    // card saves would yank the field out from under whoever is typing in it. Opening is
    // the only moment this should read the stored value, and `field` flipping away from
    // null is that moment. (No eslint-disable here — this project does not enable
    // `react-hooks/exhaustive-deps`, and a disable for a rule that is not configured is
    // itself an error.)
  }, [field])

  if (!field) return null

  const TITLES: Record<ProfileField, MessageKey> = {
    name: 'profile.form.firstName',
    role: 'profile.form.role',
    technical_level: 'profile.form.level',
    communication_style: 'profile.form.style',
    languages: 'profile.form.languages',
    freeText: 'profile.form.freeText',
  }

  const patch = (): Partial<ProfileDraft> => {
    switch (field) {
      case 'name': return { name: text }
      case 'freeText': return { freeText: text }
      case 'role': return { role: choice as ProfileDraft['role'] }
      case 'technical_level': return { technical_level: choice as ProfileDraft['technical_level'] }
      case 'communication_style': return { communication_style: choice as ProfileDraft['communication_style'] }
      case 'languages': return { languages: list }
    }
  }

  /**
   * NAME, ROLE AND LEVEL CANNOT BE SAVED EMPTY, and the button is what says so. They are
   * the three the profile cannot exist without, so clearing one from this modal would be
   * an edit that silently writes nothing — the card's warning line exists for the state
   * where they were never filled in, not as a place to land after an explicit save.
   */
  const required = field === 'name' || field === 'role' || field === 'technical_level'
  const empty = field === 'name' ? text.trim() === '' : choice === ''
  const blocked = Boolean(saving) || (required && empty)

  /** One option. `accent` is the chosen one, and there is at most one per group. */
  const option = (value: string, label: string, selected: boolean, onClick: () => void) => (
    <Button key={value} size="md" tone={selected ? 'accent' : 'neutral'} onClick={onClick}>
      {label}
    </Button>
  )

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={t(TITLES[field])}
      /* `Button` FOR BOTH, where these were two hand-built controls with their own
         padding, their own radius and their own disabled opacity. `md` — 32px — to stand
         with the `lg` fields above them, and `busy` in place of the hand-rolled spinner:
         the component already turns its own mark and blocks the second press. */
      footer={
        <>
          <Button size="md" tone="neutral" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            size="md"
            tone="accent"
            icon={Check}
            busy={saving}
            disabled={blocked}
            onClick={() => onSave(patch())}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      {field === 'name' && (
        <Input
          size="lg"
          value={text}
          onChange={setText}
          placeholder={t('profile.form.firstNamePlaceholder')}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter' && !blocked) onSave(patch()) }}
          className="w-full"
        />
      )}

      {field === 'freeText' && (
        /* SIX ROWS, where the card used to give this three in a corner of a settings
           panel. It is the one field that is prose rather than an answer, and a modal is
           the first place it has ever had the room. No Enter-to-save either: a newline is
           a legitimate thing to type in here. */
        <Input
          size="lg"
          multiline
          rows={6}
          value={text}
          onChange={setText}
          placeholder={t('profile.form.freeTextPlaceholder')}
          autoFocus
          className="w-full"
        />
      )}

      {field === 'role' && (
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map(([value, key]) =>
            option(value, t(key), choice === value, () => setChoice(value)))}
        </div>
      )}

      {field === 'technical_level' && (
        <div className="flex flex-wrap gap-2">
          {LEVEL_OPTIONS.map(([value, key]) =>
            option(value, t(key), choice === value, () => setChoice(value)))}
        </div>
      )}

      {field === 'communication_style' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {/* Pressing the chosen one again CLEARS it, which the two required groups
                above deliberately do not do: this field is optional, so "none" is one of
                its answers and the reader needs a way back to it. */}
            {STYLE_OPTIONS.map(([value, key]) =>
              option(value, t(key), choice === value, () => setChoice(choice === value ? '' : value)))}
          </div>
          <p className="text-xs text-text-secondary/60">{t('profile.form.clearHint')}</p>
        </div>
      )}

      {field === 'languages' && (
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((language) =>
            option(language, language, list.includes(language), () =>
              setList(list.includes(language)
                ? list.filter((l) => l !== language)
                : [...list, language])))}
        </div>
      )}
    </Modal>
  )
}
