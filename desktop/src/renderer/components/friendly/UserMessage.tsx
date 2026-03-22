import { memo, useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

interface UserMessageProps {
  text: string
}

export const UserMessage = memo(function UserMessage({ text }: UserMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])

  return (
    <div className="flex items-start justify-end gap-1.5 ml-auto max-w-[85%]">
      <div className="w-fit bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2.5">
        <p className="text-sm text-white whitespace-pre-wrap">{text}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 mt-1.5 p-1 rounded-md text-text-secondary/50 hover:text-text-secondary hover:bg-white/5 transition-colors"
        title="Copy"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
})
