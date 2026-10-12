import { PROJECT_COLORS } from '@ds/desktop/palette'

/**
 * How a repository's colour is CHOSEN. The colours themselves moved into
 * `design-system/desktop/palette.ts` — a palette is design system material, and the
 * design-system page had no way to draw a swatch of a value it could not read.
 *
 * What stays here is the part that is genuinely this app's: the fallback assigned by
 * index, the map built from a config, and the lookup that tells two repositories of the
 * same name apart. None of that is a design decision.
 */

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
