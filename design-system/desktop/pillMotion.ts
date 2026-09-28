/**
 * How a pill travels, shared by the two components that move one: `TabStrip`'s active
 * background and `Switch`'s knob.
 *
 * ITS TWO EDGES LEAVE AT DIFFERENT TIMES. A pill that only translates is at its
 * destination without ever having crossed anything: the eye reads two positions, not a
 * path. So the edge in front goes first and the one behind follows a beat later, and the
 * pill is longer than it is at rest for most of the move — the distance is drawn rather
 * than jumped. `TabStrip`'s header comment has the full argument.
 *
 * ONE MODULE AND NOT TWO COPIES, because the two are one gesture: a switch that
 * travelled on a different curve from the tab row above it would read as two
 * controls that disagree about how things move.
 */

/**
 * The edge in front. Symmetric, so its progress reads as even and lands without drama.
 */
export const LEAD_EASE = 'cubic-bezier(.4, 0, .2, 1)'

/**
 * The edge behind. It passes its mark by a hair and settles: an edge on `ease-out`
 * decelerates into its stop and reads as SLID, one that overshoots reads as THROWN.
 * Only the edge behind, because it is the last to arrive — its overshoot happens inside
 * the pill's destination, where nothing can poke out of the track.
 */
export const TRAIL_EASE = 'cubic-bezier(.32, 1.4, .55, 1)'

/**
 * The transition for a move, with the delay on whichever edge is behind.
 *
 * `'right'` means the pill is travelling RIGHTWARDS, so the right edge leads and the left
 * one is late. Written as one shorthand because the pairing is the point: each edge
 * carries its own duration, curve and delay.
 */
export function pillTransition(
  leading: 'left' | 'right',
  travelMs: number,
  trailDelayMs: number,
): string {
  const lead = `${leading} ${travelMs}ms ${LEAD_EASE}`
  const trail = `${leading === 'right' ? 'left' : 'right'} ${travelMs}ms ${TRAIL_EASE} ${trailDelayMs}ms`
  return `${lead}, ${trail}`
}
