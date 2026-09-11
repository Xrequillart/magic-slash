import { FolderGit2 } from 'lucide-react'
import { useStore } from '../../store'
import { getProjectColorMap } from '../../utils/projectColors'

/**
 * The repository tile that sits next to a repository name in the info sidebar.
 *
 * The webapp's repository tile at sidebar scale: the colour the repo was given in
 * Settings tints the glyph and its backdrop rather than standing alone as a dot.
 *
 * Shared because several surfaces name a repository: RepositoryCard for an implementation
 * agent, SpecPanel for a planning one — which has no repository cards at all, so its
 * heading is the only place the repo appears — and a row of the Plans list. Extracted
 * rather than copied so they cannot drift into different marks for the same thing; a
 * planner and a coder
 * pointed at the same repo must show the same colour, because that colour is how the
 * user recognises the repo across Plans, Tasks and the sidebar.
 */
/**
 * The two scales the mark is drawn at, and why there are exactly two.
 *
 * `card` is the original: a 24 px tile standing beside a repository NAME that is the
 * heading of its own block, in the info sidebar. `inline` is what the Plans list needed
 * — the mark sits inside a `text-xs` metadata line, on the same row as a 14 px author
 * photo, so the 24 px tile made the line half again as tall and turned two marks for two
 * identities into one large one and one small. Matching the avatar is the point: they are
 * read as a pair.
 *
 * A table rather than a free `className` prop, for the reason `accountAvatarSize.ts`
 * gives about its own variants: the glyph has to shrink WITH the box, so the two numbers
 * are one decision and a caller passing only the outer size would get a tile with an
 * oversized folder in it.
 */
const REPO_MARK_SIZES = Object.freeze({
  card: Object.freeze({ box: 'w-6 h-6 rounded-lg', glyph: 'w-3.5 h-3.5' }),
  inline: Object.freeze({ box: 'w-3.5 h-3.5 rounded', glyph: 'w-2.5 h-2.5' }),
})

export type RepoMarkSize = keyof typeof REPO_MARK_SIZES

export function RepoMark({ repoName, size = 'card' }: { repoName: string; size?: RepoMarkSize }) {
  const { box, glyph } = REPO_MARK_SIZES[size]
  const repositories = useStore(s => s.config?.repositories)
  /* Built over the FULL repository list, never a subset of it: getProjectColorMap
     falls back to the palette BY INDEX, so a map built from just the repos on screen
     would hand an uncoloured repo a different colour here than the dots elsewhere
     give it. This is the same call RepositoryCard makes, for the same reason. */
  const repoColor = getProjectColorMap(Object.keys(repositories ?? {}), repositories)[repoName]

  /* UNDEFINED IS A REAL CASE, not a defensive nicety: the map is keyed by the names in
     the reader's LOCAL config, and the Plans list names organization repositories that a
     given machine may never have cloned — nothing there to give one a colour, by index or
     otherwise. Without this the template below produced `backgroundColor: "undefined1f"`,
     which the browser drops, leaving a glyph on nothing.

     The fallback is the palette's own muted pair rather than a ninth project colour: a
     repo with no colour must not LOOK like a repo that was given one, or the mark stops
     being the thing the user recognises a repo by. Classes and not an inline style, so
     the neutral state follows the theme like every other muted glyph. */
  const uncoloured = !repoColor

  return (
    <span
      className={`flex items-center justify-center flex-shrink-0 ${box} ${
        uncoloured ? 'bg-surface-subtle text-icon-muted' : ''
      }`}
      style={uncoloured ? undefined : { backgroundColor: `${repoColor}1f`, color: repoColor }}
    >
      <FolderGit2 className={glyph} />
    </span>
  )
}
