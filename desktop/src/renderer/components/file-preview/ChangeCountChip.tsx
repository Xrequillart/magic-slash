import { useT } from '../../i18n'
import type { MarkerCounts } from '../../utils/diffMarkers'

/**
 * Everything about the chip EXCEPT what it sits on.
 *
 * The background is deliberately not in here. This chip now appears on three different
 * surfaces — the drawer's own header, a file card's header, and the review header —
 * and two Tailwind background utilities in one class string do not resolve by their
 * order in the string but by their order in the generated stylesheet (the rule spelled
 * out in renderer/theme/controls.ts). So a base that declared one could not be
 * overridden reliably; leaving it out means composing one is simply the only way.
 *
 * `tabular-nums` so the two figures keep one width and whatever sits to their right
 * does not shift as the counts change from file to file.
 */
const CHIP_BASE =
  'flex items-center gap-1.5 text-[10px] font-medium border border-line-field ' +
  'rounded px-1.5 py-0.5 tabular-nums select-none'

interface Props {
  counts: MarkerCounts
  /** The background for the surface this chip sits on — see `CHIP_BASE` above. */
  surface?: string
}

/**
 * `+N −M`, or nothing at all.
 *
 * Zero for both draws NOTHING rather than "+0 −0". That is not only about the spec
 * preview and the not-yet-measured card: an UNTRACKED file genuinely arrives as 0/0,
 * because git has nothing to diff it against — and a brand new file labelled "+0 −0"
 * states something false about it.
 *
 * U+2212 for the minus, not a hyphen: it is drawn at the `+`'s width and height, and
 * these two sit side by side.
 */
export default function ChangeCountChip({ counts, surface = 'bg-surface' }: Props) {
  const t = useT()

  if (counts.added + counts.removed <= 0) return null

  const addedLabel = t('filePreview.linesAdded', { count: counts.added })
  const removedLabel = t('filePreview.linesRemoved', { count: counts.removed })

  return (
    <span className={`${CHIP_BASE} ${surface}`}>
      <span className="text-green" title={addedLabel} aria-label={addedLabel}>+{counts.added}</span>
      <span className="text-red" title={removedLabel} aria-label={removedLabel}>−{counts.removed}</span>
    </span>
  )
}
