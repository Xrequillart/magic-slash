import type { RepositoryConfig } from './types'

/**
 * Resolving the per-repository language settings that are FALLBACK CHAINS rather
 * than plain defaults.
 *
 * WHY A MODULE, AND WHY NOT A DEFAULT
 * ---------------------------------------------------------------------------
 * `languages.ticket` is the language created tickets are WRITTEN IN — distinct
 * from `languages.discussion`, the language a skill talks to you in. Most teams
 * never set it, and the sensible thing to inherit is the language they already
 * chose for the other thing that lands in a tracker: `languages.jiraComment`.
 *
 * `languages.spec` sits one link further out, for the `.magic/spec-*.md` document
 * `/magic:plan` writes. It inherits the ticket language because the spec is the
 * source text the ticket bodies are composed from, so the same language for both
 * is what most people want — and the two are separable because reviewing a spec
 * and filing a ticket have different audiences: the author reads the spec, the
 * team reads the tracker.
 *
 * That inheritance is only expressible as a chain — `ticket` -> `jiraComment` ->
 * 'en', and `spec` -> that whole chain — and a chain is destroyed by a default.
 * Putting `ticket: 'en'` in DEFAULT_REPOSITORY_FIELDS would have deepMergeDefaults
 * write it onto every existing repo at first launch, after which `ticket` is always
 * set, the second link is dead code, and a team whose `jiraComment` is 'fr'
 * silently gets English tickets. So neither key is ever defaulted; both are
 * resolved here, at read time, by whoever needs an answer.
 *
 * Sits next to `types.ts` rather than under `main/config/` because both processes
 * need them: the settings form has to display the effective language (showing 'en'
 * next to a chain that resolves to 'fr' is the bug this module exists to prevent),
 * and the main process resolves it for anything writing a ticket.
 */

/** Last resort when a chain resolves to nothing. */
const FALLBACK_LANGUAGE = 'en'

/**
 * The language tickets are written in: `languages.ticket`, else
 * `languages.jiraComment`, else 'en'.
 *
 * The spec they are composed from follows this by default but can be pulled off
 * it — see `resolveSpecLanguage` below.
 *
 * Empty strings are treated as unset. They are not reachable through the settings
 * UI, which offers closed dropdowns, but the config is a jsonb blob the webapp
 * writes wholesale, so a `''` arriving here is a question of when, not if — and
 * '' would otherwise win the chain and produce a ticket in no language at all.
 */
export function resolveTicketLanguage(languages?: RepositoryConfig['languages']): string {
  return languages?.ticket || languages?.jiraComment || FALLBACK_LANGUAGE
}

/**
 * The language the `.magic/spec-*.md` document is written in: `languages.spec`,
 * else whatever the tickets are written in.
 *
 * Delegates the tail to `resolveTicketLanguage` rather than repeating its two
 * links. That is not brevity: the spec inherits the TICKET LANGUAGE, not
 * `jiraComment` directly, so a repo that sets only `ticket` must move both. Two
 * copies of the tail would let the answers drift the day one is edited.
 *
 * An unset `spec` therefore resolves to exactly what this repo resolved to before
 * the key existed — which is what makes adding it a no-op for every existing
 * configuration.
 */
export function resolveSpecLanguage(languages?: RepositoryConfig['languages']): string {
  return languages?.spec || resolveTicketLanguage(languages)
}
