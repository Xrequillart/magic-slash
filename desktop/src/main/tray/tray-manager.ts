import { Tray, Menu, BrowserWindow, app, shell } from 'electron'
import { getIconForState, type AggregateState } from './tray-icons'
import { AgentStateAggregator } from './agent-state-aggregator'

const GITHUB_URL = 'https://github.com/xrequillart/magic-slash'
const DOCS_URL = 'https://magic-slash.io'

export class TrayManager {
  private tray: Tray | null = null
  private aggregator: AgentStateAggregator
  private getMainWindow: () => BrowserWindow | null
  private onQuit: () => void
  private pulseTimer: ReturnType<typeof setInterval> | null = null
  private pulseOn = true

  constructor(
    aggregator: AgentStateAggregator,
    getMainWindow: () => BrowserWindow | null,
    onQuit: () => void,
  ) {
    this.aggregator = aggregator
    this.getMainWindow = getMainWindow
    this.onQuit = onQuit
  }

  init(): void {
    const icon = getIconForState('none')
    this.tray = new Tray(icon)
    this.tray.setToolTip('Magic Slash')

    // On macOS, using 'click' + popUpContextMenu causes a double-trigger.
    // Instead, set the menu directly so macOS handles it natively on any click.
    this.rebuildMenu()

    this.tray.on('right-click', () => {
      this.rebuildMenu()
    })

    this.aggregator.on('change', ({ state, count }: { state: AggregateState; count: number }) => {
      this.updateIcon(state)
      this.updateTitle(count)
      this.updatePulse(state)
      this.rebuildMenu()
    })

    // Initial state
    this.aggregator.update()
  }

  /** Show and focus the main window, then run an optional callback with it. */
  private showMainWindow(callback?: (win: BrowserWindow) => void): void {
    const win = this.getMainWindow()
    if (!win) return
    win.show()
    win.focus()
    callback?.(win)
  }

  private rebuildMenu(): void {
    if (!this.tray) return

    const summaries = this.aggregator.getAgentSummaries()

    const agentItems: Electron.MenuItemConstructorOptions[] = summaries.length > 0
      ? [
          ...summaries.map(agent => ({
            label: `${this.stateEmoji(agent.state)} ${agent.title || agent.name}`,
            click: () => {
              this.showMainWindow(win => {
                win.webContents.send('tray:focusAgent', { id: agent.id })
              })
            }
          })),
          { type: 'separator' as const },
        ]
      : [
          { label: 'No active agents', enabled: false },
          { type: 'separator' as const },
        ]

    const menu = Menu.buildFromTemplate([
      {
        label: `Magic Slash v${app.getVersion()}`,
        enabled: false,
      },
      { type: 'separator' },
      ...agentItems,
      {
        label: 'Show Window',
        click: () => this.showMainWindow(),
      },
      {
        label: 'Settings',
        click: () => {
          this.showMainWindow(win => {
            win.webContents.send('tray:openSettings')
          })
        },
      },
      { type: 'separator' },
      {
        label: 'Changelog',
        click: () => shell.openExternal(`${GITHUB_URL}/releases/tag/v${app.getVersion()}`),
      },
      {
        label: 'Documentation',
        click: () => shell.openExternal(DOCS_URL),
      },
      {
        label: 'GitHub',
        click: () => shell.openExternal(GITHUB_URL),
      },
      { type: 'separator' },
      {
        label: 'Quit Magic Slash',
        click: () => {
          this.onQuit()
        },
      },
    ])

    this.tray.setContextMenu(menu)
  }

  private stateEmoji(state: string): string {
    switch (state) {
      case 'working': return '⚡'
      case 'waiting': return '⏳'
      case 'idle': return '💤'
      case 'completed': return '✅'
      case 'error': return '❌'
      default: return '❔'
    }
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
    if (state === 'running' || state === 'waiting') {
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
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}
