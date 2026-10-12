// Imports nothing, so the root test suite can load it (see `avatarSizes`, `palette`).

/**
 * How a stack of `max` slots splits `people`: the ones drawn, and the ones the `+N` chip
 * stands for.
 *
 * THE CHIP TAKES A SLOT OF ITS OWN. Five people in a stack of four draw three faces and
 * `+2`, not four faces and `+1`: the stack's width is what `max` promises the row it sits
 * in, and a chip that appeared beside a full stack would break the promise exactly when the
 * row is busiest. So nobody is ever hidden behind a `+1` that could have been their face:
 * at exactly `max` people, every one of them is drawn.
 *
 * `max` below 1 is read as 1, where the stack is the chip alone (or the one face). Pure,
 * and a module of its own, for the tests.
 */
export function splitAvatarStack<T>(people: readonly T[], max: number): { shown: T[]; rest: T[] } {
  const slots = Math.max(1, Math.floor(max))
  const cut = people.length <= slots ? people.length : slots - 1
  return { shown: people.slice(0, cut), rest: people.slice(cut) }
}
