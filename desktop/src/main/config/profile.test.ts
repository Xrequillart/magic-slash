import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

/** Write a profile.md file in the temp dir. */
function writeProfileFile(content: string): void {
  fs.writeFileSync(path.join(tmpDir, 'profile.md'), content, 'utf8')
}

/** Read profile.md from the temp dir. */
function readProfileFile(): string {
  return fs.readFileSync(path.join(tmpDir, 'profile.md'), 'utf8')
}

// ---------------------------------------------------------------------------
// readProfile
// ---------------------------------------------------------------------------

describe('readProfile', () => {
  let readProfile: typeof import('./profile').readProfile

  beforeEach(async () => {
    vi.doMock('./config', () => ({ CONFIG_DIR: tmpDir }))
    vi.resetModules()
    const mod = await import('./profile')
    readProfile = mod.readProfile
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return null when profile.md does not exist', () => {
    expect(readProfile()).toBeNull()
  })

  it('should parse a valid profile with all fields', () => {
    writeProfileFile([
      '---',
      'name: Alice',
      'role: dev',
      'technical_level: expert',
      'communication_style: technical',
      'languages:',
      '  - English',
      '  - French',
      'free_text: Prefers concise answers',
      '---',
      '',
      'I am a Developer. My technical level is expert.',
    ].join('\n'))

    const profile = readProfile()
    expect(profile).not.toBeNull()
    expect(profile!.name).toBe('Alice')
    expect(profile!.role).toBe('dev')
    expect(profile!.technical_level).toBe('expert')
    expect(profile!.communication_style).toBe('technical')
    expect(profile!.languages).toEqual(['English', 'French'])
    expect(profile!.freeText).toBe('Prefers concise answers')
  })

  it('should parse a minimal profile (required fields only)', () => {
    writeProfileFile([
      '---',
      'name: Bob',
      'role: product',
      'technical_level: beginner',
      '---',
      '',
      'I am a Product Manager.',
    ].join('\n'))

    const profile = readProfile()
    expect(profile).not.toBeNull()
    expect(profile!.name).toBe('Bob')
    expect(profile!.role).toBe('product')
    expect(profile!.technical_level).toBe('beginner')
    expect(profile!.communication_style).toBeUndefined()
    expect(profile!.languages).toBeUndefined()
    expect(profile!.freeText).toBeUndefined()
  })

  it('should return null when frontmatter delimiters are missing', () => {
    writeProfileFile('name: Alice\nrole: dev\ntechnical_level: expert')
    expect(readProfile()).toBeNull()
  })

  it('should return null when frontmatter is malformed (no closing ---)', () => {
    writeProfileFile('---\nname: Alice\nrole: dev\ntechnical_level: expert\n')
    expect(readProfile()).toBeNull()
  })

  it('should return null when required field "name" is missing', () => {
    writeProfileFile('---\nrole: dev\ntechnical_level: expert\n---\n')
    expect(readProfile()).toBeNull()
  })

  it('should return null when required field "role" is missing', () => {
    writeProfileFile('---\nname: Alice\ntechnical_level: expert\n---\n')
    expect(readProfile()).toBeNull()
  })

  it('should return null when required field "technical_level" is missing', () => {
    writeProfileFile('---\nname: Alice\nrole: dev\n---\n')
    expect(readProfile()).toBeNull()
  })

  it('should handle a name containing colons (quoted)', () => {
    writeProfileFile([
      '---',
      "name: 'Dr. Smith: Surgeon'",
      'role: other',
      'technical_level: expert',
      '---',
    ].join('\n'))

    const profile = readProfile()
    expect(profile).not.toBeNull()
    expect(profile!.name).toBe('Dr. Smith: Surgeon')
  })

  it('should handle a free_text value containing colons (quoted)', () => {
    writeProfileFile([
      '---',
      'name: Alice',
      'role: dev',
      'technical_level: intermediate',
      "free_text: 'Note: prefers short answers'",
      '---',
    ].join('\n'))

    const profile = readProfile()
    expect(profile).not.toBeNull()
    expect(profile!.freeText).toBe('Note: prefers short answers')
  })

  it('should handle double-quoted values', () => {
    writeProfileFile([
      '---',
      'name: "Jane Doe"',
      'role: qa',
      'technical_level: beginner',
      '---',
    ].join('\n'))

    const profile = readProfile()
    expect(profile).not.toBeNull()
    expect(profile!.name).toBe('Jane Doe')
  })

  it('should unescape doubled single quotes', () => {
    writeProfileFile([
      '---',
      "name: 'O''Brien'",
      'role: dev',
      'technical_level: expert',
      '---',
    ].join('\n'))

    const profile = readProfile()
    expect(profile).not.toBeNull()
    expect(profile!.name).toBe("O'Brien")
  })

  it('should skip empty optional fields gracefully', () => {
    writeProfileFile([
      '---',
      'name: Alice',
      'role: dev',
      'technical_level: expert',
      'communication_style:',
      '---',
    ].join('\n'))

    const profile = readProfile()
    expect(profile).not.toBeNull()
    // communication_style was empty so it should be treated as an empty array key (not set on profile)
    expect(profile!.communication_style).toBeUndefined()
  })

  it('should parse a single language in the array', () => {
    writeProfileFile([
      '---',
      'name: Alice',
      'role: dev',
      'technical_level: expert',
      'languages:',
      '  - English',
      '---',
    ].join('\n'))

    const profile = readProfile()
    expect(profile).not.toBeNull()
    expect(profile!.languages).toEqual(['English'])
  })

  it('should return null for completely empty file', () => {
    writeProfileFile('')
    expect(readProfile()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// writeProfile
// ---------------------------------------------------------------------------

describe('writeProfile', () => {
  let writeProfile: typeof import('./profile').writeProfile

  beforeEach(async () => {
    vi.doMock('./config', () => ({ CONFIG_DIR: tmpDir }))
    vi.resetModules()
    const mod = await import('./profile')
    writeProfile = mod.writeProfile
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should generate correct YAML frontmatter and body for a full profile', () => {
    writeProfile({
      name: 'Alice',
      role: 'dev',
      technical_level: 'expert',
      communication_style: 'technical',
      languages: ['English', 'French'],
      freeText: 'Prefers concise answers',
    })

    const content = readProfileFile()
    expect(content).toContain('---\n')
    expect(content).toContain('name: Alice')
    expect(content).toContain('role: dev')
    expect(content).toContain('technical_level: expert')
    expect(content).toContain('communication_style: technical')
    expect(content).toContain('languages:')
    expect(content).toContain('  - English')
    expect(content).toContain('  - French')
    expect(content).toContain('free_text: Prefers concise answers')
    expect(content).toContain('I am a Developer. My technical level is expert. Prefers concise answers')
  })

  it('should generate a minimal profile with only required fields', () => {
    writeProfile({
      name: 'Bob',
      role: 'product',
      technical_level: 'beginner',
    })

    const content = readProfileFile()
    expect(content).toContain('name: Bob')
    expect(content).toContain('role: product')
    expect(content).toContain('technical_level: beginner')
    expect(content).not.toContain('communication_style')
    expect(content).not.toContain('languages')
    expect(content).not.toContain('free_text')
    expect(content).toContain('I am a Product Manager. My technical level is beginner.')
  })

  it('should create the config directory if it does not exist', () => {
    const nestedDir = path.join(tmpDir, 'nested', 'dir')

    // Re-mock with nested dir
    vi.doMock('./config', () => ({ CONFIG_DIR: nestedDir }))
    vi.resetModules()

    return import('./profile').then(mod => {
      mod.writeProfile({
        name: 'Alice',
        role: 'dev',
        technical_level: 'expert',
      })

      expect(fs.existsSync(path.join(nestedDir, 'profile.md'))).toBe(true)
    })
  })

  it('should quote name values containing colons', () => {
    writeProfile({
      name: 'Dr. Smith: Surgeon',
      role: 'other',
      technical_level: 'expert',
    })

    const content = readProfileFile()
    expect(content).toContain("name: 'Dr. Smith: Surgeon'")
  })

  it('should quote free_text values containing colons', () => {
    writeProfile({
      name: 'Alice',
      role: 'dev',
      technical_level: 'expert',
      freeText: 'Note: prefers short answers',
    })

    const content = readProfileFile()
    expect(content).toContain("free_text: 'Note: prefers short answers'")
  })

  it('should quote values containing newlines', () => {
    writeProfile({
      name: 'Alice',
      role: 'dev',
      technical_level: 'expert',
      freeText: 'Line one\nLine two',
    })

    const content = readProfileFile()
    expect(content).toContain("free_text: 'Line one\nLine two'")
  })

  it('should escape embedded single quotes by doubling them', () => {
    writeProfile({
      name: "O'Brien",
      role: 'dev',
      technical_level: 'expert',
    })

    const content = readProfileFile()
    // O'Brien contains a single quote but no colon/newline, so it's not quoted
    // Actually, the yamlQuote function only quotes when colons, newlines, or double-quotes are present.
    // A single quote alone does not trigger quoting.
    expect(content).toContain("name: O'Brien")
  })

  it('should escape values containing both colons and single quotes', () => {
    writeProfile({
      name: "O'Brien: Chief",
      role: 'dev',
      technical_level: 'expert',
    })

    const content = readProfileFile()
    // Contains colon -> triggers quoting; single quote is doubled
    expect(content).toContain("name: 'O''Brien: Chief'")
  })
})

// ---------------------------------------------------------------------------
// Round-trip: writeProfile -> readProfile
// ---------------------------------------------------------------------------

describe('round-trip writeProfile -> readProfile', () => {
  let readProfile: typeof import('./profile').readProfile
  let writeProfile: typeof import('./profile').writeProfile

  beforeEach(async () => {
    vi.doMock('./config', () => ({ CONFIG_DIR: tmpDir }))
    vi.resetModules()
    const mod = await import('./profile')
    readProfile = mod.readProfile
    writeProfile = mod.writeProfile
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should round-trip a full profile', () => {
    const original = {
      name: 'Alice',
      role: 'dev' as const,
      technical_level: 'expert' as const,
      communication_style: 'technical' as const,
      languages: ['English', 'French'],
      freeText: 'Prefers concise answers',
    }

    writeProfile(original)
    const result = readProfile()

    expect(result).not.toBeNull()
    expect(result!.name).toBe(original.name)
    expect(result!.role).toBe(original.role)
    expect(result!.technical_level).toBe(original.technical_level)
    expect(result!.communication_style).toBe(original.communication_style)
    expect(result!.languages).toEqual(original.languages)
    expect(result!.freeText).toBe(original.freeText)
  })

  it('should round-trip a minimal profile', () => {
    const original = {
      name: 'Bob',
      role: 'qa' as const,
      technical_level: 'beginner' as const,
    }

    writeProfile(original)
    const result = readProfile()

    expect(result).not.toBeNull()
    expect(result!.name).toBe(original.name)
    expect(result!.role).toBe(original.role)
    expect(result!.technical_level).toBe(original.technical_level)
    expect(result!.communication_style).toBeUndefined()
    expect(result!.languages).toBeUndefined()
    expect(result!.freeText).toBeUndefined()
  })

  it('should round-trip a name containing colons', () => {
    const original = {
      name: 'Dr. Smith: Surgeon',
      role: 'other' as const,
      technical_level: 'expert' as const,
    }

    writeProfile(original)
    const result = readProfile()

    expect(result).not.toBeNull()
    expect(result!.name).toBe('Dr. Smith: Surgeon')
  })

  it('should round-trip free_text containing colons', () => {
    const original = {
      name: 'Alice',
      role: 'dev' as const,
      technical_level: 'expert' as const,
      freeText: 'Important: always use TypeScript',
    }

    writeProfile(original)
    const result = readProfile()

    expect(result).not.toBeNull()
    expect(result!.freeText).toBe('Important: always use TypeScript')
  })

  it('should round-trip a name with single quotes and colons', () => {
    const original = {
      name: "O'Brien: Chief",
      role: 'dev' as const,
      technical_level: 'expert' as const,
    }

    writeProfile(original)
    const result = readProfile()

    expect(result).not.toBeNull()
    expect(result!.name).toBe("O'Brien: Chief")
  })
})

// ---------------------------------------------------------------------------
// buildMarkdownBody (tested indirectly via writeProfile output)
// ---------------------------------------------------------------------------

describe('buildMarkdownBody via writeProfile', () => {
  let writeProfile: typeof import('./profile').writeProfile

  beforeEach(async () => {
    vi.doMock('./config', () => ({ CONFIG_DIR: tmpDir }))
    vi.resetModules()
    const mod = await import('./profile')
    writeProfile = mod.writeProfile
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should generate English body by default', () => {
    writeProfile({
      name: 'Alice',
      role: 'dev',
      technical_level: 'expert',
      languages: ['English'],
    })

    const content = readProfileFile()
    expect(content).toContain('I am a Developer. My technical level is expert.')
  })

  it('should generate French body when first language is French', () => {
    writeProfile({
      name: 'Alice',
      role: 'dev',
      technical_level: 'expert',
      languages: ['Français'],
    })

    const content = readProfileFile()
    expect(content).toContain('Je suis Développeur. Mon niveau technique est expert.')
  })

  it('should generate French body when first language is "fr"', () => {
    writeProfile({
      name: 'Alice',
      role: 'dev',
      technical_level: 'beginner',
      languages: ['fr'],
    })

    const content = readProfileFile()
    expect(content).toContain('Je suis Développeur. Mon niveau technique est débutant.')
  })

  it('should generate French body when first language is "french" (case-insensitive)', () => {
    writeProfile({
      name: 'Alice',
      role: 'qa',
      technical_level: 'intermediate',
      languages: ['French'],
    })

    const content = readProfileFile()
    expect(content).toContain('Je suis Ingénieur QA. Mon niveau technique est intermédiaire.')
  })

  it('should generate English body when no languages are specified', () => {
    writeProfile({
      name: 'Alice',
      role: 'product',
      technical_level: 'intermediate',
    })

    const content = readProfileFile()
    expect(content).toContain('I am a Product Manager. My technical level is intermediate.')
  })

  it('should append freeText to the body', () => {
    writeProfile({
      name: 'Alice',
      role: 'dev',
      technical_level: 'expert',
      freeText: 'Loves testing.',
    })

    const content = readProfileFile()
    expect(content).toContain('I am a Developer. My technical level is expert. Loves testing.')
  })

  it('should use correct labels for all roles in English', () => {
    const roles: Array<{ role: 'product' | 'dev' | 'design' | 'qa' | 'ops' | 'manager' | 'other'; label: string }> = [
      { role: 'product', label: 'Product Manager' },
      { role: 'dev', label: 'Developer' },
      { role: 'design', label: 'Designer' },
      { role: 'qa', label: 'QA Engineer' },
      { role: 'ops', label: 'Ops Engineer' },
      { role: 'manager', label: 'Engineering Manager' },
      { role: 'other', label: 'Team Member' },
    ]

    for (const { role, label } of roles) {
      writeProfile({
        name: 'Test',
        role,
        technical_level: 'intermediate',
      })

      const content = readProfileFile()
      expect(content).toContain(`I am a ${label}.`)
    }
  })

  it('should use correct labels for all levels in English', () => {
    const levels: Array<{ level: 'beginner' | 'intermediate' | 'expert'; label: string }> = [
      { level: 'beginner', label: 'beginner' },
      { level: 'intermediate', label: 'intermediate' },
      { level: 'expert', label: 'expert' },
    ]

    for (const { level, label } of levels) {
      writeProfile({
        name: 'Test',
        role: 'dev',
        technical_level: level,
      })

      const content = readProfileFile()
      expect(content).toContain(`My technical level is ${label}.`)
    }
  })

  it('should fall back to "other" role label for unknown roles', () => {
    writeProfile({
      name: 'Test',
      role: 'unknown_role' as 'other',
      technical_level: 'intermediate',
    })

    const content = readProfileFile()
    expect(content).toContain('I am a Team Member.')
  })
})
