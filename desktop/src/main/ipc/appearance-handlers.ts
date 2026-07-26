import { ipcMain } from 'electron'
import { applyZoom, currentZoom } from '../appearance'

/**
 * Interface scale. Separate from the config handlers on purpose: the zoom never
 * reaches the cloud (it belongs to the display in front of you, see
 * main/appearance.ts), so it has nothing to do with Config.
 *
 * The theme, which IS a stored preference, is handled with the rest of the
 * config in config-handlers.ts.
 */
export function setupAppearanceHandlers(): void {
  ipcMain.handle('appearance:getZoom', async () => currentZoom())

  ipcMain.handle('appearance:setZoom', async (_event, { zoom }: { zoom: number }) => {
    // Out-of-range values are clamped rather than rejected: the caller is a
    // slider or a menu accelerator, and refusing would just be a dead click.
    return applyZoom(zoom)
  })
}
