import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(args) {
          args.startup()
        },
        vite: {
          // Bundle the Supabase URL + anon key into the MAIN process build.
          // The anon key is public/safe to ship (RLS enforces access). When these
          // env vars are absent at build time they resolve to undefined and the
          // cloud client stays disabled — the app still boots and works offline.
          define: {
            'process.env.MAGIC_SLASH_SUPABASE_URL': JSON.stringify(process.env.MAGIC_SLASH_SUPABASE_URL || ''),
            'process.env.MAGIC_SLASH_SUPABASE_ANON_KEY': JSON.stringify(process.env.MAGIC_SLASH_SUPABASE_ANON_KEY || ''),
          },
          build: {
            outDir: 'dist/main',
            minify: 'esbuild',
            rollupOptions: {
              external: ['electron', 'node-pty'],
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
      '@renderer': resolve(__dirname, 'src/renderer')
    }
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
})
