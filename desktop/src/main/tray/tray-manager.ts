import { Tray } from 'electron'
import { getIconForState, type AggregateState } from './tray-icons'
import { AgentStateAggregator } from './agent-state-aggregator'
import { createPopoverWindow, togglePopover, hidePopover } from '../windows/popover-window'

/**
 * The menu bar icon. Clicking it opens the app's own panel (see
 * renderer/pages/TrayPopover) rather than a native macOS menu: the panel shows
 * each agent's live state with the same loader, clock and check the sidebar uses,
 * and follows the app's theme — none of which a `Menu` can render.
 *
 * Consequence worth knowing: this class no longer builds anything from strings,
 * so a language switch does not have to reach it. The panel is a normal renderer
 * window and re-translates itself.
 */
export class TrayManager {
  private tray: Tray | null = null
  private aggregator: AgentStateAggregator
  private pulseTimer: ReturnType<typeof setInterval> | null = null
  private pulseOn = true

  constructor(aggregator: AgentStateAggregator) {
    this.aggregator = aggregator
  }

  init(): void {
    const icon = getIconForState('none')
    this.tray = new Tray(icon)
    this.tray.setToolTip('Magic Slash')

    // Built now rather than on the first click: a native menu opened instantly,
    // and a window that has to boot a renderer first would not. It stays hidden
    // until asked for.
    createPopoverWindow()

    // No context menu is set at all: with one attached, macOS opens it on any
    // click and the panel below would never be reached. Both buttons toggle it.
    this.tray.on('click', () => this.toggle())
    this.tray.on('right-click', () => this.toggle())

    this.aggregator.on('change', ({ state }: { state: AggregateState }) => {
      // Snapped back to the loud beat on every change: a question that has just come in
      // should not wait up to a second for its orange, and the icon and the title have
      // to agree on which beat they are showing.
      this.pulseOn = true
      this.applyFrame()
      this.updatePulse(state)
    })

    // Initial state
    this.aggregator.update()
  }

  private toggle(): void {
    if (!this.tray) return
    togglePopover(this.tray.getBounds())
  }

  /**
   * The text beside the icon, for the beat the pulse is currently on.
   *
   * Normally the number of agents that are up. While one of them is asking something,
   * the loud beat swaps that total for `?N` — N being how many are actually blocked on
   * an answer, which is the number worth acting on: three agents running and one asking
   * is one thing to do, not four. It rides the same rhythm as the colour on purpose.
   * The orange says someone needs you and the `?N` says how many; read as one signal,
   * they have to change together.
   */
  private renderTitle(): string {
    const questions = this.aggregator.getQuestionCount()
    if (this.pulseOn && this.aggregator.getState() === 'question' && questions > 0) {
      return `?${questions}`
    }
    const count = this.aggregator.getActiveCount()
    return count > 0 ? `${count}` : ''
  }

  /**
   * Icon and title painted together, so they can never disagree about the beat. On the
   * quiet one the mark falls back to `none`, which is the same rabbit without its status
   * dot — that is the whole animation.
   */
  private applyFrame(): void {
    if (!this.tray) return
    const state = this.aggregator.getState()
    this.tray.setImage(getIconForState(this.pulseOn ? state : 'none'))
    this.tray.setTitle(this.renderTitle())
  }

  private updatePulse(state: AggregateState): void {
    const shouldPulse = state === 'running' || state === 'waiting' || state === 'question'

    if (!shouldPulse) {
      if (this.pulseTimer) {
        clearInterval(this.pulseTimer)
        this.pulseTimer = null
      }
      return
    }

    // Left running across a change: restarting it would let a stream of updates reset
    // the interval forever and the icon would sit still.
    if (this.pulseTimer) return
    this.pulseTimer = setInterval(() => {
      this.pulseOn = !this.pulseOn
      this.applyFrame()
    }, 1000)
  }

  destroy(): void {
    if (this.pulseTimer) {
      clearInterval(this.pulseTimer)
      this.pulseTimer = null
    }
    hidePopover()
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}
