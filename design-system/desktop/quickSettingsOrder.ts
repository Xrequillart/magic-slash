// Imports nothing, so the root test suite can load it (see `avatarSizes`, `palette`).

/**
 * `ids` with `id` placed BEFORE index `at` of the list as it is drawn (`ids.length` is
 * last): moved when it is already in it, added when it is not. Pure, and a module of its own, for the tests.
 *
 * Removing the tile first shifts every index after it by one, so an insertion point
 * measured on the list WITH it is corrected: without that, a tile dragged one place to
 * the right would not move.
 */
export function placeQuickSetting(ids: string[], id: string, at: number): string[] {
  const from = ids.indexOf(id)
  const without = ids.filter((x) => x !== id)
  const target = from !== -1 && from < at ? at - 1 : at
  without.splice(Math.max(0, Math.min(target, without.length)), 0, id)
  return without
}
