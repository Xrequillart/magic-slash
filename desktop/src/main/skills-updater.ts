import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { githubHeaders } from './github'

const SKILLS = ['magic-start', 'magic-continue', 'magic-commit', 'magic-pr', 'magic-review', 'magic-resolve', 'magic-done']
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/xrequillart/magic-slash/main/skills'
const GITHUB_TREE_URL = 'https://api.github.com/repos/xrequillart/magic-slash/git/trees/main?recursive=1'

const BINARY_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|webp)$/i

interface TreeEntry {
  path: string
  type: 'blob' | 'tree'
  sha: string
}

interface TreeResponse {
  tree: TreeEntry[]
}

async function fetchSkillsTree(): Promise<Map<string, TreeEntry[]>> {
  const response = await fetch(GITHUB_TREE_URL, {
    headers: githubHeaders({ Accept: 'application/vnd.github.v3+json' })
  })
  if (!response.ok) {
    throw new Error(`GitHub Trees API returned ${response.status}`)
  }
  const data: TreeResponse = await response.json()

  const skillFiles = new Map<string, TreeEntry[]>()
  for (const skill of SKILLS) {
    skillFiles.set(skill, [])
  }

  for (const entry of data.tree) {
    if (entry.type !== 'blob') continue
    for (const skill of SKILLS) {
      const prefix = `skills/${skill}/`
      if (entry.path.startsWith(prefix)) {
        skillFiles.get(skill)!.push(entry)
        break
      }
    }
  }

  return skillFiles
}

function listLocalFiles(dir: string, base = ''): string[] {
  const files: string[] = []
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      files.push(...listLocalFiles(path.join(dir, entry.name), relative))
    } else {
      files.push(relative)
    }
  }
  return files
}

function removeEmptyDirs(dir: string): void {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      removeEmptyDirs(path.join(dir, entry.name))
    }
  }
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir)
  }
}

export async function updateSkills(): Promise<{ updated: string[]; errors: string[] }> {
  const skillsDir = path.join(os.homedir(), '.claude', 'skills')
  const updated: string[] = []
  const errors: string[] = []

  console.log('[Skills Updater] Checking for skill updates...')

  let skillFiles: Map<string, TreeEntry[]>
  try {
    skillFiles = await fetchSkillsTree()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Skills Updater] Failed to fetch repo tree:', message)
    return { updated, errors: [`tree: ${message}`] }
  }

  for (const skill of SKILLS) {
    try {
      const remoteEntries = skillFiles.get(skill) || []
      const skillDir = path.join(skillsDir, skill)
      let skillUpdated = false

      const remoteRelPaths = new Set<string>()

      for (const entry of remoteEntries) {
        const relativePath = entry.path.replace(`skills/${skill}/`, '')
        remoteRelPaths.add(relativePath)
        const localPath = path.join(skillDir, relativePath)
        const isBinary = BINARY_EXTENSIONS.test(relativePath)

        if (isBinary) {
          // Binary files: download and compare buffer
          const url = `${GITHUB_RAW_BASE}/${skill}/${relativePath}`
          const response = await fetch(url)
          if (!response.ok) continue
          const remoteBuffer = Buffer.from(await response.arrayBuffer())

          let needsUpdate = true
          if (fs.existsSync(localPath)) {
            const localBuffer = fs.readFileSync(localPath)
            needsUpdate = !remoteBuffer.equals(localBuffer)
          }

          if (needsUpdate) {
            fs.mkdirSync(path.dirname(localPath), { recursive: true })
            fs.writeFileSync(localPath, remoteBuffer)
            skillUpdated = true
            console.log(`[Skills Updater] Updated: ${skill}/${relativePath}`)
          }
        } else {
          // Text files: compare content
          const url = `${GITHUB_RAW_BASE}/${skill}/${relativePath}`
          const response = await fetch(url)
          if (!response.ok) continue
          const remoteContent = await response.text()

          let localContent = ''
          if (fs.existsSync(localPath)) {
            localContent = fs.readFileSync(localPath, 'utf8')
          }

          if (remoteContent !== localContent) {
            fs.mkdirSync(path.dirname(localPath), { recursive: true })
            fs.writeFileSync(localPath, remoteContent)
            skillUpdated = true
            console.log(`[Skills Updater] Updated: ${skill}/${relativePath}`)
          }
        }
      }

      // Remove local files that no longer exist remotely
      const localFiles = listLocalFiles(skillDir)
      for (const localFile of localFiles) {
        if (!remoteRelPaths.has(localFile)) {
          fs.unlinkSync(path.join(skillDir, localFile))
          skillUpdated = true
          console.log(`[Skills Updater] Removed obsolete: ${skill}/${localFile}`)
        }
      }

      // Clean up empty directories
      removeEmptyDirs(skillDir)

      if (skillUpdated) {
        updated.push(skill)
      } else {
        console.log(`[Skills Updater] Skill up-to-date: ${skill}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[Skills Updater] Error updating ${skill}:`, message)
      errors.push(`${skill}: ${message}`)
    }
  }

  if (updated.length > 0) {
    console.log(`[Skills Updater] Updated ${updated.length} skill(s): ${updated.join(', ')}`)
  } else {
    console.log('[Skills Updater] All skills are up-to-date')
  }

  if (errors.length > 0) {
    console.warn(`[Skills Updater] ${errors.length} error(s) occurred`)
  }

  return { updated, errors }
}
