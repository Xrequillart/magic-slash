import type { MessageKey } from './i18n'

/**
 * What `/privacy` is made of: its chrome, and the seven headed sections it renders in
 * order. The SENTENCES are in `lib/i18n/marketing/{en,fr}.ts`; this is the list of keys
 * that says which of them the page actually reads, and in what order.
 *
 * A MODULE RATHER THAN AN ARRAY INSIDE `PrivacyContent.tsx`, which is where it lived,
 * and the reason is the one `lib/faq.ts`, `lib/downloadPage.ts` and `lib/skillsBand.ts`
 * each state for their own page. The comment this file replaces argued that spelling the
 * keys out as literals against `MessageKey` was enough because "`next build`'s typecheck
 * catches it" — and that is true only of a Vercel build. `.github/workflows/ci.yml`
 * typechecks `desktop/` alone, so on a pull request the union guarantees NOTHING, and
 * `t()` has no per-key fallback: a key that does not exist renders as an empty paragraph
 * under its heading rather than as an error. On a legal page that is a section which
 * promises something and then says nothing, shipped silently. Named here, every key
 * below goes through `privacyPage.test.ts`, which runs in the ROOT vitest suite and
 * looks each one up in BOTH catalogues for real, on a pull request.
 *
 * ZERO RUNTIME IMPORTS BAR `./i18n` (as a TYPE, erased by esbuild), and that is a hard
 * constraint rather than a preference: the root suite runs on the ROOT `node_modules`
 * and CI never installs `webapp/`'s own (see the note in `vitest.config.ts`). A `react`,
 * a `next/*` or a `lucide-react` import at any depth from here would not FAIL that test,
 * it would fail to RESOLVE it, which reads as a broken suite instead of a broken module.
 *
 * WHAT IS NOT IN HERE IS THE PAGE'S RULE, because a rule is not data:
 * `components/site/privacy/PrivacyContent.tsx` and `app/(marketing)/privacy/page.tsx`
 * both carry it at length, and the short version is that every claim on that page must
 * be sourced from code in this repository. Nothing in this file can check that. What it
 * can check is the cheaper failure underneath it: that the claim is on screen at all.
 */

/** One headed section, as the pair of catalogue keys it is. */
export type LegalSection = { title: MessageKey; body: MessageKey }

/** The page's chrome, as catalogue keys. */
export const PAGE_CHROME = {
  /** The page's `h1`. */
  title: 'site.privacy.title',
  /** The one line under it. */
  lead: 'site.privacy.lead',
  /** The footnote under the rule: the question this page did not answer. */
  askLead: 'site.privacy.askLead',
  /** The label beside it. The href is `NEW_ISSUE_URL`, composed in JSX. */
  askLink: 'site.privacy.askLink',
} as const satisfies Record<string, MessageKey>

/**
 * The route, named here for the reason `WORKFLOW_PATH` and `DOWNLOAD_PATH` are named in
 * their own modules: a path absent from `PUBLIC_PATHS` (`lib/hostRouting.ts`) is not a
 * 404 on production, it is a 307 to a login form on `app.magic-slash.io`, and this is
 * the page where that is worst. A reader pressing "Privacy" to find out what we collect,
 * and being handed a sign-in form, has been answered in the least reassuring way there
 * is. `privacyPage.test.ts` reads that file and pins the pair.
 *
 * `SiteFooter.tsx` STILL SPELLS ITS OWN HREF, and this constant does not change that on
 * purpose: the footer's copyright row is markup, not a table of routes, and rewriting it
 * to import from here would be a change to a file this work has no other business in.
 * The link between the two is a test instead. `hostRouting.test.ts` reads that component
 * as text, pins every internal href it hard-codes against `PUBLIC_PATHS`, and checks
 * this path is one of them, so the constant cannot drift from what the footer links to.
 */
export const PRIVACY_PATH = '/privacy'

/**
 * The sections, in reading order, and the order is an argument.
 *
 * What stays on the machine comes SECOND, before anything about what is stored, because
 * it is the question a developer arrives with ("does my code go anywhere?") and burying
 * the answer under a definitions section would be a way of not answering it. Everything
 * after that is the account, in widening circles: what it holds, what it counts, who
 * else sees it, what the browser keeps, and how to end it.
 */
export const SECTIONS: readonly LegalSection[] = [
  { title: 'site.privacy.scope.title', body: 'site.privacy.scope.body' },
  { title: 'site.privacy.local.title', body: 'site.privacy.local.body' },
  { title: 'site.privacy.account.title', body: 'site.privacy.account.body' },
  { title: 'site.privacy.usage.title', body: 'site.privacy.usage.body' },
  { title: 'site.privacy.processors.title', body: 'site.privacy.processors.body' },
  { title: 'site.privacy.browser.title', body: 'site.privacy.browser.body' },
  { title: 'site.privacy.control.title', body: 'site.privacy.control.body' },
]

/** Every key the page reads, flat — what `privacyPage.test.ts` looks up in both catalogues. */
export const ALL_KEYS: readonly MessageKey[] = [
  ...Object.values(PAGE_CHROME),
  ...SECTIONS.flatMap((section) => [section.title, section.body]),
]
