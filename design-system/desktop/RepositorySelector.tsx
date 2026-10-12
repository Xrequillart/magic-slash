import { Card } from './Card'
import { Label } from './Label'
import { Modal } from './Modal'
import { ButtonIcon } from './ButtonIcon'
import { Check, FolderGit2, X } from './icons'
import type { AnimationEvent } from 'react'

/**
 * THE PICKER: which repositories this agent is working in.
 *
 * A `Modal` holding a `Card`, and a row per repository. Every row is a `Label` at `lg` —
 * the same chip `HeaderRepoCard` puts on a repository card and `SpecCard` puts in its
 * heading, one size up because here the repository IS the row rather than a detail inside
 * one. That matters more than it sounds: the picker used to draw one purple folder glyph on
 * every row, so the list said nothing until it was read, while every other surface in the
 * app had been colouring these repositories for months. Now the picker matches its own
 * result — the card a click adds to the sidebar wears the same chip.
 *
 * IT KNOWS NO CONFIG. A repository arrives as a name, a colour and whether it is already
 * attached; the colour is resolved from the full repository list, which needs a palette and
 * a config this folder cannot reach.
 */

export interface RepositorySelectorRepo {
  /** The checkout path — the row's identity, and what `onToggle` hands back. */
  path: string
  name: string
  /** The hue it was given in Settings, or undefined for one this app knows none for. */
  color?: string
  attached: boolean
}

export interface RepositorySelectorProps {
  title: string
  repos: RepositorySelectorRepo[]
  /** Nothing to pick from: no repository is configured yet. */
  emptyLabel: string
  closeLabel: string
  onClose: () => void
  onToggle: (path: string) => void
  /** The caller's enter and exit animation — see `Modal`, which owns neither. */
  backdropClassName?: string
  className?: string
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  /** Passed straight to `Modal` — see its note on why a drawing of the app needs it. */
  portalTo?: HTMLElement | null
}

export function RepositorySelector({
  title,
  repos,
  emptyLabel,
  closeLabel,
  onClose,
  onToggle,
  backdropClassName,
  className = '',
  onAnimationEnd,
  portalTo,
}: RepositorySelectorProps) {
  return (
    <Modal
      onClose={onClose}
      labelledBy="repository-selector-title"
      backdropClassName={backdropClassName}
      onAnimationEnd={onAnimationEnd}
      portalTo={portalTo}
      className={`w-full max-w-md mx-4 ${className}`.trim()}
    >
      {/* `padding="none"`: the two regions below state their own, because the header's is
          not the list's. The plate is the card's, the window colour under it is `Modal`'s. */}
      <Card padding="none">
        <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4">
          {/* Neutral, and no mark beside it: the title names the LIST, and there is no one
              repository here to take a colour from. */}
          <span id="repository-selector-title" className="text-xs font-semibold text-ink">
            {title}
          </span>
          <ButtonIcon icon={X} title={closeLabel} onClick={onClose} className="-mr-1.5" />
        </div>

        <div className="px-5 pb-5 space-y-1">
          {repos.map((repo) => (
            <button
              key={repo.path}
              type="button"
              onClick={() => onToggle(repo.path)}
              /* `surface-subtle` and not `surface`: the row's tint sits BEHIND a chip that
                 already has one, so at 6% the two grounds competed and the row read as a
                 second, wider plate. At 4% it answers the cursor without drawing a shape.

                 `rounded-xl` is the CHIP's radius — `Label` at `lg` — so the corner that
                 lights up follows the corner already on the row rather than cutting inside
                 it, which is what `rounded-lg` did at 8px against the chip's 12. */
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-surface-subtle transition-colors text-left"
            >
              <Label size="lg" tone="neutral" icon={FolderGit2} color={repo.color} truncate>
                {repo.name}
              </Label>
              {/* `ml-auto` and not a spacer: the chip is as wide as its name, so the tick has
                  to be pushed rather than placed. */}
              {repo.attached && <Check className="w-4 h-4 ml-auto flex-shrink-0 text-green" />}
            </button>
          ))}

          {repos.length === 0 && (
            <div className="text-center py-8 text-xs text-text-secondary/50">{emptyLabel}</div>
          )}
        </div>
      </Card>
    </Modal>
  )
}
