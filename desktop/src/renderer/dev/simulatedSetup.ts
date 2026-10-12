import type { SetupStatus } from '../../types'

/**
 * A BROKEN MACHINE, ON DEMAND — dev only, for looking at what a problem looks like.
 *
 * The quick-settings sheet opens on the machine's verdict, and on a developer's own
 * machine that verdict is always "ready": every tool is installed, both MCP servers are
 * configured, the skills are there. So the red state — the count, the cross, the panel
 * behind it — was the one thing in this app nobody could see without breaking their own
 * setup first, which is a poor way to check a colour.
 *
 * ONE SOURCE FOR BOTH SURFACES. The verdict on the sheet and the repair card in the
 * settings panel each ask the main process for the status; if only one of them knew
 * about the simulation, pressing the verdict would open a page saying the machine is
 * fine. Both call `getSetupStatus()` from here instead, so the lie is told once.
 *
 * IT IS NOT A STORE FLAG. The dev menu already speaks to the rest of the app through
 * `window` events — the empty agents list, the fake planning agent — and a debug switch
 * has no business in the state the product is built out of. Anything that wants to
 * follow it listens for `SETUP_SIMULATION_EVENT` and re-asks.
 *
 * STRIPPED IN PRODUCTION: every branch below is behind `import.meta.env.DEV`, which Vite
 * replaces with `false` in a production build, so the fixture goes with the dead code
 * around it. `setSimulatedSetup` is likewise a no-op there.
 */

export const SETUP_SIMULATION_EVENT = 'debug:setup-broken'

let simulated = false

/** Whether the fake is armed. Always false outside the dev server. */
export function isSetupSimulated(): boolean {
  return import.meta.env.DEV && simulated
}

/**
 * Arm or disarm the fake, and tell everything that is showing a verdict to ask again.
 * The event carries the new value so a listener can label itself without importing the
 * flag's reader as well.
 */
export function setSimulatedSetup(on: boolean): void {
  if (!import.meta.env.DEV) return
  simulated = on
  window.dispatchEvent(new CustomEvent(SETUP_SIMULATION_EVENT, { detail: on }))
}

/**
 * What a machine in trouble looks like: three problems of the three KINDS the verdict
 * counts, because the count is the thing being checked and one kind would not exercise
 * it. A required tool missing, a required tool too old, one MCP server unconfigured —
 * and a missing skill, so the settings card has a row of each sort to draw.
 *
 * `installable: false` and no Homebrew on purpose: it is the harder of the two repair
 * paths to draw — a command to copy and a link rather than a button — and the one a
 * developer on a well-kept mac never sees.
 */
const BROKEN: SetupStatus = {
  prerequisites: [
    { id: 'claude', installed: true, outdated: false, version: '2.0.14', minVersion: null, required: true, installCommand: null, installable: false, docsUrl: null },
    { id: 'node', installed: true, outdated: true, version: '16.20.2', minVersion: '20', required: true, installCommand: 'brew install node', installable: false, docsUrl: 'https://nodejs.org' },
    { id: 'git', installed: true, outdated: false, version: '2.43.0', minVersion: null, required: true, installCommand: null, installable: false, docsUrl: null },
    { id: 'jq', installed: false, outdated: false, version: null, minVersion: null, required: true, installCommand: 'brew install jq', installable: false, docsUrl: 'https://jqlang.github.io/jq/' },
    { id: 'gh', installed: false, outdated: false, version: null, minVersion: null, required: false, installCommand: 'brew install gh', installable: false, docsUrl: 'https://cli.github.com' },
  ],
  homebrew: false,
  mcpServers: [
    { id: 'github', state: 'missing', url: null },
    { id: 'atlassian', state: 'configured', url: 'https://mcp.atlassian.com/v1/sse' },
  ],
  integrations: { github: true, atlassian: true },
  integrationsChosen: true,
  installedSkills: ['magic-start', 'magic-commit', 'magic-pr'],
  missingSkills: ['magic-review'],
  blocked: true,
  needsSetup: true,
}

/**
 * The machine's setup as the app should believe it to be — the real answer, or the
 * fixture while the simulation is armed.
 *
 * Every surface that draws the verdict goes through this rather than calling the IPC
 * directly. The launch wizard does NOT: it decides whether to open at all from a status
 * the main process pushed before this module could be asked, and a wizard that appeared
 * over the app because a debug switch was flipped would be a dev tool taking the screen.
 */
export function getSetupStatus(): Promise<SetupStatus> {
  if (isSetupSimulated()) return Promise.resolve(BROKEN)
  return window.electronAPI.setup.getStatus()
}
