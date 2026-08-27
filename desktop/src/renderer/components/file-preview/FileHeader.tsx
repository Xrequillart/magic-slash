import type { ReactNode } from 'react'
import { FoldVertical, UnfoldVertical, X } from 'lucide-react'
import { useT } from '../../i18n'
import ChangeCountChip from './ChangeCountChip'
import type { MarkerCounts } from '../../utils/diffMarkers'
import type { MarkdownMode } from '../../utils/markdownPath'

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

/**
 * The one-letter git badge, drawn the same wherever a file is named.
 *
 * The TABLE was already shared through `statusConfigFor`; this shares the RENDERING
 * too, which is the half that had been copied into the review's file cards verbatim.
 * Sharing only the colours is how the two would drift — a resize or a re-radius landing
 * on the drawer's header and not on the forty cards under it.
 *
 * Renders nothing for an empty status, which is the rule the table already owns: the
 * spec panel opens a file that is not a git change at all, and badging it "M" would
 * state something false about it.
 */
export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfigFor(status)
  if (!cfg) return null

  return (
    <span className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

/**
 * Fold/unfold between a file's changed regions and the whole of it.
 *
 * Fold arrows rather than the spec panel's `Maximize2`, whose arrows run corner to
 * corner. That diagonal states "grow this in both directions", which is what SpecPanel
 * does — it hands the file to a bigger surface. This button does something narrower:
 * the card keeps its width and the hidden regions come back along ONE axis. Arrows
 * leaving a centre line straight up and down say that, and they read as the elision
 * rows opening back up.
 *
 * One component for the drawer's header and for every review card, label included: the
 * two spelled the same ternary over the same two keys, which is one wording change away
 * from disagreeing about what the button does.
 */
export function WholeFileToggle({ showWholeFile, onToggle }: { showWholeFile: boolean; onToggle: () => void }) {
  const t = useT()
  const label = t(showWholeFile ? 'filePreview.showChangesOnly' : 'filePreview.showWholeFile')

  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-pressed={showWholeFile}
      className="shrink-0 p-1.5 rounded-md text-text-secondary hover:text-ink hover:bg-surface-strong transition-colors border-none cursor-pointer bg-transparent"
    >
      {showWholeFile ? <FoldVertical className="w-3.5 h-3.5" /> : <UnfoldVertical className="w-3.5 h-3.5" />}
    </button>
  )
}

/**
 * Raw markdown or the formatted document, for the one file type that has two readings.
 *
 * A two-segment pill rather than a single icon button like `WholeFileToggle` beside it,
 * because the two modes are not more-versus-less of the same thing: one is the diff, the
 * other is the prose. Both states are therefore named on screen, and the pill is lifted
 * verbatim from the one the skills page already uses for exactly this choice — a reader
 * who has met it there should not have to learn a second control.
 *
 * RAW reads first, unlike that source, because raw is now the default here: a review card
 * opens on the diff, and a segmented control whose first segment is not the current one
 * reads as though something has already been changed.
 *
 * Lives next to `WholeFileToggle` so the card header's mode controls stay in one file —
 * they are read together and they will be spaced together.
 */
export function MarkdownModeToggle({ mode, onChange }: { mode: MarkdownMode; onChange: (mode: MarkdownMode) => void }) {
  const t = useT()

  return (
    // `shrink-0` like every other control in the card header: the path column beside it
    // is `min-w-0 flex-1`, and without it the labels are what gives way on a narrow
    // drawer. `role="group"` with a name because two sibling `aria-pressed` buttons
    // labelled "Raw" and "Rendered" say nothing about what they are a mode OF.
    <div
      role="group"
      aria-label={t('filePreview.markdownMode')}
      className="shrink-0 flex items-center p-0.5 rounded-lg bg-surface-subtle border border-line-field"
    >
      {(['raw', 'rendered'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={mode === option}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            mode === option
              ? 'bg-surface-strong text-ink'
              : 'text-text-secondary hover:text-ink'
          }`}
        >
          {t(option === 'raw' ? 'filePreview.markdownRaw' : 'filePreview.markdownRendered')}
        </button>
      ))}
    </div>
  )
}

/**
 * The drawer's close button, shared by both of its headers.
 *
 * Kept in one place for the label as much as for the classes: `modal.closeEsc` promises
 * a keyboard shortcut, and the panel's Escape listener is what keeps that promise. Two
 * copies of the promise is one copy too many.
 */
export function DrawerCloseButton({ onClose }: { onClose: () => void }) {
  const t = useT()

  return (
    <button
      onClick={onClose}
      title={t('modal.closeEsc')}
      aria-label={t('modal.closeEsc')}
      className="p-1.5 rounded-md hover:bg-surface-strong text-text-secondary hover:text-ink transition-colors"
    >
      <X size={16} />
    </button>
  )
}

/**
 * The bar across the top of the drawer, in whichever shape it is showing.
 *
 * `electron-no-drag` is the load-bearing part and the reason this is a shared constant
 * rather than a class string spelled once per header. The drawer is `fixed top-0`, so
 * its header is the only bar in the app that puts controls inside the window's top
 * 40px — everything else sits below TitleBar. The window is `titleBarStyle: 'hidden'`,
 * and macOS treats that band as draggable, which swallows clicks on whatever is painted
 * there no matter how high its z-index. Without this the buttons simply do not respond,
 * and nothing about the symptom points at the cause — which is exactly why the next
 * header to be added must not have to rediscover it.
 */
export const DRAWER_HEADER = 'electron-no-drag flex items-center justify-between px-4 py-3 border-b border-line shrink-0'

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
  /**
   * A control of the CALLER's, dropped at the start of the right-hand group.
   *
   * A slot rather than a prop per control, because what goes here is not this component's
   * business: the drawer's single-file mode mounts a spec's comment list, and a header that
   * knew what a spec was would be a header that has to learn what the next surface is too.
   * It sits before the chips so the two things that describe the FILE — how much of it
   * changed, and what kind of file it is — stay adjacent to the name they qualify, and so
   * the controls that act on the drawer keep the right edge.
   */
  trailing?: ReactNode
}

/**
 * The preview drawer's title bar: what the file is, what can be done to the card itself,
 * and whatever the caller has to put beside those.
 *
 * Its own component rather than JSX inline in FilePreviewPanel, which is where it
 * lived until the expand toggle joined it — the panel is four hundred lines of
 * scroll geometry, and the header shares none of it.
 */
export default function FileHeader({ filePath, status, canExpand, showWholeFile, counts, trailing, onToggleWholeFile, onClose }: Props) {
  const fileName = filePath.split('/').pop() ?? filePath

  return (
    <div className={DRAWER_HEADER}>
      <div className="flex items-center gap-2.5 min-w-0">
        <StatusBadge status={status} />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-ink truncate">{fileName}</span>
          <span className="text-xs text-text-secondary truncate">{filePath}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {trailing}
        {/* The same pill as the extension label beside it — same type scale, background,
            border and radius — so the header reads as one row of chips rather than as a
            loose figure next to a chip. Only the two numbers keep their own colour.

            Shared with the review's file cards rather than respelled there: a second
            copy is how the two would end up disagreeing about the minus sign. */}
        <ChangeCountChip counts={counts} />
        <span className="text-[10px] font-medium text-text-secondary bg-surface border border-line-field rounded px-1.5 py-0.5">
          {getExtLabel(filePath)}
        </span>
        {canExpand && <WholeFileToggle showWholeFile={showWholeFile} onToggle={onToggleWholeFile} />}
        <DrawerCloseButton onClose={onClose} />
      </div>
    </div>
  )
}
