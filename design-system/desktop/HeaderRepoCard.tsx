import { ButtonIcon } from './ButtonIcon'
import { FolderGit2, X } from './icons'
import { Label } from './Label'
import { SelectIcon, type SelectIconProps } from './SelectIcon'
import type { IconComponent } from './types'

/**
 * The top line of a repository's card: what it is, and everything you can do to it.
 *
 * THE ORDER IS THE COMPONENT. A name, then a menu, then the two places the repository
 * exists outside this app, then the one control that takes it away. Written in any
 * other order the row stops reading left to right as "this thing → open it → drop
 * it", and the destructive control stops being where the eye arrives last.
 *
 * ONE LAYOUT RULE, AND IT IS LOAD-BEARING: the NAME gives way and the controls never
 * do. This lives in a sidebar that is 288px at its narrowest, holding a repository
 * name of whatever length somebody chose, and half a chip is not a button — so the
 * label truncates to nothing before a control loses a pixel, and the path stays in
 * the tooltip.
 *
 * EVERY CONTROL IS OPTIONAL AND EACH IS AN OBJECT. A repository with no remote has no
 * button for one, rather than a dead chip; a card that cannot be detached has no
 * cross. The objects pair each handler with the name it needs, the way `BranchCard`'s
 * `copy` and `Label`'s `avatar` do — an icon-only control with no name is a control
 * only its author can use, and `ButtonIcon` will not let you skip it.
 *
 * IT IS NOT THE CARD, only its first row. What sits underneath — running scripts, the
 * branch, the diff, the commits — is the caller's, and none of it is the same kind of
 * thing as a header.
 */

/** A control that is one mark: the name it answers to, and what pressing it does. */
export interface HeaderRepoAction {
  icon: IconComponent
  /** The tooltip and the accessible name. Translated. */
  title: string
  onClick: () => void
}

export interface HeaderRepoCardProps {
  /** The repository's name. It is what truncates when the row runs out of room. */
  name: string
  /**
   * The tooltip on the name — the repository's PATH, where the caller has it. A
   * truncated name has no other way to say what it truncated, and two checkouts of
   * one repository are told apart by nothing else.
   */
  title?: string
  /**
   * The repository's hue, one of the sixteen the app assigns at runtime. A hex and
   * not a token: it is chosen while the app is running, so Tailwind never saw it.
   * Without one the chip falls back to the neutral plate, which is the right answer
   * for a repository nobody has coloured.
   */
  color?: string
  /**
   * Makes the name pressable — it opens the repository's settings. Absent, the chip
   * is inert and does not light up under a cursor that can do nothing with it.
   */
  onNameClick?: () => void
  /**
   * The scripts menu, and everything `SelectIcon` needs to draw it. The size and the
   * tone are this row's to decide; everything else is the caller's.
   *
   * `className` IS THE CALLER'S TOO, and it was not for one release. `SelectIcon` only
   * takes margins and placement there — it says so itself — so nothing in it can break
   * this row. What it buys is a HANDLE: the marketing site's scroll tour grabs the parts
   * it zooms to with a selector, and a part that lives inside a design-system component
   * has no `data-part` to be found by. A class is how the ticket card's two parts are
   * already marked, and the scripts trigger is the third. The alternative was the tour
   * framing the whole header because it could not reach the one button inside it.
   */
  scripts?: Omit<SelectIconProps, 'size' | 'tone'>
  /**
   * Open in the editor. It wears VS Code's own blue on hover — a borrowed colour that
   * may never become a token, which is exactly why `ButtonIcon` carries it as a tone
   * rather than letting a call site spell the hex.
   */
  editor?: HeaderRepoAction
  /**
   * Open where the repository lives — GitHub, or whatever else one day. The MARK is
   * the caller's for that reason: this row knows a remote is a place you can go, not
   * whose place it is.
   */
  remote?: HeaderRepoAction
  /**
   * Detach the repository from the agent.
   *
   * NO ICON TO PASS, unlike the two above. A cross is not a brand and there is no
   * second drawing of "remove" to choose between — and the `danger` tone is what
   * actually says what this one does, through a red hover where its neighbours wear
   * their own colours. The row is one set of controls; only the hover disagrees.
   */
  remove?: Omit<HeaderRepoAction, 'icon'>
  /** Margins and width. Not the gaps, the order or any of the tones. */
  className?: string
}

export function HeaderRepoCard({
  name,
  title,
  color,
  onNameClick,
  scripts,
  editor,
  remote,
  remove,
  className = '',
}: HeaderRepoCardProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      {/* THE MARK IS FIXED, where the two brand buttons' are the caller's. A
          repository has no mark of its own to be recognised by — its COLOUR does that
          job, which is why `Label` paints the glyph in the ground's own hue here and
          nowhere else. A folder is then the only thing left to draw, and offering a
          choice of it would be a prop nobody has a second answer for. */}
      <Label
        tone="neutral"
        icon={FolderGit2}
        color={color}
        onClick={onNameClick}
        title={title ?? name}
        truncate
      >
        {name}
      </Label>

      {/* `ml-auto` pushes the set to the far edge and `flex-shrink-0` holds it there.
          Both are needed: without the first the controls follow a short name into the
          middle of the row, and without the second they are what a long one squeezes. */}
      <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
        {scripts && <SelectIcon {...scripts} tone="purple" />}
        {editor && (
          <ButtonIcon
            icon={editor.icon}
            title={editor.title}
            onClick={editor.onClick}
            tone="vscode"
          />
        )}
        {remote && (
          <ButtonIcon icon={remote.icon} title={remote.title} onClick={remote.onClick} />
        )}
        {remove && <ButtonIcon icon={X} title={remove.title} onClick={remove.onClick} tone="danger" />}
      </div>
    </div>
  )
}
