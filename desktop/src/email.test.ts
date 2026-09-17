import { describe, it, expect } from 'vitest'
import { looksLikeEmail } from './email'

describe('looksLikeEmail', () => {
  it('accepts the ordinary shapes', () => {
    for (const address of ['a@b.co', 'camille@acme.dev', 'first.last@example.com']) {
      expect(looksLikeEmail(address)).toBe(true)
    }
  })

  // The point of staying permissive: every one of these is a real, deliverable address,
  // and a stricter regex is how a form ends up refusing somebody their own inbox.
  it('accepts the valid addresses a stricter regex would refuse', () => {
    for (const address of [
      'user+tag@example.com',
      "o'brien@example.com",
      'user@a.io',
      'user@mail.example.co.uk',
      'user_name-1@sub.example.museum',
    ]) {
      expect(looksLikeEmail(address)).toBe(true)
    }
  })

  it('refuses what is nonsense in any reading', () => {
    for (const address of ['', '   ', 'nope', 'a@b', '@example.com', 'user@', 'a b@example.com', 'a@@b.co']) {
      expect(looksLikeEmail(address)).toBe(false)
    }
  })

  // `user@localhost` is a valid address on a mail server and useless here: this app asks
  // a hosted service to send a message to a real inbox.
  it('refuses a domain with no dot', () => {
    expect(looksLikeEmail('user@localhost')).toBe(false)
  })

  it('refuses empty labels either side of the dot', () => {
    expect(looksLikeEmail('user@example.')).toBe(false)
    expect(looksLikeEmail('user@.com')).toBe(false)
  })

  // A trailing space survives a paste and is invisible in the field.
  it('trims before judging', () => {
    expect(looksLikeEmail('  camille@acme.dev  ')).toBe(true)
  })
})
