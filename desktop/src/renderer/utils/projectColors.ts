// Palette de couleurs distinctes pour les projets
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

// Génère une couleur stable basée sur l'index du projet
export function getProjectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]
}

// Map des couleurs par projet (pour cohérence)
// Utilise la couleur configurée si disponible, sinon fallback automatique
export function getProjectColorMap(
  projectNames: string[],
  config?: Record<string, { color?: string }>
): Record<string, string> {
  return projectNames.reduce((acc, name, index) => {
    acc[name] = config?.[name]?.color || PROJECT_COLORS[index % PROJECT_COLORS.length]
    return acc
  }, {} as Record<string, string>)
}

/**
 * The key `getProjectColorMap` knows a cloud repository by: its entry in
 * `Config.repositories`, found by the `id` that entry carries.
 *
 * WHY A LOOKUP AND NOT THE NAME. The map above is keyed by CONFIG KEY, and a repository's
 * name is unique only within one scope: two organizations may each have an `api`, in
 * which case the second one's key carries an org suffix (`api (Acme)`) while its cloud
 * name stays `api` — see `RepositoryConfig.name`. Anything that reads a name off the
 * cloud and hands it straight to the colour map therefore collides on exactly those
 * pairs, and the two repositories borrow each other's colour. The cloud `id` is a uuid
 * and does not collide, and the local entry records it, so the id is the identity to
 * match on and the key is what comes back.
 *
 * UNDEFINED IS A REAL ANSWER, not a failure: the repository is simply not in this
 * machine's config. That is routine on the Plans page, which lists an organization's
 * sessions including ones on repositories the reader has never cloned. The caller draws
 * the neutral mark for it, which is what an uncoloured repository should look like.
 */
export function configKeyForRepoId(
  repoId: string | undefined,
  repositories?: Record<string, { id?: string }>,
): string | undefined {
  if (!repoId || !repositories) return undefined
  return Object.keys(repositories).find((key) => repositories[key].id === repoId)
}

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
