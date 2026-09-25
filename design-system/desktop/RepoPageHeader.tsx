import { ButtonIcon } from './ButtonIcon'
import { ArrowLeft, FolderGit2 } from './icons'
import { Text, TEXT_FACE } from './Text'

/**
 * THE TOP OF ONE REPOSITORY'S SETTINGS PAGE: the way back, the repository's tile at
 * page-title scale, its name, and one line under them.
 *
 * IT WAS SPELLED BY HAND IN `pages/Config/RepoPage.tsx`, the last hand-drawn band of a
 * page otherwise made of `SettingsCard`s, and it moved here so the site can draw the same
 * page: `/features` shows this screen twice, and a header re-spelled there is a header
 * that drifts.
 *
 * THE TILE is the one the list, the rail and the agent sidebar draw a repository with —
 * its colour at 12% behind a folder — at 40px.
 */
export interface RepoPageHeaderProps {
  name: string
  /** The repository's colour, a CSS value (hex: the tile appends its own alpha). */
  color: string
  /** The line under the name, already translated. */
  subtitle: string
  /** The back button's name. */
  backLabel: string
  onBack: () => void
  className?: string
}

export function RepoPageHeader({ name, color, subtitle, backLabel, onBack, className = '' }: RepoPageHeaderProps) {
  return (
    <div className={`mb-8 flex flex-col gap-2 ${className}`.trim()}>
      <div className="flex items-center gap-3">
        <ButtonIcon icon={ArrowLeft} tone="ghost" title={backLabel} onClick={onBack} />
        <span
          className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <FolderGit2 className="w-5 h-5" />
        </span>
        {/* The one raw heading, and it stays one: `Text` renders a `<span>`, and a
            repository's name is this document's `h1`. The FACE is the design system's —
            `font-sans` resolves to a different family in the webapp. */}
        <h1 className={`${TEXT_FACE} text-2xl font-bold text-ink`}>{name}</h1>
      </div>
      <Text size="sm" tone="secondary">
        {subtitle}
      </Text>
    </div>
  )
}
