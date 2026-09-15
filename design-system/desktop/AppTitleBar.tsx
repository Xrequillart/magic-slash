import type { CSSProperties, ReactNode } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { Archive, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Settings2 } from './icons'
import { Label } from './Label'
import type { IconComponent } from './types'

/**
 * THE BAR ACROSS THE TOP OF THE WINDOW, whole — and like `Sidebar`, it knows nothing.
 *
 * It draws the gutter macOS's traffic lights sit in, the two panel toggles, up to two
 * segmented switches, the agent's title in the middle and one action before the right
 * toggle. What it does NOT have is a fact of its own: no store, no translator, no idea
 * what an agent is beyond a string and whether it has the focus. Hand it props and it
 * draws them; hand it none and it draws an empty 40px band the window can be dragged by.
 *
 * THE MARKETING SITE IS WHY, the same way it was for `Sidebar`. `AppWindowMockup` on the
 * public site redrew this bar by hand — the `w-16` gutter, the `p-[5px]` toggles and the
 * two sidebar SVGs copied path for path, with comments naming the lines they came from.
 * A drawing that IS the component cannot fall behind it.
 *
 * SO EVERY STRING ARRIVES TRANSLATED. The toggles' tooltips, the switches' two words,
 * the agent titles, the action's label: all of them are the caller's.
 *
 * `-webkit-app-region` IS ON THE ROOT AND OFF EVERY CONTROL, which is what makes the
 * window draggable by its bar and clickable by its buttons. A browser ignores the
 * property entirely, so the site pays nothing for it and the app needs nothing extra.
 */

/**
 * The bar's height, in pixels, and the reason it is a number anybody can import.
 *
 * The desktop's `PageModal` needs it: a full-screen overlay stops BELOW this bar rather
 * than covering it, so the window stays draggable, the traffic lights stay where macOS
 * drew them, and the app never loses its own chrome. Two places holding the same 40 is
 * how one of them ends up holding 48.
 */
export const TITLE_BAR_HEIGHT = 40

/**
 * One of the two panel toggles.
 *
 * `open` IS THE PANEL'S STATE, not the button's, and it decides both halves of what the
 * control says: the mark becomes the CLOSE glyph while the panel is out (the chevron
 * points at the edge it would fold into) and the mark LIGHTS — `ButtonIcon`'s `active`
 * at `ink`, which also brings the `aria-pressed` that makes it a toggle out loud rather
 * than just on screen.
 *
 * IN INK AND NOT IN ACCENT, which is the one place this bar overrules `ButtonIcon`'s
 * default. Both panels are open most of the time, so the accent would be showing almost
 * always — two coloured squares at rest, announcing the app's own furniture. Lit ink is
 * what the hand-written bar did and it was right.
 */
export interface TitleBarToggle {
  open: boolean
  /** The tooltip and the accessible name. Translated. */
  title: string
  onToggle: () => void
}

/** One half of a switch. Two of these, never three — see `TitleBarSwitch`. */
export interface TitleBarSwitchOption {
  /** Stable across renders, and what `onSelect` hands back — 'split', 'planner'. */
  id: string
  /** The word on the segment. Translated. */
  label: string
  /** The longer sentence under the pointer. Translated. */
  title?: string
}

/**
 * A PAIR OF WORDS, ONE OF THEM ON — the view switch, beside the left toggle.
 *
 * EXACTLY TWO OPTIONS, spelled as a tuple so a third is a type error rather than a
 * layout bug: the thumb is half the track and slides by its own width, which is a
 * two-value shape and not a list that happens to be short. A third value wants a
 * `SelectIcon` instead.
 *
 * THERE WAS A SECOND SWITCH, on the right, changing an agent between coder and planner,
 * and it is gone because the product decided it earned nothing. It took a size ladder
 * with it: this one stands at the view switch's own padding and there is no second rung
 * to keep in step with. A rung with no caller is a promise nobody is keeping.
 */
export interface TitleBarSwitch {
  options: readonly [TitleBarSwitchOption, TitleBarSwitchOption]
  /** Whichever `id` is on. A value matching neither leaves the thumb on the left. */
  value: string
  onSelect: (id: string) => void
  /**
   * Margins, and the caller's own enter/exit animation.
   *
   * THE ANIMATION IS THE CALLER'S because its trigger is: the view switch appears when a
   * second agent does, and the desktop slides it in and out with keyframes declared in
   * its own Tailwind config. A component here cannot name those without the site
   * declaring them too, for an animation the site has no second agent to fire.
   */
  className?: string
  /**
   * The caller's exit animation has finished.
   *
   * It rides on the switch rather than on the bar because that is the element running
   * the keyframes, and a caller that unmounts on this needs to know it was THIS switch
   * that ended — a handler on the root would fire for anything inside it.
   */
  onAnimationEnd?: () => void
}

/**
 * One name in the middle of the bar.
 *
 * A LIST AND NOT A STRING, because a split window shows two and dims the one that is not
 * being typed into. One title is drawn quiet whatever `focused` says — there is nothing
 * to tell it apart from — and two are drawn either lit or dimmed, with a rule between.
 */
export interface TitleBarTitle {
  /** Stable across renders — the agent's id, not an index. */
  id: string
  label: string
  focused?: boolean
}

/**
 * THE ONE ACTION IN THE BAR, and it belongs to the agent rather than to a panel.
 *
 * It is here for that reason: the desktop's info sidebar has no header to carry the
 * archive any more, and a control that closes the agent cannot live in something the
 * agent's owner may have collapsed.
 *
 * DRAWN BY `Label`, which is the component for a mark and a word on a tinted plate and
 * was already the right answer before this bar hand-rolled its own pill. It brings the
 * plate the toggles beside it wear (`bg-ink/5`), the same 24px height and the same
 * radius, so the right-hand group is three controls of one family rather than a pill
 * and two squares. `onClick` is what makes a `Label` a button at all — without one it
 * renders a span with no pointer and nothing in the tab order, deliberately.
 */
export interface TitleBarAction {
  /** The word beside the mark. Translated — this control is NOT icon-only. */
  label: string
  /** The tooltip, which is where the shortcut goes. Translated. */
  title: string
  onClick: () => void
  /** `Archive` unless the caller says otherwise. */
  icon?: IconComponent
}

export interface AppTitleBarProps {
  /**
   * Keeps the 64px the traffic lights occupy clear.
   *
   * TRUE BY DEFAULT, and the app turns it OFF in native fullscreen: the lights are gone
   * there, and the gutter with them, or the first toggle sits beside a hole nothing
   * fills. The flex gap goes with the spacer, so the button lands flush against the
   * bar's own padding.
   */
  trafficLightGutter?: boolean
  /** The toggle for the panel on the left, first in the bar after the gutter. */
  left?: TitleBarToggle
  /** The switch beside the left toggle. */
  leftSwitch?: TitleBarSwitch
  /** The name, or the two names, in the middle. */
  titles?: TitleBarTitle[]
  /** The action before the right toggle. */
  action?: TitleBarAction
  /** The toggle for the panel on the right, after the action. */
  right?: TitleBarToggle
  /**
   * THE QUICK-SETTINGS TOGGLE, last in the bar — where the platform keeps its own
   * Control Center, at the far right of the menu bar.
   *
   * `open` is the MENU's state, `TitleBarToggle`'s rule: the mark lights in ink while
   * the sheet is down, and `aria-pressed` says so out loud. The sheet itself is the
   * caller's `ControlCenter`, portalled elsewhere; this is only the button that pulls
   * it down and puts it back. `Settings2` — two sliders — unless the caller says
   * otherwise, because a cog is what opens the settings PAGE and these are not it.
   */
  settings?: TitleBarToggle & { icon?: IconComponent }
  /**
   * A STANDING NOTICE, before the quick-settings toggle — "Notifications off".
   *
   * `TitleBarAction`'s shape because it is one: a mark and a word on a plate, and a click
   * that does something about it — the app opens the quick settings, where the switch
   * is. It is here and not in a corner of a page because it says something about the
   * whole app for as long as it is true, and the bar is the one strip on screen for as
   * long as the app is.
   */
  notice?: TitleBarAction
  /** Margins and placement. Not the height, the ground, or the order of the regions. */
  className?: string
}

export function AppTitleBar({
  trafficLightGutter = true,
  left,
  leftSwitch,
  titles = [],
  action,
  right,
  settings,
  notice,
  className = '',
}: AppTitleBarProps) {
  const hasRight = Boolean(action || right || settings || notice)

  return (
    <div
      className={`bg-surface-sunken select-none flex items-center justify-between px-3 relative ${className}`}
      // The height as the exported number rather than as `h-10`, so `PageModal` and this
      // bar cannot drift apart: it lays itself out against exactly this value.
      style={{ height: TITLE_BAR_HEIGHT, WebkitAppRegion: 'drag' } as CSSProperties}
    >
      <div className="flex items-center gap-2">
        {trafficLightGutter && <div className="w-16 flex-shrink-0" />}

        <Controls>
          {left && (
            <ButtonIcon
              icon={left.open ? PanelLeftClose : PanelLeftOpen}
              title={left.title}
              onClick={left.onToggle}
              active={left.open}
              activeTone="ink"
            />
          )}
          {leftSwitch && <Switch {...leftSwitch} />}
        </Controls>
      </div>

      {/* THE NAMES, absolutely positioned — so the two flex groups either side are laid
          out as though the middle were empty, and a long title cannot shunt a control.
          A width cap is then the only thing keeping it clear of them; 36% rather than
          40% because the view switch beside it is wider in French. */}
      {titles.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 text-sm truncate max-w-[36%]">
          <Titles titles={titles} />
        </div>
      )}

      {hasRight && (
        <Controls>
          {action && <Action {...action} />}
          {right && (
            <ButtonIcon
              icon={right.open ? PanelRightClose : PanelRightOpen}
              title={right.title}
              onClick={right.onToggle}
              active={right.open}
              activeTone="ink"
            />
          )}
          {notice && <Action {...notice} />}
          {settings && (
            <ButtonIcon
              icon={settings.icon ?? Settings2}
              title={settings.title}
              onClick={settings.onToggle}
              active={settings.open}
              activeTone="ink"
            />
          )}
        </Controls>
      )}
    </div>
  )
}

/**
 * A group of controls, and the one thing every group in this bar has to say: DO NOT DRAG
 * THE WINDOW BY ME.
 *
 * Written once rather than on each group, because the failure is silent in the worst
 * way — a button that misses it still looks and hovers exactly right, and only refuses
 * to be clicked.
 */
function Controls({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-center gap-1"
      style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
    >
      {children}
    </div>
  )
}

/**
 * The middle of the bar.
 *
 * ONE TITLE IS QUIET. It is the only thing there; lighting it would be lighting the
 * whole middle of a bar whose job is to stay out of the way. Two are a comparison, and
 * then the lit one is the answer to "which of these am I typing into".
 */
function Titles({ titles }: { titles: TitleBarTitle[] }) {
  if (titles.length === 1) {
    return <span className="text-text-secondary">{titles[0].label}</span>
  }
  return (
    <div className="flex items-center gap-2">
      {titles.map((title, index) => (
        <span key={title.id} className="flex items-center gap-2">
          {index > 0 && <span className="text-text-secondary/30">|</span>}
          <span className={title.focused ? 'text-ink' : 'text-text-secondary/50'}>
            {title.label}
          </span>
        </span>
      ))}
    </div>
  )
}

function Switch({ options, value, onSelect, className = '', onAnimationEnd }: TitleBarSwitch) {
  // The SECOND option is the one that moves the thumb. A value matching neither leaves
  // it where it starts, which is the honest drawing of "nothing is chosen yet" and not
  // an empty track that looks broken.
  const secondOn = value === options[1].id

  return (
    <div
      className={`relative grid grid-cols-2 bg-surface rounded-full p-px ${className}`}
      onAnimationEnd={onAnimationEnd}
    >
      {/* THE THUMB IS A SIBLING, not the chosen button's own ground: a background that
          moves from one element to another can only cut, and this one slides. It is
          inset by the track's own padding on every side. */}
      <div
        className={`absolute top-px bottom-px left-px right-1/2 bg-surface-strong rounded-full
          transition-transform duration-200 ${secondOn ? 'translate-x-full' : 'translate-x-0'}`}
      />
      {options.map((option) => {
        const on = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => { if (!on) onSelect(option.id) }}
            title={option.title}
            aria-pressed={on}
            className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-medium
              text-center transition-colors duration-200 ${
                on ? 'text-ink' : 'text-text-secondary/50 hover:text-text-secondary'
              }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/** A mark AND its word, which is why it is a `Label` and not a `ButtonIcon`: the thing
 *  it does is irreversible enough to be worth naming on the bar rather than in a
 *  tooltip. `neutral` is the tone that brings no mark of its own, so the caller's is
 *  the one drawn — `Archive` unless it says otherwise. */
function Action({ label, title, onClick, icon = Archive }: TitleBarAction) {
  return (
    <Label tone="neutral" icon={icon} title={title} onClick={onClick}>
      {label}
    </Label>
  )
}
