import { memo } from 'react'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ClaudeMessageProps {
  content: string
}

export const ClaudeMessage = memo(function ClaudeMessage({ content }: ClaudeMessageProps) {
  if (!content) return null
  return <MarkdownRenderer content={content} />
})
