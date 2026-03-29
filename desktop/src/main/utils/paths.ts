import * as os from 'os'
import * as path from 'path'

/**
 * Returns common CLI tool paths for macOS (Homebrew, nvm, system).
 * Used by both terminal-manager (PTY spawn) and validation (git commands).
 */
export function getCommonPaths(): string[] {
  const home = os.homedir()
  return [
    path.join(home, '.local/bin'),
    path.join(home, '.npm-global/bin'),
    path.join(home, '.volta/bin'),
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ]
}
