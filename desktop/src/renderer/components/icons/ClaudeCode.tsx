import { useId, type CSSProperties } from 'react'

/**
 * Claude Code's brand colour, and the ground a chip wearing its name sits on.
 *
 * HEX AND RGBA, never tokens, for `TrackerBadge`'s reason word for word: this is
 * somebody else's brand colour, and a coral in the design system's palette would be
 * the app claiming it — and would drift the day the palette is retuned. 14% is the
 * same tint Jira's badge uses, so the two read as one family of connector chips.
 *
 * Here rather than in either sidebar because BOTH now name Claude Code: the agent
 * context card on the right, and the account usage card on the left.
 */
export const CLAUDE_CORAL = '#D97757'
export const CLAUDE_CHIP_GROUND = 'rgba(217, 119, 87, 0.14)'

/**
 * Claude Code's mark: the pixel robot, in `currentColor`.
 *
 * TRACED FROM `webapp/public/img/claudecode-color.png`, on the 16-unit grid the site
 * already reads it off (`HeroSection.tsx` states the same numbers) — body 2→14 across
 * and 3.25→11.25 down, arms the full width at 7.25→9.25, four legs one unit wide at 3,
 * 5, 10 and 12, eyes one unit wide at 4 and 11 from 5.4 to 7.3. Vector and not the
 * bitmap because this one is 14px in a sidebar chip, where a 640px PNG scaled down
 * loses the hard pixel edges that are the whole character of the mark;
 * `shapeRendering="crispEdges"` keeps them at any size.
 *
 * THE EYES ARE HOLES, knocked out with a mask, exactly as `GithubMark` does its disc:
 * the chip's ground is translucent, so eyes painted in a flat colour would be two
 * light rectangles floating over whatever is behind the card. Punched out, they show
 * the ground itself.
 *
 * `useId` for `JiraMark`'s reason: `url(#id)` resolves against the whole document, so
 * a fixed id breaks the moment two of these are on screen and the first unmounts.
 *
 * `currentColor` and not the coral: the caller owns the colour, the way it does for
 * `GitHubIcon`. Claude Code's own is `#D97757` — see `UsageCard`, which passes it as an
 * inline `style` rather than a class, because a brand hex has no business becoming a
 * token in this app's palette.
 */
export const ClaudeCodeIcon = ({ className, style }: { className?: string; style?: CSSProperties }) => {
  const maskId = useId()

  return (
    <svg viewBox="0 0 16 16" className={className} style={style} shapeRendering="crispEdges" aria-hidden="true">
      <mask id={maskId}>
        <g fill="#fff">
          <rect x="2" y="3.25" width="12" height="8" />
          <rect x="0" y="7.25" width="16" height="2" />
          <rect x="3" y="11.25" width="1" height="2" />
          <rect x="5" y="11.25" width="1" height="2" />
          <rect x="10" y="11.25" width="1" height="2" />
          <rect x="12" y="11.25" width="1" height="2" />
        </g>
        <g fill="#000">
          <rect x="4" y="5.4" width="1" height="1.9" />
          <rect x="11" y="5.4" width="1" height="1.9" />
        </g>
      </mask>
      <rect width="16" height="16" fill="currentColor" mask={`url(#${maskId})`} />
    </svg>
  )
}
