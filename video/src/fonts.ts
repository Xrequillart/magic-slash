import { loadFont } from '@remotion/fonts'
import light from '../../desktop/src/renderer/fonts/Cera Pro Light.otf'
import italic from '../../desktop/src/renderer/fonts/Cera Pro Regular Italic.otf'
import medium from '../../desktop/src/renderer/fonts/Cera Pro Medium.otf'
import bold from '../../desktop/src/renderer/fonts/Cera Pro Bold.otf'
import black from '../../desktop/src/renderer/fonts/Cera Pro Black.otf'

// The app's own faces, the same files desktop/src/renderer/index.css declares.
const FACES = [
  { url: light, weight: '300', style: 'normal' },
  { url: italic, weight: '400', style: 'italic' },
  { url: medium, weight: '500', style: 'normal' },
  { url: bold, weight: '700', style: 'normal' },
  { url: black, weight: '900', style: 'normal' },
] as const

export const fontsReady = Promise.all(
  FACES.map((face) => loadFont({ family: 'Cera Pro', url: face.url, weight: face.weight, style: face.style })),
)
