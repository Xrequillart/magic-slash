import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const BUILT_IN_SKILLS = ['start', 'commit', 'done']

interface SkillInfo {
  name: string
  description: string
  allowedTools: string
  argumentHint?: string
  isBuiltIn: boolean
  hasImage: boolean
  imagePath?: string
}

function getSkillsDir(): string {
  return path.join(os.homedir(), '.claude', 'skills')
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}

  const frontmatter: Record<string, string> = {}
  const lines = match[1].split('\n')
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    const key = line.substring(0, colonIndex).trim()
    const value = line.substring(colonIndex + 1).trim()
    frontmatter[key] = value
  }
  return frontmatter
}

function findImageInDir(dirPath: string): string | null {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
  try {
    const files = fs.readdirSync(dirPath)
    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (imageExtensions.includes(ext)) {
        return path.join(dirPath, file)
      }
    }
  } catch {
    // Directory might not exist
  }
  return null
}

export function setupSkillsHandlers() {
  // List all skills
  ipcMain.handle('skills:list', async () => {
    const skillsDir = getSkillsDir()
    const skills: SkillInfo[] = []

    if (!fs.existsSync(skillsDir)) {
      return skills
    }

    const entries = fs.readdirSync(skillsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillDir = path.join(skillsDir, entry.name)
      const skillFile = path.join(skillDir, 'SKILL.md')

      if (!fs.existsSync(skillFile)) continue

      const content = fs.readFileSync(skillFile, 'utf8')
      const frontmatter = parseFrontmatter(content)
      const imagePath = findImageInDir(skillDir)

      skills.push({
        name: frontmatter.name || entry.name,
        description: frontmatter.description || '',
        allowedTools: frontmatter['allowed-tools'] || '',
        argumentHint: frontmatter['argument-hint'] || undefined,
        isBuiltIn: BUILT_IN_SKILLS.includes(entry.name),
        hasImage: imagePath !== null,
        imagePath: imagePath || undefined,
      })
    }

    return skills
  })

  // Get a specific skill's full content
  ipcMain.handle('skills:get', async (_event, { name }: { name: string }) => {
    const skillFile = path.join(getSkillsDir(), name, 'SKILL.md')

    if (!fs.existsSync(skillFile)) {
      throw new Error(`Skill "${name}" not found`)
    }

    const content = fs.readFileSync(skillFile, 'utf8')
    const frontmatter = parseFrontmatter(content)
    const imagePath = findImageInDir(path.join(getSkillsDir(), name))

    return {
      name: frontmatter.name || name,
      description: frontmatter.description || '',
      allowedTools: frontmatter['allowed-tools'] || '',
      argumentHint: frontmatter['argument-hint'] || undefined,
      content,
      isBuiltIn: BUILT_IN_SKILLS.includes(name),
      hasImage: imagePath !== null,
      imagePath: imagePath || undefined,
    }
  })

  // Create a new skill
  ipcMain.handle('skills:create', async (_event, { name, content, imagePath }: { name: string; content: string; imagePath?: string }) => {
    const skillDir = path.join(getSkillsDir(), name)

    if (fs.existsSync(skillDir)) {
      throw new Error(`Skill "${name}" already exists`)
    }

    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content)

    if (imagePath && fs.existsSync(imagePath)) {
      const ext = path.extname(imagePath)
      fs.copyFileSync(imagePath, path.join(skillDir, `image${ext}`))
    }

    return { success: true }
  })

  // Update an existing skill
  ipcMain.handle('skills:update', async (_event, { name, content, imagePath }: { name: string; content: string; imagePath?: string }) => {
    const skillDir = path.join(getSkillsDir(), name)

    if (!fs.existsSync(skillDir)) {
      throw new Error(`Skill "${name}" not found`)
    }

    if (BUILT_IN_SKILLS.includes(name)) {
      throw new Error(`Cannot modify built-in skill "${name}"`)
    }

    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content)

    if (imagePath && fs.existsSync(imagePath)) {
      // Remove old images
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
      const files = fs.readdirSync(skillDir)
      for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        if (imageExtensions.includes(ext)) {
          fs.unlinkSync(path.join(skillDir, file))
        }
      }
      // Copy new image
      const ext = path.extname(imagePath)
      fs.copyFileSync(imagePath, path.join(skillDir, `image${ext}`))
    }

    return { success: true }
  })

  // Delete a custom skill
  ipcMain.handle('skills:delete', async (_event, { name }: { name: string }) => {
    if (BUILT_IN_SKILLS.includes(name)) {
      throw new Error(`Cannot delete built-in skill "${name}"`)
    }

    const skillDir = path.join(getSkillsDir(), name)
    if (!fs.existsSync(skillDir)) {
      throw new Error(`Skill "${name}" not found`)
    }

    fs.rmSync(skillDir, { recursive: true, force: true })
    return { success: true }
  })

  // Get image as base64
  ipcMain.handle('skills:getImage', async (_event, { name }: { name: string }) => {
    const skillDir = path.join(getSkillsDir(), name)
    const imagePath = findImageInDir(skillDir)

    if (!imagePath) {
      return null
    }

    const ext = path.extname(imagePath).toLowerCase().replace('.', '')
    const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
    const data = fs.readFileSync(imagePath)
    return `data:${mimeType};base64,${data.toString('base64')}`
  })

  // Download a skill as a zip
  ipcMain.handle('skills:download', async (_event, { name }: { name: string }) => {
    if (BUILT_IN_SKILLS.includes(name)) throw new Error('Cannot download built-in skills')

    const skillDir = path.join(getSkillsDir(), name)
    const skillFile = path.join(skillDir, 'SKILL.md')
    if (!fs.existsSync(skillFile)) throw new Error('Skill not found')

    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { success: false }

    const result = await dialog.showSaveDialog(window, {
      defaultPath: path.join(os.homedir(), 'Downloads', `${name}.zip`),
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    })
    if (result.canceled || !result.filePath) return { success: false, canceled: true }

    const content = fs.readFileSync(skillFile, 'utf-8')
    const AdmZip = require('adm-zip')
    const zip = new AdmZip()
    zip.addFile(`${name}/SKILL.md`, Buffer.from(content, 'utf-8'))
    zip.writeZip(result.filePath)

    return { success: true, filePath: result.filePath }
  })

  // Import a skill from a folder
  ipcMain.handle('skills:import', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return { success: false }

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory'],
      title: 'Select a skill folder',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true }
    }

    const sourceDir = result.filePaths[0]
    const skillFile = path.join(sourceDir, 'SKILL.md')

    if (!fs.existsSync(skillFile)) {
      throw new Error('Selected folder does not contain a SKILL.md file')
    }

    const content = fs.readFileSync(skillFile, 'utf8')
    const frontmatter = parseFrontmatter(content)
    const skillName = frontmatter.name || path.basename(sourceDir)

    // Validate name
    if (!/^[a-z0-9-]+$/.test(skillName)) {
      throw new Error(`Invalid skill name "${skillName}". Must contain only lowercase letters, numbers, and hyphens.`)
    }

    const destDir = path.join(getSkillsDir(), skillName)
    if (fs.existsSync(destDir)) {
      throw new Error(`Skill "${skillName}" already exists`)
    }

    // Copy entire folder contents
    fs.mkdirSync(destDir, { recursive: true })
    const entries = fs.readdirSync(sourceDir)
    for (const entry of entries) {
      const srcPath = path.join(sourceDir, entry)
      const destPath = path.join(destDir, entry)
      if (fs.statSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath)
      }
    }

    return { success: true, name: skillName }
  })

  // Dialog: open file for image selection
  ipcMain.handle('dialog:openFile', async () => {
    const window = BrowserWindow.getFocusedWindow()
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile'],
      title: 'Select an image',
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })
}
