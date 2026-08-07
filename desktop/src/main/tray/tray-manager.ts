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

    this.aggregator.on('change', ({ state, count }: { state: AggregateState; count: number }) => {
      this.updateIcon(state)
      this.updateTitle(count)
      this.updatePulse(state)
    })

    // Initial state
    this.aggregator.update()
  }

  private toggle(): void {
    if (!this.tray) return
    togglePopover(this.tray.getBounds())
  }

  private updateIcon(state: AggregateState): void {
    if (!this.tray) return
    this.tray.setImage(getIconForState(state))
  }

  private updateTitle(count: number): void {
    if (!this.tray) return
    this.tray.setTitle(count > 0 ? `${count}` : '')
  }

  private updatePulse(state: AggregateState): void {
    if (state === 'running' || state === 'waiting' || state === 'question') {
      if (!this.pulseTimer) {
        this.pulseOn = true
        this.pulseTimer = setInterval(() => {
          if (!this.tray) return
          this.pulseOn = !this.pulseOn
          this.tray.setImage(getIconForState(this.pulseOn ? this.aggregator.getState() : 'none'))
        }, 1000)
      }
    } else {
      if (this.pulseTimer) {
        clearInterval(this.pulseTimer)
        this.pulseTimer = null
        this.pulseOn = true
        // Ensure correct icon is shown
        if (this.tray) {
          this.tray.setImage(getIconForState(state))
        }
      }
    }
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
