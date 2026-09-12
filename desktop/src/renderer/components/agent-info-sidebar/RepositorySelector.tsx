import { createPortal } from 'react-dom'
import { X, Folder, Check } from 'lucide-react'
import { RepoMark } from './RepoMark'
import { useModalExit } from '../../hooks/useModalExit'
import { useT } from '../../i18n'

interface RepositorySelectorProps {
  isOpen: boolean
  onClose: () => void
  availableRepos: Array<{ name: string; path: string }>
  attachedRepos: string[]
  onToggleRepository: (path: string) => void
}

export function RepositorySelector({
  isOpen,
  onClose,
  availableRepos,
  attachedRepos,
  onToggleRepository,
}: RepositorySelectorProps) {
  const t = useT()
  // Stays mounted past `isOpen` so it can animate out, like every other dialog.
  const { mounted, closing, onExitAnimationEnd } = useModalExit(isOpen)

  if (!mounted) return null

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 ${
        closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'
      }`}
      onClick={onClose}
    >
      <div
        onAnimationEnd={onExitAnimationEnd}
        className={`bg-bg-secondary border border-line rounded-xl w-full max-w-md mx-4 ${
          closing ? 'animate-modal-content-out' : 'animate-modal-content'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            {/* Neutral: the title names the LIST, and there is no one repository here
                to take a colour from. Purple was never a repository's colour — it was
                the app's accent standing in for one everywhere a folder was drawn. */}
            <Folder className="w-4 h-4 text-icon" />
            <span className="text-xs font-semibold text-ink">{t('agentInfo.selectRepositories')}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Repo list */}
        <div className="px-5 pb-5 space-y-1">
          {availableRepos.map((repo) => {
            const isAttached = attachedRepos.includes(repo.path)
            return (
              <button
                key={repo.path}
                onClick={() => onToggleRepository(repo.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface transition-colors text-left"
              >
                {/* THE REPOSITORY'S OWN MARK, not a folder glyph. Every row here was
                    the same purple folder, so the list said nothing until it was read —
                    while the sidebar behind it, the Plans list and the Tasks board have
                    all been drawing these repositories in their own colours for a while.
                    `RepoMark` is that mark, and `repo.name` is already the key it wants:
                    `availableRepos` is built from `Object.entries(config.repositories)`.

                    It also makes the picker match its result: the card this click adds
                    to the sidebar wears exactly this tile. */}
                <RepoMark repoName={repo.name} />
                <span className="flex-1 text-ink/80 font-medium text-xs">{repo.name}</span>
                {isAttached && (
                  <Check className="w-4 h-4 text-green" />
                )}
              </button>
            )
          })}

          {availableRepos.length === 0 && (
            <div className="text-center py-8 text-xs text-text-secondary/50">
              {t('agentInfo.noRepositories')}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
