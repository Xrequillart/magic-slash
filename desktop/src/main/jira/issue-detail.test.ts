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
    expect(DETAIL_FIELDS).toEqual(['description', 'status', 'assignee', 'reporter', 'labels'])
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
    // A description written entirely inside a `panel` would otherwise come back
    // blank, and the panel would say "no description" about a ticket that has one.
    const markdown = adfToMarkdown(doc({
      type: 'panel',
      attrs: { panelType: 'warning' },
      content: [
        paragraph(text('Careful.')),
        { type: 'expand', attrs: { title: 'More' }, content: [paragraph(text('Details here.'))] },
      ],
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

describe('mapIssueDetail', () => {
  it('maps the fields the panel shows', () => {
    expect(mapIssueDetail(rawIssue())).toEqual({
      description: 'Do the thing',
      assignee: 'Ada Lovelace',
      reporter: 'Grace Hopper',
      labels: ['backend', 'urgent'],
      statusName: 'In Progress',
      statusCategory: 'indeterminate',
    })
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
    expect(mapIssueDetail({})).toEqual({ description: '', labels: [], statusName: '', statusCategory: 'new' })
    expect(mapIssueDetail(null)).toEqual({ description: '', labels: [], statusName: '', statusCategory: 'new' })
  })
})
