import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const SKILLS = ['magic-start', 'magic-continue', 'magic-commit', 'magic-done']
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/xrequillart/magic-slash/main/skills'

export async function updateSkills(): Promise<{ updated: string[]; errors: string[] }> {
  const skillsDir = path.join(os.homedir(), '.claude', 'skills')
  const updated: string[] = []
  const errors: string[] = []

  console.log('[Skills Updater] Checking for skill updates...')

  for (const skill of SKILLS) {
    try {
      const url = `${GITHUB_RAW_BASE}/${skill}/SKILL.md`
      const localPath = path.join(skillsDir, skill, 'SKILL.md')

      // Fetch remote content
      const response = await fetch(url)
      if (!response.ok) {
        console.warn(`[Skills Updater] Failed to fetch ${skill}: ${response.status}`)
        errors.push(`${skill}: HTTP ${response.status}`)
        continue
      }

      const remoteContent = await response.text()

      // Read local content if exists
      let localContent = ''
      if (fs.existsSync(localPath)) {
        localContent = fs.readFileSync(localPath, 'utf8')
      }

      // Compare and update if different
      if (remoteContent !== localContent) {
        // Ensure directory exists
        fs.mkdirSync(path.dirname(localPath), { recursive: true })
        fs.writeFileSync(localPath, remoteContent)
        updated.push(skill)
        console.log(`[Skills Updater] Updated skill: ${skill}`)
      } else {
        console.log(`[Skills Updater] Skill up-to-date: ${skill}`)
      }

      // Download image if missing
      const imagePath = path.join(skillsDir, skill, 'image.png')
      if (!fs.existsSync(imagePath)) {
        try {
          const imageUrl = `${GITHUB_RAW_BASE}/${skill}/image.png`
          const imageResponse = await fetch(imageUrl)
          if (imageResponse.ok) {
            const buffer = Buffer.from(await imageResponse.arrayBuffer())
            fs.mkdirSync(path.join(skillsDir, skill), { recursive: true })
            fs.writeFileSync(imagePath, buffer)
            console.log(`[Skills Updater] Downloaded image for: ${skill}`)
          }
        } catch {
          // Image download is non-critical, skip silently
        }
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
