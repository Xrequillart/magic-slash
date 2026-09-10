import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { APP_HOST, canonicalHost, resolveRewrite, retiredPath } from './hostRouting'
import { APP_URL } from './inviteLink'
import { PRIVACY_PATH } from './privacyPage'
import { TERMS_PATH } from './termsPage'

/**
 * Which host a path belongs on. `resolveRewrite` below answers the second question —
 * how a path that belongs HERE is rendered — and the two are only correct together:
 * a rewrite applied on the wrong host is the bug this half exists to prevent.
 */
describe('canonicalHost', () => {
  describe('the apex — the public site, and nothing else', () => {
    it('keeps the public pages', () => {
      expect(canonicalHost('magic-slash.io', '/')).toBeNull()
      // `/features` is the newest of them, and the one whose absence from the list
      // would be least visible: a 307 to `app.magic-slash.io` is a login form, not a
      // 404, so a reader following a link off the homepage would think the site had
      // signed them out rather than that a page was missing.
      expect(canonicalHost('magic-slash.io', '/features')).toBeNull()
      // `/changelog`, which the desktop app's update notice and every release note link
      // straight to. It moved out of `/documentation#changelog` and onto a route of its
      // own, and a route of its own is a route this list has to know about.
      expect(canonicalHost('magic-slash.io', '/changelog')).toBeNull()
      // `/story` has NO ROUTE ANY MORE and stays in the list for the same reason
      // `/documentation` does, further down: `retiredPath` 308s it to the homepage, and
      // that redirect only fires while this rule agrees the path is public.
      expect(canonicalHost('magic-slash.io', '/story')).toBeNull()
      // `/workflow`, which the homepage's workflow band points its one button at. Same
      // failure mode as `/features` above and one click closer to it: the button is on
      // the landing page itself, so its absence here would read as the site signing the
      // reader out mid-scroll.
      expect(canonicalHost('magic-slash.io', '/workflow')).toBeNull()
      // `/faq`, which replaced `/documentation` and is a bare link in the bar as well as
      // a row of the footer's Help column.
      expect(canonicalHost('magic-slash.io', '/faq')).toBeNull()
      // THE HEADER'S OWN PAGES, which are the worst of this failure mode rather than
      // another instance of it: they are in the HEADER, so they are on every public
      // page at once — a reader who opened the menu anywhere would be handed a login
      // form. `siteNav.test.ts` pins each of them to a page as well; this is the routing
      // half.
      //
      // `/cloud` IS STILL IN THE LIST though its page is deleted, and that is the point
      // of listing it: it is retired rather than gone, so this rule has to keep agreeing
      // it is public for `retiredPath` to get its 308 in. See the case below.
      for (const path of ['/desktop', '/cloud', '/download']) {
        expect(canonicalHost('magic-slash.io', path), path).toBeNull()
      }
      // THE TWO LEGAL PAGES, which are worse still: the header's rows are behind a menu,
      // these two are in the copyright row at the bottom of every public page. A reader
      // pressing "Privacy" to find out what we collect and being handed a login form
      // instead is the single least reassuring answer that question can get.
      for (const path of ['/privacy', '/terms']) {
        expect(canonicalHost('magic-slash.io', path), path).toBeNull()
      }
      // AND `/application` IS NOT ONE OF THEM, though the menu row that opens `/desktop`
      // is labelled "Application": that path is the app's own settings section, and it
      // goes where the rest of the product goes.
      expect(canonicalHost('magic-slash.io', '/application')).toBe(APP_HOST)
      expect(canonicalHost('magic-slash.io', '/application/appearance')).toBe(APP_HOST)
      // `/documentation` has no route behind it any more — `retiredPath` below 308s it
      // to `/faq`, and the middleware asks that FIRST. It stays in `PUBLIC_PATHS`
      // regardless, because this rule runs on the raw path and would otherwise decide a
      // deleted public page belongs to the app: a reader following an old link would get
      // a login form instead of the page that replaced it.
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
      expect(canonicalHost('magic-slash.io', '/features/')).toBeNull()
      expect(canonicalHost('magic-slash.io', '/changelog/')).toBeNull()
      expect(canonicalHost('magic-slash.io', '/faq/')).toBeNull()
      expect(canonicalHost('magic-slash.io', '/workflow/')).toBeNull()
      expect(canonicalHost('magic-slash.io', '/download/')).toBeNull()
      expect(canonicalHost('magic-slash.io', '/privacy/')).toBeNull()
      expect(canonicalHost('magic-slash.io', '/terms/')).toBeNull()
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
 * The pages we deleted, and where their readers land.
 *
 * The rule matters more than its two entries: a public page that stops existing has three
 * possible fates and only one of them is acceptable. It can 404, which throws away every
 * inbound link. It can fall out of `PUBLIC_PATHS` and 307 to the app host, which answers
 * a missing page with a login form — worse than a 404, because it reads as having been
 * signed out. Or it can redirect to whatever replaced it, which is this.
 *
 * AND WHERE THERE IS NO SUCCESSOR, the homepage: `/story` was deleted by request and
 * nothing took over what it said, which is the difference between its entry and
 * `/documentation`'s. A redirect to the front door still keeps the link working.
 */
describe('retiredPath', () => {
  it('sends the documentation page to the FAQ that replaced it', () => {
    // `/documentation` is in the README, in release notes, and in whatever anybody
    // bookmarked over the releases it was linked from. The manual is gone — split
    // between `/changelog`, `/features` and `/faq` — and the FAQ is the part of it
    // people were actually opening it for.
    expect(retiredPath('magic-slash.io', '/documentation')).toBe('/faq')
  })

  it('retires the path however it was typed', () => {
    // On a production build Next answers `/documentation/` with its own 308 to
    // `/documentation` before the middleware runs, so this normalisation is belt and
    // braces rather than the thing carrying that URL today — measured, two hops to
    // `/faq`. It stays because the ordering is the framework's to change and the
    // `trailingSlash` option is ours: without it, either change turns an old link into
    // a 404 silently.
    expect(retiredPath('magic-slash.io', '/documentation/')).toBe('/faq')
  })

  it('answers off production too, where the route is just as absent', () => {
    // Unlike `canonicalHost`, this is not a hosting decision — the page does not exist
    // in development either, so scoping it to the real domains would leave the redirect
    // untestable in the one place anybody would try it.
    expect(retiredPath('localhost:3000', '/documentation')).toBe('/faq')
    expect(retiredPath('magic-slash-git-branch.vercel.app', '/documentation')).toBe('/faq')
  })

  it('sends the founding story to the homepage, having nothing to replace it with', () => {
    // `/story` was in the FOOTER of every public page for releases, and in the header
    // bar for the last of them, so its URL is out there in a way a page reached from one
    // menu row is not. Nothing replaced what it said — there is no second page about
    // where this came from — so the front door is the honest destination.
    expect(retiredPath('magic-slash.io', '/story')).toBe('/')
    expect(retiredPath('magic-slash.io', '/story/')).toBe('/')
    expect(retiredPath('localhost:3000', '/story')).toBe('/')
  })

  it('writes no entry for a path that never shipped', () => {
    // `/best-practices` was deleted in the same story as `/story` and gets no redirect,
    // which is not an oversight: the path only ever existed on a feature branch, so
    // there is no inbound link to keep alive. `siteNav.test.ts` pins the other half —
    // that it is out of `PUBLIC_PATHS` too.
    expect(retiredPath('magic-slash.io', '/best-practices')).toBeNull()
  })

  it('sends the deleted cloud page to the homepage too', () => {
    // Deleted by request when the owner stopped selling the cloud side: the page, its
    // row in the header's Product menu, the homepage band that linked to it and the
    // Cloud family on `/features` all went in one story. THE HOMEPAGE and not a
    // successor, like `/story` and for the same reason — nothing replaced what it said.
    //
    // It shipped, which is the whole difference between this entry and `/best-practices`
    // below: it was a row in the bar on every public page and a button on the homepage,
    // so an inbound link or a bookmark outlives the route.
    expect(retiredPath('magic-slash.io', '/cloud')).toBe('/')
    expect(retiredPath('localhost:3000', '/cloud')).toBe('/')
  })

  it('leaves every live page alone', () => {
    for (const path of ['/', '/faq', '/features', '/changelog', '/workflow', '/desktop', '/download', '/privacy', '/terms', '/dashboard']) {
      expect(retiredPath('magic-slash.io', path), path).toBeNull()
    }
  })

  it('exempts the invite host, where a path is a token and not a route', () => {
    // `invite.magic-slash.io/documentation` is a request for an invitation that happens
    // to be named `documentation`. Redirecting it would answer a wrong-token message
    // with a page about uninstalling the app — the same reason that host is exempt from
    // `canonicalHost`.
    expect(retiredPath('invite.magic-slash.io', '/documentation')).toBeNull()
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
      // `/story` is a retired path now, redirected before this rule is asked — it must
      // not grow a rewrite of its own either way, exactly like `/documentation` below.
      expect(resolveRewrite('magic-slash.io', '/story')).toBeNull()
      // The features page, linked from the homepage, the header and the footer. Only
      // the ROOT of a host is ever rewritten, so a new public page needs no rule of its
      // own here — this pins that, since the failure would be a rewrite nobody wrote.
      expect(resolveRewrite('magic-slash.io', '/features')).toBeNull()
      expect(resolveRewrite('magic-slash.io', '/changelog')).toBeNull()
      expect(resolveRewrite('magic-slash.io', '/faq')).toBeNull()
      expect(resolveRewrite('magic-slash.io', '/workflow')).toBeNull()
      // The header's own pages, and the retired `/cloud` beside them. Nothing on the
      // apex is rewritten but the root, and the reason to say so per path is that a
      // rewrite rule added for one of them would be silent: the page still renders, just
      // not the one the URL names.
      for (const path of ['/desktop', '/cloud', '/download']) {
        expect(resolveRewrite('magic-slash.io', path), path).toBeNull()
      }
      // The two legal pages, for the same reason: they are ordinary routes under
      // `app/(marketing)`, and the only rewrite the apex has is its root.
      for (const path of ['/privacy', '/terms']) {
        expect(resolveRewrite('magic-slash.io', path), path).toBeNull()
      }
      // A retired path never reaches this rule — the middleware redirects it before
      // asking — but it must not grow a rewrite of its own if it ever does.
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

/**
 * THE ONE SET OF PUBLIC PATHS NO OTHER TEST REACHES.
 *
 * Every path in the HEADER comes from `lib/siteNav.ts`, and `siteNav.test.ts` walks that
 * module row by row against `PUBLIC_PATHS`. The footer's two link columns are that same
 * data (see `SiteFooter.tsx`), so they are covered by the same walk. Its COPYRIGHT ROW
 * is not: `/privacy` and `/terms` are written into the markup as string literals, in a
 * component no data module owns, and until this block existed the list in
 * `hostRouting.ts` was the only thing standing between them and a 307.
 *
 * WHICH IS THE WORST PLACE ON THE SITE FOR THAT GAP. Those two links are on the last
 * line of every public page, and a path absent from `PUBLIC_PATHS` does not 404 — it
 * sends the reader to a login form on `app.magic-slash.io`. Somebody pressing "Privacy"
 * to find out what is collected, and being asked to sign in, has been answered.
 *
 * READ AS TEXT, and the assertion is `canonicalHost` rather than a grep for the literal:
 * the question is not whether a string appears in a file, it is whether the apex will
 * answer that URL — which is the function's own job, and it covers the prefix rules and
 * the trailing-slash normalisation a grep would miss. `siteNav.test.ts` reads
 * `SiteHeader.tsx` the same way, for the half of the header a value cannot express.
 */
describe('the footer, whose legal links are the only public paths written as literals', () => {
  const footer = () =>
    readFileSync(
      fileURLToPath(new URL('../components/site/SiteFooter.tsx', import.meta.url)),
      'utf8',
    )

  /**
   * Every internal href the component hard-codes.
   *
   * `href="/..."` ONLY, which is exactly the shape that needs pinning: an `href={...}`
   * is a constant from `lib/siteNav.ts` or an off-site URL from `links.ts`, and neither
   * is this list's business. A leading slash is what separates a route from
   * `https://github.com/...`.
   */
  const internalHrefs = () =>
    [...footer().matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1])

  it('links only to paths the apex actually answers', () => {
    const hrefs = internalHrefs()

    // A GUARD ON THE GUARD. The regex is the whole test, so a footer refactor that moved
    // both links behind constants would silently leave this asserting over an empty
    // array and reporting green. Two is what the copyright row carries today; the day it
    // carries none, this fails and asks whoever changed it to say what covers them now.
    expect(hrefs.length, 'no hard-coded internal href found in SiteFooter.tsx').toBeGreaterThan(0)

    for (const href of hrefs) {
      expect(canonicalHost('magic-slash.io', href), `${href} is not a public path`).toBeNull()
    }
  })

  it('carries the two legal pages the modules declare', () => {
    // THE OTHER DIRECTION, and it is what stops `PRIVACY_PATH` and `TERMS_PATH` becoming
    // decoration. Those constants exist so the pages' own tests can find the route file
    // and check the routing list; if the footer's literal and the module's constant ever
    // named different paths, both halves would still pass on their own and the link in
    // the copyright row would be the one nobody had checked.
    expect(internalHrefs()).toEqual(expect.arrayContaining([PRIVACY_PATH, TERMS_PATH]))
  })
})
