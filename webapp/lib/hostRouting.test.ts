import { describe, it, expect } from 'vitest'
import { APP_HOST, canonicalHost, resolveRewrite } from './hostRouting'
import { APP_URL } from './inviteLink'

/**
 * Which host a path belongs on. `resolveRewrite` below answers the second question —
 * how a path that belongs HERE is rendered — and the two are only correct together:
 * a rewrite applied on the wrong host is the bug this half exists to prevent.
 */
describe('canonicalHost', () => {
  describe('the apex — the public site, and nothing else', () => {
    it('keeps the public pages', () => {
      expect(canonicalHost('magic-slash.io', '/')).toBeNull()
      expect(canonicalHost('magic-slash.io', '/story')).toBeNull()
      expect(canonicalHost('magic-slash.io', '/documentation')).toBeNull()
    })

    it('sends the product to the app host', () => {
      // These four were all reachable on the apex, which is how someone ends up with
      // `magic-slash.io/account` in their password manager.
      for (const path of ['/login', '/dashboard', '/account', '/organization']) {
        expect(canonicalHost('magic-slash.io', path)).toBe(APP_HOST)
      }
      expect(canonicalHost('magic-slash.io', '/repository/42')).toBe(APP_HOST)
    })

    it('sends the back-office to the app host too', () => {
      // It had a host of its own for a while. `/admin` is a section of the product now,
      // so it goes where the product goes and needs no rule of its own.
      expect(canonicalHost('magic-slash.io', '/admin')).toBe(APP_HOST)
      expect(canonicalHost('magic-slash.io', '/admin/users')).toBe(APP_HOST)
    })

    it('keeps a public page whose URL was typed with a trailing slash', () => {
      // Next normalises `/story/` to `/story`, but in the routing layer — this runs
      // first, and an unmatched public page here is not re-rendered, it is sent away.
      expect(canonicalHost('magic-slash.io', '/story/')).toBeNull()
      expect(canonicalHost('magic-slash.io', '/documentation/')).toBeNull()
    })

    it('keeps answering the long-form invitation links', () => {
      // Sent before the short host existed. They do not expire because we moved a URL.
      expect(canonicalHost('magic-slash.io', '/invite/abc123')).toBeNull()
    })
  })

  describe('the app host — where everything signed-in belongs', () => {
    it('leaves it all alone, back-office included', () => {
      expect(canonicalHost(APP_HOST, '/dashboard')).toBeNull()
      expect(canonicalHost(APP_HOST, '/login')).toBeNull()
      expect(canonicalHost(APP_HOST, '/account')).toBeNull()
      expect(canonicalHost(APP_HOST, '/admin/users')).toBeNull()
      // The root: public by this rule, then rewritten to /dashboard by the next one.
      expect(canonicalHost(APP_HOST, '/')).toBeNull()
    })

    it('does not bounce a signed-in page that used to live elsewhere', () => {
      // `useRequirePlatformAdmin` sends a non-admin to /dashboard, and both ends of that
      // hop are now the same host — so it stays a client-side navigation.
      expect(canonicalHost(APP_HOST, '/admin')).toBeNull()
    })
  })

  describe('a host we no longer serve', () => {
    it('would still be answered, if it ever resolved again', () => {
      // The admin sub-domain is gone from DNS, so nothing can arrive on it. The rule is
      // written on the host that OWNS the path rather than on a list of hosts that do
      // not, which is why retiring a sub-domain needed no special case here.
      expect(canonicalHost('admin.magic-slash.io', '/admin/users')).toBe(APP_HOST)
      expect(canonicalHost('www.magic-slash.io', '/dashboard')).toBe(APP_HOST)
    })
  })

  describe('invite. — exempt from the whole question', () => {
    it('never redirects, whatever the path looks like', () => {
      // Every path on that host is a TOKEN. `/dashboard` there is a request for an
      // invitation named `dashboard`, and redirecting it would answer a wrong-token
      // message with a trip to the login page.
      expect(canonicalHost('invite.magic-slash.io', '/dashboard')).toBeNull()
      expect(canonicalHost('invite.magic-slash.io', '/admin')).toBeNull()
      expect(canonicalHost('invite.magic-slash.io', '/abc123')).toBeNull()
      expect(canonicalHost('invite.magic-slash.io', '/')).toBeNull()
    })
  })

  describe('off production', () => {
    it('never redirects, because there is only one host', () => {
      // Otherwise `npm run dev` sends the developer into production on first sign-in,
      // and a preview deploy can only be used to review the landing page.
      expect(canonicalHost('localhost:3000', '/dashboard')).toBeNull()
      expect(canonicalHost('127.0.0.1:3000', '/admin/users')).toBeNull()
      expect(canonicalHost('magic-slash-git-branch.vercel.app', '/dashboard')).toBeNull()
    })

    it('is not fooled by a lookalike domain', () => {
      // A redirect here would hand our host name to whoever owns that domain.
      expect(canonicalHost('magic-slash.io.evil.com', '/dashboard')).toBeNull()
    })
  })

  it('agrees with the URL the invitation flow leaves for', () => {
    // Two modules name the app host: this one because it routes, `inviteLink` because it
    // mirrors `desktop/src/urls.ts` and cannot import from here. They must not drift.
    expect(APP_URL).toBe(`https://${APP_HOST}`)
  })
})

/**
 * Host routing decides what three different audiences see at `/`, so a mistake here
 * is not a broken page — it is the wrong PRODUCT answering the door. The invite
 * rules get the most attention because they are the only ones that touch paths
 * other than the root.
 */
describe('resolveRewrite', () => {
  describe('the apex — the public site', () => {
    it('leaves the landing page alone', () => {
      expect(resolveRewrite('magic-slash.io', '/')).toBeNull()
    })

    it('leaves every other public page alone', () => {
      expect(resolveRewrite('magic-slash.io', '/story')).toBeNull()
      // Unlinked from the site's nav, but still reachable — the desktop app links here.
      expect(resolveRewrite('magic-slash.io', '/documentation')).toBeNull()
    })
  })

  describe('app. — the product', () => {
    it('serves the dashboard at the root', () => {
      expect(resolveRewrite('app.magic-slash.io', '/')).toBe('/dashboard')
    })

    it('leaves deeper paths alone, since they already carry their real route', () => {
      expect(resolveRewrite('app.magic-slash.io', '/account')).toBeNull()
      // The back-office, which is a section of the product rather than a host of its own.
      expect(resolveRewrite('app.magic-slash.io', '/admin/users')).toBeNull()
      // The link the desktop app builds for invitations. It has to keep working.
      expect(resolveRewrite('app.magic-slash.io', '/invite/abc123')).toBeNull()
    })
  })

  describe('invite. — the invitation funnel', () => {
    it('turns a bare token into the invite route', () => {
      // The whole reason this host needs path prefixing: /abc123 is not a route.
      expect(resolveRewrite('invite.magic-slash.io', '/abc123')).toBe('/invite/abc123')
    })

    it('serves the invite route itself at the root', () => {
      expect(resolveRewrite('invite.magic-slash.io', '/')).toBe('/invite')
    })

    it('does not prefix a path that already carries it', () => {
      // Otherwise /invite/abc123 becomes /invite/invite/abc123 — a 404 reached by
      // someone following a perfectly valid link.
      expect(resolveRewrite('invite.magic-slash.io', '/invite/abc123')).toBeNull()
      expect(resolveRewrite('invite.magic-slash.io', '/invite')).toBeNull()
    })

    it('does not mistake a path that merely starts with the same letters', () => {
      // `/invitations` shares a prefix with `/invite` as a STRING but is not under
      // it, so it still needs prefixing. Guarding on the trailing slash is what
      // keeps the two apart.
      expect(resolveRewrite('invite.magic-slash.io', '/invitations')).toBe('/invite/invitations')
    })
  })

  describe('hosts that are not ours to route', () => {
    it('leaves localhost alone, so dev serves the real paths', () => {
      expect(resolveRewrite('localhost:3000', '/')).toBeNull()
      expect(resolveRewrite('localhost:3000', '/dashboard')).toBeNull()
    })

    it('treats a missing Host header as the apex rather than guessing', () => {
      expect(resolveRewrite('', '/')).toBeNull()
    })

    it('matches on the subdomain, so Vercel previews of the app host still work', () => {
      // A preview deployment answers on app.<something-else>, and the prefix is what
      // identifies it — not the full domain.
      expect(resolveRewrite('app.magic-slash-git-branch.vercel.app', '/')).toBe('/dashboard')
    })
  })
})
