import { memo } from 'react'

interface UserMessageProps {
  text: string
}

export const UserMessage = memo(function UserMessage({ text }: UserMessageProps) {
  return (
    <div className="ml-auto max-w-[80%] bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl px-4 py-2.5">
      <p className="text-sm text-white whitespace-pre-wrap">{text}</p>
    </div>
  )
})
