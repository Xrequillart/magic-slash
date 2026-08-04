import { describe, it, expect } from 'vitest'
import { extractInviteToken, inviteLink, INVITE_URL } from './urls'

/**
 * Invitation links, both directions.
 *
 * The stakes are asymmetric: building a bad link means an invitation nobody can
 * accept, and failing to parse one means a person who was invited, followed the link,
 * and is told their token is invalid. So the parser's job is to accept every shape
 * that has ever been sent — not just the one currently produced.
 */

const TOKEN = 'a1b2c3d4e5'

describe('inviteLink', () => {
  it('uses the short host when no origin is given (the desktop app)', () => {
    expect(inviteLink(TOKEN)).toBe(`${INVITE_URL}/${TOKEN}`)
  })

  it('uses the short host from any production origin', () => {
    // This is the fix for the webapp: it used to build the link from
    // window.location.origin, so an admin working in the back-office handed the
    // invitee `admin.magic-slash.io` — a hostname they had no business seeing. That
    // sub-domain is retired; the case stays because the rule is about ANY host the
    // sender is on, not about a list of the ones we happen to run today.
    expect(inviteLink(TOKEN, 'https://admin.magic-slash.io')).toBe(`${INVITE_URL}/${TOKEN}`)
    expect(inviteLink(TOKEN, 'https://app.magic-slash.io')).toBe(`${INVITE_URL}/${TOKEN}`)
    expect(inviteLink(TOKEN, 'https://magic-slash.io')).toBe(`${INVITE_URL}/${TOKEN}`)
  })

  it('stays on the current origin in dev and on previews', () => {
    // The short host does not resolve there, so a production link would be
    // untestable locally — the long form is the only one that works.
    expect(inviteLink(TOKEN, 'http://localhost:3000')).toBe(`http://localhost:3000/invite/${TOKEN}`)
    expect(inviteLink(TOKEN, 'https://magic-slash-git-branch.vercel.app'))
      .toBe(`https://magic-slash-git-branch.vercel.app/invite/${TOKEN}`)
  })

  it('is not fooled by a lookalike domain', () => {
    // `magic-slash.io.evil.com` must not be treated as ours.
    expect(inviteLink(TOKEN, 'https://magic-slash.io.evil.com'))
      .toBe(`https://magic-slash.io.evil.com/invite/${TOKEN}`)
  })
})

describe('extractInviteToken', () => {
  it('passes a raw token through', () => {
    expect(extractInviteToken(TOKEN)).toBe(TOKEN)
    expect(extractInviteToken(`  ${TOKEN}\n`)).toBe(TOKEN)
  })

  it('reads the long form, whatever the host', () => {
    // Every invitation sent before the short host existed looks like one of these,
    // and none of them expired because a URL changed. The `admin.` one matters MORE now
    // that the sub-domain is retired, not less: that link no longer opens in a browser,
    // so pasting it into the join field is the only way its token can be reached.
    expect(extractInviteToken(`https://app.magic-slash.io/invite/${TOKEN}`)).toBe(TOKEN)
    expect(extractInviteToken(`https://magic-slash.io/invite/${TOKEN}`)).toBe(TOKEN)
    expect(extractInviteToken(`https://admin.magic-slash.io/invite/${TOKEN}`)).toBe(TOKEN)
    expect(extractInviteToken(`http://localhost:3000/invite/${TOKEN}`)).toBe(TOKEN)
  })

  it('reads the short form, which has no /invite/ segment to anchor on', () => {
    // The case the previous parser missed: it returned the entire URL as the token.
    expect(extractInviteToken(`https://invite.magic-slash.io/${TOKEN}`)).toBe(TOKEN)
  })

  it('ignores a trailing query string or fragment', () => {
    expect(extractInviteToken(`https://invite.magic-slash.io/${TOKEN}?utm_source=email`)).toBe(TOKEN)
    expect(extractInviteToken(`https://app.magic-slash.io/invite/${TOKEN}#accept`)).toBe(TOKEN)
  })

  it('survives a link wrapped in whitespace by a mail client', () => {
    expect(extractInviteToken(`\n  https://invite.magic-slash.io/${TOKEN}  \n`)).toBe(TOKEN)
  })

  it('does not invent a token out of a URL that is not an invitation', () => {
    // A "last path segment" rule would read `dashboard` here and report an invalid
    // token. Returning the input unchanged lets the caller say the honest thing.
    const notAnInvite = 'https://app.magic-slash.io/dashboard'
    expect(extractInviteToken(notAnInvite)).toBe(notAnInvite)
  })

  it('returns the short host with no token unchanged rather than an empty string', () => {
    expect(extractInviteToken('https://invite.magic-slash.io/')).toBe('https://invite.magic-slash.io/')
  })
})
