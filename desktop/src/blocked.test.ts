import { describe, it, expect } from 'vitest'
import { blockedStatusNames, isBlockedLabel, isBlockedStatus } from './blocked'

/**
 * The vocabulary is shared across the bridge, and these tests are the reason it can be.
 * The main process turns it into a JQL `status in (…)` clause and the renderer classifies
 * the rows that come back with it; a ticket fetched under the blocked budget and then
 * drawn in Backlog is the bug a single rule makes impossible.
 */
describe('isBlockedStatus', () => {
  it('matches the word wherever a team put it in the status name', () => {
    // A Jira status is a sentence a team wrote, so anything stricter than a substring
    // would match our own board and nobody else's.
    expect(isBlockedStatus('Blocked')).toBe(true)
    expect(isBlockedStatus('Blocked / on hold')).toBe(true)
    expect(isBlockedStatus('Bloqué par le client')).toBe(true)
    expect(isBlockedStatus('BLOQUEE')).toBe(true)
  })

  it('says nothing is blocked when the word is not there', () => {
    expect(isBlockedStatus('In Progress')).toBe(false)
    expect(isBlockedStatus('À faire')).toBe(false)
  })
})

describe('isBlockedLabel', () => {
  it('asks a label the same question, more strictly', () => {
    // `blocker` contains `block` and is a SEVERITY on most repositories that use it,
    // not a state: a substring rule would move every urgent bug into a column saying
    // nobody can work on it.
    expect(isBlockedLabel(['blocked-by'])).toBe(true)
    expect(isBlockedLabel(['on hold'])).toBe(true)
    expect(isBlockedLabel(['blocker'])).toBe(false)
  })
})

describe('blockedStatusNames', () => {
  it('keeps the project statuses the board would file under Blocked', () => {
    expect(blockedStatusNames(['To Do', 'Blocked', 'In Progress', 'Bloqué'])).toEqual(['Blocked', 'Bloqué'])
  })

  it('reports a status once however many workflows define it', () => {
    // `/rest/api/3/project/{key}/statuses` answers per issue type, so a project with a
    // Story, a Bug and a Task workflow returns "Blocked" three times. Three copies in
    // the JQL would be valid and unreadable in a log.
    expect(blockedStatusNames(['Blocked', 'blocked', 'BLOCKED'])).toEqual(['Blocked'])
  })

  it('keeps the site’s own order, so the clause does not shuffle between reads', () => {
    expect(blockedStatusNames(['Bloqué', 'Blocked'])).toEqual(['Bloqué', 'Blocked'])
  })

  it('drops a name that would break the string literal it lands in', () => {
    // Vanishingly rare in a status name, and the clause it would land in is the one
    // place a malformed string turns a board into a 400. A dropped name costs the
    // column its server-side budget and nothing else — the renderer still files the
    // ticket under Blocked when it arrives under another budget.
    expect(blockedStatusNames(['Bloqué "urgent"', 'Blocked\\now'])).toEqual([])
    expect(blockedStatusNames(['Bloqué (client)'])).toEqual(['Bloqué (client)'])
  })
})
