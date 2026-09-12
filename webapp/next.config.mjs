import path from 'node:path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * `design-system/` sits a directory ABOVE this app, and Next refuses to compile a
   * file outside the project root unless told to. Without it, importing `@ds/desktop`
   * fails to resolve rather than merely rendering oddly.
   *
   * The alias itself is set in `webpack()` below, and mirrored in `tsconfig.json` so
   * the editor and `next build`'s type-check agree with the bundler.
   */
  experimental: { externalDir: true },

  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@ds': path.resolve(process.cwd(), '../design-system'),
      // `lucide-react` FROM THIS APP'S OWN INSTALL, for the shared files too.
      //
      // The design system declares the dependency and owns its version — that is the
      // whole point of it living there — but it resolves through `design-system/
      // node_modules`, and on Vercel that directory does not exist: the deployment's
      // root is `webapp/`, so `npm install` runs here and nowhere else. The build died
      // with `Module not found: Can't resolve 'lucide-react'`, reproduced locally by
      // moving that folder aside.
      //
      // Pointing it here is what a PEER dependency does, and it is safe precisely
      // because the two declare the same range: `^1.26.0` in both. If they ever
      // diverge this alias is the lie that hides it, so `lib/sharedDeps.test.ts` fails
      // the moment they do.
      //
      // NOT `react`, ever — see the note below.
      'lucide-react': path.resolve(process.cwd(), 'node_modules/lucide-react'),
    }
    return config
  },

  // WHY `react` IS NOT IN THAT LIST. Pinning it is the obvious guard against an
  // out-of-root file finding a second copy, and it breaks the build instead: Next
  // points `react` at its own vendored builds per environment, and the server one is
  // where `React.cache` lives. Overriding it takes `cache` away from every server
  // component, and the build dies collecting `/admin/…` page data with
  // `n.cache is not a function`.

  /**
   * `/application` is the way into the Application section, not a tab of its own —
   * every tab has its own URL, so the bare path has to name one.
   *
   * Here rather than a `redirect()` in `app/application/page.tsx`: that page renders
   * under a CLIENT layout, so the shell is already streaming by the time the redirect
   * is thrown and Next can only finish it in the browser — a flash of the loading
   * state, and a 200 for anything that is not a browser. This answers with a real
   * redirect before a byte of the page is rendered.
   *
   * Not permanent: which tab opens first is a product decision, and a 308 would sit in
   * browser caches long after we changed our mind about it.
   *
   * The target is duplicated from `DEFAULT_APPLICATION_TAB` in
   * `components/application/ApplicationTabs.tsx`, which is the tab strip's own
   * definition of "first" — this file is plain JS loaded before the app, so it cannot
   * import it. Change one, change the other.
   */
  async redirects() {
    return [{ source: '/application', destination: '/application/features', permanent: false }]
  },
}

export default nextConfig
