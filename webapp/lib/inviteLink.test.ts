import { describe, it, expect } from 'vitest'
import { APP_URL, extractInviteToken, inviteLink, INVITE_URL, postAcceptUrl } from './inviteLink'
// The desktop's copy of the same logic. Imported here on purpose — see the drift
// suite at the bottom, which is the only thing that can catch the two diverging.
import {
  extractInviteToken as desktopExtract,
  inviteLink as desktopBuild,
  INVITE_URL as DESKTOP_INVITE_URL,
} from '../../desktop/src/urls'

const TOKEN = 'a1b2c3d4e5'

describe('inviteLink', () => {
  it('uses the short host from any production origin', () => {
    // The bug this fixes: the link was built from window.location.origin alone, so an
    // admin in the back-office handed the invitee `admin.magic-slash.io`. That
    // sub-domain is retired — it stays in the list precisely because the rule is about
    // ANY host the sender is on, including one nobody has thought of yet.
    expect(inviteLink(TOKEN, 'https://admin.magic-slash.io')).toBe(`${INVITE_URL}/${TOKEN}`)
    expect(inviteLink(TOKEN, 'https://app.magic-slash.io')).toBe(`${INVITE_URL}/${TOKEN}`)
    expect(inviteLink(TOKEN, 'https://magic-slash.io')).toBe(`${INVITE_URL}/${TOKEN}`)
  })

  it('stays on the current origin in dev and on previews', () => {
    expect(inviteLink(TOKEN, 'http://localhost:3000')).toBe(`http://localhost:3000/invite/${TOKEN}`)
    expect(inviteLink(TOKEN, 'https://magic-slash-git-branch.vercel.app'))
      .toBe(`https://magic-slash-git-branch.vercel.app/invite/${TOKEN}`)
  })

  it('is not fooled by a lookalike domain', () => {
    expect(inviteLink(TOKEN, 'https://magic-slash.io.evil.com'))
      .toBe(`https://magic-slash.io.evil.com/invite/${TOKEN}`)
  })
})

describe('postAcceptUrl', () => {
  it('leaves the invite host for the product', () => {
    // The bug this fixes: `router.replace('/dashboard')` stayed on the invite host,
    // where the path prefix turned it into `/invite/dashboard` — so the page told
    // someone who had just joined that their invitation did not exist.
    expect(postAcceptUrl('https://invite.magic-slash.io')).toBe(`${APP_URL}/`)
  })

  it('sends someone accepting from any other production host to the same place', () => {
    // Invitations sent before the short host existed are still live, and land on the
    // long form of whichever host they were built from.
    expect(postAcceptUrl('https://app.magic-slash.io')).toBe(`${APP_URL}/`)
    expect(postAcceptUrl('https://magic-slash.io')).toBe(`${APP_URL}/`)
  })

  it('stays on the current origin in dev and on previews', () => {
    // The production host does not resolve there, so leaving for it would end the flow
    // on a domain the developer is not running.
    expect(postAcceptUrl('http://localhost:3000')).toBe('http://localhost:3000/dashboard')
    expect(postAcceptUrl('https://magic-slash-git-branch.vercel.app'))
      .toBe('https://magic-slash-git-branch.vercel.app/dashboard')
  })

  it('is not fooled by a lookalike domain', () => {
    expect(postAcceptUrl('https://magic-slash.io.evil.com'))
      .toBe('https://magic-slash.io.evil.com/dashboard')
  })
})

describe('extractInviteToken', () => {
  it('passes a raw token through', () => {
    expect(extractInviteToken(`  ${TOKEN}\n`)).toBe(TOKEN)
  })

  it('reads the long form, whatever the host', () => {
    expect(extractInviteToken(`https://app.magic-slash.io/invite/${TOKEN}`)).toBe(TOKEN)
    expect(extractInviteToken(`http://localhost:3000/invite/${TOKEN}`)).toBe(TOKEN)
  })

  it('reads the short form, which has no /invite/ segment', () => {
    expect(extractInviteToken(`https://invite.magic-slash.io/${TOKEN}`)).toBe(TOKEN)
  })

  it('ignores a trailing query string or fragment', () => {
    expect(extractInviteToken(`https://invite.magic-slash.io/${TOKEN}?utm_source=email`)).toBe(TOKEN)
    expect(extractInviteToken(`https://app.magic-slash.io/invite/${TOKEN}#accept`)).toBe(TOKEN)
  })

  it('does not invent a token out of a URL that is not an invitation', () => {
    const notAnInvite = 'https://app.magic-slash.io/dashboard'
    expect(extractInviteToken(notAnInvite)).toBe(notAnInvite)
  })
})

/**
 * The two implementations must agree.
 *
 * This logic is duplicated in `desktop/src/urls.ts` because the two builds cannot
 * import each other, and BOTH surfaces create invitations and accept pasted links. A
 * divergence would not fail anywhere — it would produce a link one side emits and the
 * other cannot read, discovered by whoever was invited.
 *
 * Comparing behaviour rather than source: the desktop's builder takes its origin
 * optionally (it is not served from a host), so the signatures differ on purpose. What
 * has to match is the answer.
 */
describe('the desktop and webapp copies agree', () => {
  it('serves the same invite host', () => {
    expect(INVITE_URL).toBe(DESKTOP_INVITE_URL)
  })

  it.each([
    'https://app.magic-slash.io',
    'https://admin.magic-slash.io',
    'https://magic-slash.io',
    'http://localhost:3000',
    'https://magic-slash-git-branch.vercel.app',
    'https://magic-slash.io.evil.com',
  ])('builds the same link from %s', (origin) => {
    expect(inviteLink(TOKEN, origin)).toBe(desktopBuild(TOKEN, origin))
  })

  it.each([
    TOKEN,
    `  ${TOKEN}  `,
    `https://invite.magic-slash.io/${TOKEN}`,
    `https://app.magic-slash.io/invite/${TOKEN}`,
    `https://magic-slash.io/invite/${TOKEN}`,
    `http://localhost:3000/invite/${TOKEN}`,
    `https://invite.magic-slash.io/${TOKEN}?utm_source=email`,
    `https://app.magic-slash.io/invite/${TOKEN}#accept`,
    'https://app.magic-slash.io/dashboard',
    'https://invite.magic-slash.io/',
    '',
  ])('reads %s the same way', (input) => {
    expect(extractInviteToken(input)).toBe(desktopExtract(input))
  })
})
