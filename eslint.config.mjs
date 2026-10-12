import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

// The desktop app and the shared components it compiles. One list rather than two
// spellings: `design-system/` is desktop source that happens to live a directory up,
// and a folder linted by the recommended set but not by the rules below — or the
// reverse — is the failure a second literal invites.
const LINTED = ['desktop/src/**/*.{ts,tsx}', 'design-system/**/*.{ts,tsx}']

export default [
  {
    ignores: ['**/node_modules/', '**/dist/', '**/release/', 'desktop/out/'],
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: LINTED,
  })),
  {
    files: LINTED,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'warn',
    },
  },
]
