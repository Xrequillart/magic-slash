import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../store'
import FileContentRenderer from './file-preview/FileContentRenderer'

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  modified:  { label: 'M', color: 'text-yellow  bg-yellow/10  border-yellow/20',  border: 'border-l-yellow' },
  added:     { label: 'A', color: 'text-green   bg-green/10   border-green/20',   border: 'border-l-green' },
  deleted:   { label: 'D', color: 'text-red     bg-red/10     border-red/20',     border: 'border-l-red' },
  renamed:   { label: 'R', color: 'text-accent  bg-accent/10  border-accent/20',  border: 'border-l-accent' },
  untracked: { label: 'U', color: 'text-orange  bg-orange/10  border-orange/20',  border: 'border-l-orange' },
}

function getExtLabel(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const MAP: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
    py: 'Python', rs: 'Rust', go: 'Go', rb: 'Ruby', java: 'Java',
    md: 'Markdown', markdown: 'Markdown', json: 'JSON', yaml: 'YAML',
    yml: 'YAML', toml: 'TOML', css: 'CSS', scss: 'SCSS', html: 'HTML',
    sh: 'Shell', bash: 'Shell', vue: 'Vue', svelte: 'Svelte', sql: 'SQL',
    png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG', gif: 'GIF', svg: 'SVG', webp: 'WebP',
  }
  return MAP[ext] ?? ext.toUpperCase()
}

export default function FilePreviewPanel() {
  const selectedFile = useStore(s => s.selectedFile)
  const closeFilePreview = useStore(s => s.closeFilePreview)
  const activeTerminalId = useStore(s => s.activeTerminalId)
  const prevTerminalId = useRef(activeTerminalId)
  const [isClosing, setIsClosing] = useState(false)
  const isClosingRef = useRef(false)
  const [prevSelectedFile, setPrevSelectedFile] = useState(selectedFile)
  const [scrollSeq, setScrollSeq] = useState(0)

  // Every selection — including re-clicking the file already on screen — is a fresh
  // object from `setSelectedFile`, so this fires on each one. That is the whole
  // point of it: on a re-click the path, the status and the cached content are all
  // unchanged, nothing below re-reads anything, and this is the only signal left to
  // tell CodeView to take the reader back to the first change after they have
  // scrolled away from it. Bumped inline during render rather than from an effect —
  // `selectedFile` already carries a fresh identity per click, so comparing it
  // against the previous render is enough; React applies the state update before
  // committing, with no extra effect-and-re-render round trip.
  if (selectedFile !== prevSelectedFile) {
    setPrevSelectedFile(selectedFile)
    if (selectedFile) setScrollSeq(n => n + 1)
  }

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    setIsClosing(true)
    setTimeout(() => {
      isClosingRef.current = false
      setIsClosing(false)
      closeFilePreview()
    }, 310)
  }, [closeFilePreview])

  useEffect(() => {
    if (selectedFile) {
      isClosingRef.current = false
      setIsClosing(false)
    }
  }, [selectedFile])

  useEffect(() => {
    if (prevTerminalId.current !== activeTerminalId) {
      prevTerminalId.current = activeTerminalId
      handleClose()
    }
  }, [activeTerminalId, handleClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedFile !== null) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedFile, handleClose])

  if (!selectedFile) return null

  const fileName = selectedFile.path.split('/').pop() ?? selectedFile.path
  const relativePath = selectedFile.path
  // No fallback to `modified` for an EMPTY status. The fallback exists for a git
  // status this version does not know — showing "M" beats showing nothing there —
  // but an empty status means the file is not a git change at all (the live spec
  // panel opens the spec this way), and badging it "M" with a yellow rail states
  // something false about it.
  const statusCfg = selectedFile.status ? (STATUS_CONFIG[selectedFile.status] ?? STATUS_CONFIG.modified) : null
  const extLabel = getExtLabel(selectedFile.path)

  return (
    <>
      <div
        className="fixed inset-0 z-[59]"
        onClick={handleClose}
      />
      <div className={`fixed right-0 top-0 h-full w-[70%] z-[60] flex flex-col bg-bg-secondary border-l-4 ${statusCfg?.border ?? 'border-l-line'} ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {statusCfg && (
              <span className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-ink truncate">{fileName}</span>
              <span className="text-xs text-text-secondary truncate">{relativePath}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <span className="text-[10px] font-medium text-text-secondary bg-surface border border-line-field rounded px-1.5 py-0.5">
              {extLabel}
            </span>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-surface-strong text-text-secondary hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto [will-change:transform]">
          <FileContentRenderer
            repoPath={selectedFile.repoPath}
            filePath={selectedFile.path}
            status={selectedFile.status}
            scrollSeq={scrollSeq}
          />
        </div>
      </div>
    </>
  )
}
