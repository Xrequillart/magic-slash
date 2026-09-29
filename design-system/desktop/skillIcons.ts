import {
  CircleCheck, ClipboardList, GitCommitHorizontal, GitPullRequest, MessageSquare, Play, ScanSearch, Sparkles,
} from './icons'
import type { IconComponent } from './types'

/**
 * THE GLYPH EACH SKILL WEARS on the workflow canvas, by skill folder name.
 *
 * The one table: the repository settings' skill tabs (`RepoPage`) read their glyphs
 * from it too, so a node on the canvas and the tab that configures its skill cannot
 * drift apart. Start and Done have no tab and are here for the canvas alone.
 *
 * Keyed by the FOLDER (`magic-review`) and not by node id, because a node's id is the
 * flow's business and can be anything; the skill it runs is what the glyph describes.
 * A skill this table does not know (a custom one) gets `Sparkles` rather than
 * nothing, so a card never opens on an empty tile.
 */
const SKILL_ICONS: Record<string, IconComponent> = {
  'magic-plan': ClipboardList,
  'magic-start': Play,
  'magic-commit': GitCommitHorizontal,
  'magic-pr': GitPullRequest,
  'magic-review': ScanSearch,
  'magic-resolve': MessageSquare,
  'magic-done': CircleCheck,
}

export function skillIcon(skill: string): IconComponent {
  return SKILL_ICONS[skill] ?? Sparkles
}
