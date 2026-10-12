/**
 * The colours a repository can wear, and the ones it is given when it chooses none.
 *
 * PALETTE MATERIAL, which is why it lives here and not in the app: these are values a
 * design system is supposed to own, and the design-system page cannot draw a swatch of
 * a colour it has no way to read. The app keeps the LOGIC that hands them out —
 * `getProjectColor`, `getProjectColorMap`, `configKeyForRepoId` — in
 * `desktop/src/renderer/utils/projectColors.ts`, which imports this file.
 *
 * A MODULE THAT IMPORTS NOTHING, for `avatarSizes.ts`'s reason: the root Vitest suite
 * runs on the ROOT `node_modules`, where React does not exist, so anything importing
 * React is unreachable from it. Keeping the palette pure is what keeps
 * `projectColors.test.ts` able to assert against it.
 *
 * THE ONE THING THESE ARE NOT is theme tokens. A repository's colour is chosen by a
 * person and stored in their config; it does not change with the theme and never
 * becomes a `--c-*` variable. That is why they are hexes here and classes nowhere.
 */

export const PROJECT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  // Appended, never inserted: the eight above are also the fallback assigned BY
  // INDEX to repos with no colour of their own, so reordering them would repaint
  // every unconfigured repo in the app at once.
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#84CC16', // lime
  '#EAB308', // yellow
  '#F43F5E', // rose
  '#D946EF', // fuchsia
  '#0EA5E9', // sky
  '#64748B', // slate
]

/**
 * The colours offered in the picker — a superset of the fallback palette above,
 * and a different job from it.
 *
 * PROJECT_COLORS has to stay short and stay put: it is handed out BY INDEX to
 * repos that never chose a colour, so every entry is a promise about what an
 * unconfigured repo already looks like elsewhere in the app. This list has no
 * such duty. Nothing is assigned from it, so it can be as long as the grid can
 * hold and be reordered whenever the grid wants reordering.
 *
 * Eighteen hue families in spectrum order, each in a vivid and a deep tone —
 * which is what makes the two halves of the grid read as two rows of the same
 * rainbow rather than thirty-six unrelated dots. Every PROJECT_COLORS entry is
 * one of the vivid eighteen (projectColors.test.ts holds that), so a repo left
 * on its fallback colour still finds that colour selected when it opens the
 * picker.
 *
 * The deep tone is genuinely darker rather than one Tailwind step down, because
 * a shade nobody can tell from its neighbour is not a choice. It looks dimmer on
 * the dark theme than the vivid one does, and that is the point of having it —
 * the grid shows each colour in the very tile it is picking, so what you see in
 * the modal is what the repo wears afterwards.
 */
export const REPO_COLOR_CHOICES = [
  // Vivid
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#EAB308', // yellow
  '#84CC16', // lime
  '#22C55E', // green
  '#10B981', // emerald
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#D946EF', // fuchsia
  '#EC4899', // pink
  '#F43F5E', // rose
  '#64748B', // slate
  // Deep
  '#B91C1C', // red
  '#C2410C', // orange
  '#B45309', // amber
  '#A16207', // yellow
  '#4D7C0F', // lime
  '#15803D', // green
  '#047857', // emerald
  '#0F766E', // teal
  '#0E7490', // cyan
  '#0369A1', // sky
  '#1D4ED8', // blue
  '#4338CA', // indigo
  '#6D28D9', // violet
  '#7E22CE', // purple
  '#A21CAF', // fuchsia
  '#BE185D', // pink
  '#BE123C', // rose
  '#334155', // slate
]

/**
 * The six colours the closed row offers without opening anything.
 *
 * The head of the grid, in the grid's own order — not a set picked for the row.
 * The row and the modal show the same palette starting at the same place, so the
 * six tiles are the modal's first line brought forward rather than a second,
 * shorter palette the user has to reconcile with the long one.
 *
 * Six because that is the grid's row width: open the modal from a quick pick and
 * the tile you just chose is the one directly above, in the same column.
 */
export const REPO_QUICK_COLORS = REPO_COLOR_CHOICES.slice(0, 6)

/**
 * The grounds a CUSTOM step's card can wear on the workflow canvas, tinted over the
 * card's own opaque ground.
 *
 * NO NEUTRAL IN IT, on purpose: the built-in steps wear the plain ground, and a custom
 * step that could too would stop reading as one. Slate is left out for the same reason.
 *
 * Twenty-two: eleven hues of `REPO_COLOR_CHOICES`, spectrum order, each in its vivid and
 * its deep tone, so a picker eleven wide shows the two tones of a hue one above the
 * other, the way the repository colour grid does.
 */
export const WORKFLOW_STEP_COLORS = [
  // Vivid
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#84CC16', // lime
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#A855F7', // purple
  '#EC4899', // pink
  // Deep
  '#B91C1C', // red
  '#C2410C', // orange
  '#A16207', // yellow
  '#4D7C0F', // lime
  '#047857', // emerald
  '#0E7490', // cyan
  '#0369A1', // sky
  '#1D4ED8', // blue
  '#4338CA', // indigo
  '#7E22CE', // purple
  '#BE185D', // pink
]

/**
 * The ground a custom step wears: its own when it is one of `WORKFLOW_STEP_COLORS`,
 * otherwise one handed out by its place among the custom steps (a step saved before
 * steps had colours, or a colour hand-written outside the palette). Never none.
 */
export function workflowStepColor(stored: string | undefined, index: number): string {
  const own = stored?.toUpperCase()
  if (own && WORKFLOW_STEP_COLORS.includes(own)) return own
  return WORKFLOW_STEP_COLORS[index % WORKFLOW_STEP_COLORS.length]
}

/** A new step's ground: the first colour no other custom step wears, or the next in turn. */
export function nextWorkflowStepColor(taken: readonly string[]): string {
  const used = new Set(taken.map((color) => color.toUpperCase()))
  return WORKFLOW_STEP_COLORS.find((color) => !used.has(color))
    ?? WORKFLOW_STEP_COLORS[taken.length % WORKFLOW_STEP_COLORS.length]
}
