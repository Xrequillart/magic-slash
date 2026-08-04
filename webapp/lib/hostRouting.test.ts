import { describe, it, expect } from 'vitest'
import { resolveRewrite } from './hostRouting'

/**
 * Host routing decides what four different audiences see at `/`, so a mistake here
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
      // The link the desktop app builds for invitations. It has to keep working.
      expect(resolveRewrite('app.magic-slash.io', '/invite/abc123')).toBeNull()
    })
  })

  describe('admin. — the back-office', () => {
    it('serves /admin at the root', () => {
      expect(resolveRewrite('admin.magic-slash.io', '/')).toBe('/admin')
    })

    it('leaves the sections alone', () => {
      expect(resolveRewrite('admin.magic-slash.io', '/admin/users')).toBeNull()
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
