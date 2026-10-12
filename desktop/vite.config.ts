import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Load .env / .env.local (any prefix) from the desktop dir, falling back to the
  // shell's process.env. Lets you point at a Supabase project via an untracked
  // .env.local instead of exporting env vars before every run.
  const env = loadEnv(mode, process.cwd(), '')
  const supabaseUrl = env.MAGIC_SLASH_SUPABASE_URL || process.env.MAGIC_SLASH_SUPABASE_URL || ''
  const supabaseAnonKey = env.MAGIC_SLASH_SUPABASE_ANON_KEY || process.env.MAGIC_SLASH_SUPABASE_ANON_KEY || ''
  // The Atlassian OAuth client id. A PUBLIC identifier (it rides in the authorize
  // URL the user's own browser opens), which is why it travels the same way as the
  // Supabase anon key rather than through any secret path. Absent → the desktop
  // reports `configured: false` and Settings says the feature is not available in
  // this build, which is the correct state until the Atlassian app is registered.
  const atlassianClientId = env.MAGIC_SLASH_ATLASSIAN_CLIENT_ID || process.env.MAGIC_SLASH_ATLASSIAN_CLIENT_ID || ''

  return {
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(args) {
          args.startup()
        },
        vite: {
          // Bundle the Supabase URL + anon key, and the Atlassian OAuth client id,
          // into the MAIN process build.
          // The anon key is public/safe to ship (RLS enforces access). When these
          // env vars are absent at build time they resolve to undefined and the
          // cloud client stays disabled — the app still boots and works offline.
          define: {
            'process.env.MAGIC_SLASH_SUPABASE_URL': JSON.stringify(supabaseUrl),
            'process.env.MAGIC_SLASH_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
            'process.env.MAGIC_SLASH_ATLASSIAN_CLIENT_ID': JSON.stringify(atlassianClientId),
          },
          build: {
            outDir: 'dist/main',
            minify: 'esbuild',
            rollupOptions: {
              // bufferutil / utf-8-validate are OPTIONAL native speed-ups that
              // `ws` requires inside a try/catch. Bundling turns that guarded
              // require into a hard import, and rollup then emits a stub that
              // throws "Could not resolve …" the moment dist/main/index.js
              // loads — the app dies at boot. Keeping them external leaves a
              // plain runtime require that ws's catch handles (it falls back to
              // its pure-JS path), exactly as in an unbundled install.
              external: ['electron', 'node-pty', 'bufferutil', 'utf-8-validate'],
              output: {
                format: 'cjs',
              }
            }
          }
        }
      },
      {
        entry: 'src/preload/index.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist/preload',
            minify: 'esbuild',
            rollupOptions: {
              output: {
                format: 'cjs',
              }
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      // The shared components, compiled from source — there is no package and no
      // build step in `design-system/`, and deliberately so: two apps with two
      // `node_modules` and no workspaces cannot agree on a published artefact,
      // but they can both read a .tsx file.
      '@ds': resolve(__dirname, '../design-system')
    },
    // The DS files resolve their `react` import from the ROOT `node_modules`,
    // which has none — so without this Vite happily bundles a second copy the
    // moment one ever lands there, and two Reacts in one renderer is a blank
    // window with "invalid hook call" in the console.
    dedupe: ['react', 'react-dom']
  },
  server: {
    // `design-system/` sits ABOVE the Vite root, and the dev server refuses to
    // serve a file outside it unless the path is allowed. Without this the app
    // builds for production and 403s in dev, which is the worse way round.
    fs: { allow: [resolve(__dirname), resolve(__dirname, '../design-system')] }
  },
  build: {
    outDir: 'dist/renderer',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        popover: resolve(__dirname, 'popover.html'),
        'quick-launch': resolve(__dirname, 'quick-launch.html'),
      },
    },
  }
  }
})
