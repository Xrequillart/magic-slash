import { query } from '@anthropic-ai/claude-agent-sdk'
import { which } from './setup/shell-exec'
import { isValidModelName, type ClaudeModelOption } from '../types'

/**
 * THE MODELS THE READER'S OWN `/model` OFFERS, for Settings → Agents.
 *
 * Asked of the installed CLI rather than listed here, so the picker never goes stale: a
 * Claude Code release that adds a model, or an organization that offers an extra one,
 * shows up without a Magic Slash release. `supportedModels()` is the Agent SDK's
 * documented answer to exactly that question — "what /model shows" — and it sends no
 * prompt, so it costs no tokens. It does start a CLI process for the length of the
 * question (~300 ms), which is why the answer is kept for the life of the app.
 *
 * THE SDK IS A devDependency ON PURPOSE. Vite bundles its JavaScript into dist/main, and
 * electron-builder only ships `dependencies`, so the platform binary the SDK would
 * otherwise bring along (hundreds of megabytes) never reaches the .dmg. It is not needed:
 * `pathToClaudeCodeExecutable` points it at the reader's own `claude`, which is also what
 * makes the list theirs — their version, their account, their organization.
 *
 * `default` is dropped: it is the CLI's own "no choice", which this app spells as no
 * `--model` at all, and the picker offers that as its first row under its own name.
 */

let cached: Promise<ClaudeModelOption[]> | null = null

async function ask(): Promise<ClaudeModelOption[]> {
  const executable = await which('claude')
  if (!executable) return []
  const abortController = new AbortController()
  // A prompt that never yields: the session is opened only to be asked a question, and
  // nothing is ever sent to the model.
  async function* noPrompt(): AsyncGenerator<never> {
    await new Promise<never>(() => {})
  }
  const session = query({ prompt: noPrompt(), options: { pathToClaudeCodeExecutable: executable, abortController } })
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const models = await Promise.race([
      session.supportedModels(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 15_000) }),
    ])
    return models
      .filter((model) => model.value !== 'default' && isValidModelName(model.value))
      .map((model) => ({ value: model.value, label: model.displayName, description: model.description }))
  } finally {
    clearTimeout(timer)
    // Ends the CLI process the session started: it was only ever there to be asked.
    abortController.abort()
  }
}

/** The list, asked once and kept. A failed ask is not kept, so the next open retries. */
export function listClaudeModels(): Promise<ClaudeModelOption[]> {
  if (!cached) {
    cached = ask().catch((error) => {
      cached = null
      throw error
    })
  }
  return cached
}
