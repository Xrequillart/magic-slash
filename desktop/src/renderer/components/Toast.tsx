import { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastId = 0
const listeners = new Set<(toast: Toast) => void>()

export function showToast(message: string, type: ToastType = 'success') {
  const toast: Toast = { id: ++toastId, message, type }
  listeners.forEach(listener => listener(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 4000)
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
            p-4 flex items-center gap-3 min-w-[300px] max-w-[400px]
            shadow-lg animate-slide-in
          `}
        >
          {icons[toast.type]}
          <span className="flex-1 text-sm">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
