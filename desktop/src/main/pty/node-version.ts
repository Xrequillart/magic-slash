import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Returns a shell command prefix that activates the correct Node.js version
 * for the given project, or null if no version file is found.
 */
export function getNodeActivationPrefix(repoPath: string): string | null {
  // Check if the project specifies a Node version
  const hasNvmrc = fs.existsSync(path.join(repoPath, '.nvmrc'))
  const hasNodeVersion = fs.existsSync(path.join(repoPath, '.node-version'))

  let hasVolta = false
  try {
    const pkgPath = path.join(repoPath, 'package.json')
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      hasVolta = !!pkg.volta
    }
  } catch {
    // Ignore parse errors
  }

  if (!hasNvmrc && !hasNodeVersion && !hasVolta) {
    return null
  }

  // Volta works via shims in PATH — no activation needed
  if (hasVolta) {
    return null
  }

  const home = os.homedir()

  // Detect nvm
  const nvmSh = path.join(home, '.nvm/nvm.sh')
  if (fs.existsSync(nvmSh)) {
    return `source ${nvmSh} && nvm use`
  }

  // Detect fnm
  const fnmPaths = [
    path.join(home, '.local/share/fnm'),
    path.join(home, '.fnm'),
  ]
  for (const fnmPath of fnmPaths) {
    if (fs.existsSync(fnmPath)) {
      return 'eval "$(fnm env)" && fnm use'
    }
  }

  return null
}
