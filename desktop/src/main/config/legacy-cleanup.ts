import * as fs from 'fs'
import * as path from 'path'
import { CONFIG_DIR } from './paths'

/**
 * Retire the pre-cloud `config.json`.
 *
 * Supabase is the single source of truth (see store/CloudStore.ts) and nothing has
 * mirrored settings to disk since that migration — but the file it replaced was never
 * removed. It therefore kept answering `cat ~/.config/magic-slash/config.json` with
 * whatever was true the day it was last written: repositories since deleted, a version
 * many releases behind, integrations long re-toggled. Every reader that still reaches
 * for that path (a skill, an agent following stale documentation, the CLI) silently
 * acts on it, and nothing about the read looks wrong.
 *
 * Archived rather than deleted, for two reasons: the stale read then fails loudly
 * instead of returning plausible fiction, which is the whole point; and it does not
 * destroy the only copy of settings for a user who never got them into the cloud.
 */
const LEGACY_CONFIG = 'config.json'
const ARCHIVE_SUFFIX = '.pre-cloud-migration'

/**
 * @returns the archive path when something was moved, `null` when there was nothing
 *          to do (the common case, every launch after the first).
 */
export function archiveLegacyConfig(dir: string = CONFIG_DIR): string | null {
  const source = path.join(dir, LEGACY_CONFIG)
  const target = `${source}${ARCHIVE_SUFFIX}`

  try {
    if (!fs.existsSync(source)) return null

    // The first archive wins. A config.json reappearing later was written by
    // something confused about where settings live, and is worth less than the
    // genuine pre-migration snapshot it would otherwise overwrite.
    if (fs.existsSync(target)) {
      fs.rmSync(source, { force: true })
    } else {
      fs.renameSync(source, target)
    }
    return target
  } catch (error) {
    // Non-fatal: a surviving file is a stale-read risk, not a broken app.
    console.error('[LegacyCleanup] Failed to archive the legacy config.json:', error)
    return null
  }
}
