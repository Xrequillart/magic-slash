import { describe, it, expect } from 'vitest'
import { AtlassianApiError } from './atlassian-api'
import {
  browseUrl,
  buildOpenSprintProbeJql,
  buildSprintJql,
  classify,
  classifyUnexpected,
  mapIssue,
  mapSprintIssues,
  PROBE_PAGE_SIZE,
  SPRINT_FIELDS,
} from './sprint-issues'

// No mocks and no network: this module is pure by design (see its header), so the
// whole sprint read's decision-making is exercised by calling it. `atlassian-api.
// test.ts` is the model — the transport is somebody else's problem, and the
// module that owns it is tested with a hand-written stub rather than a mock.

/** Jira's own issue shape, as `/rest/api/3/search/jql` returns it. */
function rawIssue(overrides: Record<string, unknown> = {}, fields: Record<string, unknown> = {}) {
  return {
    key: 'PROJ-1',
    fields: {
      summary: 'Do the thing',
      created: '2026-08-01T10:00:00.000+0200',
      status: { name: 'To Do', statusCategory: { key: 'new', name: 'To Do' } },
      ...fields,
    },
    ...overrides,
  }
}

describe('buildSprintJql', () => {
  it('asks one project for the unfinished work of its open sprints', () => {
    // No board id, and no `/rest/agile` call: `openSprints()` resolves the board
    // itself, which is what keeps the read inside the `read:jira-work` scope.
    expect(buildSprintJql('PROJ')).toBe(
      'project = "PROJ" AND sprint in openSprints() AND statusCategory != Done ORDER BY statusCategory DESC, created DESC',
    )
  })

  it('excludes Done server-side so the page cap is never spent on it', () => {
    // The cap applies to the SERVER's result. Every row it spends on something this
    // feature then discards is a row the user does not get — and it disappears
    // silently, because the visible count sits under the cap and no truncation hint
    // is shown. Filtering here is what keeps the budget on rows that can be seen.
    expect(buildSprintJql('PROJ')).toContain('statusCategory != Done')
  })

  it('orders In Progress ahead of To Do', () => {
    // Jira sequences the categories To Do → In Progress → Done, so with Done
    // excluded, DESCENDING puts In Progress first. That is the priority this page
    // wants: an In Progress ticket only ever shows when an agent is on it, so it is
    // the row the user most needs, and a truncated To Do column is what the
    // `truncated` flag exists to report. Ordering ascending instead was the bug —
    // a long To Do column pushed every agented ticket off the only page fetched.
    const jql = buildSprintJql('PROJ')
    expect(jql).toContain('ORDER BY statusCategory DESC')
    expect(jql.indexOf('statusCategory DESC')).toBeLessThan(jql.indexOf('created DESC'))
  })

  it('probes for an open sprint without the status filter', () => {
    // Asked only when the filtered query came back empty. Without the filter, a
    // sprint whose every ticket is finished still answers with something — which is
    // what separates "nothing left to do" from "no sprint running".
    expect(buildOpenSprintProbeJql('PROJ')).toBe(
      'project = "PROJ" AND sprint in openSprints()',
    )
    expect(buildOpenSprintProbeJql('PROJ')).not.toContain('statusCategory')
    expect(PROBE_PAGE_SIZE).toBe(1)
  })

  it('escapes the project key in the probe too', () => {
    // Same free-text field, same hazard: the probe is a second query and would break
    // on its own if the escaping lived only in the first.
    expect(buildOpenSprintProbeJql('A"B')).toContain('project = "A\\"B"')
  })

  it('escapes a project key that would otherwise break the query', () => {
    // The key comes from a free-text settings field. Unescaped, a quote in it
    // produces a query that no longer parses — reported as a mysterious 400
    // instead of as an empty project.
    expect(buildSprintJql('A"B')).toContain('project = "A\\"B"')
    expect(buildSprintJql('A\\B')).toContain('project = "A\\\\B"')
  })
})

describe('SPRINT_FIELDS', () => {
  it('asks for the timestamp the rows are sorted on', () => {
    // `created` looks optional and is not: `sortIssues` sinks anything without a
    // timestamp, so a read without it would pile every Jira row at the bottom of
    // its own card.
    expect(SPRINT_FIELDS).toContain('created')
  })

  it('asks for what puts a Jira row on equal footing with a GitHub one', () => {
    // The row carried a key, a title and a status while the GitHub row beside it
    // carried its author and its labels. Both people are asked for and one is kept
    // — see `readReporter`.
    expect(SPRINT_FIELDS).toEqual(['summary', 'status', 'created', 'labels', 'reporter', 'creator'])
  })

  it('asks for nothing only the open ticket needs', () => {
    // Every field here is serialised for every ticket of every Jira repository on
    // every reload. A description is kilobytes per row; it belongs to DETAIL_FIELDS.
    expect(SPRINT_FIELDS).not.toContain('description')
    expect(SPRINT_FIELDS).not.toContain('comment')
  })
})

describe('browseUrl', () => {
  it('builds a browse link from a bare site origin', () => {
    expect(browseUrl('https://acme.atlassian.net', 'PROJ-1'))
      .toBe('https://acme.atlassian.net/browse/PROJ-1')
  })

  it('does not append a second /browse to a configured browse base', () => {
    // `RepositoryConfig.jira.siteUrl` is documented as a browse base URL, while the
    // credential's `site_url` is the bare origin — and `…/browse/browse/PROJ-1`
    // 404s in the user's browser rather than failing anywhere we would see it.
    expect(browseUrl('https://acme.atlassian.net/browse/', 'PROJ-1'))
      .toBe('https://acme.atlassian.net/browse/PROJ-1')
    expect(browseUrl('https://acme.atlassian.net/browse', 'PROJ-1'))
      .toBe('https://acme.atlassian.net/browse/PROJ-1')
  })

  it('answers the empty string when there is no site to build on', () => {
    // The row renders without its Open and Copy buttons rather than with dead ones.
    expect(browseUrl('', 'PROJ-1')).toBe('')
    expect(browseUrl('   ', 'PROJ-1')).toBe('')
  })
})

describe('mapIssue', () => {
  it('reads the fields the row is drawn from', () => {
    const raw = rawIssue({}, {
      labels: ['backend', 'urgent'],
      reporter: { displayName: 'Ada Lovelace', accountId: 'acc-1' },
    })

    expect(mapIssue(raw, 'https://acme.atlassian.net')).toEqual({
      key: 'PROJ-1',
      title: 'Do the thing',
      url: 'https://acme.atlassian.net/browse/PROJ-1',
      createdAt: '2026-08-01T10:00:00.000+0200',
      statusName: 'To Do',
      statusCategory: 'new',
      reporter: 'Ada Lovelace',
      labels: ['backend', 'urgent'],
    })
  })

  // `reporter` is who the ticket is FOR and is what every Jira screen shows;
  // `creator` is whoever pressed the button. On a ticket filed on someone's behalf
  // they are two different people, and the reader recognises the reporter.
  it('prefers the reporter over the creator', () => {
    const mapped = mapIssue(rawIssue({}, {
      reporter: { displayName: 'Ada Lovelace' },
      creator: { displayName: 'Support Bot' },
    }), 'https://acme.atlassian.net')

    expect(mapped?.reporter).toBe('Ada Lovelace')
  })

  // An automation can file a ticket with no reporter at all, and the creator is then
  // the only name there is. Preferring the reporter alone would blank the byline on
  // exactly the tickets nobody can otherwise put a face to.
  it('falls back to the creator when no reporter is set', () => {
    const mapped = mapIssue(
      rawIssue({}, { reporter: null, creator: { displayName: 'Support Bot' } }),
      'https://acme.atlassian.net',
    )

    expect(mapped?.reporter).toBe('Support Bot')
  })

  // Omitted, never `''`: the field is optional in the type, and an empty string is a
  // person whose name is blank.
  it('omits the reporter when Jira names nobody', () => {
    const mapped = mapIssue(rawIssue({}, { reporter: null, creator: null }), 'https://acme.atlassian.net')

    expect(mapped).not.toHaveProperty('reporter')
  })

  // A site with labels disabled omits the field entirely, and the row `.map()`s over
  // this without a guard.
  it('always produces a labels array', () => {
    expect(mapIssue(rawIssue(), 'https://acme.atlassian.net')?.labels).toEqual([])
    expect(mapIssue(rawIssue({}, { labels: 'backend' }), 'https://acme.atlassian.net')?.labels).toEqual([])
    expect(mapIssue(rawIssue({}, { labels: ['ok', '', 7] }), 'https://acme.atlassian.net')?.labels)
      .toEqual(['ok'])
  })

  it('keeps the status NAME as this site spells it', () => {
    // Every Atlassian site renames its statuses. The name is shown, the category is
    // branched on — showing the category key would show the reader a word that
    // appears nowhere on their board.
    const mapped = mapIssue(
      rawIssue({}, { status: { name: 'En cours', statusCategory: { key: 'indeterminate' } } }),
      'https://acme.atlassian.net',
    )
    expect(mapped?.statusName).toBe('En cours')
    expect(mapped?.statusCategory).toBe('indeterminate')
  })

  it('drops an entry with no key, and nothing else', () => {
    // The key is the identity, the badge, the link and the value the agent
    // cross-reference joins on: a row without one cannot be drawn at all.
    expect(mapIssue({ fields: { summary: 'x' } }, 'https://acme.atlassian.net')).toBeNull()
    expect(mapIssue({ key: '' }, 'https://acme.atlassian.net')).toBeNull()
    expect(mapIssue(null, 'https://acme.atlassian.net')).toBeNull()
    expect(mapIssue('PROJ-1', 'https://acme.atlassian.net')).toBeNull()
  })

  it('degrades a ticket missing everything but its key', () => {
    // A mapper, not a validator: a ticket that really is in the sprint is worth a
    // row that shows its key and sinks to the bottom, not a row the reader loses.
    expect(mapIssue({ key: 'PROJ-9' }, 'https://acme.atlassian.net')).toEqual({
      key: 'PROJ-9',
      title: 'PROJ-9',
      url: 'https://acme.atlassian.net/browse/PROJ-9',
      createdAt: '',
      statusName: '',
      statusCategory: 'new',
      labels: [],
    })
  })

  it('reads a status filed under no category as To Do', () => {
    // Jira has a fourth category key (`undefined`) for a status an admin never
    // filed. Such a ticket is in the sprint and is not finished, so the To Do
    // column is the one default that neither hides work nor claims an agent is
    // on something.
    const mapped = mapIssue(
      rawIssue({}, { status: { name: 'Triage', statusCategory: { key: 'undefined' } } }),
      'https://acme.atlassian.net',
    )
    expect(mapped?.statusCategory).toBe('new')
  })
})

describe('mapSprintIssues', () => {
  it('drops what is finished and keeps what is in flight', () => {
    // `done` is dropped HERE and not in the query, so an empty ANSWER can go on
    // meaning "no active sprint". In Progress is kept because only the renderer
    // knows which tickets have an agent on them.
    const issues = mapSprintIssues([
      rawIssue({ key: 'PROJ-1' }),
      rawIssue({ key: 'PROJ-2' }, { status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } } }),
      rawIssue({ key: 'PROJ-3' }, { status: { name: 'Done', statusCategory: { key: 'done' } } }),
    ], 'https://acme.atlassian.net')

    expect(issues.map((issue) => issue.key)).toEqual(['PROJ-1', 'PROJ-2'])
  })

  it('skips an unmappable entry without losing the rest of the sprint', () => {
    const issues = mapSprintIssues([rawIssue({ key: 'PROJ-1' }), null, { fields: {} }], 'https://acme.atlassian.net')
    expect(issues.map((issue) => issue.key)).toEqual(['PROJ-1'])
  })
})

describe('classify', () => {
  it.each([
    // A transport failure — `send()` normalises DNS, a refused connection and a
    // machine with no network at all to status 0.
    [0, 'offline'],
    // The likeliest Jira failure of the lot, and the one with no GitHub twin: a
    // project key that does not exist, or a project with no Jira Software in it,
    // where `sprint` is not a field the query may name.
    [400, 'invalid-query'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [429, 'rate-limited'],
    [500, 'server-error'],
    [503, 'server-error'],
  ])('reads HTTP %i as %s', (status, expected) => {
    expect(classify(new AtlassianApiError('Jira sprint search', status as number)).error).toBe(expected)
  })

  it('reads an unreadable body as a server error, whatever it was served with', () => {
    // Atlassian's SSO interstitial answers HTTP 200 with HTML, which `readBody`
    // already turns into a named error rather than a parse throw. "The site
    // answered something we could not read" is the honest reading of it.
    const error = new AtlassianApiError('Jira sprint search (unreadable body)', 200)
    expect(classify(error).error).toBe('server-error')
  })

  it('carries the error’s own message and never a response body', () => {
    // The invariant `atlassian-api.ts` exists to enforce: an operation name and a
    // status code, nothing from the wire. This message is for the log; the sentence
    // the reader sees is picked from the catalogues by the CODE.
    expect(classify(new AtlassianApiError('Jira sprint search', 403)).message)
      .toBe('Jira sprint search failed (HTTP 403)')
  })

  it('produces neither of the two codes the caller owns', () => {
    // `not-connected` is decided before any request is made, and `no-active-sprint`
    // by an empty SUCCESSFUL answer. Neither is a failed call, so neither is here.
    const codes = [0, 400, 401, 403, 404, 429, 500]
      .map((status) => classify(new AtlassianApiError('Jira sprint search', status)).error)
    expect(codes).not.toContain('not-connected')
    expect(codes).not.toContain('no-active-sprint')
  })
})

describe('classifyUnexpected', () => {
  it('passes an Atlassian failure through the ladder', () => {
    expect(classifyUnexpected(new AtlassianApiError('Jira sprint search', 429)).error).toBe('rate-limited')
  })

  it('lands a bug on our own side in a card rather than in a rejected page', () => {
    // Every failure has to be confined to its repository's group: an unexpected
    // throw inside the Promise.all would otherwise blank the whole page.
    expect(classifyUnexpected(new Error('boom'))).toEqual({ error: 'server-error', message: 'boom' })
    expect(classifyUnexpected('boom')).toEqual({ error: 'server-error', message: 'boom' })
  })
})
