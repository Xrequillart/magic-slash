import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useT } from '../i18n'

/**
 * The fallback is its own function component because the boundary above has to be
 * a class (only classes can catch a render error), and a class cannot call
 * `useT()`. Splitting it here is what lets the error screen follow a live
 * language switch like everything else.
 */
function ErrorFallback({ label, message, onRetry }: {
  label?: string
  message?: string
  onRetry: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="p-3 bg-red/10 rounded-full mb-4">
        <AlertTriangle className="w-6 h-6 text-red" />
      </div>
      <h3 className="text-ink font-semibold mb-2">
        {label || t('app.errorBoundary.title')}
      </h3>
      <p className="text-text-secondary text-sm mb-4 max-w-sm">
        {message || t('app.errorBoundary.body')}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-colors"
      >
        {t('app.errorBoundary.retry')}
      </button>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackLabel?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.fallbackLabel ? ` - ${this.props.fallbackLabel}` : ''}]`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          label={this.props.fallbackLabel}
          message={this.state.error?.message}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      )
    }

    return this.props.children
  }
}
