import { describe, it, expect } from 'vitest'
import { adfToMarkdown, DETAIL_FIELDS, mapIssueDetail } from './issue-detail'

// No mocks and no network, for `sprint-issues.test.ts`'s reason: this module is
// pure by design (see its header), so the whole of the detail read's decision-
// making is exercised by calling it.

/** Jira's own issue shape, as `GET /rest/api/3/issue/{key}` returns it. */
function rawIssue(fields: Record<string, unknown> = {}) {
  return {
    key: 'PROJ-1',
    fields: {
      description: doc(paragraph(text('Do the thing'))),
      status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
      assignee: { displayName: 'Ada Lovelace', accountId: 'acc-1' },
      reporter: { displayName: 'Grace Hopper', accountId: 'acc-2' },
      labels: ['backend', 'urgent'],
      ...fields,
    },
  }
}

/** ADF builders, so a fixture reads as the document it is. */
function doc(...content: unknown[]) {
  return { type: 'doc', version: 1, content }
}
function paragraph(...content: unknown[]) {
  return { type: 'paragraph', content }
}
function text(value: string, marks?: unknown[]) {
  return marks ? { type: 'text', text: value, marks } : { type: 'text', text: value }
}

describe('DETAIL_FIELDS', () => {
  it('asks for the half of a ticket the sprint read leaves behind', () => {
    expect(DETAIL_FIELDS)
      .toEqual([
        'description', 'status', 'priority', 'assignee', 'reporter', 'creator', 'labels', 'comment',
      ])
  })

  it('brings the conversation back in the response it already makes', () => {
    // `fields=comment` rather than a second call to `/issue/{key}/comment`: the
    // bodies arrive in the read the panel is making anyway, so the thread costs one
    // round trip instead of two.
    expect(DETAIL_FIELDS).toContain('comment')
  })

  it('asks for the status again rather than trusting the row’s', () => {
    // The row may have been listed minutes ago. A ticket transitioned since must
    // not go on showing the word the list captured.
    expect(DETAIL_FIELDS).toContain('status')
  })

  it('does not ask again for anything the row already carries', () => {
    // A second copy of the summary could only disagree with the one the panel holds.
    expect(DETAIL_FIELDS).not.toContain('summary')
    expect(DETAIL_FIELDS).not.toContain('created')
  })
})

describe('adfToMarkdown', () => {
  it('converts a nested document into markdown', () => {
    const markdown = adfToMarkdown(doc(
      { type: 'heading', attrs: { level: 2 }, content: [text('Context')] },
      paragraph(
        text('The '),
        text('cache', [{ type: 'code' }]),
        text(' is '),
        text('stale', [{ type: 'strong' }]),
        text(' — see '),
        text('the ticket', [{ type: 'link', attrs: { href: 'https://example.test/x' } }]),
        text('.'),
      ),
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [paragraph(text('first'))] },
          {
            type: 'listItem',
            content: [
              paragraph(text('second')),
              { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('nested'))] }] },
            ],
          },
        ],
      },
      { type: 'orderedList', attrs: { order: 3 }, content: [
        { type: 'listItem', content: [paragraph(text('three'))] },
        { type: 'listItem', content: [paragraph(text('four'))] },
      ] },
      { type: 'rule' },
      { type: 'codeBlock', attrs: { language: 'ts' }, content: [text('const a = 1')] },
    ))

    expect(markdown).toBe([
      '## Context',
      '',
      'The `cache` is **stale** — see [the ticket](https://example.test/x).',
      '',
      '- first',
      '- second',
      '',
      '  - nested',
      '',
      '3. three',
      '4. four',
      '',
      '---',
      '',
      '```ts',
      'const a = 1',
      '```',
    ].join('\n'))
  })

  it('turns a hard break into markdown’s own line break', () => {
    // `remarkGfm` does not read a bare newline as a break, so the two spaces are
    // what keeps the second line on its own line in the panel.
    expect(adfToMarkdown(doc(paragraph(text('one'), { type: 'hardBreak' }, text('two')))))
      .toBe('one  \ntwo')
  })

  it('grows a code fence past a fence inside the snippet', () => {
    const markdown = adfToMarkdown(doc({ type: 'codeBlock', content: [text('```\nnested\n```')] }))
    expect(markdown.startsWith('````')).toBe(true)
    expect(markdown).toContain('```\nnested\n```')
  })

  it('grows an inline code delimiter past a backtick inside the span', () => {
    // The fence rule above, one level down: a single backtick around text holding
    // one closes the span early and spills the rest into the prose.
    expect(adfToMarkdown(doc(paragraph(text('a`b', [{ type: 'code' }])))))
      .toBe('``a`b``')
  })

  it('pads an inline code span that starts or ends on a backtick', () => {
    // Markdown's own escape: the reader strips one leading and one trailing space,
    // so the padding never reaches the screen.
    expect(adfToMarkdown(doc(paragraph(text('`x', [{ type: 'code' }])))))
      .toBe('`` `x ``')
  })

  it('reads no description as an empty one', () => {
    // `description: null` is what an unfilled ticket answers with, and it is not a
    // failed read: the panel says the ticket has no description and moves on.
    expect(adfToMarkdown(null)).toBe('')
    expect(adfToMarkdown(undefined)).toBe('')
    expect(adfToMarkdown(doc())).toBe('')
  })

  it('passes a plain-string description through rather than losing it', () => {
    // `/rest/api/3` answers ADF, but a site behind an older renderer answering wiki
    // markup is content we can still show — and refusing it would be dropping it.
    expect(adfToMarkdown('  h1. Legacy wiki markup  ')).toBe('h1. Legacy wiki markup')
  })

  // ─── The rule the converter exists for ───────────────────────────────────────
  // Silently ignoring a node type this module has never seen is a content-loss bug,
  // and ADF is an open format. The two halves of it fail differently and both are
  // covered here.

  it('keeps the whole subtree of an unknown WRAPPER', () => {
    // A description written entirely inside a layout column would otherwise come
    // back blank, and the panel would say "no description" about a ticket that has
    // one. Written with node types this module deliberately does NOT know: `panel`
    // and `table` are handled now, so using either here would stop testing the rule.
    const markdown = adfToMarkdown(doc({
      type: 'layoutSection',
      content: [{
        type: 'layoutColumn',
        attrs: { width: 50 },
        content: [
          paragraph(text('Careful.')),
          { type: 'expand', attrs: { title: 'More' }, content: [paragraph(text('Details here.'))] },
        ],
      }],
    }))

    expect(markdown).toBe('Careful.\n\nDetails here.')
  })

  it('walks into an unknown wrapper whose leaves are inline, without splitting the sentence', () => {
    // A table cell, a layout column: the run inside is one sentence, so it is
    // joined with nothing rather than with a blank line.
    expect(adfToMarkdown(doc({
      type: 'tableCell',
      content: [text('one '), text('sentence')],
    }))).toBe('one sentence')
  })

  it('emits an unknown LEAF’s text', () => {
    // `mention`, `emoji`, `status`, `taskItem` carry no `text` child at all: the
    // sentence would still render, with the person missing from the middle of it.
    expect(adfToMarkdown(doc(paragraph(
      text('Assigned to '),
      { type: 'mention', attrs: { id: 'acc-1', text: '@Ada' } },
      text(' with '),
      { type: 'status', attrs: { text: 'DONE', color: 'green' } },
    )))).toBe('Assigned to @Ada with DONE')
  })

  it('emits an unknown leaf’s url when it has no text', () => {
    // `inlineCard` and `blockCard` are a URL and nothing else — the link the
    // paragraph was about.
    expect(adfToMarkdown(doc(
      paragraph(text('See '), { type: 'inlineCard', attrs: { url: 'https://example.test/a' } }),
      { type: 'blockCard', attrs: { url: 'https://example.test/b' } },
    ))).toBe('See https://example.test/a\n\nhttps://example.test/b')
  })

  it('drops an unknown leaf that has nothing to say rather than printing a hole', () => {
    expect(adfToMarkdown(doc(paragraph(text('a'), { type: 'mediaSingle', attrs: { layout: 'center' } }))))
      .toBe('a')
  })
})

describe('adfToMarkdown — a table', () => {
  /** ADF's own table shape: rows of cells, the first row optionally headers. */
  function table(...rows: unknown[]) {
    return { type: 'table', content: rows }
  }
  function row(...cells: unknown[]) {
    return { type: 'tableRow', content: cells }
  }
  function th(value: string) {
    return { type: 'tableHeader', content: [paragraph(text(value))] }
  }
  function td(value: string, attrs?: Record<string, unknown>) {
    return { type: 'tableCell', ...(attrs ? { attrs } : {}), content: [paragraph(text(value))] }
  }

  it('renders a header row and its body as a GFM table', () => {
    expect(adfToMarkdown(doc(table(
      row(th('Field'), th('Value')),
      row(td('Env'), td('prod')),
      row(td('Owner'), td('Ada')),
    )))).toBe([
      '| Field | Value |',
      '| --- | --- |',
      '| Env | prod |',
      '| Owner | Ada |',
    ].join('\n'))
  })

  it('keeps a headerless table\u2019s first row as content rather than promoting it', () => {
    // GFM has no headerless table, so the band above is empty — but every row of
    // the ticket is still a row of the table.
    expect(adfToMarkdown(doc(table(row(td('a'), td('b')), row(td('c'), td('d')))))).toBe([
      '|  |  |',
      '| --- | --- |',
      '| a | b |',
      '| c | d |',
    ].join('\n'))
  })

  it('pads a short row so every later column stays under its heading', () => {
    expect(adfToMarkdown(doc(table(row(th('a'), th('b'), th('c')), row(td('1')))))).toBe([
      '| a | b | c |',
      '| --- | --- | --- |',
      '| 1 |  |  |',
    ].join('\n'))
  })

  it('spends a merged cell\u2019s extra columns on empty ones', () => {
    expect(adfToMarkdown(doc(table(
      row(th('a'), th('b')),
      row(td('wide', { colspan: 2 })),
    )))).toBe([
      '| a | b |',
      '| --- | --- |',
      '| wide |  |',
    ].join('\n'))
  })

  it('flattens a multi-paragraph cell onto its one line, and escapes a pipe in it', () => {
    const cell = { type: 'tableCell', content: [paragraph(text('one | two')), paragraph(text('three'))] }
    expect(adfToMarkdown(doc(table(row(th('h')), row(cell))))).toBe([
      '| h |',
      '| --- |',
      '| one \\| two three |',
    ].join('\n'))
  })

  it('reads a table with no rows as nothing rather than as an empty grid', () => {
    expect(adfToMarkdown(doc(paragraph(text('a')), table()))).toBe('a')
  })
})

describe('adfToMarkdown — the other blocks a description is written in', () => {
  it('keeps a panel as a quote rather than as ordinary prose', () => {
    expect(adfToMarkdown(doc({
      type: 'panel',
      attrs: { panelType: 'warning' },
      content: [paragraph(text('Careful')), paragraph(text('Really'))],
    }))).toBe('> Careful\n>\n> Really')
  })

  it('marks a checklist with its own state', () => {
    expect(adfToMarkdown(doc({
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { state: 'DONE' }, content: [text('shipped')] },
        { type: 'taskItem', attrs: { state: 'TODO' }, content: [text('pending')] },
      ],
    }))).toBe('- [x] shipped\n- [ ] pending')
  })
})

describe('mapIssueDetail', () => {
  it('maps the fields the panel shows', () => {
    expect(mapIssueDetail(rawIssue())).toEqual({
      description: 'Do the thing',
      assignee: 'Ada Lovelace',
      reporter: 'Grace Hopper',
      labels: ['backend', 'urgent'],
      statusName: 'In Progress',
      statusCategory: 'indeterminate',
      comments: [],
    })
  })

  // The panel is opened FROM a row, so the two must answer this the same way — which
  // is why both go through `readReporter` rather than reading the field themselves.
  it('prefers the reporter over the creator, as the row does', () => {
    const detail = mapIssueDetail(rawIssue({
      reporter: null,
      creator: { displayName: 'Support Bot' },
    }))

    expect(detail.reporter).toBe('Support Bot')
  })

  // Re-read with the status and for its reason: a ticket re-prioritised between the
  // list read and the click must not go on showing the value the row captured.
  it('reads the priority back, through the same reader the row used', () => {
    expect(mapIssueDetail(rawIssue({ priority: { id: '1', name: 'Highest' } })).priority)
      .toEqual({ name: 'Highest', level: 'highest' })
  })

  it('omits the priority on a ticket that has none', () => {
    // A project with the field off its screens, or a ticket set to "None". Absent
    // is what the panel treats as "this ticket does not have one".
    expect('priority' in mapIssueDetail(rawIssue({ priority: null }))).toBe(false)
    expect('priority' in mapIssueDetail(rawIssue())).toBe(false)
  })

  it('omits an assignee Jira reports as nobody', () => {
    // Omitted rather than `''`: an empty string is a person whose name is blank,
    // and the panel would print it in place of "none".
    const detail = mapIssueDetail(rawIssue({ assignee: null }))
    expect('assignee' in detail).toBe(false)
    expect(detail.reporter).toBe('Grace Hopper')
  })

  it('falls back to the account id when a name is withheld', () => {
    expect(mapIssueDetail(rawIssue({ assignee: { accountId: 'acc-9' } })).assignee).toBe('acc-9')
  })

  it('reads a ticket with no labels as having none', () => {
    expect(mapIssueDetail(rawIssue({ labels: [] })).labels).toEqual([])
    expect(mapIssueDetail(rawIssue({ labels: null })).labels).toEqual([])
  })

  it('defaults a status with no category to To Do, as the list does', () => {
    // The same rule `readStatus` states in `sprint-issues.ts` — and the reason this
    // module imports it rather than copying it: the panel re-colours the pill the
    // list drew, so a second answer would show as a ticket changing colour on open.
    const detail = mapIssueDetail(rawIssue({ status: { name: 'Triage' } }))
    expect(detail).toMatchObject({ statusName: 'Triage', statusCategory: 'new' })
  })

  it('never fails on an answer it did not understand', () => {
    // Nothing here can report a failure: the panel was opened on a row that exists,
    // and every field degrades to an empty one.
    const empty = { description: '', labels: [], statusName: '', statusCategory: 'new', comments: [] }
    expect(mapIssueDetail({})).toEqual(empty)
    expect(mapIssueDetail(null)).toEqual(empty)
  })
})

describe('mapIssueDetail — the comment thread', () => {
  function comment(overrides: Record<string, unknown> = {}) {
    return {
      id: '10000',
      author: { displayName: 'Ada Lovelace', accountId: 'acc-1' },
      created: '2026-08-02T09:00:00.000+0200',
      updated: '2026-08-02T09:00:00.000+0200',
      body: doc(paragraph(text('Looks good to me.'))),
      ...overrides,
    }
  }

  function withComments(page: Record<string, unknown>) {
    return mapIssueDetail(rawIssue({ comment: page }))
  }

  it('reads a comment through the same converter the description goes through', () => {
    const detail = withComments({ comments: [comment()], total: 1 })

    expect(detail.comments).toEqual([{
      id: '10000',
      author: 'Ada Lovelace',
      createdAt: '2026-08-02T09:00:00.000+0200',
      body: 'Looks good to me.',
    }])
    // Equal to what arrived: no "showing N of M" line on the common case.
    expect(detail).not.toHaveProperty('commentTotal')
  })

  // Jira sets `updated` to `created` on a comment nobody has touched, so passing it
  // through unconditionally would mark every comment in the thread as edited.
  it('marks a comment as edited only when it really was', () => {
    const untouched = withComments({ comments: [comment()] })
    expect(untouched.comments[0]).not.toHaveProperty('updatedAt')

    const rewritten = withComments({
      comments: [comment({ updated: '2026-08-03T11:30:00.000+0200' })],
    })
    expect(rewritten.comments[0].updatedAt).toBe('2026-08-03T11:30:00.000+0200')
  })

  // The field is a PAGE whose size Jira picks. A reader who reaches the bottom of a
  // truncated thread must not believe they have read all of it.
  it('reports the real count when Jira sent only a page', () => {
    const detail = withComments({ comments: [comment(), comment({ id: '10001' })], total: 47 })

    expect(detail.comments).toHaveLength(2)
    expect(detail.commentTotal).toBe(47)
  })

  // A total below what arrived is Jira answering something impossible; trusting it
  // would render "showing the first 2 of 1".
  it('ignores a total that is not bigger than what arrived', () => {
    expect(withComments({ comments: [comment()], total: 1 })).not.toHaveProperty('commentTotal')
    expect(withComments({ comments: [comment()], total: 0 })).not.toHaveProperty('commentTotal')
    expect(withComments({ comments: [comment()], total: 'many' })).not.toHaveProperty('commentTotal')
  })

  // A comment that exists is a turn in the conversation. Dropping the odd ones would
  // leave the reader with a thread that silently skips a turn.
  it('keeps a comment with no author, no body and no id', () => {
    const detail = withComments({ comments: [{}, {}] })

    expect(detail.comments).toEqual([
      { id: 'comment-0', author: '', createdAt: '', body: '' },
      { id: 'comment-1', author: '', createdAt: '', body: '' },
    ])
  })

  it('reads a ticket with no comment field as having none', () => {
    expect(mapIssueDetail(rawIssue()).comments).toEqual([])
    expect(withComments({}).comments).toEqual([])
    expect(mapIssueDetail(rawIssue({ comment: 'nonsense' })).comments).toEqual([])
  })
})
