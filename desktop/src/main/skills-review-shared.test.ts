import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// /magic:auto-review (your own PR, a step of the cycle) and /magic:review (a colleague's PR, a
// side door) are the same review with two different endings. They share their structure step for
// step, and every reference file but `workflow.md`. Those files are COPIED into both folders
// rather than shared, for the reason workflow.md is copied into every cycle skill: the skills
// updater installs `skills/<skill>/**` and nothing else.
//
// Two copies of a review checklist drift the moment one is edited alone, and the drift is silent:
// both skills still read a plausible checklist, just not the same one. This test holds them
// together, and holds the workflow protocol to the cycle side only.

const REPO_ROOT = join(__dirname, '..', '..', '..')
const AUTO = join(REPO_ROOT, 'skills', 'magic-auto-review')
const EXTERNAL = join(REPO_ROOT, 'skills', 'magic-review')

function references(skillDir: string): string[] {
  return readdirSync(join(skillDir, 'references')).filter((file) => file.endsWith('.md')).sort()
}

const SHARED = references(EXTERNAL)

describe('the references shared by the two review skills', () => {
  it('finds the shared references, so an empty scan cannot pass silently', () => {
    expect(SHARED).toEqual(expect.arrayContaining(['analysis.md', 'intent.md', 'messages.md', 'posting.md', 'review-config.md']))
  })

  it('gives auto-review exactly the shared references, plus the workflow protocol', () => {
    expect(references(AUTO)).toEqual([...SHARED, 'workflow.md'].sort())
  })

  it.each(SHARED)('keeps references/%s byte-identical in both skills', (file) => {
    const auto = readFileSync(join(AUTO, 'references', file))
    const external = readFileSync(join(EXTERNAL, 'references', file))
    expect(auto.equals(external)).toBe(true)
  })

  it.each(SHARED)('points both SKILL.md at references/%s', (file) => {
    for (const dir of [AUTO, EXTERNAL]) {
      expect(readFileSync(join(dir, 'SKILL.md'), 'utf-8')).toContain(`references/${file}`)
    }
  })

  it('keeps the same steps, in the same order, in both SKILL.md', () => {
    const steps = (dir: string) =>
      [...readFileSync(join(dir, 'SKILL.md'), 'utf-8').matchAll(/^## Step (\d+):/gm)].map((m) => Number(m[1]))
    expect(steps(AUTO).length).toBeGreaterThan(5)
    expect(steps(EXTERNAL)).toEqual(steps(AUTO))
  })

  it('records each run under its own skill name', () => {
    expect(readFileSync(join(AUTO, 'SKILL.md'), 'utf-8')).toContain('"skill":"magic-auto-review"')
    expect(readFileSync(join(EXTERNAL, 'SKILL.md'), 'utf-8')).toContain('"skill":"magic-review"')
  })

  it('keeps both skills read-only', () => {
    for (const dir of [AUTO, EXTERNAL]) {
      expect(readFileSync(join(dir, 'SKILL.md'), 'utf-8')).toMatch(/^disallowed-tools: Write, Edit, NotebookEdit$/m)
    }
  })

  it('ships the workflow protocol with auto-review only', () => {
    expect(existsSync(join(AUTO, 'references', 'workflow.md'))).toBe(true)
    expect(existsSync(join(EXTERNAL, 'references', 'workflow.md'))).toBe(false)
  })
})
