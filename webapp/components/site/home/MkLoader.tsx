/**
 * The mockup's "agent at work" indicator — the app's own `WaveLoader`, in the
 * illustration's palette and scale.
 *
 * A component for the same reason the app has one: the shape needs three children, and
 * three empty spans copied into two mockups is how one of them ends up with two bars.
 * The styling is `.mk-loader` in marketing.css, with the rest of the illustration.
 *
 * `rest` carries the animation driver's hooks — `AppMockup` toggles `is-out` on this
 * element through `data-mk="agent-loader"`, while the tilted sidebar in ④ renders it
 * plain and lets it run.
 */
export function MkLoader({ className = '', ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`mk-loader ${className}`} {...rest}>
      <span />
      <span />
      <span />
    </span>
  )
}
