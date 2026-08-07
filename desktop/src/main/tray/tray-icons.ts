import { nativeImage, NativeImage } from 'electron'
import { join } from 'path'

/** `question` outranks the rest: see AgentStateAggregator.update. */
export type AggregateState = 'none' | 'idle' | 'running' | 'waiting' | 'question'

const iconCache = new Map<string, NativeImage>()

function getResourcesPath(): string {
  return join(__dirname, '../../resources/tray')
}

/**
 * A template image is the right default in a menu bar: macOS masks it to a single
 * colour and picks that colour itself, so the icon stays legible whether the bar is
 * light or dark. The cost is that it discards the asset's own colours. That is why
 * `idle`, `running` and `waiting` share one file: they used to name three of their own
 * (`-green`, `-orange`, `-red`) that were byte-identical and rendered identically.
 * A colour only survives with the flag off, and then the asset has to carry a hue that
 * works on both a white and a black bar by itself.
 */
interface IconSpec {
  file: string
  template: boolean
}

function loadIcon({ file, template }: IconSpec): NativeImage {
  const cached = iconCache.get(file)
  if (cached) return cached

  const iconPath = join(getResourcesPath(), file)
  const icon = nativeImage.createFromPath(iconPath)
  icon.setTemplateImage(template)
  iconCache.set(file, icon)
  return icon
}

const stateIconMap: Record<AggregateState, IconSpec> = {
  none: { file: 'trayTemplate.png', template: true },
  idle: { file: 'trayActiveTemplate.png', template: true },
  running: { file: 'trayActiveTemplate.png', template: true },
  waiting: { file: 'trayActiveTemplate.png', template: true },
  // The one state that is worth interrupting someone for, so the one that opts out of
  // the template mask and shows real colour. Orange (#F97316, the app's own) clears
  // both bar backgrounds; a template icon could not have said this at all.
  question: { file: 'trayQuestion.png', template: false },
}

export function getIconForState(state: AggregateState): NativeImage {
  return loadIcon(stateIconMap[state])
}
