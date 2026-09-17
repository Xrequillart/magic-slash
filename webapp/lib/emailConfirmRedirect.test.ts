import { describe, it, expect } from 'vitest'
import { isEmailChangeRedirect } from './emailConfirmRedirect'

// The real thing, copied from a 303 the local GoTrue actually returned.
const REAL = '#access_token=eyJhbGciOi.abc.def&expires_at=1789637606&expires_in=3600'
  + '&refresh_token=zzz&sb=&token_type=bearer&type=email_change'

describe('isEmailChangeRedirect', () => {
  it('recognises the fragment Supabase actually sends', () => {
    expect(isEmailChangeRedirect(REAL)).toBe(true)
  })

  it('does not need the leading hash', () => {
    expect(isEmailChangeRedirect(REAL.slice(1))).toBe(true)
  })

  it('stays quiet on an ordinary visit', () => {
    for (const hash of ['', '#', '#section', '#access_token=abc']) {
      expect(isEmailChangeRedirect(hash)).toBe(false)
    }
  })

  // The whole reason this parses rather than matches: every one of these contains the
  // phrase `type=email_change` as a substring and none of them is a confirmation.
  it('is not fooled by a value that merely contains the phrase', () => {
    expect(isEmailChangeRedirect('#type=email_change_pending')).toBe(false)
    expect(isEmailChangeRedirect('#error_description=type%3Demail_change+failed')).toBe(false)
    expect(isEmailChangeRedirect('#next=%23type%3Demail_change')).toBe(false)
  })

  // Recovery and signup land on the same URL with the same shape. Celebrating an email
  // change there would be a page congratulating somebody on something else.
  it('tells the other auth redirects apart', () => {
    expect(isEmailChangeRedirect('#access_token=a&type=recovery')).toBe(false)
    expect(isEmailChangeRedirect('#access_token=a&type=signup')).toBe(false)
  })
})
