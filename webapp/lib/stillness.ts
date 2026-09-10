/**
 * WHEN THE SITE HOLDS STILL. Two audiences get the resting state of every animation on
 * the public site — the entrance reveals, the looping mockups, the hero's figure:
 *
 *   • readers who asked the OS for less motion (`prefers-reduced-motion: reduce`), and
 *   • every phone and tablet, which here means any viewport under Tailwind's `lg`
 *     (1024px). The product owner's call ("retire toutes les animations" on mobile and
 *     tablet): on a small screen the mockups are cropped to a sliver, a loop the reader
 *     cannot see whole is a battery cost with no story, and the entrance stagger only
 *     delays copy the reader has already scrolled to.
 *
 * ONE QUERY, TWO CONSUMERS. The JavaScript-driven animations (timers, `requestAnimationFrame`,
 * the `IntersectionObserver` that plays `Reveal`) call `isStill()` where they used to read
 * the reduced-motion query alone. The CSS animations (`animate-*`) are cut by a rule in
 * `app/globals.css` under `[data-site]`, on the same width — it cannot read this constant,
 * so the number is written twice, here and there, and the comment on each names the other.
 *
 * `1023.98px` and not `1023px`: media queries compare fractional widths, and a viewport
 * at 1023.5px would otherwise fall between "small" and `lg`.
 */
export const STILL_QUERY = '(prefers-reduced-motion: reduce), (max-width: 1023.98px)'

/** True when nothing on the site should move. Safe to call during render on the server: false there. */
export function isStill(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(STILL_QUERY).matches
}
