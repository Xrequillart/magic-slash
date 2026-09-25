import { Button } from './Button'
import { Folder, FolderPlus } from './icons'
import { ItemGroup } from './Item'
import { RepositoryItem, type RepositoryItemProps } from './RepositoryItem'
import { SectionHeader } from './SectionHeader'
import type { IconComponent } from './types'

/**
 * THE REPOSITORIES PAGE: the button that adds one, and a section per owner — the reader's
 * own under a padlock, each organization's under its name — with a `RepositoryItem` per
 * repository.
 *
 * IT WAS THE LIST HALF OF `pages/Config/index.tsx`, moved so the site can draw the same
 * screen. What a row SAYS — which remote, how many agents, whether a folder is bound — is
 * worked out by the app and arrives as `RepositoryItem`'s props; which owner a repository
 * belongs to arrives as the sections.
 *
 * NO HEADING OVER THE WHOLE: the window has one page and the page is the repositories, so
 * a title naming it would name what the reader is already looking at. What is left of the
 * row it used to share is the action, at the right edge.
 */

export interface RepositoryListSection {
  id: string
  icon: IconComponent
  title: string
  /** Its repositories. `key` is React's; the rest is `RepositoryItem`'s. */
  rows: (RepositoryItemProps & { key: string })[]
  /** The sentence in the dashed box when `rows` is empty. */
  empty: string
}

export interface RepositoryListProps {
  /** "Add repository", and the state while a folder is being added. */
  add: { label: string; busy?: boolean; onClick: () => void }
  /**
   * NO REPOSITORY AT ALL: the whole list is one dashed box that adds the first one,
   * instead of empty sections. Absent draws the sections whatever they hold.
   */
  empty?: { title: string; hint: string }
  sections: RepositoryListSection[]
  className?: string
}

export function RepositoryList({ add, empty, sections, className = '' }: RepositoryListProps) {
  const nothing = sections.every((section) => section.rows.length === 0)

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-end">
        {/* `neutral`, an affordance in the corner rather than the step the page asks for;
            `busy` rather than `disabled`, because adding hits the cloud and a button that
            only dims says "unavailable" about a control that is working. */}
        <Button size="md" icon={FolderPlus} {...(add.busy ? { busy: true } : {})} onClick={add.onClick}>
          {add.label}
        </Button>
      </div>

      {empty && nothing ? (
        <button
          type="button"
          onClick={add.onClick}
          disabled={add.busy}
          className="w-full py-8 text-center border border-dashed border-border/50 rounded-xl hover:border-text-secondary/50 hover:bg-surface transition-colors"
        >
          <Folder className="w-8 h-8 text-icon-muted mx-auto mb-3" />
          <div className="text-sm text-text-secondary/50 mb-1">{empty.title}</div>
          <div className="text-xs text-text-secondary/30">{empty.hint}</div>
        </button>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            // `gap-3` from the wrapper with `spacing="none"`: the heading spaces itself from
            // its list with the parent's gap rather than a margin only one of them knows.
            <div key={section.id} className="flex flex-col gap-3">
              <SectionHeader icon={section.icon} title={section.title} count={section.rows.length} spacing="none" />
              {section.rows.length === 0 ? (
                <div className="px-4 py-3 text-xs text-text-secondary/40 border border-dashed border-line-field rounded-xl">
                  {section.empty}
                </div>
              ) : (
                // Flush rows on one ground: a section reads as one panel divided into its
                // repositories. The radius is on the first and the last — see `Item`.
                <ItemGroup>
                  {section.rows.map(({ key, ...row }) => <RepositoryItem key={key} {...row} />)}
                </ItemGroup>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
