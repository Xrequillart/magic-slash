import { describe, it, expect } from 'vitest'
import { needsSetup } from './status'
import type { SetupStatus, PrerequisiteStatus } from '../../types'

/**
 * The rule that decides whether a modal interrupts someone's launch.
 *
 * Tested closely because both failure directions are bad in ways that are hard to
 * notice from the inside: too eager and the wizard becomes a nag people dismiss
 * reflexively, including the once it mattered; too shy and a machine that cannot run a
 * single skill says nothing about it.
 */

function prerequisite(overrides: Partial<PrerequisiteStatus> = {}): PrerequisiteStatus {
  return {
    id: 'jq',
    installed: true,
    outdated: false,
    version: '1.7.1',
    minVersion: null,
    required: true,
    installCommand: null,
    installable: false,
    docsUrl: null,
    ...overrides,
  }
}

/** A fully set-up machine: the baseline every case below deviates from by one thing. */
function healthy(overrides: Partial<Omit<SetupStatus, 'needsSetup'>> = {}): Omit<SetupStatus, 'needsSetup'> {
  return {
    prerequisites: [prerequisite()],
    homebrew: true,
    mcpServers: [
      { id: 'atlassian', state: 'configured', url: 'https://mcp.atlassian.com/v1/mcp' },
      { id: 'github', state: 'configured', url: 'https://api.githubcopilot.com/mcp/' },
    ],
    integrations: { github: true, atlassian: true },
    integrationsChosen: true,
    installedSkills: ['magic-start', 'magic-commit'],
    missingSkills: [],
    blocked: false,
    ...overrides,
  }
}

describe('needsSetup', () => {
  it('stays out of the way on a machine that is ready', () => {
    expect(needsSetup(healthy())).toBe(false)
  })

  it('asks when a required prerequisite is missing', () => {
    expect(needsSetup(healthy({ blocked: true }))).toBe(true)
  })

  it('asks when the integration choice has never been made', () => {
    expect(needsSetup(healthy({ integrationsChosen: false }))).toBe(true)
  })

  it('asks when a skill failed to install', () => {
    expect(needsSetup(healthy({ missingSkills: ['magic-pr'] }))).toBe(true)
  })

  it('asks when an MCP server for an ENABLED integration is missing', () => {
    expect(needsSetup(healthy({
      mcpServers: [{ id: 'github', state: 'missing', url: null }],
    }))).toBe(true)
  })

  it('ignores a missing MCP server for a DISABLED integration', () => {
    // A GitHub-only user has no Atlassian server on purpose. Prompting them about it
    // would be asking them to undo their own choice at every launch.
    expect(needsSetup(healthy({
      integrations: { github: true, atlassian: false },
      mcpServers: [
        { id: 'atlassian', state: 'missing', url: null },
        { id: 'github', state: 'configured', url: 'https://api.githubcopilot.com/mcp/' },
      ],
    }))).toBe(false)
  })

  it('does not ask about a legacy MCP server', () => {
    // A machine installed by the old script has a WORKING stdio GitHub server. The
    // migration is offered in Settings; it is not a reason to interrupt a launch.
    expect(needsSetup(healthy({
      mcpServers: [{ id: 'github', state: 'legacy', url: null, command: 'npx' }],
    }))).toBe(false)
  })

  it('does not ask about a missing optional tool', () => {
    // `gh` absent leaves /magic:resolve with a documented fallback and nothing else
    // broken. `blocked` already encodes the required/optional distinction.
    expect(needsSetup(healthy({
      prerequisites: [prerequisite({ id: 'gh', required: false, installed: false })],
      blocked: false,
    }))).toBe(false)
  })
})
