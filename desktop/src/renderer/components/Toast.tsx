import { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning'

export interface ToastAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
}

interface Toast {
  id: number
  message: string
  type: ToastType
  actions?: ToastAction[]
  persistent?: boolean
}

let toastId = 0
const listeners = new Set<(toast: Toast) => void>()

export function showToast(message: string, type: ToastType = 'success', options?: { actions?: ToastAction[], persistent?: boolean }) {
  const toast: Toast = { id: ++toastId, message, type, ...options }
  listeners.forEach(listener => listener(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast])
      if (!toast.persistent) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id))
        }, 4000)
      }
    }

    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green" />,
    error: <XCircle className="w-5 h-5 text-red" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow" />,
  }

  const borderColors = {
    success: 'border-green',
    error: 'border-red',
    warning: 'border-yellow',
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            bg-bg-secondary border ${borderColors[toast.type]} rounded-xl
            p-4 min-w-[300px] max-w-[450px]
            shadow-lg animate-slide-in
          `}
        >
          <div className={`flex ${toast.actions ? 'items-start' : 'items-center'} gap-3`}>
            {icons[toast.type]}
            <div className="flex-1">
              <span className="text-sm">{toast.message}</span>
              {toast.actions && (
                <div className="flex gap-2 mt-3">
                  {toast.actions.map(action => (
                    <button
                      key={action.label}
                      onClick={() => { action.onClick(); removeToast(toast.id) }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-text-secondary hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
