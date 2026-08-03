/**
 * The icons the public site needs that `lucide-react` does not ship.
 *
 * lucide dropped its brand glyphs at v1 (trademark reasons), so the GitHub mark the
 * footer and the nav link with has no export to import. It is drawn here with the
 * geometry `docs/` already used — the Feather icon, MIT-licensed, same 24×24 grid and
 * same 2px round stroke as every lucide icon next to it, so the row stays optically
 * even.
 *
 * Keep this file for GLYPHS ONLY. Anything lucide has, import from lucide.
 */

/** GitHub's mark, at the same weight as the lucide icons it sits beside. */
export function GithubIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  )
}
