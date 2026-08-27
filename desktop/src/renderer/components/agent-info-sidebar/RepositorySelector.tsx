import { createPortal } from 'react-dom'
import { X, Folder, Check } from 'lucide-react'
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
            <Folder className="w-4 h-4 text-purple" />
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
                <Folder className="w-4 h-4 text-purple flex-shrink-0" />
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
