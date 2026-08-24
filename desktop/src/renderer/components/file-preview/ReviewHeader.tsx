import { FolderGit2 } from 'lucide-react'
import { useT } from '../../i18n'
import ChangeCountChip from './ChangeCountChip'
import { DRAWER_HEADER, DrawerCloseButton } from './FileHeader'
import type { MarkerCounts } from '../../utils/diffMarkers'

interface Props {
  repoName: string
  /** Repository-relative root, for the tooltip — the sidebar names the repo the same way. */
  repoPath: string
  fileCount: number
  /**
   * The repository's total, summed over the frozen file list rather than measured.
   *
   * Measured counts only cover the cards that are expanded and finished reading, so a
   * header fed by those would count up as files resolved and back down as the reader
   * folded them away — a total that moves while the repository has not changed.
   */
  counts: MarkerCounts
  onClose: () => void
}

/**
 * The review drawer's title bar: which repository is being read, and how much of it.
 *
 * Its counterpart FileHeader names ONE file and carries that file's two controls. This
 * one deliberately carries none: the expand toggle and the fold-shut chevron both belong
 * to a file, and a copy of either up here would claim to speak for every card at once.
 * What is left is identification and the close button.
 */
export default function ReviewHeader({ repoName, repoPath, fileCount, counts, onClose }: Props) {
  const t = useT()

  return (
    /* The same shell as FileHeader, `electron-no-drag` and all — see `DRAWER_HEADER` for
       why that class is the load-bearing part of it. */
    <div className={DRAWER_HEADER}>
      <div className="flex items-center gap-2.5 min-w-0">
        <FolderGit2 className="w-4 h-4 shrink-0 text-text-secondary" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-ink truncate" title={repoPath}>{repoName}</span>
          <span className="text-xs text-text-secondary truncate">
            {t(fileCount === 1 ? 'filePreview.filesChanged.one' : 'filePreview.filesChanged.other', { count: fileCount })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        <ChangeCountChip counts={counts} />
        <DrawerCloseButton onClose={onClose} />
      </div>
    </div>
  )
}
