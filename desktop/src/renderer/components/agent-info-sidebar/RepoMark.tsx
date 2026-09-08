import { FolderGit2 } from 'lucide-react'
import { useStore } from '../../store'
import { getProjectColorMap } from '../../utils/projectColors'

/**
 * The repository tile that sits next to a repository name in the info sidebar.
 *
 * The webapp's repository tile at sidebar scale: the colour the repo was given in
 * Settings tints the glyph and its backdrop rather than standing alone as a dot.
 *
 * Shared because both cards name a repository: RepositoryCard for an implementation
 * agent, SpecPanel for a planning one — which has no repository cards at all, so its
 * heading is the only place the repo appears. Extracted rather than copied so the two
 * cannot drift into two different marks for the same thing; a planner and a coder
 * pointed at the same repo must show the same colour, because that colour is how the
 * user recognises the repo across Dashboard, Tasks and the sidebar.
 */
export function RepoMark({ repoName }: { repoName: string }) {
  const repositories = useStore(s => s.config?.repositories)
  /* Built over the FULL repository list, never a subset of it: getProjectColorMap
     falls back to the palette BY INDEX, so a map built from just the repos on screen
     would hand an uncoloured repo a different colour here than the dots elsewhere
     give it. This is the same call RepositoryCard makes, for the same reason. */
  const repoColor = getProjectColorMap(Object.keys(repositories ?? {}), repositories)[repoName]

  return (
    <span
      className="flex items-center justify-center w-6 h-6 rounded-lg flex-shrink-0"
      style={{ backgroundColor: `${repoColor}1f`, color: repoColor }}
    >
      <FolderGit2 className="w-3.5 h-3.5" />
    </span>
  )
}
