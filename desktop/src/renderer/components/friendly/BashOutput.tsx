import { memo, useState, useCallback } from 'react'
import { ChevronRight } from 'lucide-react'

interface BashOutputProps {
  command: string
  output?: string
  exitCode?: number
}

export const BashOutput = memo(function BashOutput({ command, output, exitCode }: BashOutputProps) {
  const [showOutput, setShowOutput] = useState(false)
  const toggleOutput = useCallback(() => setShowOutput(prev => !prev), [])

  const hasOutput = output && output.trim().length > 0
  const isError = exitCode !== undefined && exitCode !== 0
  const exitColor = isError ? 'text-red' : 'text-green'

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2 text-[12px] font-mono">
        <span className="text-text-secondary">$</span>
        <span className="text-white/80 truncate">{command}</span>
        {exitCode !== undefined && (
          <span className={`ml-auto shrink-0 text-[11px] ${exitColor}`}>
            exit {exitCode}
          </span>
        )}
      </div>

      {hasOutput && (
        <div>
          <button
            type="button"
            onClick={toggleOutput}
            className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-white/70 transition-colors"
          >
            <ChevronRight
              className={`w-3 h-3 transition-transform duration-200 ${showOutput ? 'rotate-90' : ''}`}
            />
            {showOutput ? 'Hide output' : 'Show output'}
          </button>

          {showOutput && (
            <pre className="mt-1 bg-black/40 border border-white/10 rounded-md p-2 text-[11px] font-mono text-white/70 overflow-x-auto max-h-60 overflow-y-auto leading-relaxed">
              {output}
            </pre>
          )}
        </div>
      )}
    </div>
  )
})
