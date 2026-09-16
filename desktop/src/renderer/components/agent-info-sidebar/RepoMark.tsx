import { useMemo } from 'react'
import { FolderGit2 } from '@ds/desktop/icons'
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
 * A table rather than a free `className` prop, for the reason `avatarSizes.ts` gives
 * about its own rungs: the glyph has to shrink WITH the box, so the two numbers are one
 * decision and a caller passing only the outer size would get a tile with an oversized
 * folder in it.
 */
const REPO_MARK_SIZES = Object.freeze({
  card: Object.freeze({ box: 'w-6 h-6 rounded-lg', glyph: 'w-3.5 h-3.5' }),
  inline: Object.freeze({ box: 'w-3.5 h-3.5 rounded', glyph: 'w-2.5 h-2.5' }),
})

export type RepoMarkSize = keyof typeof REPO_MARK_SIZES

/**
 * `repoName` is the KEY the repository has in `Config.repositories`, which is what the
 * colour map is keyed by — not whatever a surface happens to display. The two are the
 * same string for a repository whose name is unique across the user's scopes, and they
 * differ for one that is not (`api` vs `api (Acme)`), so a caller holding a cloud name
 * must resolve it first: `configKeyForRepoId` in `utils/projectColors.ts`.
 *
 * It is OPTIONAL because that resolution can legitimately come back empty — a repository
 * listed from an organization that this machine has no local entry for. Undefined draws
 * the neutral mark, the same one an entry with no colour gets, which is the honest look
 * for a repository this app knows no colour for.
 */
/**
 * The colour this repository wears everywhere, or undefined when it has none.
 *
 * Built over the FULL repository list, never a subset of it: `getProjectColorMap`
 * falls back to the palette BY INDEX, so a map built from just the repos on screen
 * would hand an uncoloured repo a different colour here than the dots elsewhere give
 * it. This is the same call `RepositoryCard` makes, for the same reason.
 *
 * Shared by the mark and the name badge below so the two cannot resolve the same repo
 * to two different colours — they are drawn side by side, and now inside one another.
 */
/**
 * EVERY repository's colour at once, by name.
 *
 * THE PLURAL IS THE USABLE ONE and the singular below is now a thin read of it. A hook
 * cannot be called inside a `.map()`, so as long as the only way to get a colour was one
 * call per repository, the repository cards had to be a component per row — and that
 * component was the last thing standing between `SidebarAgentCoderInfo` and owning the
 * arrangement of its own cards. The map was always built whole anyway: `getProjectColorMap`
 * takes the entire config and hands back every entry, so asking it for one name at a time
 * was rebuilding all sixteen to throw fifteen away.
 */
export function useRepoColors(): Record<string, string> {
  const repositories = useStore(s => s.config?.repositories)
  return useMemo(
    () => getProjectColorMap(Object.keys(repositories ?? {}), repositories),
    [repositories],
  )
}

export function useRepoColor(repoName?: string): string | undefined {
  const colors = useRepoColors()
  return repoName ? colors[repoName] : undefined
}

export function RepoMark({ repoName, size = 'card' }: { repoName?: string; size?: RepoMarkSize }) {
  const { box, glyph } = REPO_MARK_SIZES[size]
  const repoColor = useRepoColor(repoName)

  /* UNDEFINED IS A REAL CASE, not a defensive nicety: the map is keyed by the reader's
     LOCAL config, and the Plans list names organization repositories that a given machine
     may never have cloned — no entry there, so no key to resolve and nothing to give one
     a colour, by index or otherwise. Without this the template below produced
     `backgroundColor: "undefined1f"`, which the browser drops, leaving a glyph on nothing.

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

/**
 * The same chip as `RepoNameBadge`, INERT and with the two names split apart.
 *
 * Two differences, and each is forced by where it is used — the Plans list and a plan's
 * detail header:
 *
 * THE CLICK IS GONE. A plan row is itself a `role="button"`, and a control inside it
 * would either swallow the row's own click or navigate the reader out of the modal they
 * are reading. A chip that looks pressable and is not would be worse than a plain label,
 * so this one is a `<span>` and nothing about it invites a press.
 *
 * THE COLOUR KEY AND THE LABEL ARE SEPARATE. A plan carries the repository's CLOUD name,
 * and names are unique only inside one organization; the colour map is keyed by the
 * LOCAL config, where a second `api` is stored as `api (Acme)`. So what is displayed and
 * what is coloured are two different strings, and the caller resolves the second through
 * `configKeyForRepoId`. `RepoNameBadge` needs no such split — the sidebar names the local
 * repository it is attached to, so its one string is both.
 */
export function RepoColorChip({
  colorKey,
  label,
  className = '',
}: {
  /** The key the colour map is keyed by, or undefined for a repo this machine has none for. */
  colorKey?: string
  /** What to print — the cloud name, or the "no repository" wording. */
  label: string
  className?: string
}) {
  const repoColor = useRepoColor(colorKey)
  const uncoloured = !repoColor

  return (
    <span
      title={label}
      className={`h-6 gap-1.5 px-2 rounded-lg text-xs inline-flex items-center min-w-0 text-ink font-medium ${
        uncoloured ? 'bg-surface-subtle' : ''
      } ${className}`}
      style={uncoloured ? undefined : { backgroundColor: `${repoColor}1f` }}
    >
      <FolderGit2
        className={`w-3.5 h-3.5 flex-shrink-0 ${uncoloured ? 'text-icon-muted' : ''}`}
        style={uncoloured ? undefined : { color: repoColor }}
      />
      <span className="truncate">{label}</span>
    </span>
  )
}
