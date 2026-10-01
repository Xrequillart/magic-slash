import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { collectListingEntries, parseFrontmatterFields } from './skills-listing'

let home: string

function write(file: string, content: string) {
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, content)
}

function skill(dir: string, fields: string) {
  write(join(dir, 'SKILL.md'), `---\n${fields}\n---\n\nbody\n`)
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'skills-listing-'))
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('parseFrontmatterFields', () => {
  it('reads folded and literal block scalars instead of a lone ">"', () => {
    const fm = parseFrontmatterFields('---\nname: x\ndescription: >\n  first line\n  second line\nother: y\n---\n')
    expect(fm.description).toBe('first line second line')
    expect(fm.other).toBe('y')
  })

  it('strips the quotes around a quoted value', () => {
    expect(parseFrontmatterFields('---\ndescription: "Use it: always"\n---\n').description).toBe('Use it: always')
  })
})

describe('collectListingEntries', () => {
  it('joins when_to_use to the description, as the listing appends it', () => {
    skill(join(home, '.claude/skills/a'), 'name: a\ndescription: Does A.\nwhen_to_use: When A.')
    const { entries } = collectListingEntries({ home, repos: [], builtIn: [] })
    expect(entries).toEqual([{ name: 'a', text: 'Does A. When A.', description: 'Does A.', source: 'custom', mode: 'full' }])
  })

  it('marks built-ins by directory and reads user commands', () => {
    skill(join(home, '.claude/skills/magic-start'), 'name: magic:start\ndescription: Start.')
    write(join(home, '.claude/commands/deploy.md'), '---\ndescription: Deploy.\n---\n')
    const { entries } = collectListingEntries({ home, repos: [], builtIn: ['magic-start'] })
    expect(entries.map((e) => [e.name, e.source])).toEqual([['magic:start', 'built-in'], ['deploy', 'custom']])
  })

  it('leaves out what the listing hides and keeps name-only skills by name', () => {
    skill(join(home, '.claude/skills/manual'), 'name: manual\ndescription: M.\ndisable-model-invocation: true')
    skill(join(home, '.claude/skills/quiet'), 'name: quiet\ndescription: Q.')
    skill(join(home, '.claude/skills/gone'), 'name: gone\ndescription: G.')
    write(join(home, '.claude/settings.json'), JSON.stringify({ skillOverrides: { quiet: 'name-only', gone: 'off' } }))
    const modes = Object.fromEntries(collectListingEntries({ home, repos: [], builtIn: [] }).entries.map((e) => [e.name, e.mode]))
    expect(modes).toEqual({ manual: 'hidden', quiet: 'name-only', gone: 'hidden' })
  })

  it('counts enabled user-scope plugins, prefixed, and skips disabled ones', () => {
    const on = join(home, 'plugins/on')
    const off = join(home, 'plugins/off')
    skill(join(on, 'skills/review'), 'name: review\ndescription: Reviews.')
    write(join(on, 'commands/fix.md'), '---\ndescription: Fixes.\n---\n')
    skill(join(off, 'skills/other'), 'name: other\ndescription: Other.')
    write(join(home, '.claude/plugins/installed_plugins.json'), JSON.stringify({
      version: 2,
      plugins: {
        'on@market': [{ scope: 'user', installPath: on }],
        'off@market': [{ scope: 'user', installPath: off }],
      },
    }))
    write(join(home, '.claude/settings.json'), JSON.stringify({ enabledPlugins: { 'on@market': true, 'off@market': false } }))
    const { entries } = collectListingEntries({ home, repos: [], builtIn: [] })
    expect(entries.map((e) => [e.name, e.source, e.origin])).toEqual([
      ['on:review', 'plugin', 'on'],
      ['on:fix', 'plugin', 'on'],
    ])
  })

  it('reads organisation-synced plugins at their manifest generation, and synced skills', () => {
    const bucket = join(home, '.claude/plugins/synced/b1')
    write(join(bucket, 'manifest.json'), JSON.stringify({ plugins: [{ name: 'brand', generation: 2 }] }))
    skill(join(bucket, 'brand/skills/old'), 'name: old\ndescription: Stale generation.')
    skill(join(bucket, 'brand~g2/skills/guide'), 'name: guide\ndescription: Current generation.')
    const skills = join(home, '.claude/skills/synced/b2')
    write(join(skills, 'manifest.json'), JSON.stringify({ skills: [{ name: 'pdf', source: 'anthropic' }] }))
    skill(join(skills, 'pdf'), 'name: pdf\ndescription: PDFs.')
    const names = collectListingEntries({ home, repos: [], builtIn: [] }).entries.map((e) => e.name)
    expect(names).toEqual(['brand:guide', 'anthropic-skills:pdf'])
  })

  it('applies a repository’s own overrides to its skills and lists one name once', () => {
    const repo = join(home, 'repo')
    skill(join(repo, '.claude/skills/audit'), 'name: audit\ndescription: Audits.')
    skill(join(repo, '.claude/skills/shared'), 'name: shared\ndescription: Repo copy.')
    skill(join(home, '.claude/skills/shared'), 'name: shared\ndescription: User copy.')
    write(join(repo, '.claude/settings.local.json'), JSON.stringify({ skillOverrides: { audit: 'name-only' } }))
    const { entries } = collectListingEntries({ home, repos: [{ name: 'r', path: repo }], builtIn: [] })
    expect(entries.map((e) => [e.name, e.source, e.mode])).toEqual([
      ['shared', 'custom', 'full'],
      ['audit', 'repo', 'name-only'],
    ])
  })

  it('reads the outcomes a skill declares, as a flow or a block list', () => {
    skill(join(home, '.claude/skills/check'), 'name: check\ndescription: Checks.\noutcomes: [tests_passed, tests_failed]')
    skill(join(home, '.claude/skills/lint'), 'name: lint\ndescription: Lints.\noutcomes:\n  - clean\n  - dirty')
    skill(join(home, '.claude/skills/plain'), 'name: plain\ndescription: Nothing declared.')
    const { entries } = collectListingEntries({ home, repos: [], builtIn: [] })
    const byName = Object.fromEntries(entries.map((entry) => [entry.name, entry]))
    expect(byName.check.outcomes).toEqual(['tests_passed', 'tests_failed'])
    expect(byName.lint.outcomes).toEqual(['clean', 'dirty'])
    expect(byName.plain).not.toHaveProperty('outcomes')
  })

  it('reports the budget settings the user changed', () => {
    write(join(home, '.claude/settings.json'), JSON.stringify({ skillListingBudgetFraction: 0.02, skillListingMaxDescChars: 800 }))
    const { settings } = collectListingEntries({ home, repos: [], builtIn: [], env: { SLASH_COMMAND_TOOL_CHAR_BUDGET: '12000' } })
    expect(settings).toEqual({ budgetFraction: 0.02, maxDescChars: 800, fixedCharBudget: 12000 })
  })
})
