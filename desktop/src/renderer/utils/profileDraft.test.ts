import { describe, it, expect } from 'vitest'
import { draftFromProfile, profileFromDraft, type ProfileDraft } from './profileDraft'
import type { UserProfile } from '../../types'

const FULL: UserProfile = {
  name: 'Camille',
  role: 'product',
  technical_level: 'intermediate',
  communication_style: 'simple',
  languages: ['English', 'Français'],
  freeText: 'I prefer short answers.',
}

/** A draft with the three required fields answered and nothing else. */
const MINIMAL: ProfileDraft = {
  name: 'Camille',
  role: 'product',
  technical_level: 'intermediate',
  communication_style: '',
  languages: [],
  freeText: '',
}

describe('draftFromProfile', () => {
  it('carries every field across', () => {
    expect(draftFromProfile(FULL)).toEqual({
      name: 'Camille',
      role: 'product',
      technical_level: 'intermediate',
      communication_style: 'simple',
      languages: ['English', 'Français'],
      freeText: 'I prefer short answers.',
    })
  })

  // The whole reason the draft is its own type: a form is half-filled by definition for
  // as long as somebody is filling it in, and `UserProfile` cannot model that.
  it('turns no profile into an empty draft rather than nulls', () => {
    expect(draftFromProfile(null)).toEqual({
      name: '',
      role: '',
      technical_level: '',
      communication_style: '',
      languages: [],
      freeText: '',
    })
  })

  it('fills the optional fields that a stored profile omits', () => {
    const draft = draftFromProfile({ name: 'Ada', role: 'dev', technical_level: 'expert' })
    expect(draft.communication_style).toBe('')
    expect(draft.languages).toEqual([])
    expect(draft.freeText).toBe('')
  })
})

describe('profileFromDraft', () => {
  it('narrows a complete draft', () => {
    expect(profileFromDraft(draftFromProfile(FULL))).toEqual(FULL)
  })

  // Null is "not yet", not "broken": it is the normal state of the first thirty seconds,
  // which is why the card answers it with a line of text rather than an error.
  it('refuses a draft missing any one of the three required fields', () => {
    expect(profileFromDraft({ ...MINIMAL, name: '' })).toBeNull()
    expect(profileFromDraft({ ...MINIMAL, role: '' })).toBeNull()
    expect(profileFromDraft({ ...MINIMAL, technical_level: '' })).toBeNull()
  })

  // A name of spaces is not a name. It also must not reach the store, which would write
  // it and leave the card looking filled in.
  it('treats a whitespace-only name as missing', () => {
    expect(profileFromDraft({ ...MINIMAL, name: '   ' })).toBeNull()
  })

  it('trims what it stores', () => {
    const profile = profileFromDraft({ ...MINIMAL, name: '  Camille  ', freeText: '  hi  ' })
    expect(profile?.name).toBe('Camille')
    expect(profile?.freeText).toBe('hi')
  })

  /**
   * THE OPTIONAL FIELDS ARE OMITTED RATHER THAN SENT EMPTY, and this is the test that
   * matters: the store writes every optional column as `?? null`, so an empty string
   * surviving to here would land in the database as a style nobody chose.
   */
  it('omits the optional fields instead of writing them empty', () => {
    const profile = profileFromDraft(MINIMAL)
    expect(profile).not.toBeNull()
    expect(Object.keys(profile!).sort()).toEqual(['name', 'role', 'technical_level'])
  })

  it('omits free text that is only whitespace', () => {
    expect(profileFromDraft({ ...MINIMAL, freeText: '   ' })).not.toHaveProperty('freeText')
  })

  it('keeps languages only when at least one was chosen', () => {
    expect(profileFromDraft({ ...MINIMAL, languages: [] })).not.toHaveProperty('languages')
    expect(profileFromDraft({ ...MINIMAL, languages: ['English'] })?.languages).toEqual(['English'])
  })

  // Round-tripping is what the card does on every failed save: it reverts the draft from
  // the profile it knows is on disk.
  it('round-trips a profile through a draft unchanged', () => {
    expect(profileFromDraft(draftFromProfile(profileFromDraft(draftFromProfile(FULL))!))).toEqual(FULL)
  })
})
