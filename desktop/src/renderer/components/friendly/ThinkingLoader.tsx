import { memo } from 'react'

export const ThinkingLoader = memo(function ThinkingLoader() {
  return (
    <div className="flex items-center gap-2 pl-1 py-2">
      <span className="text-sm text-text-secondary">Claude is thinking</span>
      <span className="thinking-dots flex gap-0.5">
        <span className="thinking-dot w-1 h-1 rounded-full bg-accent" />
        <span className="thinking-dot w-1 h-1 rounded-full bg-accent" />
        <span className="thinking-dot w-1 h-1 rounded-full bg-accent" />
      </span>
    </div>
  )
})
