import { nativeImage, NativeImage } from 'electron'
import { join } from 'path'

export type AggregateState = 'none' | 'idle' | 'running' | 'waiting'

const iconCache = new Map<string, NativeImage>()

function getResourcesPath(): string {
  return join(__dirname, '../../resources/tray')
}

function loadIcon(filename: string): NativeImage {
  const cached = iconCache.get(filename)
  if (cached) return cached

  const iconPath = join(getResourcesPath(), filename)
  const icon = nativeImage.createFromPath(iconPath)
  icon.setTemplateImage(true)
  iconCache.set(filename, icon)
  return icon
}

const stateIconMap: Record<AggregateState, string> = {
  none: 'trayTemplate.png',
  idle: 'trayTemplate-green.png',
  running: 'trayTemplate-orange.png',
  waiting: 'trayTemplate-red.png',
}

export function getIconForState(state: AggregateState): NativeImage {
  return loadIcon(stateIconMap[state])
}
