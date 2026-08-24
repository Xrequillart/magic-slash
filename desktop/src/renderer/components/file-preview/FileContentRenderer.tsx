import { useEffect, useState } from 'react'
import type { FilePreviewResult } from '../../../types'
import CodeView from './CodeView'
import MarkdownView from './MarkdownView'
import ImageView from './ImageView'
import BinaryPlaceholder from './BinaryPlaceholder'
import { formatSize } from '../../utils/formatSize'
import type { MarkerBlock } from '../../utils/diffMarkers'
import { useT } from '../../i18n'

interface Props {
  repoPath: string
  filePath: string
  status: string
  /**
   * Bump to re-read the file WITHOUT remounting. Omitted — the file-preview
   * drawer's case — nothing changes: the read stays keyed on the file alone.
   *
   * A remount would work too, but it would throw away the scroll position on
   * every keystroke Claude Code writes into a spec, which is precisely what the
   * live spec panel exists to preserve.
   */
  refreshToken?: number
  /**
   * What to show instead of the red "cannot read file" when the file is simply
   * not there yet. `/magic:plan` announces where the spec WILL be before writing
   * a byte, so "no such file" is that panel's normal FIRST state, not a failure.
   * Omitted, the hard error stands — a preview opened on a deleted file is an
   * error, and should look like one.
   */
  notFoundLabel?: string
  /**
   * Forwarded to CodeView, where every bump re-anchors the view on the file's first
   * change. Nothing here reads it, and nothing here should: it must NOT join the
   * read effect's dependencies, or re-clicking an open file would pay for a fresh
   * IPC read to arrive at the bytes already on screen.
   */
  scrollSeq?: number
  /**
   * Forwarded to CodeView, which calls it with the changed blocks it just measured.
   * Nothing here reads it either, and like `scrollSeq` it must NOT join the read
   * effect's dependencies: a caller that rebuilds the callback would otherwise buy a
   * fresh IPC read of bytes already on screen.
   */
  onBlocksMeasured?: (blocks: MarkerBlock[], contextPx: number) => void
}

// `unreadable` is local to this component: the handler never returns it, it is
// what a thrown IPC call becomes. Kept apart from `not_found` so a dead channel
// is never softened by `notFoundLabel` into "the file is not written yet".
type FileResult = FilePreviewResult | { error: 'unreadable' }

const MARKDOWN_EXTS = new Set(['md', 'markdown'])

/**
 * Last read per file, so coming back to a file shows it instantly instead of
 * flashing a loader over content that has not changed.
 *
 * This is what makes switching away from a planning agent and back feel free: the
 * spec panel remounts on every switch (its `key` is the spec path, which is how the
 * follow state gets reset), so without a cache every return paid for a full IPC
 * read plus a shiki highlight before showing a single character.
 *
 * Bounded, because entries hold whole file contents: the oldest key is dropped past
 * MAX_CACHED. Insertion order is Map's own, so the first key is the oldest.
 */
const MAX_CACHED = 10
const readCache = new Map<string, FileResult>()

function cacheKeyFor(repoPath: string, filePath: string, status: string) {
  return `${repoPath}\u0000${filePath}\u0000${status}`
}

function remember(key: string, value: FileResult) {
  readCache.delete(key)
  readCache.set(key, value)
  if (readCache.size > MAX_CACHED) {
    const oldest = readCache.keys().next().value
    if (oldest !== undefined) readCache.delete(oldest)
  }
}

/** Pulsing lines standing in for the document, rather than a bare "Loading…". */
function ContentSkeleton() {
  return (
    <div className="px-5 py-4 space-y-2.5 animate-pulse" aria-hidden="true">
      {['w-2/5', 'w-full', 'w-11/12', 'w-4/5', 'w-1/3', 'w-full', 'w-3/4'].map((w, i) => (
        <div key={i} className={`h-3 rounded bg-ink/10 ${w}`} />
      ))}
    </div>
  )
}

export default function FileContentRenderer({ repoPath, filePath, status, refreshToken, notFoundLabel, scrollSeq, onBlocksMeasured }: Props) {
  const t = useT()
  const key = cacheKeyFor(repoPath, filePath, status)
  // Seeded from the cache so a remount on a known file paints immediately; the read
  // below still runs and replaces this the moment it resolves.
  const [result, setResult] = useState<FileResult | null>(() => readCache.get(key) ?? null)
  const [loading, setLoading] = useState(() => !readCache.has(key))

  // Two effects, not one, and the split is the whole point of `refreshToken`.
  //
  // Blanking to the spinner belongs to the FILE changing: a re-read of the same
  // file must not flash "Loading…" over content that is already on screen, or a
  // spec being written would strobe once per save.
  useEffect(() => {
    const cached = readCache.get(key)
    setResult(cached ?? null)
    setLoading(!cached)
  }, [key])

  useEffect(() => {
    let cancelled = false
    window.electronAPI.config.readFile(repoPath, filePath, status)
      // Identical bytes keep the previous object, so a refresh that found no change
      // does not re-run the markdown parse over the whole document.
      .then((res: FileResult) => {
        if (cancelled) return
        remember(key, res)
        setResult(prev => (prev && 'content' in prev && 'content' in res && prev.content === res.content ? prev : res))
      })
      // A failed read is never cached: the next mount must retry rather than serve
      // the error back instantly forever.
      .catch(() => { if (!cancelled) setResult({ error: 'unreadable' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    // Two reads can be in flight at once now that a refresh no longer remounts;
    // without this the slower one wins and the panel shows a stale spec.
    return () => { cancelled = true }
  }, [repoPath, filePath, status, refreshToken, key])

  if (loading) return <ContentSkeleton />

  if (!result) return null

  if ('error' in result) {
    if (result.error === 'too_large') {
      return (
        <div className="flex items-center justify-center h-32 text-text-secondary text-sm">
          File too large to preview ({formatSize(result.size)})
        </div>
      )
    }
    if (result.error === 'not_found' && notFoundLabel) {
      return (
        <div className="flex items-center justify-center h-32 text-text-secondary text-sm italic">
          {notFoundLabel}
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center h-32 text-red text-sm">
        {t('filePreview.unreadable')}
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

  return (
    <CodeView
      content={result.content}
      highlightedHtml={result.highlightedHtml}
      scrollSeq={scrollSeq}
      changedLines={result.changedLines}
      onBlocksMeasured={onBlocksMeasured}
    />
  )
}
