import { ButtonIcon } from './ButtonIcon'
import { Icon } from './Icon'
import { ArrowRight, Check, Copy, GitBranch } from './icons'
import { Text } from './Text'

/**
 * Where the work is: the branch you are on, and the one it will go back to.
 *
 * TWO CHIPS AND AN ARROW, and the arrow is the component. Either chip on its own is
 * a name on a plate — something `Label` already does. What this draws is a
 * RELATION: `main → feat/loader` says at a glance that there is a branch beneath
 * this one and a merge ahead, which is the question anybody looking at an agent's
 * repository card is actually asking.
 *
 * THE BASE IS OPTIONAL AND SO IS THE ARROW WITH IT. A branch with no parent worth
 * naming is one chip, not one chip and a dangling arrow pointing at nothing — and
 * "no parent worth naming" includes being ON the base branch, where `main → main`
 * would spend a whole row saying the same word twice. Which of those the caller is
 * in is the caller's question; this one only draws what it is handed.
 *
 * GREEN IS THE CURRENT BRANCH and grey is the base, and that is not decoration. The
 * repository card spends green on where you are and red on deletions; a reader
 * scanning four of these cards down a sidebar picks their branch out by colour
 * before reading a single name.
 *
 * THE NAMES TRUNCATE, both of them. A branch name is as long as whoever typed it,
 * and the sidebar it lives in is 288px at its narrowest — so the chip gives way and
 * the `title` carries the whole thing. It is the one place here where a truncated
 * value is the right answer: unlike a ticket id, half a branch name still says which
 * branch it is.
 */

export interface BranchCardProps {
  /** The branch the work is on. Shown in green, because it is where you are. */
  branch: string
  /**
   * The branch this one goes back to. Omit it when there is none, or when it is the
   * same branch — see the note above on why `main → main` is not a row worth drawing.
   */
  base?: string
  /**
   * The copy control, or nothing at all.
   *
   * AN OBJECT AND NOT THREE PROPS, for the reason `Label`'s `avatar` is one: the
   * handler and the name it needs cannot be given separately without letting a
   * caller supply half of them. An icon-only control with no name is a control only
   * its author can use — `ButtonIcon` will not let you skip it, and neither will this.
   *
   * Absent, there is no button and the name simply fills the chip.
   */
  copy?: {
    /** The tooltip and the accessible name, translated. */
    label: string
    /** Whether the name is ON the clipboard right now — the tick instead of the mark. */
    copied?: boolean
    onCopy: () => void
  }
  /** Margins and width. Not the grounds, the radius or either colour. */
  className?: string
}

export function BranchCard({ branch, base, copy, className = '' }: BranchCardProps) {
  // `bg-ink/5` and `rounded-lg` — the action chip's own two values, because every
  // block in the card this sits in is that chip grown. Ink rather than a surface: it
  // is an OVERLAY, so it composes with the card beneath into a visible step up, where
  // surface on surface paints the same value twice and needs a rule around it to be
  // seen at all.
  const chip = 'flex items-center gap-1.5 px-2 py-1.5 bg-ink/5 rounded-lg min-w-0'

  return (
    <div className={`flex items-center gap-1.5 ${className}`.trim()}>
      {base && (
        <>
          {/* `self-stretch` so the base chip matches the height of the current one,
              which is taller whenever it carries the copy button. Two chips either
              side of an arrow that did not line up would read as two rows. */}
          <div className={`self-stretch ${chip} text-text-secondary`}>
            <Icon glyph={GitBranch} tone="inherit" className="flex-shrink-0" />
            <Text tone="inherit" className="truncate" title={base}>
              {base}
            </Text>
          </div>
          <Icon glyph={ArrowRight} size="xs" tone="muted" className="flex-shrink-0" />
        </>
      )}

      {/* `flex-1`: the current branch takes the room left over, so a long name gives
          way on the base chip first — the one you are on is the one worth reading. */}
      <div className={`flex-1 ${chip} text-green`}>
        <Icon glyph={GitBranch} tone="inherit" className="flex-shrink-0" />
        <Text tone="inherit" className="truncate" title={branch}>
          {branch}
        </Text>
        {copy && (
          // `ghost` and `xs`: a plate inside a plate would be a permanent square in a
          // chip that is already one, and the 24px rung would be 24 of this row's 32.
          // Both are `ButtonIcon`'s own answers to being nested — see its notes.
          //
          // THE TICK'S GREEN IS A TONE and not a class in `className`. It was the
          // latter for one measurement, which is how long it took to find out the
          // tick came out grey: two colour classes on one element are settled by the
          // order Tailwind emitted them in. `ButtonIcon` carries exactly one.
          <ButtonIcon
            icon={copy.copied ? Check : Copy}
            title={copy.label}
            onClick={copy.onCopy}
            tone={copy.copied ? 'success' : 'ghost'}
            size="xs"
            className="ml-auto"
          />
        )}
      </div>
    </div>
  )
}
