/**
 * The desktop's Tailwind config, reused whole: every colour role, font and token the
 * shared components spell resolves exactly as it does in the app. Only the content
 * globs are this package's.
 */
const desktop = require('../desktop/tailwind.config.cjs')

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...desktop,
  content: [
    './src/**/*.{ts,tsx}',
    '../design-system/desktop/**/*.{ts,tsx}',
    // The spec is rendered by the app's own MarkdownView, which still lives in the renderer.
    '../desktop/src/renderer/components/file-preview/MarkdownView.tsx',
  ],
}
