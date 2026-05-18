import { useEffect, useState } from 'react'
import CodeView from './CodeView'
import MarkdownView from './MarkdownView'
import ImageView from './ImageView'
import BinaryPlaceholder from './BinaryPlaceholder'
import { formatSize } from '../../utils/formatSize'

interface Props {
  repoPath: string
  filePath: string
  status: string
}

type FileResult =
  | { encoding: 'utf8'; content: string; highlightedHtml: string | null; size: number; mimeHint: string }
  | { encoding: 'binary'; size: number; mimeHint: string; content?: never }
  | { encoding: 'image'; content: string; size: number; mimeHint: string }
  | { error: 'too_large'; size: number }
  | { error: 'path_traversal' | 'not_found' }

const MARKDOWN_EXTS = new Set(['md', 'markdown'])

export default function FileContentRenderer({ repoPath, filePath, status }: Props) {
  const [result, setResult] = useState<FileResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setResult(null)
    window.electronAPI.config.readFile(repoPath, filePath, status)
      .then((res: FileResult) => setResult(res))
      .catch(() => setResult({ error: 'not_found' }))
      .finally(() => setLoading(false))
  }, [repoPath, filePath, status])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
        Loading…
      </div>
    )
  }

  if (!result) return null

  if ('error' in result) {
    if (result.error === 'too_large') {
      return (
        <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
          File too large to preview ({formatSize(result.size)})
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center h-32 text-red-400 text-sm">
        Cannot read file
      </div>
    )
  }

  const ext = result.mimeHint.toLowerCase()

  if (result.encoding === 'image') {
    return <ImageView dataUrl={result.content} alt={filePath} />
  }

  if (result.encoding === 'binary') {
    return <BinaryPlaceholder size={result.size} />
  }

  if (MARKDOWN_EXTS.has(ext)) {
    return <MarkdownView content={result.content} />
  }

  return <CodeView content={result.content} highlightedHtml={result.highlightedHtml} />
}
