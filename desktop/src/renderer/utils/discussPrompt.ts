import { isValidLanguage, type LanguageId, type RepositoryConfig } from '../../types'

/**
 * The opening line the Tasks page's "Discuss with an agent" button types into a
 * fresh agent, and the language it is written in.
 *
 * WHY IT IS ONE SHORT SENTENCE
 * ---------------------------------------------------------------------------
 * It used to be a paragraph — read it first, do not implement it, do not create a
 * branch, help me explain or summarise or refine or rewrite. All of it was
 * instruction the person then had to scroll past to reach the end of the box and
 * say the one thing they actually wanted to ask. A draft is an invitation to type,
 * so it names the ticket and stops; the sentence the person adds is what the
 * discussion is about, and Claude Code reads the ticket because the sentence asks
 * something about it.
 *
 * WHY IT IS NOT IN THE i18n CATALOGUE
 * ---------------------------------------------------------------------------
 * This is a prompt addressed to Claude, not chrome the reader looks at, so it
 * follows the REPOSITORY's discussion language (`languages.discussion` — "the
 * language Claude talks to you in") and not the language the app happens to be
 * displaying. Those are two different settings and they disagree all the time: an
 * English interface over a French team's repository must still open the discussion
 * in French, because that is the language the answer will come back in.
 *
 * Total over `LanguageId`, so adding a language to the app is a compile error here
 * rather than an agent silently addressed in English.
 */
const OPENERS: Record<LanguageId, (ref: string) => string> = {
  // The trailing space is load-bearing in both: the draft lands in the input box
  // with the caret after it, and the person carries straight on typing.
  en: (ref) => `Let's discuss ${ref} `,
  fr: (ref) => `Discutons de ${ref} `,
}

/**
 * The language a repository's agents talk in: `languages.discussion`, else English.
 *
 * A plain fallback rather than a chain — unlike `resolveTicketLanguage` in
 * `desktop/src/languages.ts`, `discussion` IS materialised in
 * DEFAULT_REPOSITORY_FIELDS, so an unset value here means a repository that
 * predates the field or a config written straight into the jsonb blob by the
 * webapp. `isValidLanguage` covers the same ground: an unknown code must fall back
 * to a language the app can actually write, not be interpolated into the prompt.
 */
export function resolveDiscussionLanguage(languages?: RepositoryConfig['languages']): LanguageId {
  const declared = languages?.discussion
  return isValidLanguage(declared) ? declared : 'en'
}

/**
 * The draft itself, for a ticket named by `ref` — a Jira KEY (`PROJ-123`) or a
 * GitHub issue URL, whichever the caller's tracker resolves a ticket by.
 *
 * MUST stay a single line: it is typed into the input box, where a newline IS the
 * send, so a two-line draft would post its first line and abandon the second.
 */
export function discussPrompt(ref: string, languages?: RepositoryConfig['languages']): string {
  return OPENERS[resolveDiscussionLanguage(languages)](ref)
}

/**
 * The agent's own name in the sidebar, so a discussion is recognisable next to the
 * agents that are working.
 *
 * English whatever the discussion language is, and deliberately: it is a LABEL in a
 * list of agents, sitting beside titles the skills write, and those are English too.
 */
export function discussAgentTitle(ticketId: string): string {
  return `Discuss ${ticketId}`
}
