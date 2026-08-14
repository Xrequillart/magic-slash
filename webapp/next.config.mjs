/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
