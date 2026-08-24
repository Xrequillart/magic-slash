import { FoldVertical, UnfoldVertical, X } from 'lucide-react'
import { useT } from '../../i18n'
import type { MarkerCounts } from '../../utils/diffMarkers'

/**
 * How a git status is badged, and which colour the drawer's left rail takes.
 *
 * One table for both, so a status can never end up with a green badge over a yellow
 * rail — even though the rail is drawn by FilePreviewPanel, on the panel element
 * rather than on this header. It reaches the table through `statusConfigFor`, which
 * is the only door out of this module: the fallback below belongs to every reader.
 */
const STATUS_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  modified:  { label: 'M', color: 'text-yellow  bg-yellow/10  border-yellow/20',  border: 'border-l-yellow' },
  added:     { label: 'A', color: 'text-green   bg-green/10   border-green/20',   border: 'border-l-green' },
  deleted:   { label: 'D', color: 'text-red     bg-red/10     border-red/20',     border: 'border-l-red' },
  renamed:   { label: 'R', color: 'text-accent  bg-accent/10  border-accent/20',  border: 'border-l-accent' },
  untracked: { label: 'U', color: 'text-orange  bg-orange/10  border-orange/20',  border: 'border-l-orange' },
}

/**
 * No fallback to `modified` for an EMPTY status. The fallback exists for a git
 * status this version does not know — showing "M" beats showing nothing there —
 * but an empty status means the file is not a git change at all (the live spec
 * panel opens the spec this way), and badging it "M" with a yellow rail states
 * something false about it.
 */
export function statusConfigFor(status: string) {
  return status ? (STATUS_CONFIG[status] ?? STATUS_CONFIG.modified) : null
}

const EXT_LABELS: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
  py: 'Python', rs: 'Rust', go: 'Go', rb: 'Ruby', java: 'Java',
  md: 'Markdown', markdown: 'Markdown', json: 'JSON', yaml: 'YAML',
  yml: 'YAML', toml: 'TOML', css: 'CSS', scss: 'SCSS', html: 'HTML',
  sh: 'Shell', bash: 'Shell', vue: 'Vue', svelte: 'Svelte', sql: 'SQL',
  png: 'PNG', jpg: 'JPEG', jpeg: 'JPEG', gif: 'GIF', svg: 'SVG', webp: 'WebP',
}

function getExtLabel(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return EXT_LABELS[ext] ?? ext.toUpperCase()
}

interface Props {
  /** Repository-relative, as the file list names it. The filename is split back out here. */
  filePath: string
  status: string
  /**
   * Whether there is anything to expand — false whenever the read came back without
   * a changes-only rendering, which is every added, untracked or deleted file and
   * every file short enough that the context already covers it. The button is then
   * not rendered at all rather than disabled: a control that cannot change anything
   * is noise, and the card is already showing the whole file.
   */
  canExpand: boolean
  showWholeFile: boolean
  /**
   * How many rows changed. Zero for both — the spec panel, an unchanged file, a preview
   * that has not been measured yet — draws no summary at all rather than "+0 −0".
   */
  counts: MarkerCounts
  onToggleWholeFile: () => void
  onClose: () => void
}

/**
 * The preview drawer's title bar: what the file is, and the two things that can be
 * done to the card itself.
 *
 * Its own component rather than JSX inline in FilePreviewPanel, which is where it
 * lived until the expand toggle joined it — the panel is four hundred lines of
 * scroll geometry, and the header shares none of it.
 */
export default function FileHeader({ filePath, status, canExpand, showWholeFile, counts, onToggleWholeFile, onClose }: Props) {
  const t = useT()
  const fileName = filePath.split('/').pop() ?? filePath
  const statusCfg = statusConfigFor(status)
  const expandLabel = t(showWholeFile ? 'filePreview.showChangesOnly' : 'filePreview.showWholeFile')
  const addedLabel = t('filePreview.linesAdded', { count: counts.added })
  const removedLabel = t('filePreview.linesRemoved', { count: counts.removed })

  return (
    /* `electron-no-drag`: the drawer is `fixed top-0`, so this header is the only bar in
       the app that puts controls inside the window's top 40px — everything else sits
       below TitleBar. The window is `titleBarStyle: 'hidden'`, and macOS treats that band
       as draggable, which swallows clicks on whatever is painted there no matter how high
       its z-index. Without this the expand and close buttons simply do not respond. */
    <div className="electron-no-drag flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {statusCfg && (
          <span className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-ink truncate">{fileName}</span>
          <span className="text-xs text-text-secondary truncate">{filePath}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {/* The same pill as the extension label beside it — same type scale, background,
            border and radius — so the header reads as one row of chips rather than as a
            loose figure next to a chip. Only the two numbers keep their own colour.

            `tabular-nums` so the two figures keep one width and the controls to their
            right do not shift as the counts change from file to file. U+2212 for the
            minus, not a hyphen: it is drawn at the `+`'s width and height, and these
            two sit side by side. */}
        {counts.added + counts.removed > 0 && (
          <span className="flex items-center gap-1.5 text-[10px] font-medium bg-surface border border-line-field rounded px-1.5 py-0.5 tabular-nums select-none">
            <span className="text-green" title={addedLabel} aria-label={addedLabel}>+{counts.added}</span>
            <span className="text-red" title={removedLabel} aria-label={removedLabel}>−{counts.removed}</span>
          </span>
        )}
        <span className="text-[10px] font-medium text-text-secondary bg-surface border border-line-field rounded px-1.5 py-0.5">
          {getExtLabel(filePath)}
        </span>
        {/* Fold/unfold rather than the spec panel's `Maximize2`, whose arrows run corner
            to corner. That diagonal states "grow this in both directions", which is what
            SpecPanel does — it hands the file to a bigger surface. This button does
            something narrower: the card keeps its width and the hidden regions come back
            along ONE axis. Arrows leaving a centre line straight up and down say that,
            and they read as the elision rows opening back up. */}
        {canExpand && (
          <button
            onClick={onToggleWholeFile}
            title={expandLabel}
            aria-label={expandLabel}
            aria-pressed={showWholeFile}
            className="p-1.5 rounded-md text-text-secondary hover:text-ink hover:bg-surface-strong transition-colors border-none cursor-pointer bg-transparent"
          >
            {showWholeFile ? <FoldVertical className="w-3.5 h-3.5" /> : <UnfoldVertical className="w-3.5 h-3.5" />}
          </button>
        )}
        <button
          onClick={onClose}
          title={t('modal.closeEsc')}
          aria-label={t('modal.closeEsc')}
          className="p-1.5 rounded-md hover:bg-surface-strong text-text-secondary hover:text-ink transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
