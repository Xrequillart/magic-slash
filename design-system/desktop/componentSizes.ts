/**
 * `2xs` `xs` `sm` `md` `lg` `xl` `2xl` — the seven rungs EVERY sized component wears.
 *
 * ONE VOCABULARY. Before this, the folder had six different scales: `Label`, `Status`,
 * `Switch`, `CheckList` and `Tally` had three rungs, `Avatar` and `ButtonIcon` four,
 * `Icon` five, `Loader` six, `Text` seven under a seventh name (`base`, now `md`), and
 * `ProgressBar` three that started at a different end. Each was defensible on its own
 * and the set was not: `md` was a real size on five components, absent on four, and
 * the LARGEST available on one. A caller moving between them had to relearn the ladder
 * every time.
 *
 * NOTHING ON SCREEN MOVED. Every rung that already existed kept its exact geometry,
 * every default is the one it was, and the only rename was `Text`'s `base` to `md`,
 * which no call site used. The new rungs are ADDITIONS — the point of them is that a
 * size can now be changed at a call site in one word instead of being a reason to go
 * and edit the component.
 *
 * WHAT THE RUNGS MEAN, in the terms `Label` set:
 *
 *  - `2xs` `xs` are BELOW A ROW — a mark inside a chip, detail under a label, a
 *    control nested in something that already has a plate.
 *  - `sm` is a LIST ROW: 12px type around it, the component the tallest thing on the
 *    line. It is the default nearly everywhere, because it is what the app draws.
 *  - `md` is a row of 14px type; `lg` stands beside a heading.
 *  - `xl` `2xl` are ABOVE A HEADING — an empty state, a dialog, a first paint. The
 *    app has almost nothing here yet, and that is fine: an unused rung costs a line
 *    in a table, where a missing one costs an edit to the component.
 *
 * THE LADDER IS NOT ONE SET OF PIXELS. What each rung resolves to is the component's
 * own business, and it has to be: the CONTROLS stand on 16/20/24/28/32/36/40, `Text`
 * on 10/12/14/16/18/20/24, `Icon` on 10/12/14/16/20/24/28, `Avatar` on its own
 * because a face is not a glyph, and `ProgressBar` on hairlines. A shared table of
 * boxes would be the design system claiming a 24px plate and a 14px tick are the same
 * drawing. What is shared is the NAME and the ORDER — which is the whole of what a
 * caller needs.
 *
 * SOME RUNGS ARE AVAILABLE AND DECONSEILLED, and each says so where it lives: a 16px
 * `Switch` is a target too small for a control whose job is being hit, a `2xs` avatar
 * cannot hold an initial. They are reachable because a closed record with a hole in it
 * is a component you have to edit to try something, and unreachable-by-design is a
 * decision that belongs in a comment rather than in a compile error.
 */
export type ComponentSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/**
 * The rungs in order, for a showcase that draws all seven and for a `map` that must
 * not silently skip the one added later.
 */
export const COMPONENT_SIZES: readonly ComponentSize[] = [
  '2xs',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
]
