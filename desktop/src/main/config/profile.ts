import * as fs from 'fs'
import * as path from 'path'
import type { UserProfile } from '../../types'
import { CONFIG_DIR } from './config'

const PROFILE_PATH = path.join(CONFIG_DIR, 'profile.md')

export function readProfile(): UserProfile | null {
  try {
    if (!fs.existsSync(PROFILE_PATH)) return null
    const content = fs.readFileSync(PROFILE_PATH, 'utf8')
    return parseFrontmatter(content)
  } catch {
    return null
  }
}

export function writeProfile(profile: UserProfile): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }

  const yaml = buildYamlFrontmatter(profile)
  const body = buildMarkdownBody(profile)
  const content = `---\n${yaml}---\n\n${body}\n`

  fs.writeFileSync(PROFILE_PATH, content, 'utf8')
}

function parseFrontmatter(content: string): UserProfile | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const lines = match[1].split('\n')
  const data: Record<string, string | string[]> = {}
  let currentKey: string | null = null

  for (const line of lines) {
    // Array item (continuation of previous key)
    if (line.match(/^\s+-\s+/) && currentKey) {
      const value = line.replace(/^\s+-\s+/, '').trim()
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = []
      }
      ;(data[currentKey] as string[]).push(value)
      continue
    }

    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.substring(0, colonIndex).trim()
    let value = line.substring(colonIndex + 1).trim()

    // Strip surrounding single or double quotes (YAML quoting)
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1)
      // Unescape doubled single quotes
      if (value.includes("''")) {
        value = value.replace(/''/g, "'")
      }
    }

    if (value === '') {
      // Next lines may be array items
      currentKey = key
      data[key] = []
    } else {
      currentKey = key
      data[key] = value
    }
  }

  const name = typeof data.name === 'string' ? data.name : ''
  const role = typeof data.role === 'string' ? data.role : ''
  const technicalLevel = typeof data.technical_level === 'string' ? data.technical_level : ''

  if (!name || !role || !technicalLevel) return null

  const profile: UserProfile = {
    name,
    role: role as UserProfile['role'],
    technical_level: technicalLevel as UserProfile['technical_level'],
  }

  if (typeof data.communication_style === 'string' && data.communication_style) {
    profile.communication_style = data.communication_style as UserProfile['communication_style']
  }

  if (Array.isArray(data.languages) && data.languages.length > 0) {
    profile.languages = data.languages
  }

  if (typeof data.free_text === 'string' && data.free_text) {
    profile.freeText = data.free_text
  }

  return profile
}

/** Quotes a YAML scalar value if it contains characters that could break parsing (colons, newlines). */
function yamlQuote(value: string): string {
  if (value.includes('\n') || value.includes(':') || value.includes('"')) {
    // Use single quotes; escape embedded single quotes by doubling them
    return `'${value.replace(/'/g, "''")}'`
  }
  return value
}

function buildYamlFrontmatter(profile: UserProfile): string {
  const lines: string[] = []
  lines.push(`name: ${yamlQuote(profile.name)}`)
  lines.push(`role: ${profile.role}`)
  lines.push(`technical_level: ${profile.technical_level}`)

  if (profile.communication_style) {
    lines.push(`communication_style: ${profile.communication_style}`)
  }

  if (profile.languages && profile.languages.length > 0) {
    lines.push('languages:')
    for (const lang of profile.languages) {
      lines.push(`  - ${yamlQuote(lang)}`)
    }
  }

  if (profile.freeText) {
    lines.push(`free_text: ${yamlQuote(profile.freeText)}`)
  }

  return lines.join('\n') + '\n'
}

function buildMarkdownBody(profile: UserProfile): string {
  const lang = profile.languages?.[0]?.toLowerCase()
  const isFrench = lang === 'français' || lang === 'french' || lang === 'fr'

  const roleLabels: Record<string, { en: string; fr: string }> = {
    product: { en: 'Product Manager', fr: 'Product Manager' },
    dev: { en: 'Developer', fr: 'Développeur' },
    design: { en: 'Designer', fr: 'Designer' },
    qa: { en: 'QA Engineer', fr: 'Ingénieur QA' },
    ops: { en: 'Ops Engineer', fr: 'Ingénieur Ops' },
    manager: { en: 'Engineering Manager', fr: 'Engineering Manager' },
    other: { en: 'Team Member', fr: 'Membre de l\'équipe' },
  }

  const levelLabels: Record<string, { en: string; fr: string }> = {
    beginner: { en: 'beginner', fr: 'débutant' },
    intermediate: { en: 'intermediate', fr: 'intermédiaire' },
    expert: { en: 'expert', fr: 'expert' },
  }

  const roleLabel = roleLabels[profile.role] || roleLabels.other
  const levelLabel = levelLabels[profile.technical_level] || levelLabels.intermediate

  const freeTextSuffix = profile.freeText ? ` ${profile.freeText}` : ''

  if (isFrench) {
    return `Je suis ${roleLabel.fr}. Mon niveau technique est ${levelLabel.fr}.${freeTextSuffix}`
  }

  return `I am a ${roleLabel.en}. My technical level is ${levelLabel.en}.${freeTextSuffix}`
}
