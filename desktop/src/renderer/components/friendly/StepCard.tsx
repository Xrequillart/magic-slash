import { memo, useState, useCallback, type ReactNode } from 'react'
import { FileText, Terminal, Search, FolderSearch, PenLine, FilePlus, ChevronRight, Bot, Wrench, Check, X, MessageCircleQuestion } from 'lucide-react'

const TOOL_ICONS: Record<string, typeof FileText> = {
  Read: FileText,
  Edit: PenLine,
  Write: FilePlus,
  Bash: Terminal,
  Grep: Search,
  Glob: FolderSearch,
  Agent: Bot,
  AskUserQuestion: MessageCircleQuestion,
}

function getToolIcon(toolName: string) {
  return TOOL_ICONS[toolName] || Wrench
}

export type PermissionStatus = 'allow' | 'deny' | undefined

interface StepCardProps {
  toolName: string
  summary: string
  isError?: boolean
  defaultOpen?: boolean
  permissionStatus?: PermissionStatus
  children?: ReactNode
}

export const StepCard = memo(function StepCard({
  toolName,
  summary,
  isError = false,
  defaultOpen = false,
  permissionStatus,
  children,
}: StepCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  const Icon = getToolIcon(toolName)
  const denied = permissionStatus === 'deny'
  const borderColor = isError || denied ? 'border-red/30' : 'border-white/10'
  const iconColor = isError || denied ? 'text-red' : 'text-accent'

  const hasDetails = !!children
  const Wrapper = hasDetails ? 'button' : 'div'

  return (
    <div className={`bg-white/5 border ${borderColor} rounded-lg overflow-hidden animate-fade-in`}>
      <Wrapper
        type={hasDetails ? 'button' : undefined}
        onClick={hasDetails ? toggle : undefined}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${hasDetails ? 'hover:bg-white/5 cursor-pointer' : ''} transition-colors`}
      >
        {hasDetails && (
          <ChevronRight
            className={`w-3.5 h-3.5 text-text-secondary shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
        )}
        <Icon className={`w-4 h-4 ${iconColor} shrink-0`} />
        <span className={`text-xs font-mono truncate ${denied ? 'text-red/60 line-through' : 'text-text-secondary'}`}>{summary}</span>
        {permissionStatus === 'allow' && (
          <Check className="w-3.5 h-3.5 text-green shrink-0 ml-auto" />
        )}
        {permissionStatus === 'deny' && (
          <X className="w-3.5 h-3.5 text-red shrink-0 ml-auto" />
        )}
      </Wrapper>

      {isOpen && children && (
        <div className="px-3 pb-3 border-t border-white/5">
          {children}
        </div>
      )}
    </div>
  )
})
