/**
 * The "something is running" indicator: three parallel bars, the middle one tallest,
 * with a wave travelling across them.
 *
 * A component rather than a bare `<span className="loader-wave" />` because the shape
 * needs three children, and three empty spans repeated at each call site is the kind of
 * markup that gets one bar dropped in a hurry and animates wrong ever after. The styling
 * lives in index.css, next to the keyframes.
 *
 * Colourless on purpose — the bars are `currentColor`, so whatever wraps this decides.
 * In the sidebar that is the agent's own state colour.
 *
 * Decorative: the row it sits in already says what is going on in words.
 */
export function WaveLoader({ className = '' }: { className?: string }) {
  return (
    <span className={`loader-wave ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}
