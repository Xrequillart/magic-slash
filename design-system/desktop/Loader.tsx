import { useInsertionEffect } from "react";
import type { CSSProperties } from "react";
import { Loader2 } from "./icons";

/**
 * "Something is happening." Two shapes, one scale, one component.
 *
 * The app drew this thirty-five times and agreed on nothing. Three bars with a wave
 * through them lived in `components/WaveLoader.tsx` with its keyframes in the
 * renderer's `index.css`; a spinning arc was `<Loader2 className="animate-spin" />`
 * spelled out at four different sizes in thirty places; and four screens rolled
 * their OWN ring out of a border — one of which, the app's first loading screen, was
 * INVISIBLE. `border-3` is not a Tailwind class and never was, so preflight's
 * `border-width: 0` stood: a coloured top edge on a ring with no thickness.
 *
 * That bug is the argument for this file. Nobody mistyped anything — `border-3`
 * looks exactly like a class that should exist, and the only thing that would have
 * caught it is the ring being drawn in one place instead of four.
 *
 * WHICH SHAPE MEANS WHAT. `wave` is an agent at work: it has no end and nothing is
 * waiting on you, which is why it reads as activity rather than as progress. `spin`
 * is an action YOU started and are waiting on — a button you pressed, a page
 * fetching. Both are indeterminate; the difference is whose turn it is.
 *
 * COLOURLESS BY DEFAULT. The bars and the arc are `currentColor`, so whatever wraps
 * this decides — in the sidebar that is the agent's own state colour, which the old
 * hardcoded-accent ring ignored. `tone` exists for the two cases with nothing
 * around them to inherit from.
 */

/** The rungs, matching `Icon`'s, plus the one above them. */
export type LoaderSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

/**
 * Sizes in PIXELS, not in Tailwind classes, and this is the one place in the folder
 * that does it.
 *
 * The wave is three bars whose widths, gaps, radii and two rest heights are all
 * fractions of the box (see `LOADER_CSS`). Tailwind can state the box but not the
 * six things derived from it, so the box has to reach the CSS as a number either
 * way. Sizing the arc from the same number rather than from a `w-4 h-4` table keeps
 * the two variants swappable at a call site without the row moving — which is the
 * whole reason they share a component.
 *
 * `2xl` is not in `Icon`'s scale on purpose: 32px is past the size anything sits in
 * a line of text at. It is here because a loader legitimately owns a whole screen
 * sometimes — the app's connect gate and its first paint — and that is the size
 * both already used.
 */
const LOADER_PX: Record<LoaderSize, number> = {
  xs: 12,
  sm: 14,
  /** The default, and the sidebar's: the size of the ring the wave replaced. */
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
};

export type LoaderVariant = "wave" | "spin";

/**
 * `inherit` is the default and the common case — see the note above. The other two
 * are for a loader alone on a ground: `accent` when it is the only thing on screen,
 * `muted` when it sits in a row that is already saying something.
 */
export type LoaderTone = "inherit" | "accent" | "muted";

const TONES: Record<LoaderTone, string> = {
  inherit: "",
  accent: "text-accent",
  muted: "text-text-secondary",
};

/**
 * The keyframes, and the geometry that cannot be a class.
 *
 * THE NUMBERS ARE TUNED, not rounded to something tidy. The bars keep their ORDER
 * through the whole cycle: the 6/13px rest heights and the 0.15s offsets are picked
 * so the middle bar is still tallest at the worst instant of the loop — 7.7px
 * against 5.3px, at t=0.655s, its own trough meeting a neighbour's rise. Sides of
 * 7px against a middle of 12px animate the same way and close that gap to 0.9px; a
 * silhouette that flattens twice a second stops reading as one shape.
 *
 * They survive resizing because every one of them is a FRACTION of the box rather
 * than a pixel count: 0.375 and 0.8125 are 6 and 13 at the original 16px, and the
 * ratio is what the tuning actually depends on. The marketing site had already
 * proved that by hand, redrawing the same loader at 13px.
 *
 * Bars SCALE rather than change height, which keeps the animation off the layout
 * path — and it is what makes the reduced-motion rule below land somewhere sensible:
 * an untransformed bar is its rest height, so the loader stops as three bars rather
 * than as a blank.
 */
const LOADER_CSS = `
.ds-loader-wave {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--ds-loader) * 0.125);
  width: var(--ds-loader);
  height: var(--ds-loader);
}
.ds-loader-wave > span {
  width: calc(var(--ds-loader) * 0.125);
  height: calc(var(--ds-loader) * 0.375);
  border-radius: calc(var(--ds-loader) * 0.0625);
  background: currentColor;
  animation: ds-loader-wave 1.2s ease-in-out infinite;
}
.ds-loader-wave > span:nth-child(2) {
  height: calc(var(--ds-loader) * 0.8125);
  animation-delay: 0.15s;
}
.ds-loader-wave > span:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes ds-loader-wave {
  0%, 100% { transform: scaleY(1); }
  35% { transform: scaleY(0.55); }
  70% { transform: scaleY(1.1); }
}
.ds-loader-spin {
  width: var(--ds-loader);
  height: var(--ds-loader);
}
@media (prefers-reduced-motion: reduce) {
  .ds-loader-wave > span,
  .ds-loader-spin {
    animation: none;
  }
}
`;

const STYLE_ID = "ds-loader-styles";

/**
 * The stylesheet, put in the document once, by whichever loader renders first.
 *
 * This folder has no CSS file and gains nothing by growing one: a fourth thing to
 * wire per app, after the alias, the Tailwind glob and the tsconfig paths — and
 * Next is particular about CSS imported from outside its root. A component that
 * carries its own keyframes needs no wiring at all, which is the same bargain the
 * README strikes everywhere else here.
 *
 * `useInsertionEffect` is the hook meant for exactly this, and it is the reason the
 * rules land before anything reads a layout. It does not run on the server, so a
 * prerendered page ships the markup and picks the animation up at hydration.
 *
 * KEYED ON THE DOM, not on a module flag. A flag desynchronises the first time a
 * hot reload swaps the module out from under a live document, and the lookup is one
 * `getElementById` per mount.
 *
 * The rules are appended to `head`, so they come after Tailwind's and win the size
 * against a `w-4` somebody passes in `className` — same outcome as `Icon`'s rule
 * that a size does not belong there, reached without needing anyone to read it.
 */
function useLoaderStyles() {
  useInsertionEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = LOADER_CSS;
    document.head.appendChild(style);
  }, []);
}

export interface LoaderProps {
  /** `wave` for an agent at work, `spin` for something you are waiting on. */
  variant?: LoaderVariant;
  size?: LoaderSize;
  tone?: LoaderTone;
  /**
   * What is loading, for a screen reader. Without it the loader is DECORATIVE, which
   * is the right answer for the common case: it sits beside a row that already says
   * what is going on in words, and a second voice reading "loading" adds nothing.
   *
   * Pass it when the loader is alone on a ground — a gate, a first paint, an empty
   * panel — where it is the only thing saying anything at all.
   */
  label?: string;
  /** Layout and colour — `flex-shrink-0`, a margin, a tone class. Not a size. */
  className?: string;
}

export function Loader({
  variant = "wave",
  size = "md",
  tone = "inherit",
  label,
  className = "",
}: LoaderProps) {
  useLoaderStyles();

  const style = { "--ds-loader": `${LOADER_PX[size]}px` } as CSSProperties;
  const a11y = label
    ? { role: "status" as const, "aria-label": label }
    : { "aria-hidden": true };
  const classes = `${TONES[tone]} ${className}`.trim();

  if (variant === "spin") {
    return (
      <Loader2
        className={`ds-loader-spin animate-spin ${classes}`.trim()}
        style={style}
        {...a11y}
      />
    );
  }

  // Three children and not one: the shape IS three bars, and three empty spans
  // repeated at a call site is the markup that gets one dropped in a hurry and
  // animates wrong ever after.
  return (
    <span
      className={`ds-loader-wave ${classes}`.trim()}
      style={style}
      {...a11y}
    >
      <span />
      <span />
      <span />
    </span>
  );
}
