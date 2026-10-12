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
      // `@xyflow/react` for the same reason and on the same terms (the workflow canvas).
      // A webpack alias without `$` is a PREFIX, which is what this one needs: the
      // canvas also imports `@xyflow/react/dist/base.css`, and that subpath must land in
      // the same install as the module, or the styles and the code drift apart.
      '@xyflow/react': path.resolve(process.cwd(), 'node_modules/@xyflow/react'),
      // And the chat view's Markdown (`ChatMarkdown`), same terms again.
      'react-markdown': path.resolve(process.cwd(), 'node_modules/react-markdown'),
      'remark-gfm': path.resolve(process.cwd(), 'node_modules/remark-gfm'),
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
   * The signed-in pages the desktop app replaced. `/application`, `/plans`,
   * `/organization`, `/account` and `/repository/<id>` were deleted once everything
   * they did was done in the app, and they go to the dashboard rather than to a 404:
   * they were in the account menu for releases, so they are bookmarked.
   *
   * Not permanent: the dashboard is where a signed-in visitor lands today, and a 308
   * would sit in browser caches long after that changed.
   */
  async redirects() {
    return ['/application', '/plans', '/organization', '/account', '/repository'].flatMap((source) => [
      { source, destination: '/dashboard', permanent: false },
      { source: `${source}/:path*`, destination: '/dashboard', permanent: false },
    ])
  },
}

export default nextConfig
