import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { DEFAULT_WORKFLOW } from '../workflow/defaultFlow'

// Every cycle skill reads its workflow at Step 0 and computes its next step from it, following
// one protocol: `references/workflow.md`. That file is COPIED into each cycle skill rather than
// shared, because the skills updater installs `skills/<skill>/**` and nothing else, so a shared
// folder would never reach a user's machine. Seven copies of one protocol drift the moment one
// is edited alone, and the drift is silent: each skill still reads a plausible protocol, just
// not the same one, and two skills of the same chain disagree about when to chain.
//
// This test holds the copies together, and holds the side skills out of it.
//
// The cycle skills are the default flow's nodes, not a list spelled out here: a skill that joins
// the cycle joins the default flow (desktop/src/workflow/defaultFlow.ts), and this test then asks
// for its copy of the protocol without being edited.

const REPO_ROOT = join(__dirname, '..', '..', '..')
const PROTOCOL = join('references', 'workflow.md')

const CYCLE_SKILLS = DEFAULT_WORKFLOW.nodes.map((node) => node.skill).sort()

/** The skill folders that actually ship, as skills-registry.test.ts derives them. */
function shippedSkills(): string[] {
  return readdirSync(join(REPO_ROOT, 'skills'))
    .filter((entry) => entry.startsWith('magic-'))
    .filter((entry) => existsSync(join(REPO_ROOT, 'skills', entry, 'SKILL.md')))
    .sort()
}

function skillFile(skill: string, relativePath: string): string {
  return join(REPO_ROOT, 'skills', skill, relativePath)
}

describe('workflow protocol shipped with the skills', () => {
  it('scans a non-empty set of skills and cycle skills', () => {
    expect(shippedSkills().length).toBeGreaterThan(0)
    expect(CYCLE_SKILLS.length).toBeGreaterThan(0)
  })

  it('draws the cycle skills from skills that actually ship', () => {
    const shipped = shippedSkills()
    for (const skill of CYCLE_SKILLS) expect(shipped).toContain(skill)
  })

  it.each(CYCLE_SKILLS)('%s carries references/workflow.md', (skill) => {
    expect(existsSync(skillFile(skill, PROTOCOL))).toBe(true)
  })

  it('keeps every copy of the protocol byte-identical', () => {
    const copies = CYCLE_SKILLS.map((skill) => ({ skill, bytes: readFileSync(skillFile(skill, PROTOCOL)) }))
    const [reference] = copies
    for (const copy of copies) {
      expect({ skill: copy.skill, same: copy.bytes.equals(reference.bytes) }).toEqual({
        skill: copy.skill,
        same: true,
      })
    }
  })

  it.each(CYCLE_SKILLS)('%s/SKILL.md points at the protocol and the /workflow read', (skill) => {
    const source = readFileSync(skillFile(skill, 'SKILL.md'), 'utf-8')
    expect(source).toContain('references/workflow.md')
    // Backticked, so that the path above (which contains "/workflow") cannot satisfy it alone.
    expect(source).toContain('`/workflow`')
  })

  it('keeps the side skills out of the protocol', () => {
    const side = shippedSkills().filter((skill) => !CYCLE_SKILLS.includes(skill))
    // The two side doors today; the list is derived so that a new one is held out too.
    expect(side).toEqual(expect.arrayContaining(['magic-continue', 'magic-plan-change']))
    for (const skill of side) {
      expect(existsSync(skillFile(skill, PROTOCOL))).toBe(false)
      expect(readFileSync(skillFile(skill, 'SKILL.md'), 'utf-8')).not.toContain('references/workflow.md')
    }
  })
})
