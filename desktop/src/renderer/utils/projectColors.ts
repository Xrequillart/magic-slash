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
