import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Whether `dir` pins a Node version at all — an `.nvmrc`, a `.node-version`, or a
 * `volta` field.
 */
function pinsNodeVersion(dir: string): boolean {
  if (fs.existsSync(path.join(dir, '.nvmrc')) || fs.existsSync(path.join(dir, '.node-version'))) return true
  try {
    const pkgPath = path.join(dir, 'package.json')
    if (!fs.existsSync(pkgPath)) return false
    return !!JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).volta
  } catch {
    return false
  }
}

/**
 * The directory the Node activation has to run IN, walking up from `startDir` to
 * `stopDir`.
 *
 * `nvm use` and `fnm use` take the version from the CURRENT directory's `.nvmrc`, and a
 * monorepo pins Node once at its root: run from a package that carries no version file
 * of its own, `nvm use` exits non-zero on "No .nvmrc file found" and takes the `&&
 * exec` behind it down with it — the script never starts. So the activation is run
 * where the version file actually is, and the caller steps back into the package
 * afterwards.
 *
 * Falls back to `startDir`, which is also what makes "nothing pins a version anywhere"
 * behave exactly as it did before: `getNodeActivationPrefix` finds no file there and
 * returns null.
 */
export function findNodeVersionDir(startDir: string, stopDir: string): string {
  let current = path.resolve(startDir)
  const stop = path.resolve(stopDir)

  for (;;) {
    if (pinsNodeVersion(current)) return current
    if (current === stop) break
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return startDir
}

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
