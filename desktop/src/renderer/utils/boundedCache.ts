/**
 * Keeping a `Map` used as an LRU inside a size budget rather than an entry count.
 *
 * Written for the file-preview read cache, where counting entries is the wrong unit by
 * a wide margin. One entry holds a file's whole content PLUS two highlighted renderings
 * of it, each capped at 10 MB on its own — so ten entries is anywhere between a few
 * kilobytes and a few hundred megabytes, and the count says nothing about which. The
 * review drawer is what makes that concrete: it reads every changed file of a
 * repository, so the cache now fills in one go instead of a file at a time.
 *
 * A plain `Map` is the LRU: insertion order is its own iteration order, and the reader
 * keeps recency honest by deleting a key before re-setting it. So the oldest entry is
 * always the first one iteration yields, and eviction is a walk from the front.
 */

/**
 * Drop the oldest entries until the total is inside `budget`.
 *
 * The LAST entry is never evicted, whatever it measures. A single file bigger than the
 * whole budget would otherwise be dropped by the very call that cached it, and every
 * remount would re-read it — the one case where a cache must not be empty is right
 * after something was put in it. Holding one oversized entry until the next read
 * displaces it is the cheaper mistake.
 *
 * Mutates the map in place, because that is what the caller holds — it is a module
 * singleton shared by every mounted renderer, and handing back a copy would leave every
 * existing reference pointing at the unevicted one. Returns the total that remains, so
 * a caller can log or assert on it without walking the entries again.
 */
export function evictToBudget<K, V>(entries: Map<K, V>, sizeOf: (value: V) => number, budget: number): number {
  let total = 0
  for (const value of entries.values()) total += sizeOf(value)

  // `entries.size > 1` rather than `> 0`: see above. A budget of zero or less still
  // leaves exactly one entry standing, which is the same rule and not a special case.
  for (const [key, value] of entries) {
    if (total <= budget || entries.size <= 1) break
    entries.delete(key)
    total -= sizeOf(value)
  }

  return total
}
