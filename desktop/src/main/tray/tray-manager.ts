import { Tray, Menu, BrowserWindow, app, shell } from 'electron'
import { getIconForState, type AggregateState } from './tray-icons'
import { AgentStateAggregator } from './agent-state-aggregator'
import { getUpdateStatus, onUpdateStatusChange, installUpdate, type UpdateStatus } from '../updater'
import { autoUpdater } from 'electron-updater'
import { t } from '../i18n'
import { DOCUMENTATION_URL, GITHUB_URL } from '../../urls'

export class TrayManager {
  private tray: Tray | null = null
  private aggregator: AgentStateAggregator
  private getMainWindow: () => BrowserWindow | null
  private onQuit: () => void
  private pulseTimer: ReturnType<typeof setInterval> | null = null
  private pulseOn = true
  private unsubscribeUpdate: (() => void) | null = null

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

    this.unsubscribeUpdate = onUpdateStatusChange(() => {
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

  /**
   * Rebuild the menu from the current agent state and the current strings. Public
   * because a language switch has to trigger one from outside (see main/index.ts);
   * everything else that invalidates it is an event this class owns.
   */
  rebuildMenu(): void {
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
          { label: t('tray.noAgents'), enabled: false },
          { type: 'separator' as const },
        ]

    const updateItem = this.buildUpdateMenuItem()

    const menu = Menu.buildFromTemplate([
      {
        label: t('tray.version', { version: app.getVersion() }),
        enabled: false,
      },
      updateItem,
      { type: 'separator' },
      ...agentItems,
      {
        label: t('tray.showWindow'),
        click: () => this.showMainWindow(),
      },
      {
        label: t('tray.settings'),
        click: () => {
          this.showMainWindow(win => {
            win.webContents.send('tray:openSettings')
          })
        },
      },
      { type: 'separator' },
      {
        label: t('tray.changelog'),
        click: () => shell.openExternal(`${GITHUB_URL}/releases/tag/v${app.getVersion()}`),
      },
      {
        label: t('tray.documentation'),
        click: () => shell.openExternal(DOCUMENTATION_URL),
      },
      {
        label: t('tray.github'),
        click: () => shell.openExternal(GITHUB_URL),
      },
      { type: 'separator' },
      {
        label: t('tray.quit'),
        click: () => {
          this.onQuit()
        },
      },
    ])

    this.tray.setContextMenu(menu)
  }

  private buildUpdateMenuItem(): Electron.MenuItemConstructorOptions {
    const status: UpdateStatus = getUpdateStatus()

    switch (status.type) {
      case 'checking':
        return { label: t('tray.update.checking'), enabled: false }
      case 'available':
        return { label: t('tray.update.downloadingVersion', { version: status.version }), enabled: false }
      case 'downloading': {
        const pct = Math.round(status.progress)
        return { label: t('tray.update.downloadingProgress', { percent: pct }), enabled: false }
      }
      case 'downloaded':
        return {
          label: t('tray.update.restart', { version: status.version }),
          click: () => installUpdate(),
        }
      case 'error':
        return {
          label: t('tray.update.checkFailed'),
          click: () => { autoUpdater.checkForUpdates().catch(() => {}) },
        }
      case 'not-available':
      default:
        return {
          label: t('tray.update.check'),
          click: () => { autoUpdater.checkForUpdates().catch(() => {}) },
        }
    }
  }

  private stateEmoji(state: string): string {
    switch (state) {
      case 'working': return '🔥'
      case 'waiting': return '💬'
      case 'idle': return '😴'
      case 'completed': return '✅'
      case 'error': return '❌'
      default: return '❓'
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
    if (this.unsubscribeUpdate) {
      this.unsubscribeUpdate()
      this.unsubscribeUpdate = null
    }
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
