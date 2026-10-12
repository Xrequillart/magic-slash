import { fold } from './text'

/**
 * What "blocked" means, in the one place both sides of the bridge can read it.
 *
 * BLOCKED IS A WORD, NOT A FIELD. Jira has no blocked flag this app can query — its
 * `Flagged` field is a custom field whose id differs per site — so a blocked ticket
 * is recognised by the WORD in the name of the status its team gave it. That rule
 * used to live in `renderer/utils/taskBoard.ts` and be applied only to tickets that
 * had already arrived.
 *
 * It moved here when the sprint read started giving the Blocked column a page budget
 * of its own (see `buildSprintBlockedJql`). The main process now has to name the
 * site's blocked statuses in JQL, and the renderer still classifies the rows that
 * come back: two copies of the vocabulary would mean a ticket fetched under the
 * blocked budget and then drawn in Backlog, which is the exact bug a shared rule
 * makes impossible.
 */

/**
 * The words that mean "blocked", in the two languages this app is written in, folded
 * the way `fold` folds everything else.
 *
 * PREFIXES, tested against a status NAME with `includes`. A Jira status is a sentence
 * a team wrote — "Blocked", "Bloqué par le client", "Blocked / on hold" — so anything
 * stricter than a substring would match our own board and nobody else's.
 */
export const BLOCKED_WORDS = ['block', 'bloqu']

/**
 * The same question asked of a GitHub LABEL, and asked more strictly.
 *
 * A whole-label match on a small set, where a Jira status gets a substring. Labels are
 * a flat namespace people put anything in, and `blocker` — which contains `block` — is
 * a severity on most repositories that use it, not a state: a substring rule would move
 * every urgent bug into a column that says nobody can work on it. So the label has to
 * BE one of these, once folded and stripped of the separators people spell labels with
 * (`blocked-by`, `on hold`, `on_hold`).
 */
const BLOCKED_LABELS = new Set(['blocked', 'blockedby', 'blocking', 'bloque', 'bloquee', 'onhold'])

/** A label as `BLOCKED_LABELS` spells its entries: folded, and separator-free. */
function labelToken(label: string): string {
  return fold(label).replace(/[^a-z0-9]/g, '')
}

/**
 * Whether a Jira status name says the ticket is blocked.
 *
 * The STATUS and not Jira's `Flagged` field, which is the other place a site can record
 * an impediment. Flagged is a custom field whose id differs per site and would have to
 * be resolved and asked for on every sprint read; the status is already on the ticket
 * and is what a board's own Blocked column is made of. A team that flags instead of
 * moving the ticket keeps the ticket in `progress`, which is where their board shows
 * it too.
 */
export function isBlockedStatus(statusName: string): boolean {
  const folded = fold(statusName)
  return BLOCKED_WORDS.some((word) => folded.includes(word))
}

/** Whether any of a GitHub issue's labels says it is blocked. See `BLOCKED_LABELS`. */
export function isBlockedLabel(labels: readonly string[]): boolean {
  return labels.some((label) => BLOCKED_LABELS.has(labelToken(label)))
}

/**
 * Which of a project's status names the board would file under Blocked — the list the
 * sprint read turns into a JQL `status in (…)` clause.
 *
 * `isBlockedStatus` applied to names read off the site, rather than a second rule: the
 * whole point of this module is that the query and the column agree about the word.
 *
 * DEDUPLICATED AND ORDER-STABLE. `/rest/api/3/project/{key}/statuses` reports statuses
 * per issue type, so a project with a Story, a Bug and a Task workflow returns "Blocked"
 * three times; three copies in the JQL would be valid and unreadable in a log. The order
 * is the site's own, so the clause a given project produces does not shuffle between
 * reads.
 *
 * Names carrying a double quote or a backslash are DROPPED rather than escaped. They are
 * vanishingly rare in a status name, the clause they would land in is the one place a
 * malformed string turns a board into a 400, and a dropped name costs the column its
 * server-side budget and nothing else — the renderer still classifies the ticket when it
 * arrives under another budget.
 */
export function blockedStatusNames(names: string[]): string[] {
  const kept: string[] = []
  const seen = new Set<string>()
  for (const name of names) {
    if (!name || /["\\]/.test(name) || !isBlockedStatus(name)) continue
    const key = fold(name)
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(name)
  }
  return kept
}
