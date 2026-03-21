import { memo } from 'react'

type ActionVerb = 'Edited' | 'Read' | 'Created' | 'Ran' | 'Searched' | 'Used'

function getActionVerb(toolName: string): ActionVerb {
  switch (toolName) {
    case 'Edit': return 'Edited'
    case 'Read': return 'Read'
    case 'Write': return 'Created'
    case 'Bash': return 'Ran'
    case 'Grep':
    case 'Glob': return 'Searched'
    default: return 'Used'
  }
}

function getFileName(toolName: string, input: Record<string, unknown>): string {
  if (toolName === 'Bash') {
    const cmd = (input.command as string) || ''
    return cmd.length > 25 ? cmd.slice(0, 25) + '...' : cmd
  }
  const filePath = (input.file_path || input.path || '') as string
  return filePath.split('/').pop() || toolName.toLowerCase()
}

interface FilePillProps {
  toolName: string
  input: Record<string, unknown>
  isError?: boolean
  onClick?: () => void
}

export const FilePill = memo(function FilePill({ toolName, input, isError = false, onClick }: FilePillProps) {
  const verb = getActionVerb(toolName)
  const name = getFileName(toolName, input)

  const bgColor = isError ? 'bg-red/10 border-red/20' : 'bg-white/5 border-white/10'
  const textColor = isError ? 'text-red' : 'text-white/70'
  const checkColor = isError ? 'text-red' : 'text-green'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${bgColor} text-[11px] font-mono hover:bg-white/10 transition-colors`}
    >
      <span className={textColor}>{verb}</span>
      <span className="text-white/90">{name}</span>
      {!isError && <span className={`${checkColor} text-[10px]`}>&#10003;</span>}
    </button>
  )
})
