import * as path from 'path'
import * as os from 'os'

/**
 * The one config dir every build shares, whatever build it is.
 *
 * Anything whose path is handed to Claude Code belongs here and never gets the dev
 * suffix: the statusline wrapper, the skill spool and the `Read()` permission are
 * written into ~/.claude/settings.json, a single file shared by every build AND by
 * plain `claude` sessions. Making them per-instance would mean the build that
 * launched last repoints every session at its own dir, and the statusline marker
 * would stop matching the other build's wrapper — each would then bake the other's
 * wrapper in as "the user's original statusline", nesting them.
 */
export const STABLE_CONFIG_DIR = path.join(os.homedir(), '.config', 'magic-slash')

/**
 * Resolve the per-instance config dir. Split out from the constant below so it can
 * be tested without an env var and a module reload.
 *
 * @param devServerUrl VITE_DEV_SERVER_URL — set only by `npm run desktop`.
 */
export function resolveConfigDir(stableDir: string, devServerUrl: string | undefined): string {
  return devServerUrl ? `${stableDir}-dev` : stableDir
}

/**
 * Where this instance keeps the state it must NOT share with another running app:
 * cloud-session.enc, port, outbox.ndjson, command-history.json. (No config.json —
 * settings live in Supabase, and nothing mirrors them to disk any more.)
 *
 * The dev build gets its own copy. Sharing them with the installed app is what made
 * both instances hydrate the same session, restore the same agent roster and write
 * it to the same rows — the duplicate agents of issue #179 — and made the hooks of
 * every Claude session report into whichever app started last (one shared port file).
 */
export const CONFIG_DIR = resolveConfigDir(STABLE_CONFIG_DIR, process.env.VITE_DEV_SERVER_URL)
