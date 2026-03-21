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
          build: {
            outDir: 'dist/main',
            minify: 'esbuild',
            rollupOptions: {
              external: ['electron', 'node-pty', '@anthropic-ai/claude-agent-sdk'],
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
    outDir: 'dist/renderer'
  }
})
