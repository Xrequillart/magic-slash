import { useEffect, useState } from 'react'
import { Download, CheckCircle, Loader2 } from 'lucide-react'

type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

export function UpdateOverlay() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const unsubscribe = window.electronAPI.updater.onStatus((newStatus) => {
      setStatus(newStatus)

      // Show overlay for active states
      if (
        newStatus.type === 'checking' ||
        newStatus.type === 'available' ||
        newStatus.type === 'downloading' ||
        newStatus.type === 'downloaded'
      ) {
        setVisible(true)
      }

      // Hide overlay for terminal states
      if (newStatus.type === 'not-available') {
        // Small delay before hiding
        setTimeout(() => setVisible(false), 500)
      }

      if (newStatus.type === 'error') {
        // Hide after 3 seconds on error
        setTimeout(() => setVisible(false), 3000)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (!visible || !status) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-bg/95 flex items-center justify-center z-[100] animate-fade-in">
      <div className="flex flex-col items-center gap-6 p-8">
        {/* Icon */}
        <div className="relative">
          {status.type === 'checking' && (
            <div className="w-16 h-16 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-accent animate-spin" />
            </div>
          )}
          {(status.type === 'available' || status.type === 'downloading') && (
            <div className="w-16 h-16 flex items-center justify-center">
              <Download className="w-12 h-12 text-purple" />
            </div>
          )}
          {status.type === 'downloaded' && (
            <div className="w-16 h-16 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green" />
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="text-center">
          {status.type === 'checking' && (
            <p className="text-text-secondary text-lg">Checking for updates...</p>
          )}
          {status.type === 'available' && (
            <p className="text-white text-lg">
              Update available: <span className="text-purple font-semibold">v{status.version}</span>
            </p>
          )}
          {status.type === 'downloading' && (
            <>
              <p className="text-white text-lg mb-4">Downloading update...</p>
              {/* Progress bar */}
              <div className="w-64 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple transition-all duration-300 ease-out"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <p className="text-text-secondary text-sm mt-2">{Math.round(status.progress)}%</p>
            </>
          )}
          {status.type === 'downloaded' && (
            <p className="text-green text-lg">Restarting...</p>
          )}
          {status.type === 'error' && (
            <p className="text-red text-sm">Update check failed. Continuing...</p>
          )}
        </div>
      </div>
    </div>
  )
}
