/**
 * A chat message as it is written into the agent's TUI: `promptBytes` and `submitDelay` now
 * live in src/prompt-submit.ts, shared with the main process, which submits a paired
 * iPhone's prompts the same way. Re-exported here so the renderer's callers keep their names.
 */
export { promptBytes, submitDelay } from '../../prompt-submit'
