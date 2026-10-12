import { Children, useState, type ReactNode } from 'react'
import {
  DecisionList, SizingCard, SpecHeaderCard, type SizingFact, type SizingFactKind, type SpecHeaderCardProps, type SpecStatusTone,
} from '@ds/desktop'
import type { MarkdownListProps, MarkdownTableProps } from '../../components/file-preview/MarkdownView'
import { commentLabel, useCommentLines } from '../../components/file-preview/CommentLines'
import { useLocale, useT } from '../../i18n'

/**
 * The columns of a spec's `## Framing decisions`, as the template freezes them: English
 * whatever the spec's language, because the skills find the section by its words.
 */
const DECISION_HEAD = ['question', 'decision', 'why']

function isDecisionTable(head: string[]): boolean {
  return head.length === DECISION_HEAD.length && head.every((cell, i) => cell.toLowerCase() === DECISION_HEAD[i])
}

/**
 * A table of a plan's spec, drawn as what it holds. Today that is the one table a reader
 * argues with — the questions the agent asked and what was decided — which becomes a list
 * of rows to fold and comment on whole. Every other table is drawn as a table.
 */
export function SpecTable(props: MarkdownTableProps) {
  if (!isDecisionTable(props.head)) return <>{props.fallback}</>
  return <DecisionTable {...props} />
}

/**
 * The framing decisions. A row is one line to comment on — the question and its decision
 * together — and is only read here: see `DecisionList`.
 *
 * Which rows are open is kept BY POSITION. A row's key is its offset in the source, which
 * moves the moment anything above it is edited; its place in the table does not.
 */
function DecisionTable({ rows }: MarkdownTableProps) {
  const t = useT()
  const comments = useCommentLines()
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set())
  const toggle = (i: number) => setOpen((prev) => {
    const next = new Set(prev)
    if (!next.delete(i)) next.add(i)
    return next
  })

  const items = rows.map((row, i) => {
    const key = row.lineKey
    const count = key && comments ? comments.countOf(key) : 0
    return {
      key: String(i),
      question: row.cells[0],
      decision: row.cells[1],
      reason: row.cells[2],
      open: open.has(i),
      onToggle: () => toggle(i),
      comment: key && comments
        ? { lineId: key, count, active: comments.open === key, label: commentLabel(t, count), onOpen: () => comments.onOpen(key) }
        : undefined,
    }
  })

  return (
    <DecisionList
      items={items}
      labels={{
        decision: t('plans.decisions.decision'),
        reason: t('plans.decisions.reason'),
        expand: t('plans.decisions.expand'),
        collapse: t('plans.decisions.collapse'),
      }}
    />
  )
}

/**
 * The facts of a spec's `## Sizing`, by the words the template opens each bullet with. In
 * English whatever the spec's language, like the headings: the specs written in French still
 * say `Verdict:`.
 */
const SIZING_FACTS: Record<string, SizingFactKind> = {
  verdict: 'verdict',
  'deliverables counted': 'deliverables',
  'splitting mode': 'splitting',
  justification: 'justification',
}

/** `Verdict: epic + 3 stories` as its kind, or `null` for a bullet that is not a sizing fact. */
function sizingKindOf(text: string): SizingFactKind | null {
  const colon = text.indexOf(':')
  return colon === -1 ? null : SIZING_FACTS[text.slice(0, colon).trim().toLowerCase()] ?? null
}

/**
 * The words of a bullet after its `Label:`. The label is always plain text at the start of
 * the first string — the template writes it that way — so only that string is cut, and the
 * bold and the code after it are drawn as the spec wrote them.
 */
function afterLabel(children: ReactNode): ReactNode {
  const kids = Children.toArray(children)
  const first = kids[0]
  if (typeof first !== 'string') return children
  const rest = first.slice(first.indexOf(':') + 1).replace(/^\s+/, '')
  return rest === '' ? kids.slice(1) : [rest, ...kids.slice(1)]
}

/**
 * A bulleted list of a plan's spec, drawn as what it holds. Today that is the header under
 * the title, which becomes the spec's coordinates (`SpecHeaderCard`), and the sizing, which
 * becomes a card of facts (`SizingCard`). Every other list is drawn as a list.
 *
 * RECOGNISED BY ITS WORDS ALONE — every bullet a sizing fact, a verdict among them, none
 * twice — because a list does not know the heading it sits under. A list that only looks
 * like one somewhere else in a spec would have to open every bullet with those exact labels.
 */
export function SpecList(props: MarkdownListProps) {
  if (isSpecHeader(props.items)) return <SpecHeader items={props.items} />
  const kinds = props.items.map((item) => sizingKindOf(item.text))
  const sizing = kinds.every((kind) => kind !== null)
    && kinds.includes('verdict')
    && new Set(kinds).size === kinds.length
  if (!sizing) return <>{props.fallback}</>
  return <SizingFacts {...props} />
}

function SizingFacts({ items }: MarkdownListProps) {
  const t = useT()
  const comments = useCommentLines()
  const facts = items.map((item): SizingFact => {
    const key = item.lineKey
    const count = key && comments ? comments.countOf(key) : 0
    return {
      kind: sizingKindOf(item.text) as SizingFactKind,
      value: afterLabel(item.children),
      comment: key && comments
        ? { lineId: key, count, active: comments.open === key, label: commentLabel(t, count), onOpen: () => comments.onOpen(key) }
        : undefined,
    }
  })
  return (
    <SizingCard
      facts={facts}
      labels={{
        verdict: t('plans.sizing.verdict'),
        deliverables: t('plans.sizing.deliverables'),
        splitting: t('plans.sizing.splitting'),
        justification: t('plans.sizing.justification'),
      }}
    />
  )
}

/** The spec's header, `- Repository: …` to `- Status: …`, by the template's own words. */
type HeaderKey = 'repository' | 'tracker' | 'created' | 'status'
const HEADER_KEYS: readonly HeaderKey[] = ['repository', 'tracker', 'created', 'status']

/** A bullet as its label and its words, or `null` when it opens on no label. */
function labelled(text: string): { key: string; value: string } | null {
  const colon = text.indexOf(':')
  return colon === -1 ? null : { key: text.slice(0, colon).trim().toLowerCase(), value: text.slice(colon + 1).trim() }
}

/** Every bullet a header fact, the repository among them, none twice. `SpecList`'s test. */
function isSpecHeader(items: MarkdownListProps['items']): boolean {
  const keys = items.map((item) => labelled(item.text)?.key)
  return keys.every((key) => HEADER_KEYS.includes(key as HeaderKey))
    && keys.includes('repository')
    && new Set(keys).size === keys.length
}

/** The skill's statuses, as the template spells them. Anything else is drawn as written. */
const STATUSES: Record<string, Exclude<SpecStatusTone, 'unknown'>> = {
  drafting: 'drafting',
  'awaiting approval': 'awaiting',
  'tickets created': 'created',
  abandoned: 'abandoned',
}

/** `github.com/…` and `Jira PROJ` are products with a mark; anything else is a plain label. */
function trackerTone(name: string): 'github' | 'jira' | 'neutral' {
  if (/github/i.test(name)) return 'github'
  if (/jira|atlassian/i.test(name)) return 'jira'
  return 'neutral'
}

/**
 * The spec's header, as its coordinates. Read off the bullets' PLAIN words: every value is
 * an identifier the skill writes by rule, so there is no markup in them to keep.
 */
function SpecHeader({ items }: { items: MarkdownListProps['items'] }) {
  const t = useT()
  const locale = useLocale()
  const facts = new Map(items.map((item) => {
    const fact = labelled(item.text)
    return [fact?.key ?? '', fact?.value ?? ''] as const
  }))

  const props: SpecHeaderCardProps = {
    labels: {
      repository: t('plans.specHeader.repository'),
      tracker: t('plans.specHeader.tracker'),
      created: t('plans.specHeader.created'),
      status: t('plans.specHeader.status'),
    },
  }

  const repository = facts.get('repository')
  if (repository) {
    // `magic-slash (/Users/…/magic-slash)`: the name, and the path it was planned in.
    const match = /^(.*?)\s*\((.+)\)$/.exec(repository)
    props.repository = match ? { name: match[1], path: match[2] } : { name: repository }
  }
  const tracker = facts.get('tracker')
  if (tracker) props.tracker = { name: tracker, tone: trackerTone(tracker) }
  const created = facts.get('created')
  if (created) {
    // An ISO date is read as the calendar day it names, not as midnight UTC.
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(created)
    props.created = day
      ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]))
        .toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
      : created
  }
  const status = facts.get('status')
  if (status) {
    const tone = STATUSES[status.toLowerCase()]
    props.status = tone
      ? { label: t(`plans.specHeader.statuses.${tone}`), tone }
      : { label: status, tone: 'unknown' }
  }
  return <SpecHeaderCard {...props} />
}
