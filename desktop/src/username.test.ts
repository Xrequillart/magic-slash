import { describe, it, expect } from 'vitest'
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  sameUsername,
  validateUsername,
} from './username'

describe('validateUsername', () => {
  it('accepts the ordinary case and hands back what to store', () => {
    expect(validateUsername('camille')).toEqual({ ok: true, username: 'camille' })
  })

  // The rule this module exists for: main, the form and the SQL check constraint all
  // have to agree on the same set, so the separators are tested one by one rather than
  // as one happy string that would still pass if three of the four were dropped.
  it('accepts digits and the three separators, anywhere but first', () => {
    for (const handle of ['a.b', 'a-b', 'a_b', 'x12', '1xy', 'ab.cd-ef_gh']) {
      expect(validateUsername(handle)).toEqual({ ok: true, username: handle })
    }
  })

  it('refuses a handle opening with a separator, so it cannot read as a flag or a dotfile', () => {
    for (const handle of ['.config', '-fast', '_xav']) {
      expect(validateUsername(handle)).toEqual({ ok: false, reason: 'bad_characters' })
    }
  })

  it('refuses anything outside the set, including the space a display name would use', () => {
    for (const handle of ['jean claude', 'a@b', 'héloïse', 'x/y', 'emoji🙂ok']) {
      expect(validateUsername(handle)).toEqual({ ok: false, reason: 'bad_characters' })
    }
  })

  // Three codes and not one, because "too short" and "that character is not allowed"
  // send a person to two different edits — the pattern alone would collapse them.
  it('names the length refusals separately from the character one', () => {
    expect(validateUsername('ab')).toEqual({ ok: false, reason: 'too_short' })
    expect(validateUsername('a'.repeat(USERNAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      reason: 'too_long',
    })
  })

  it('accepts exactly the bounds it states', () => {
    expect(validateUsername('a'.repeat(USERNAME_MIN_LENGTH)).ok).toBe(true)
    expect(validateUsername('a'.repeat(USERNAME_MAX_LENGTH)).ok).toBe(true)
  })

  // A trailing space survives a paste and is invisible in the field. Untrimmed it
  // would fail the pattern — a message about characters, for a character the user
  // cannot see.
  it('trims before judging, and stores the trimmed string', () => {
    expect(validateUsername('  camille  ')).toEqual({ ok: true, username: 'camille' })
    expect(validateUsername('   ')).toEqual({ ok: false, reason: 'too_short' })
  })

  // The column stores what its owner typed; only the UNIQUENESS is case-insensitive,
  // and that is the index's business, not this function's.
  it('does not lower-case what it accepts', () => {
    expect(validateUsername('Camille')).toEqual({ ok: true, username: 'Camille' })
  })

  // The pattern is the twin of `profiles_username_format` in migration
  // 20260916090000. Its bounds are spelled as literals over there, so this is what
  // catches one of the two constants moving without the regex.
  it('states bounds the pattern actually enforces', () => {
    expect(USERNAME_PATTERN.test('a'.repeat(USERNAME_MIN_LENGTH - 1))).toBe(false)
    expect(USERNAME_PATTERN.test('a'.repeat(USERNAME_MIN_LENGTH))).toBe(true)
    expect(USERNAME_PATTERN.test('a'.repeat(USERNAME_MAX_LENGTH))).toBe(true)
    expect(USERNAME_PATTERN.test('a'.repeat(USERNAME_MAX_LENGTH + 1))).toBe(false)
  })
})

describe('sameUsername', () => {
  // The comparison the unique index makes: `Xavier` and `xavier` addressing two
  // different people is a phishing primitive, not a feature.
  it('ignores case and surrounding space, the way lower(username) does', () => {
    expect(sameUsername('Xavier', 'xavier')).toBe(true)
    expect(sameUsername('  xavier ', 'xavier')).toBe(true)
  })

  it('tells two different handles apart', () => {
    expect(sameUsername('xavier', 'xavier1')).toBe(false)
  })

  // Null is "no handle", and no handle is not the same handle as anyone's — including
  // the caller's own, which is what stops an unset row short-circuiting a real save.
  it('treats null as a handle nobody shares, except with another null', () => {
    expect(sameUsername(null, 'xavier')).toBe(false)
    expect(sameUsername('xavier', null)).toBe(false)
    expect(sameUsername(null, null)).toBe(true)
  })
})
