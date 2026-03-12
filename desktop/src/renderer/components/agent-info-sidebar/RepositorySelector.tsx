import { createPortal } from 'react-dom'
import { X, Folder, Check } from 'lucide-react'

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
  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-white/10 rounded-xl w-full max-w-md mx-4 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-purple" />
            <span className="text-base font-semibold text-white">Select repositories</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-all"
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
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <Folder className="w-4 h-4 text-purple/50 flex-shrink-0" />
                <span className="flex-1 text-white/80 font-medium text-sm">{repo.name}</span>
                {isAttached && (
                  <Check className="w-4 h-4 text-green" />
                )}
              </button>
            )
          })}

          {availableRepos.length === 0 && (
            <div className="text-center py-8 text-sm text-text-secondary/50">
              No repositories configured
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
