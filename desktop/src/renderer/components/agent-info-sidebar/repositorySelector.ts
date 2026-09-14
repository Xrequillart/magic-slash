import type { RepositorySelectorProps } from '@ds/desktop'
import { useRepoColors } from './RepoMark'
import { useModalExit } from '../../hooks/useModalExit'
import { useT } from '../../i18n'

/**
 * THE DATA PATH for the repository picker. The dialog is `RepositorySelector` in the design
 * system, the ground it floats on is `Modal`, and the column that renders it is
 * `SidebarAgentCoderInfo` — the one that opens it.
 *
 * WHAT IS LEFT HERE is the three things the design system cannot reach: the words, the hue
 * each repository was given in Settings, and the enter/exit animation — the app's keyframes
 * live in its own stylesheet, so the classes are passed in rather than named over there.
 *
 * `useModalExit` stays too, and it is why this returns `undefined` rather than the caller
 * testing `isOpen`: an overlay unmounts the instant it is closed, which leaves no frame for
 * a closing animation to play in. This keeps it alive past `isOpen` and lets it go when the
 * animation ends, so "is there a dialog" is a question only this file can answer.
 */

interface RepositorySelectorOptions {
  isOpen: boolean
  onClose: () => void
  availableRepos: Array<{ name: string; path: string }>
  attachedRepos: string[]
  onToggleRepository: (path: string) => void
}

export function useRepositorySelector({
  isOpen,
  onClose,
  availableRepos,
  attachedRepos,
  onToggleRepository,
}: RepositorySelectorOptions): RepositorySelectorProps | undefined {
  const t = useT()
  const colors = useRepoColors()
  const { mounted, closing, onExitAnimationEnd } = useModalExit(isOpen)

  if (!mounted) return undefined

  return {
    title: t('agentInfo.selectRepositories'),
    closeLabel: t('common.close'),
    emptyLabel: t('agentInfo.noRepositories'),
    /* `repo.name` is already the key the colour map wants: `availableRepos` is built from
       `Object.entries(config.repositories)`. */
    repos: availableRepos.map((repo) => ({
      path: repo.path,
      name: repo.name,
      color: colors[repo.name],
      attached: attachedRepos.includes(repo.path),
    })),
    onClose,
    onToggle: onToggleRepository,
    backdropClassName: closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop',
    className: closing ? 'animate-modal-content-out' : 'animate-modal-content',
    onAnimationEnd: onExitAnimationEnd,
  }
}
