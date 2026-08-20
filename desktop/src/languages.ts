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
 * That inheritance is only expressible as a chain, `ticket` -> `jiraComment` ->
 * 'en', and a chain is destroyed by a default. Putting `ticket: 'en'` in
 * DEFAULT_REPOSITORY_FIELDS would have deepMergeDefaults write it onto every
 * existing repo at first launch, after which `ticket` is always set, the second
 * link is dead code, and a team whose `jiraComment` is 'fr' silently gets English
 * tickets. So the key stays ABSENT from the defaults and is resolved here, at
 * read time, by whoever needs an answer.
 *
 * Sits next to `types.ts` rather than under `main/config/` because both processes
 * need it: the settings form has to display the effective language (showing 'en'
 * next to a chain that resolves to 'fr' is the bug this module exists to prevent),
 * and the main process resolves it for anything writing a ticket.
 */

/** Last resort when a chain resolves to nothing. */
const FALLBACK_LANGUAGE = 'en'

/**
 * The language tickets — and the `.magic/spec-*.md` artifact they come from —
 * are written in: `languages.ticket`, else `languages.jiraComment`, else 'en'.
 *
 * Empty strings are treated as unset. They are not reachable through the settings
 * UI, which offers closed dropdowns, but the config is a jsonb blob the webapp
 * writes wholesale, so a `''` arriving here is a question of when, not if — and
 * '' would otherwise win the chain and produce a ticket in no language at all.
 */
export function resolveTicketLanguage(languages?: RepositoryConfig['languages']): string {
  return languages?.ticket || languages?.jiraComment || FALLBACK_LANGUAGE
}
