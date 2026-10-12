import {
  Claude, Figma, Github, GoogleDocs, GoogleSheets, GoogleSlides, Link2, Loom, Miro, Notion,
} from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop'
import type { LinkKind } from '../../utils/externalLinks'

/**
 * The mark each tool is drawn with. Brand marks where the design system has one.
 *
 * Shared by the links section and the plan's history, so a Figma file pinned to the plan
 * and the same file in the timeline wear the same mark.
 */
export const LINK_ICONS: Record<LinkKind, IconComponent> = {
  figma: Figma,
  figjam: Figma,
  notion: Notion,
  claude_artifact: Claude,
  google_docs: GoogleDocs,
  google_sheets: GoogleSheets,
  google_slides: GoogleSlides,
  miro: Miro,
  loom: Loom,
  github: Github,
  other: Link2,
}
