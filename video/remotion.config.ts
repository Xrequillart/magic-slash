import path from 'node:path'
import { Config } from '@remotion/cli/config'
import { enableTailwind } from '@remotion/tailwind'

// Quality over speed: lossless frames, rendered at twice the composition's size (4K,
// so the app's small text stays sharp under the camera's zooms), encoded gently.
Config.setVideoImageFormat('png')
Config.setScale(2)
Config.setCrf(14)
Config.setX264Preset('slow')
Config.setPixelFormat('yuv420p')
Config.setColorSpace('bt709')
Config.setConcurrency(6)

Config.overrideWebpackConfig((current) => {
  const withTailwind = enableTailwind(current, {
    configLocation: path.resolve(process.cwd(), 'tailwind.config.cjs'),
  })
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...(withTailwind.resolve?.alias ?? {}),
        // The film draws the app with the app's own components, read as source the
        // way desktop/ and webapp/ read them (see design-system/README.md).
        '@ds': path.resolve(process.cwd(), '../design-system'),
        // design-system/ installs no React of its own (.npmrc: no peers), so a shared
        // file has to find this package's copy rather than none, or a second one.
        react: path.resolve(process.cwd(), 'node_modules/react'),
        'react-dom': path.resolve(process.cwd(), 'node_modules/react-dom'),
      },
      // Lets a file under design-system/ or desktop/ resolve what only this package
      // installs, without hiding the design system's own lucide behind it.
      modules: ['node_modules', path.resolve(process.cwd(), 'node_modules')],
    },
  }
})
