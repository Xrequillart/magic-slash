import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { SetupStatus } from '../../types'
import { readConfig } from '../config/config'
import { checkPrerequisites, hasBlockingIssue, hasHomebrew } from './prerequisites'
import { allMcpServerStatuses } from './mcp'

/**
 * Everything the old install script used to verify, answered in one call.
 *
 * Read by two surfaces with the same data: the first-run wizard (which shows it while
 * something is missing) and the settings panel (which shows it forever, so a setup
 * that rots six months later is diagnosable without reinstalling anything).
 */

const SKILLS = ['magic-start', 'magic-continue', 'magic-commit', 'magic-pr', 'magic-review', 'magic-resolve', 'magic-done']

/**
 * Which skills are actually on disk.
 *
 * A folder alone is not enough — a half-written skill directory from an interrupted
 * update would count as installed and then fail when Claude Code tried to read it. The
 * SKILL.md is the file that makes a skill a skill.
 */
export function installedSkills(): string[] {
  const skillsDir = path.join(os.homedir(), '.claude', 'skills')
  return SKILLS.filter((skill) => fs.existsSync(path.join(skillsDir, skill, 'SKILL.md')))
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const [prerequisites, homebrew] = await Promise.all([checkPrerequisites(), hasHomebrew()])
  const config = readConfig()
  const skills = installedSkills()

  const status: Omit<SetupStatus, 'needsSetup'> = {
    prerequisites,
    homebrew,
    mcpServers: allMcpServerStatuses(),
    integrations: {
      // GitHub is not a toggle — every skill that opens a PR needs it, which is why
      // the config types it as the literal `true`. Reported anyway so the panel can
      // show it next to Atlassian rather than treating it as a special case.
      github: config.integrations?.github ?? true,
      atlassian: config.integrations?.atlassian !== false,
    },
    /** Whether the user has ever been asked; drives the first-run wizard. */
    integrationsChosen: config.integrations !== undefined,
    installedSkills: skills,
    missingSkills: SKILLS.filter((s) => !skills.includes(s)),
    blocked: hasBlockingIssue(prerequisites),
  }

  return { ...status, needsSetup: needsSetup(status) }
}

/**
 * Whether to open the first-run wizard.
 *
 * Deliberately narrow: it asks only when something is genuinely unusable or unasked.
 * A wizard that reappears because `gh` is missing — an optional tool with a documented
 * fallback — would be a nag, and people close nags without reading them, including the
 * one time it had something important to say.
 */
export function needsSetup(status: Omit<SetupStatus, 'needsSetup'>): boolean {
  if (status.blocked) return true
  if (!status.integrationsChosen) return true
  if (status.missingSkills.length > 0) return true
  // A required integration with no MCP server behind it: the skills would fail at
  // their first Jira or GitHub call.
  return status.mcpServers.some(
    (server) => server.state === 'missing' && (server.id === 'github' ? status.integrations.github : status.integrations.atlassian),
  )
}
