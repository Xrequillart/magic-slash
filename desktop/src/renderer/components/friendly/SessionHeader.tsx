import { memo, useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import claudeCodeIcon from '../../assets/claudecode-icon.png'

interface ClaudeInfo {
  version: string
  model: string
  accountType: string
}

// Map raw model IDs to human-readable names
function formatModel(raw: string): string {
  if (raw.includes('opus')) return 'Claude Opus 4.6'
  if (raw.includes('sonnet') && raw.includes('4-6')) return 'Claude Sonnet 4.6'
  if (raw.includes('sonnet')) return 'Claude Sonnet 4'
  if (raw.includes('haiku')) return 'Claude Haiku 4.5'
  // Fallback: clean up the raw ID
  return raw.replace(/^(us\.anthropic\.|anthropic\.)/, '').replace(/-v\d+$/, '')
}

// Map apiKeySource to human-readable billing label
function formatAccountType(raw: string): string {
  if (raw === 'none') return 'Max Plan'
  if (raw === 'api_key' || raw === 'env') return 'API Usage Billing'
  if (raw === 'oauth') return 'OAuth'
  return raw
}

interface SessionHeaderProps {
  cwd: string
}

export const SessionHeader = memo(function SessionHeader({ cwd }: SessionHeaderProps) {
  const [info, setInfo] = useState<ClaudeInfo | null>(null)

  useEffect(() => {
    window.electronAPI.overlay.getClaudeInfo().then(setInfo)
  }, [])


  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      {/* Claude Code logo */}
      <img src={claudeCodeIcon} alt="Claude Code" className="w-14 h-14" />

      {/* Title + version */}
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-base font-semibold text-white">Claude Code</h2>
        {info && info.version !== 'unknown' && (
          <span className="text-xs text-text-secondary font-mono">v{info.version}</span>
        )}
      </div>

      {/* Model + Account type pills */}
      {info && (
        <div className="flex items-center gap-2">
          {info.model !== 'unknown' && (
            <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
              {formatModel(info.model)}
            </span>
          )}
          {info.accountType !== 'unknown' && (
            <span className="px-2.5 py-1 rounded-full bg-white/5 text-text-secondary text-xs font-medium">
              {formatAccountType(info.accountType)}
            </span>
          )}
        </div>
      )}

      {/* Working directory */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 max-w-[90%]">
        <FolderOpen className="w-3.5 h-3.5 text-text-secondary shrink-0" />
        <span className="text-xs text-text-secondary font-mono truncate direction-rtl text-left" dir="rtl">{cwd}</span>
      </div>
    </div>
  )
})
