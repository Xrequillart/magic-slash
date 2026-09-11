import { describe, it, expect } from 'vitest'
import { AtlassianApiError } from './atlassian-api'
import {
  applyEpicColors,
  browseUrl,
  buildEpicColorJql,
  buildOpenSprintProbeJql,
  buildSprintBacklogJql,
  buildSprintBlockedJql,
  buildSprintProgressJql,
  buildSprintSearchJql,
  dedupeByKey,
  readProjectStatusNames,
  searchTerms,
  SPRINT_COLUMN_PAGE_SIZE,
  JIRA_MAX_PAGE_SIZE,
  classify,
  classifyUnexpected,
  epicKeys,
  findEpicColorFieldIds,
  findSprintFieldId,
  mapEpicColors,
  mapIssue,
  mapSprintIssues,
  pickSprintName,
  PROBE_PAGE_SIZE,
  readEpic,
  readEpicColor,
  readPriority,
  readSprintName,
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

describe('the per-column sprint queries', () => {
  // ONE QUERY PER COLUMN, each with a budget of its own. They replaced a single
  // unfinished search whose 50-ticket page the three columns shared, which meant a
  // four-hundred-ticket backlog spent the whole page on To Do rows and left In progress
  // and Blocked empty — on a board that gave no sign anything was missing.

  it('asks the backlog for everything unfinished that is not in flight', () => {
    // No board id, and no `/rest/agile` call: `openSprints()` resolves the board
    // itself, which is what keeps the read inside the `read:jira-work` scope.
    expect(buildSprintBacklogJql('PROJ', [])).toBe(
      'project = "PROJ" AND sprint in openSprints() AND statusCategory != Done'
        + ' AND statusCategory != "In Progress" ORDER BY created DESC',
    )
  })

  it('writes the backlog as two exclusions rather than as `= "To Do"`', () => {
    // Jira has a FOURTH category key — `undefined`, for a status an admin never filed
    // under one — and a workflow can be configured out of the standard three entirely.
    // Such a ticket is in the sprint and unfinished, so it belongs on the board;
    // `= "To Do"` would match neither it nor `= "In Progress"` and it would vanish
    // without a trace. `readStatus` defaults the same case to `new`, and the two have
    // to agree.
    const jql = buildSprintBacklogJql('PROJ', [])
    expect(jql).not.toContain('statusCategory = "To Do"')
    expect(jql).toContain('statusCategory != "In Progress"')
  })

  it('asks In Progress for its own page', () => {
    expect(buildSprintProgressJql('PROJ', [])).toBe(
      'project = "PROJ" AND sprint in openSprints() AND statusCategory = "In Progress" ORDER BY created DESC',
    )
  })

  it('excludes Done server-side so no column budget is spent on it', () => {
    // The cap applies to the SERVER's result. Every row it spends on something this
    // feature then discards is a row the user does not get — and it disappears
    // silently. Filtering here keeps each budget on rows that can be seen.
    expect(buildSprintBacklogJql('PROJ', [])).toContain('statusCategory != Done')
    expect(buildSprintBlockedJql('PROJ', ['Blocked'])).toContain('statusCategory != Done')
  })

  it('names the blocked statuses, because blocked is a word and not a category', () => {
    // The only way to give Blocked a budget. It has no status category of its own —
    // teams put the word in a status name and file it under whichever category they
    // like — so under a shared budget it was the one column with no protection at all.
    expect(buildSprintBlockedJql('PROJ', ['Blocked', 'Bloqué'])).toBe(
      'project = "PROJ" AND sprint in openSprints() AND statusCategory != Done'
        + ' AND status in ("Blocked", "Bloqué") ORDER BY created DESC',
    )
  })

  it('keeps the blocked statuses out of the other two columns', () => {
    // Otherwise the budgets overlap: a site whose "Blocked" status is filed under In
    // Progress would fetch those tickets twice and spend this column's rows on tickets
    // it will not draw — the shared-budget bug, one level down.
    expect(buildSprintProgressJql('PROJ', ['Blocked'])).toContain('AND status not in ("Blocked")')
    expect(buildSprintBacklogJql('PROJ', ['Blocked'])).toContain('AND status not in ("Blocked")')
  })

  it('writes no status clause at all when there is no blocked status to name', () => {
    // `status in ()` is a syntax error, so the empty case cannot be a clause. The board
    // degrades to a plain category split and the renderer still files a blocked ticket
    // under Blocked by name — less protection, never a wrong column.
    expect(buildSprintBacklogJql('PROJ', [])).not.toContain('status not in')
    expect(buildSprintProgressJql('PROJ', [])).not.toContain('status not in')
  })

  it('orders every column newest first', () => {
    // It matches the page's default sort, so an untruncated column arrives in the order
    // it is drawn in. The category ordering the old shared query needed is gone with
    // the sharing: it existed only to stop To Do eating In Progress's rows.
    for (const jql of [
      buildSprintBacklogJql('PROJ', []),
      buildSprintProgressJql('PROJ', []),
      buildSprintBlockedJql('PROJ', ['Blocked']),
    ]) {
      expect(jql.endsWith(' ORDER BY created DESC')).toBe(true)
      expect(jql).not.toContain('statusCategory DESC')
    }
  })

  it('probes for an open sprint without the status filter', () => {
    // Asked only when every column came back empty. Without the filter, a sprint whose
    // every ticket is finished still answers with something — which is what separates
    // "nothing left to do" from "no sprint running".
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
    // The key comes from a free-text settings field. Unescaped, a quote in it produces
    // a query that no longer parses — reported as a mysterious 400 instead of as an
    // empty project.
    expect(buildSprintBacklogJql('A"B', [])).toContain('project = "A\\"B"')
    expect(buildSprintBacklogJql('A\\B', [])).toContain('project = "A\\\\B"')
  })

  it('escapes a status name the same way', () => {
    // Status names are the site's own text and land in the same kind of literal. A name
    // carrying a quote is dropped upstream by `blockedStatusNames`, so this is the
    // second line of defence rather than the first.
    expect(buildSprintBlockedJql('PROJ', ["Bloqué (client)"])).toContain('status in ("Bloqué (client)")')
  })
})

describe('the column budgets', () => {
  it('never asks for more than one page of `/search/jql` can hold', () => {
    // A request that names `fields` — this one names nine — is served at most a hundred
    // rows per page. The 5000 the docs mention applies to an id-only read. Asking for
    // more is not an error, it is silently served 100: a budget that reads as 250 in the
    // source and behaves as 100 in production.
    expect(JIRA_MAX_PAGE_SIZE).toBe(100)
    expect(SPRINT_COLUMN_PAGE_SIZE).toBeLessThanOrEqual(JIRA_MAX_PAGE_SIZE)
  })
})

describe('readProjectStatusNames', () => {
  it('unions the statuses of every issue type', () => {
    // A project can run a different workflow per type, and a status only the Bug
    // workflow has is still a status a ticket in this sprint can be in.
    expect(readProjectStatusNames([
      { statuses: [{ name: 'To Do' }, { name: 'Blocked' }] },
      { statuses: [{ name: 'Triage' }] },
    ])).toEqual(['To Do', 'Blocked', 'Triage'])
  })

  it('skips what it cannot read rather than failing the lot', () => {
    // This list only buys the Blocked column a budget. A malformed entry buried in one
    // workflow must not cost the board its Blocked query.
    expect(readProjectStatusNames([
      null,
      { statuses: 'nope' },
      { statuses: [{ name: '' }, { name: 42 }, null, { name: 'Blocked' }] },
    ])).toEqual(['Blocked'])
  })
})

describe('searchTerms', () => {
  it('reduces a query to plain words', () => {
    expect(searchTerms('  deploy   the   thing ')).toEqual(['deploy', 'the', 'thing'])
  })

  it('drops everything that means something to Lucene or to the string literal', () => {
    // `~` takes a Lucene-flavoured query, so `+ - & | ! ( ) { } [ ] ^ ~ * ? : \ /` are
    // all operators, and a quote or a backslash escapes out of the literal wrapping it.
    // Escaping two nested grammars correctly is a thing to get wrong once, in
    // production, as a 400 on somebody's board.
    expect(searchTerms('foo" OR key="BAR-1')).toEqual(['foo', 'OR', 'key', 'BAR', '1'])
    expect(searchTerms('a*b?c\\d')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('keeps accents, which both sides fold anyway', () => {
    expect(searchTerms('création')).toEqual(['création'])
  })

  it('gives back nothing for a query made entirely of punctuation', () => {
    // The caller spends no round trip on it.
    expect(searchTerms('***')).toEqual([])
  })

  it('stops at six words', () => {
    // Past that the clause is longer than the sprint, and somebody pasting a sentence
    // is not narrowing anything.
    expect(searchTerms('a b c d e f g h')).toHaveLength(6)
  })
})

describe('buildSprintSearchJql', () => {
  it('searches the open sprint by word prefix', () => {
    // Scoped to the SPRINT and not the project: the board is one sprint, and a ticket
    // outside it is not a row this page could draw.
    expect(buildSprintSearchJql('PROJ', 'deploy')).toBe(
      'project = "PROJ" AND sprint in openSprints() AND (summary ~ "deploy*") ORDER BY created DESC',
    )
  })

  it('requires every word, and lets the renderer apply its own substring rule', () => {
    // The server is a candidate generator, not a second search: `filterTaskRows` then
    // applies the substring rule to the union of these and the rows already loaded, so
    // what the reader sees is one rule over a wider set.
    expect(buildSprintSearchJql('PROJ', 'deploy staging')).toContain(
      '(summary ~ "deploy*" AND summary ~ "staging*")',
    )
  })

  it('matches a ticket key exactly, as an alternative to the words', () => {
    // Somebody pasting a key wants that ticket; requiring its summary to contain the
    // key as well would answer nothing every time. The word half is parenthesised as a
    // unit so the OR cannot be read as binding to `5030*` alone.
    expect(buildSprintSearchJql('PROJ', 'per-5030')).toContain(
      'AND ((summary ~ "per*" AND summary ~ "5030*") OR key = "PER-5030")',
    )
  })

  it('uppercases the key, since that is how Jira spells one', () => {
    expect(buildSprintSearchJql('PROJ', 'per-5030')).toContain('key = "PER-5030"')
  })

  it('gives back nothing when the query reduces to nothing', () => {
    // Spending a round trip to be told a site has no ticket called `***` would be this
    // function's own fault.
    expect(buildSprintSearchJql('PROJ', '***')).toBe('')
    expect(buildSprintSearchJql('PROJ', '   ')).toBe('')
  })

  it('escapes the project key here too', () => {
    expect(buildSprintSearchJql('A"B', 'deploy')).toContain('project = "A\\"B"')
  })
})

describe('dedupeByKey', () => {
  it('keeps the first of two rows naming one ticket', () => {
    // The four column reads are built to be disjoint, so on a healthy site this drops
    // nothing. What it defends against is the site where they are not — a status
    // renamed between the lookup being cached and the search running — because the
    // board keys its cards by ticket key and React would be handed the same key twice.
    const rows = [
      { key: 'PROJ-1', title: 'first' },
      { key: 'PROJ-2', title: 'other' },
      { key: 'PROJ-1', title: 'second' },
    ] as Parameters<typeof dedupeByKey>[0]

    expect(dedupeByKey(rows).map((issue) => `${issue.key}:${issue.title}`))
      .toEqual(['PROJ-1:first', 'PROJ-2:other'])
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
    expect(SPRINT_FIELDS).toEqual(
      ['summary', 'status', 'priority', 'created', 'labels', 'reporter', 'creator', 'parent'],
    )
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


describe('readPriority', () => {
  it('places Jira\'s five defaults by id, whatever the site calls them', () => {
    // The ID and not the name, because the id survives translation: a French site
    // calls priority 2 "Élevée" and an English one "High", and both are the same
    // step on the same scale.
    expect(readPriority({ id: '1', name: 'Highest' })?.level).toBe('highest')
    expect(readPriority({ id: '2', name: 'Élevée' })?.level).toBe('high')
    expect(readPriority({ id: '3', name: 'Medium' })?.level).toBe('medium')
    expect(readPriority({ id: '4', name: 'Basse' })?.level).toBe('low')
    expect(readPriority({ id: '5', name: 'Lowest' })?.level).toBe('lowest')
  })

  it('keeps the site\'s own word to print', () => {
    // The level is what the badge draws, the name is what it says — `readStatus`'s
    // split, one field along.
    expect(readPriority({ id: '2', name: 'Élevée' })).toEqual({ name: 'Élevée', level: 'high' })
  })

  it('falls back to the name on a site running its own scheme', () => {
    // A custom scheme gets ids Jira assigned to nothing in particular, so the id
    // misses and the words such schemes reuse are what is left to go on.
    expect(readPriority({ id: '10004', name: 'Blocker' })?.level).toBe('highest')
    expect(readPriority({ id: '10007', name: 'P2' })?.level).toBe('high')
    expect(readPriority({ id: '10009', name: 'trivial' })?.level).toBe('lowest')
  })

  it('admits it cannot place a priority rather than guessing', () => {
    // `unknown` renders the site's own word in the neutral tier. Calling this one
    // "Medium" would be a guess presented to the reader as a fact about their
    // ticket — the one outcome worse than showing no level at all.
    expect(readPriority({ id: '10021', name: 'Yesterday' }))
      .toEqual({ name: 'Yesterday', level: 'unknown' })
  })

  it('reports no priority at all for the three ways a ticket has none', () => {
    // The field removed from the project's screens (omitted), the ticket set to
    // "None" (null), and an object with no name to print. None is an error, and
    // none should produce a badge.
    expect(readPriority(undefined)).toBeUndefined()
    expect(readPriority(null)).toBeUndefined()
    expect(readPriority({ id: '3', name: '   ' })).toBeUndefined()
  })
})

describe('mapIssue', () => {
  it('reads the fields the row is drawn from', () => {
    const raw = rawIssue({}, {
      labels: ['backend', 'urgent'],
      priority: { id: '2', name: 'High' },
      reporter: { displayName: 'Ada Lovelace', accountId: 'acc-1' },
    })

    expect(mapIssue(raw, 'https://acme.atlassian.net')).toEqual({
      key: 'PROJ-1',
      title: 'Do the thing',
      url: 'https://acme.atlassian.net/browse/PROJ-1',
      createdAt: '2026-08-01T10:00:00.000+0200',
      statusName: 'To Do',
      statusCategory: 'new',
      priority: { name: 'High', level: 'high' },
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

  // A project with the priority field off its screens sends no priority, and a row
  // that then carried one would be inventing a fact about the ticket.
  it('omits the priority when the ticket has none', () => {
    expect(mapIssue(rawIssue(), 'https://acme.atlassian.net')).not.toHaveProperty('priority')
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

describe('findSprintFieldId', () => {
  const sprint = {
    id: 'customfield_10020',
    name: 'Sprint',
    schema: { type: 'array', custom: 'com.pyxis.greenhopper.jira:gh-sprint' },
  }

  it('finds the field by its TYPE, whatever id this site gave it', () => {
    expect(findSprintFieldId([{ id: 'summary', name: 'Summary' }, sprint])).toBe('customfield_10020')
  })

  it('is not fooled by a field an admin renamed', () => {
    // The name is per-site and per-language; the schema is not.
    expect(findSprintFieldId([{ ...sprint, name: 'Itération' }])).toBe('customfield_10020')
  })

  it('falls back to the English name when the site sent no schema', () => {
    expect(findSprintFieldId([{ id: 'customfield_10007', name: 'Sprint' }])).toBe('customfield_10007')
  })

  it('prefers the typed field over one that merely shares its name', () => {
    expect(findSprintFieldId([{ id: 'customfield_1', name: 'Sprint' }, sprint])).toBe('customfield_10020')
  })

  it('answers nothing for a site with no Jira Software on it', () => {
    expect(findSprintFieldId([{ id: 'summary', name: 'Summary' }])).toBe('')
    expect(findSprintFieldId([])).toBe('')
    expect(findSprintFieldId([null, 'nonsense', {}])).toBe('')
  })
})

describe('readSprintName', () => {
  it('names the sprint the ticket is currently in', () => {
    expect(readSprintName([
      { id: 4, name: 'PER Sprint 11', state: 'closed' },
      { id: 5, name: 'PER Sprint 12', state: 'active' },
    ])).toBe('PER Sprint 12')
  })

  it('falls back to the newest entry when none is marked active', () => {
    expect(readSprintName([{ name: 'Sprint 1' }, { name: 'Sprint 2' }])).toBe('Sprint 2')
  })

  it('reads the toString shape an older site answers with', () => {
    expect(readSprintName([
      'com.atlassian.greenhopper.service.sprint.Sprint@1a2b[id=5,rapidViewId=3,state=ACTIVE,name=Sprint 3,goal=<null>]',
    ])).toBe('Sprint 3')
  })

  it('reads no sprint as no name rather than as an empty one', () => {
    expect(readSprintName(null)).toBe('')
    expect(readSprintName([])).toBe('')
    expect(readSprintName([{ id: 5 }])).toBe('')
  })
})

describe('pickSprintName', () => {
  const issue = (name: string) => ({ fields: { customfield_10020: [{ name, state: 'active' }] } })

  it('names the sprint the first row that knows is in', () => {
    expect(pickSprintName([{ fields: {} }, issue('PER Sprint 12')], 'customfield_10020')).toBe('PER Sprint 12')
  })

  it('says nothing when the field id is not known on this site', () => {
    // A site with no Jira Software on it: the search was never asked for the field,
    // so there is nothing to read and nothing to claim.
    expect(pickSprintName([issue('PER Sprint 12')], '')).toBe('')
  })

  it('says nothing rather than guessing when no row names one', () => {
    expect(pickSprintName([null, 'nonsense', { fields: {} }], 'customfield_10020')).toBe('')
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

/** Jira's inline `parent` object, as the search returns it on a ticket in an epic. */
function rawParent(key: string, summary: string, hierarchyLevel = 1) {
  return {
    id: '45454',
    key,
    fields: {
      summary,
      status: { name: 'Backlog', statusCategory: { key: 'new' } },
      priority: { id: '3', name: 'Medium' },
      issuetype: { id: '10000', name: 'Epic', subtask: false, hierarchyLevel },
    },
  }
}

describe('readEpic', () => {
  it('reads the epic a ticket hangs off, with a link to it', () => {
    expect(readEpic(rawParent('PER-5056', 'Pilotes US 2026'), 'https://acme.atlassian.net/browse/')).toEqual({
      key: 'PER-5056',
      title: 'Pilotes US 2026',
      url: 'https://acme.atlassian.net/browse/PER-5056',
    })
  })

  it('refuses a sub-task’s parent story', () => {
    // `parent` is populated for two different relationships, and only one of them is
    // an epic. A badge that took either would put a story's title behind an epic
    // label on every sub-task in the sprint.
    expect(readEpic(rawParent('PER-4000', 'A story', 0), 'https://acme.atlassian.net')).toBeUndefined()
  })

  it('accepts a parent above the epic level', () => {
    // Atlassian Premium adds Initiative at level 2. A ticket parented straight to one
    // has no epic in between, and naming the initiative beats naming nothing.
    expect(readEpic(rawParent('PER-1', 'Initiative', 2), '')?.key).toBe('PER-1')
  })

  it('drops a parent with no hierarchy level rather than assuming one', () => {
    // The field has been on every Jira Cloud response for years, so its absence means
    // a shape this does not understand — and inventing an epic is worse than none.
    expect(readEpic({ key: 'PER-1', fields: { summary: 'x' } }, '')).toBeUndefined()
  })

  it('falls back to the key when Jira sends no summary', () => {
    const parent = rawParent('PER-9', '')
    expect(readEpic(parent, '')?.title).toBe('PER-9')
  })

  it('answers nothing for a ticket with no parent at all', () => {
    expect(readEpic(undefined, '')).toBeUndefined()
    expect(readEpic(null, '')).toBeUndefined()
    expect(readEpic({}, '')).toBeUndefined()
  })
})

describe('readEpicColor', () => {
  it('reads the modern Issue Color field, which answers a name', () => {
    expect(readEpicColor('green')).toBe('#36B37E')
    expect(readEpicColor('dark_purple')).toBe('#5243AA')
  })

  it('reads the legacy Epic Colour field, which answers a swatch id', () => {
    // `ghx-label-6` is green and `ghx-label-8` is dark purple on every site — the
    // same two epics the case above names through the other field.
    expect(readEpicColor('ghx-label-6')).toBe('#36B37E')
    expect(readEpicColor('ghx-label-8')).toBe('#5243AA')
  })

  it('answers nothing for an epic whose colour was never set', () => {
    // Not a failure: `JiraEpic.color` is optional for exactly this, and the badge
    // then draws no dot rather than an invented colour.
    expect(readEpicColor(null)).toBeUndefined()
    expect(readEpicColor('')).toBeUndefined()
    expect(readEpicColor('chartreuse')).toBeUndefined()
    expect(readEpicColor(6)).toBeUndefined()
  })
})

describe('findEpicColorFieldIds', () => {
  const fields = [
    { id: 'customfield_10013', name: 'Epic Colour', schema: { custom: 'com.pyxis.greenhopper.jira:gh-epic-color' } },
    { id: 'customfield_10017', name: 'Issue Color', schema: { custom: 'com.pyxis.greenhopper.jira:jsw-issue-color' } },
    { id: 'customfield_10020', name: 'Sprint', schema: { custom: 'com.pyxis.greenhopper.jira:gh-sprint' } },
    { id: 'summary', name: 'Summary' },
  ]

  it('finds both colour fields, modern first', () => {
    // The order is the preference order `mapEpicColors` walks: they agree, and where
    // one is empty the other stands in.
    expect(findEpicColorFieldIds(fields)).toEqual(['customfield_10017', 'customfield_10013'])
  })

  it('matches on the schema type, never on the name', () => {
    // The id is per site and the name is whatever an admin renamed it to, in whatever
    // language. The type is the only stable handle.
    expect(findEpicColorFieldIds([
      { id: 'customfield_99', name: 'Couleur de l’epic', schema: { custom: 'com.pyxis.greenhopper.jira:gh-epic-color' } },
      { id: 'customfield_98', name: 'Epic Colour' },
    ])).toEqual(['customfield_99'])
  })

  it('catches a colour field whose suffix it has never seen, but ranks it last', () => {
    // The safety net: a site whose Jira Software spells its colour field a third way
    // would otherwise draw no dots at all — a failure with no symptom, since the badge
    // still carries the epic's title. Last, because `readEpicColor` is written against
    // the two known vocabularies and an unknown third is a guess.
    expect(findEpicColorFieldIds([
      { id: 'customfield_50', schema: { custom: 'com.pyxis.greenhopper.jira:gh-something-colour' } },
      ...fields,
    ])).toEqual(['customfield_10017', 'customfield_10013', 'customfield_50'])
  })

  it('never reaches outside Jira Software’s own namespace', () => {
    // "Colour" is a word a site's own custom fields use freely — a Design Colour, a
    // Brand Color — and none of them holds an epic swatch.
    expect(findEpicColorFieldIds([
      { id: 'customfield_60', name: 'Brand Colour', schema: { custom: 'com.acme.plugin:brand-colour' } },
      { id: 'customfield_61', schema: { custom: 'com.pyxis.greenhopper.jira:gh-sprint' } },
    ])).toEqual([])
  })

  it('answers nothing on a site with no colour field', () => {
    // A team-managed project, whose epic badges simply draw no dot.
    expect(findEpicColorFieldIds([{ id: 'summary', name: 'Summary' }])).toEqual([])
  })

  it('reads the same /field response the sprint id comes out of', () => {
    // One lookup answers both, which is why they are resolved together.
    expect(findSprintFieldId(fields)).toBe('customfield_10020')
  })
})

describe('epicKeys and buildEpicColorJql', () => {
  it('asks about each epic once, however many tickets hang off it', () => {
    const issues = [
      mapIssue(rawIssue({ key: 'PER-1' }, { parent: rawParent('PER-100', 'Remb') }), ''),
      mapIssue(rawIssue({ key: 'PER-2' }, { parent: rawParent('PER-100', 'Remb') }), ''),
      mapIssue(rawIssue({ key: 'PER-3' }, { parent: rawParent('PER-200', 'Pilotes') }), ''),
      mapIssue(rawIssue({ key: 'PER-4' }), ''),
    ].filter((issue) => issue !== null)

    expect(epicKeys(issues)).toEqual(['PER-100', 'PER-200'])
    expect(buildEpicColorJql(epicKeys(issues))).toBe('key in ("PER-100", "PER-200")')
  })

  it('answers no keys for a sprint whose tickets are all top-level', () => {
    // What lets the caller return before making any request at all.
    expect(epicKeys([mapIssue(rawIssue({ key: 'PER-1' }), '')!])).toEqual([])
  })
})

describe('mapEpicColors and applyEpicColors', () => {
  const fieldIds = ['customfield_10017', 'customfield_10013']

  it('reads the colour out of the first field that answers', () => {
    const raw = [
      { key: 'PER-100', fields: { customfield_10017: 'yellow', customfield_10013: 'ghx-label-3' } },
      // Only the legacy field is filled: the modern one stands aside rather than
      // shadowing it with a null.
      { key: 'PER-200', fields: { customfield_10017: null, customfield_10013: 'ghx-label-6' } },
      // Neither: the epic appears in the response and not in the map.
      { key: 'PER-300', fields: { customfield_10017: null, customfield_10013: null } },
    ]

    expect(mapEpicColors(raw, fieldIds)).toEqual({ 'PER-100': '#FFC400', 'PER-200': '#36B37E' })
  })

  it('colours the tickets of the epics it knows and leaves the rest alone', () => {
    const issues = [
      mapIssue(rawIssue({ key: 'PER-1' }, { parent: rawParent('PER-100', 'Remb') }), ''),
      mapIssue(rawIssue({ key: 'PER-2' }, { parent: rawParent('PER-300', 'Data') }), ''),
      mapIssue(rawIssue({ key: 'PER-3' }), ''),
    ].filter((issue) => issue !== null)

    const coloured = applyEpicColors(issues, { 'PER-100': '#FFC400' })

    expect(coloured[0].epic).toEqual({ key: 'PER-100', title: 'Remb', url: '', color: '#FFC400' })
    // Unchanged and IDENTICAL: the rows reach React through a memo, so an untouched
    // ticket must not come back as a new object.
    expect(coloured[1]).toBe(issues[1])
    expect(coloured[1].epic).not.toHaveProperty('color')
    expect(coloured[2]).toBe(issues[2])
  })

  it('returns a new array so the page has something to redraw on', () => {
    const issues = [mapIssue(rawIssue({ key: 'PER-1' }, { parent: rawParent('PER-100', 'Remb') }), '')!]
    expect(applyEpicColors(issues, { 'PER-100': '#FFC400' })).not.toBe(issues)
  })
})

describe('mapIssue, the epic', () => {
  it('carries the epic onto the row, colourless at this point', () => {
    const issue = mapIssue(
      rawIssue({ key: 'PER-5165' }, { parent: rawParent('PER-5056', 'Pilotes US 2026') }),
      'https://acme.atlassian.net/browse/',
    )

    expect(issue?.epic).toEqual({
      key: 'PER-5056',
      title: 'Pilotes US 2026',
      url: 'https://acme.atlassian.net/browse/PER-5056',
    })
  })

  it('omits the field entirely on a top-level ticket', () => {
    // Present-and-undefined is a shape every equality assertion downstream would then
    // have to know about — the rule the two fields beside it follow.
    expect(mapIssue(rawIssue({ key: 'PER-1' }), '')).not.toHaveProperty('epic')
  })
})
