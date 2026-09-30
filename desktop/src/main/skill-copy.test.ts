import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { copySkillToRepo, findSkillSource, hasSkillIn, isSafeSegment, relativePathOf, skillInRepo } from './skill-copy'

let base: string
let home: string
let repo: string

function write(file: string, content: string) {
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, content)
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'skill-copy-'))
  home = join(base, 'home')
  repo = join(base, 'repo')
  mkdirSync(home)
  mkdirSync(repo)
})

afterEach(() => {
  rmSync(base, { recursive: true, force: true })
})

describe('isSafeSegment', () => {
  it('takes one visible path segment, whatever its case or punctuation', () => {
    for (const ok of ['check-2', 'Check_2', 'a.b', 'é']) expect(isSafeSegment(ok)).toBe(true)
    for (const bad of ['', '.', '..', '.hidden', '../x', 'a/b', 'a\\b', 'plugin:x', 'a\0b', 42, null]) {
      expect(isSafeSegment(bad)).toBe(false)
    }
  })
})

describe('hasSkillIn', () => {
  it('finds a skill by its SKILL.md', () => {
    write(join(repo, '.claude/skills/check/SKILL.md'), 'x')
    mkdirSync(join(repo, '.claude/skills/empty'), { recursive: true })
    expect(hasSkillIn(repo, 'check')).toBe(true)
    expect(hasSkillIn(repo, 'empty')).toBe(false)
    expect(hasSkillIn(repo, 'missing')).toBe(false)
  })

  it('answers false for a name no skill of ours can have', () => {
    write(join(repo, '.claude/skills/check/SKILL.md'), 'x')
    for (const bad of ['..', '.', 'check/..', 'plugin:check', '']) expect(hasSkillIn(repo, bad)).toBe(false)
  })

  it('finds a command, nested folders included', () => {
    write(join(home, '.claude/commands/deploy.md'), 'x')
    write(join(home, '.claude/commands/ops/rollback.md'), 'x')
    expect(findSkillSource(home, 'deploy')).toMatchObject({ kind: 'command', rel: 'deploy.md' })
    expect(findSkillSource(home, 'rollback')).toMatchObject({ kind: 'command', rel: 'ops/rollback.md' })
    expect(relativePathOf(findSkillSource(home, 'rollback')!)).toBe('.claude/commands/ops/rollback.md')
  })

  it('finds an atypical folder name, and a skill by its frontmatter name first', () => {
    write(join(home, '.claude/skills/My_Skill.v2/SKILL.md'), 'x')
    write(join(home, '.claude/skills/folder/SKILL.md'), '---\nname: "shown-name"\n---\n')
    write(join(home, '.claude/skills/shown-name/SKILL.md'), '---\nname: other\n---\n')
    expect(findSkillSource(home, 'My_Skill.v2')).toMatchObject({ kind: 'skill', dir: 'My_Skill.v2' })
    // The frontmatter name wins over a folder of the same name.
    expect(findSkillSource(home, 'shown-name')).toMatchObject({ kind: 'skill', dir: 'folder' })
    expect(findSkillSource(home, 'other')).toMatchObject({ kind: 'skill', dir: 'shown-name' })
    expect(findSkillSource(home, 'folder')).toMatchObject({ kind: 'skill', dir: 'folder' })
  })

  it('skips hidden folders and files', () => {
    write(join(home, '.claude/skills/.draft/SKILL.md'), '---\nname: draft\n---\n')
    write(join(home, '.claude/commands/.old/draft.md'), 'x')
    expect(findSkillSource(home, 'draft')).toBeNull()
  })
})

describe('skillInRepo', () => {
  it('finds the skill in either form, by the same name', () => {
    write(join(home, '.claude/skills/check/SKILL.md'), 'x')
    write(join(repo, '.claude/commands/check.md'), 'x')
    expect(skillInRepo(home, repo, 'check')).toMatchObject({ kind: 'command', rel: 'check.md' })
  })

  it('finds a folder named like the home one even when its frontmatter says otherwise', () => {
    write(join(home, '.claude/skills/check/SKILL.md'), 'x')
    write(join(repo, '.claude/skills/check/SKILL.md'), '---\nname: renamed\n---\n')
    expect(skillInRepo(home, repo, 'check')).toMatchObject({ kind: 'skill', dir: 'check' })
    expect(skillInRepo(home, repo, 'missing')).toBeNull()
  })
})

describe('copySkillToRepo', () => {
  it('copies the whole skill, nested folders included', () => {
    write(join(home, '.claude/skills/check/SKILL.md'), 'skill')
    write(join(home, '.claude/skills/check/scripts/run.sh'), 'echo')
    copySkillToRepo(home, repo, 'check')
    expect(readFileSync(join(repo, '.claude/skills/check/SKILL.md'), 'utf8')).toBe('skill')
    expect(readFileSync(join(repo, '.claude/skills/check/scripts/run.sh'), 'utf8')).toBe('echo')
    expect(readdirSync(join(repo, '.claude/skills'))).toEqual(['check'])
  })

  it('never overwrites a skill the repository already has', () => {
    write(join(home, '.claude/skills/check/SKILL.md'), 'mine')
    write(join(repo, '.claude/skills/check/SKILL.md'), 'theirs')
    expect(() => copySkillToRepo(home, repo, 'check')).toThrow(/already has/)
    expect(readFileSync(join(repo, '.claude/skills/check/SKILL.md'), 'utf8')).toBe('theirs')
  })

  it('refuses an invalid name, a missing skill and a missing repository', () => {
    write(join(home, '.claude/skills/check/SKILL.md'), 'x')
    for (const bad of ['../check', '..', '.check', 'a/b', 'plugin:check']) {
      expect(() => copySkillToRepo(home, repo, bad)).toThrow(/Invalid skill name/)
    }
    expect(() => copySkillToRepo(home, repo, 'other')).toThrow(/not found/)
    expect(() => copySkillToRepo(home, join(base, 'gone'), 'check')).toThrow(/not found/)
  })

  it('refuses a symlink leading outside the skill, and leaves nothing behind', () => {
    write(join(home, '.claude/skills/check/SKILL.md'), 'x')
    write(join(base, 'secret.txt'), 'secret')
    symlinkSync(join(base, 'secret.txt'), join(home, '.claude/skills/check/leak.txt'))
    expect(() => copySkillToRepo(home, repo, 'check')).toThrow(/links outside/)
    expect(existsSync(join(repo, '.claude/skills/check'))).toBe(false)
    expect(readdirSync(join(repo, '.claude/skills'))).toEqual([])
  })

  it('keeps a symlink inside the skill as the same relative link', () => {
    write(join(home, '.claude/skills/check/SKILL.md'), 'x')
    write(join(home, '.claude/skills/check/docs/a.md'), 'a')
    symlinkSync(join(home, '.claude/skills/check/docs/a.md'), join(home, '.claude/skills/check/a.md'))
    copySkillToRepo(home, repo, 'check')
    const link = join(repo, '.claude/skills/check/a.md')
    expect(lstatSync(link).isSymbolicLink()).toBe(true)
    expect(readlinkSync(link)).toBe(join('docs', 'a.md'))
    expect(readFileSync(link, 'utf8')).toBe('a')
  })

  it('follows a skill directory that is itself a symlink', () => {
    write(join(base, 'checkout/check/SKILL.md'), 'linked')
    mkdirSync(join(home, '.claude/skills'), { recursive: true })
    symlinkSync(join(base, 'checkout/check'), join(home, '.claude/skills/check'))
    copySkillToRepo(home, repo, 'check')
    expect(lstatSync(join(repo, '.claude/skills/check')).isDirectory()).toBe(true)
    expect(readFileSync(join(repo, '.claude/skills/check/SKILL.md'), 'utf8')).toBe('linked')
  })

  it('copies a skill under its folder name, whatever it is called by', () => {
    write(join(home, '.claude/skills/My_Tool.v2/SKILL.md'), '---\nname: tool\n---\n')
    const dest = copySkillToRepo(home, repo, 'tool')
    expect(relativePathOf(dest)).toBe('.claude/skills/My_Tool.v2')
    expect(readFileSync(join(repo, '.claude/skills/My_Tool.v2/SKILL.md'), 'utf8')).toContain('name: tool')
    expect(hasSkillIn(repo, 'tool')).toBe(true)
  })

  it('copies a command to the same relative path, nested folders included', () => {
    write(join(home, '.claude/commands/ops/rollback.md'), 'roll')
    const dest = copySkillToRepo(home, repo, 'rollback')
    expect(relativePathOf(dest)).toBe('.claude/commands/ops/rollback.md')
    expect(readFileSync(join(repo, '.claude/commands/ops/rollback.md'), 'utf8')).toBe('roll')
    expect(readdirSync(join(repo, '.claude/commands/ops'))).toEqual(['rollback.md'])
  })

  it('copies what a symlinked command points at, as a plain file', () => {
    write(join(base, 'checkout/deploy.md'), 'linked')
    mkdirSync(join(home, '.claude/commands'), { recursive: true })
    symlinkSync(join(base, 'checkout/deploy.md'), join(home, '.claude/commands/deploy.md'))
    copySkillToRepo(home, repo, 'deploy')
    expect(lstatSync(join(repo, '.claude/commands/deploy.md')).isFile()).toBe(true)
    expect(readFileSync(join(repo, '.claude/commands/deploy.md'), 'utf8')).toBe('linked')
  })

  it('never overwrites a command, nor a skill the repository has in the other form', () => {
    write(join(home, '.claude/commands/deploy.md'), 'mine')
    write(join(repo, '.claude/commands/deploy.md'), 'theirs')
    expect(() => copySkillToRepo(home, repo, 'deploy')).toThrow(/already has/)
    expect(readFileSync(join(repo, '.claude/commands/deploy.md'), 'utf8')).toBe('theirs')

    write(join(home, '.claude/skills/check/SKILL.md'), 'mine')
    write(join(repo, '.claude/commands/check.md'), 'theirs')
    expect(() => copySkillToRepo(home, repo, 'check')).toThrow(/already has/)
    expect(existsSync(join(repo, '.claude/skills/check'))).toBe(false)
  })

  it('never overwrites whatever sits where the copy would land', () => {
    write(join(home, '.claude/skills/check/SKILL.md'), 'mine')
    mkdirSync(join(repo, '.claude/skills/check'), { recursive: true })
    write(join(repo, '.claude/skills/check/notes.txt'), 'theirs')
    expect(() => copySkillToRepo(home, repo, 'check')).toThrow(/already has/)
    expect(readdirSync(join(repo, '.claude/skills/check'))).toEqual(['notes.txt'])
  })
})
