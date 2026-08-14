import { describe, it, expect } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import { CONFIG_DIR, STABLE_CONFIG_DIR, resolveConfigDir } from './paths'

const STABLE = '/home/me/.config/magic-slash'

describe('resolveConfigDir', () => {
  it('keeps the stable dir when no dev server is running', () => {
    expect(resolveConfigDir(STABLE, undefined)).toBe(STABLE)
  })

  it('suffixes the dir when VITE_DEV_SERVER_URL is set', () => {
    expect(resolveConfigDir(STABLE, 'http://localhost:5173/')).toBe(`${STABLE}-dev`)
  })

  // An empty string is what a shell exports for an unset variable, and it must not
  // move the installed app's config out from under it.
  it('treats an empty dev server url as not-dev', () => {
    expect(resolveConfigDir(STABLE, '')).toBe(STABLE)
  })
})

describe('STABLE_CONFIG_DIR', () => {
  // Baked into ~/.claude/settings.json (statusline path, skill spool, Read()
  // permission) and hardcoded by the /magic:* skills, so it can never move.
  it('is always ~/.config/magic-slash', () => {
    expect(STABLE_CONFIG_DIR).toBe(path.join(os.homedir(), '.config', 'magic-slash'))
  })

  // Asserting `CONFIG_DIR === resolveConfigDir(STABLE_CONFIG_DIR, env)` would only
  // restate the definition. What is worth pinning is that the per-instance dir is
  // always a sibling of the stable one — an installer or an uninstaller that walks
  // ~/.config/magic-slash* reaches both.
  it('is the base CONFIG_DIR is derived from', () => {
    expect(CONFIG_DIR.startsWith(STABLE_CONFIG_DIR)).toBe(true)
  })
})
