import type { JiraEpic, JiraPriority, JiraPriorityLevel, JiraStatusCategory, JiraTaskIssue, JiraTaskStatusError } from '../../types'
import { AtlassianApiError } from './atlassian-api'

/**
 * Everything the sprint read DECIDES, with nothing it needs a machine for.
 *
 * PURE in `atlassian-api.ts`'s sense, and for the same reason: no `electron`, no
 * filesystem, no ambient `fetch` — and, importantly, no import of `connect.ts`,
 * which pulls in `electron` and (through `token-store.ts`) a `CONFIG_DIR` computed
 * at module load. This module therefore imports cleanly under plain Node, which is
 * what lets `sprint-issues.test.ts` cover the query, the mapping and the failure
 * ladder without a single mock.
 *
 * The three questions it answers:
 *
 *  1. WHAT TO ASK — one JQL query per project, and only one. `sprint in
 *     openSprints()` resolves the board itself, so nothing here needs a board id
 *     (we have none) nor the `/rest/agile` scope (we do not ask for one).
 *  2. WHAT CAME BACK — Jira's issue shape into `JiraTaskIssue`, dropping anything
 *     unusable rather than half-rendering it.
 *  3. WHY IT FAILED — an `AtlassianApiError` into one of the nine named failures
 *     the card can put a sentence and a fix against.
 */

/**
 * The fields the search asks for, and the reason each is there.
 *
 * `summary` is the row's title and `status` is what the page filters and colours
 * on. `created` looks optional and is not: `TaskIssue.createdAt` feeds
 * `sortIssues` (renderer/utils/taskRows.ts), which sinks anything without a
 * timestamp — so a sprint read without it would pile every Jira row at the bottom
 * of its own card in whatever order Jira happened to answer in.
 *
 * `priority` is the one fact on a Jira ticket that the reader sorts their own day
 * by and that a GitHub issue has no equivalent of. It costs one short object per
 * row and is what `readPriority` turns into a badge — a field a project has
 * switched off simply comes back absent, which is a state both surfaces render.
 *
 * `labels` and the two PEOPLE fields are what put a Jira row on equal footing with
 * a GitHub one: that row has carried its author and its labels from the start, and
 * a sprint row beside it with neither read as the poorer half of the page. Both
 * people are asked for and only one is kept — see `readReporter`, which is where
 * the choice between them is made and explained.
 *
 * `parent` is what the epic badge is built from, and it is free in the sense that
 * matters: Jira returns it INLINE — key, summary and issue type in the same response
 * — so a ticket's epic costs no call of its own. Only the epic's COLOUR needs one,
 * and that is a single extra search per card for the handful of distinct epics a
 * sprint has (see `buildEpicColorJql`). Read through `readEpic`, which is where a
 * sub-task's parent story is rejected as not being an epic.
 *
 * Nothing else. Every field named here is serialised for every ticket of every Jira
 * repository on every reload, which is why what only the OPEN ticket needs — the
 * description, the assignee, the comments — stays in `DETAIL_FIELDS` next door. The
 * three added here cost a short array and one name per row; a description is
 * kilobytes per row.
 */
export const SPRINT_FIELDS = ['summary', 'status', 'priority', 'created', 'labels', 'reporter', 'creator', 'parent']

/**
 * How many tickets one repository's card can hold.
 *
 * Matched to `github-issues.ts`'s `first: 50` so the two halves of the page cap
 * alike. A single page, never a follow-up: an active sprint with more than fifty
 * open tickets is a planning problem, not a pagination one, and walking the cursor
 * would spend a round trip per page on rows nobody scrolls to.
 */
export const SPRINT_PAGE_SIZE = 50

/**
 * A JQL string literal.
 *
 * JQL escapes with a backslash, exactly as JSON does, and the project key reaches
 * here from a settings field that accepts free text. Unescaped, a key containing a
 * quote would not "inject" anything interesting — the rest of the query is fixed
 * and Jira's parser has no statement separator — but it WOULD produce a query that
 * no longer parses, reported as a mysterious 400 instead of an empty project.
 */
function quoteJql(value: string): string {
  return `"${value.replace(/[\\"]/g, (character) => `\\${character}`)}"`
}

/**
 * The query that fills a card: the unfinished work of the project's open sprints.
 *
 * FILTERED SERVER-SIDE, and that is the whole point. `SPRINT_PAGE_SIZE` caps the
 * SERVER's result, so every row the cap spends on something this feature then
 * discards is a row the user does not get. Two earlier shapes of this query both
 * failed that way: unfiltered and ordered by date, finished tickets ate the budget;
 * unfiltered and ordered by category ascending, To Do ate it and pushed the In
 * Progress rows — the ones an agent is actually on — off the only page fetched. In
 * both cases the rows vanished silently, because the visible count sat under the cap
 * and no truncation hint appeared. Excluding `Done` here means the budget is spent
 * only on rows that can reach the card.
 *
 * ORDERED BY CATEGORY DESCENDING. Jira sequences the categories To Do → In Progress
 * → Done, so with `Done` already excluded, descending puts In Progress first. That
 * is the order this page wants: an In Progress ticket appears only when an agent is
 * on it, which makes it the row the user most needs to see, while a truncated To Do
 * column is what the `truncated` flag is for. If a site ever sequenced its
 * categories differently the worst case is the previous behaviour, not a failure.
 *
 * Creation date breaks the tie inside a category, so the rows still arrive in the
 * order the renderer sorts them into anyway.
 *
 * The cost of filtering is that an empty answer no longer distinguishes "no active
 * sprint" from "this sprint has nothing left to do" — see `buildOpenSprintProbeJql`,
 * which buys that distinction back without spending a call on the common case.
 */
export function buildSprintJql(projectKey: string): string {
  return `project = ${quoteJql(projectKey)} AND sprint in openSprints() AND statusCategory != Done ORDER BY statusCategory DESC, created DESC`
}

/**
 * The follow-up asked ONLY when `buildSprintJql` came back empty: does this project
 * have an open sprint at all?
 *
 * Same query without the status filter, so a sprint whose every ticket is finished
 * still answers with something. Non-empty means the sprint exists and the card is
 * legitimately empty; empty means there is no sprint to show, which is a different
 * sentence to put in front of the user (acceptance criterion 5).
 *
 * A second round trip, but only on a card that is about to be empty — never on the
 * common path, which is what an earlier no-filter design paid instead. One row is
 * enough to answer a yes/no question, hence `PROBE_PAGE_SIZE`.
 *
 * One case stays out of reach: an open sprint with no issues in it at all answers
 * empty here too, and is reported as no sprint. Telling those apart needs the board
 * id and the Agile API, which is a scope this app does not request.
 */
export function buildOpenSprintProbeJql(projectKey: string): string {
  return `project = ${quoteJql(projectKey)} AND sprint in openSprints()`
}

/** One row is enough to answer the probe's yes/no question. */
export const PROBE_PAGE_SIZE = 1

/**
 * `https://acme.atlassian.net/browse/PROJ-123`, or `''` when there is no site to
 * build it from.
 *
 * The configured site is documented as a BROWSE BASE (`.../browse/`), while the
 * credential's `site_url` is the bare origin — so both trailing slashes and a
 * trailing `/browse` are stripped before one is appended. Getting this wrong
 * produces `…/browse/browse/PROJ-123`, which 404s in the user's browser rather
 * than failing anywhere we would see it.
 */
export function browseUrl(site: string, key: string): string {
  const base = site.trim().replace(/\/+$/, '').replace(/\/browse$/i, '')
  return base ? `${base}/browse/${encodeURIComponent(key)}` : ''
}

/** Jira's fixed category keys, as a lookup rather than three comparisons. */
const CATEGORIES: Record<string, JiraStatusCategory> = {
  new: 'new',
  indeterminate: 'indeterminate',
  done: 'done',
}

/**
 * A ticket's status, as the two values the page uses: the word to print, and the
 * category to branch on.
 *
 * Read together rather than one function each, because they come out of the same
 * object and would otherwise re-run the same "is this an object" narrowing twice —
 * and could disagree about what a malformed status means.
 *
 * The category defaults to `new`. Jira has a fourth category key — `undefined`, for
 * a status an admin never filed under one — and a workflow can be configured
 * entirely out of the standard three. Such a ticket is in the sprint and is not
 * finished, so `new` (the To Do column) is where it belongs: it is the one default
 * that neither hides real work nor claims an agent is on something.
 *
 * EXPORTED for `issue-detail.ts`, which reads the same `status` object out of the
 * same API for the same two values. A second copy would be a second answer to
 * "what does a status with no category mean", and the detail panel re-colours the
 * pill the list drew — so the two disagreeing would show as a ticket changing
 * colour on being opened.
 */
export function readStatus(status: unknown): { name: string; category: JiraStatusCategory } {
  const fields = (status && typeof status === 'object' ? status : {}) as Record<string, unknown>
  const name = fields.name
  const category = fields.statusCategory
  const key = category && typeof category === 'object'
    ? (category as Record<string, unknown>).key
    : undefined
  return {
    name: typeof name === 'string' ? name : '',
    category: (typeof key === 'string' && CATEGORIES[key]) || 'new',
  }
}

/**
 * Jira's five default priorities, by the id its own seed data gives them.
 *
 * The ID and not the name, because the id is what survives translation: a French
 * site calls priority 2 "Élevée" and an English one "High", and both mean the same
 * step on the same scale. Every Atlassian site is created with exactly these five
 * under exactly these ids, so this hits on the overwhelming majority of tickets
 * without a word of any language in it.
 */
const DEFAULT_PRIORITY_IDS: Record<string, JiraPriorityLevel> = {
  '1': 'highest',
  '2': 'high',
  '3': 'medium',
  '4': 'low',
  '5': 'lowest',
}

/**
 * The fallback for a site that runs its own priority scheme: the NAME, lower-cased,
 * for the words such a scheme almost always reuses.
 *
 * Deliberately small, and deliberately not clever. A scheme built out of "P1…P4",
 * "Blocker/Critical/Major" or "Urgent" is common enough to be worth placing; one
 * built out of anything else lands on `unknown`, which renders the site's own word
 * in the neutral tier. That is the point of having an `unknown` at all — the
 * alternative to admitting we cannot place a priority is guessing, and a ticket
 * shown as Low because its name was unfamiliar is worse than one shown as itself.
 */
const PRIORITY_NAMES: Record<string, JiraPriorityLevel> = {
  highest: 'highest',
  blocker: 'highest',
  critical: 'highest',
  urgent: 'highest',
  p1: 'highest',
  high: 'high',
  major: 'high',
  p2: 'high',
  medium: 'medium',
  normal: 'medium',
  moyenne: 'medium',
  p3: 'medium',
  low: 'low',
  minor: 'low',
  basse: 'low',
  p4: 'low',
  lowest: 'lowest',
  trivial: 'lowest',
  p5: 'lowest',
}

/**
 * A ticket's priority, as the name to print and the step to colour — or `undefined`
 * when the ticket has none.
 *
 * THREE ways a ticket legitimately has no priority, and all three come out the same:
 * the project removed the field from its screens (Jira omits it), the ticket sits at
 * "None" (Jira sends `null`), or the object arrived without a name to print. None of
 * them is an error, and none of them should produce a badge — `undefined` is what
 * both surfaces treat as "this ticket does not have one".
 *
 * The LEVEL is what the badge draws and the NAME is what it says, which is
 * `readStatus`'s split one field along: the id is fixed by Jira and can be branched
 * on, the name is the site's own word and is the only thing worth showing.
 *
 * EXPORTED for `issue-detail.ts`, which asks for the same field on the same ticket:
 * two copies would be two answers to what an unfamiliar priority means, and the
 * panel would then contradict the row it was opened from.
 */
export function readPriority(value: unknown): JiraPriority | undefined {
  if (!value || typeof value !== 'object') return undefined
  const { id, name } = value as Record<string, unknown>
  if (typeof name !== 'string' || name.trim() === '') return undefined
  const byId = typeof id === 'string' ? DEFAULT_PRIORITY_IDS[id] : undefined
  return {
    name: name.trim(),
    level: byId || PRIORITY_NAMES[name.trim().toLowerCase()] || 'unknown',
  }
}

/**
 * A ticket's labels, as the array of non-empty strings both surfaces render.
 *
 * Jira answers `[]` for a ticket with none and omits the field entirely on a site
 * where labels are disabled, so the absent case has to produce an array rather than
 * `undefined` — the row and the panel both `.map()` over this without a guard.
 *
 * EXPORTED for `issue-detail.ts`, which asks for the same field. See `readPerson`.
 */
export function readLabels(labels: unknown): string[] {
  return Array.isArray(labels)
    ? labels.filter((label): label is string => typeof label === 'string' && label !== '')
    : []
}

/**
 * A Jira user object as the one word any surface here prints for it.
 *
 * `''` for no person at all, which every caller treats as "omit the field" rather
 * than as a person whose name is blank.
 *
 * EXPORTED for `issue-detail.ts`, which reads the same user objects out of the same
 * API — the arrangement `readStatus` above is already in, and for its reason: two
 * copies would be two answers to what a privacy-restricted account is called, and
 * the panel would then disagree with the row it was opened from.
 */
export function readPerson(person: unknown): string {
  if (!person || typeof person !== 'object') return ''
  const { displayName, accountId } = person as Record<string, unknown>
  // `displayName` is the field Atlassian's privacy settings never hide, so the
  // fallback is all but unreachable — and an account id is at least an identity,
  // where an empty string would make an attributed ticket read as anonymous.
  if (typeof displayName === 'string' && displayName !== '') return displayName
  return typeof accountId === 'string' ? accountId : ''
}

/**
 * Who a ticket is FROM, out of the two people Jira records for it.
 *
 * `reporter` wins, `creator` stands in. They are genuinely different fields:
 * `creator` is whoever pressed the button and Jira will not let it be changed,
 * while `reporter` is who the ticket is on behalf of and is what every Jira screen
 * shows. On a ticket filed by a support agent for a customer they name two
 * different people, and the one the reader recognises from Jira is the reporter.
 *
 * The fallback is not cosmetic: an automation or an integration can file a ticket
 * with no reporter set, and `creator` is then the only name there is. Preferring
 * `reporter` alone would blank the byline on exactly the tickets nobody can put a
 * face to otherwise.
 */
export function readReporter(fields: Record<string, unknown>): string {
  return readPerson(fields.reporter) || readPerson(fields.creator)
}

/**
 * Jira's fourteen epic colours, as the hex the badge actually draws.
 *
 * A LOOKUP AND NOT A FETCH, deliberately. The swatches are Atlassian's own product
 * palette, fixed for every site — a Jira nobody has ever configured offers exactly
 * these fourteen — so resolving them is a translation, not a read. The alternative
 * is a call per site for a table that cannot change, which is the kind of dependency
 * `feedback_no_external_api_for_owned_values` is about.
 *
 * The KEYS are the names a modern site answers with (`green`, `dark_purple`), which
 * is the vocabulary of the Issue Color field. The legacy Epic Colour field answers
 * `ghx-label-N` instead, and `GHX_LABEL_NAMES` below folds those onto these names
 * rather than duplicating fourteen hexes under a second set of keys.
 *
 * The hexes are the Atlassian palette's own mid and dark steps. They are not read
 * off the app's theme tokens on purpose: this dot claims to be the colour the user
 * chose IN JIRA, so it has to be that colour in both themes rather than a token that
 * shifts with the surface behind it.
 */
const EPIC_COLORS: Record<string, string> = {
  grey: '#8993A4',
  dark_grey: '#505F79',
  blue: '#2684FF',
  dark_blue: '#0052CC',
  teal: '#00B8D9',
  dark_teal: '#008DA6',
  green: '#36B37E',
  dark_green: '#006644',
  yellow: '#FFC400',
  dark_yellow: '#FF991F',
  orange: '#FF8B00',
  dark_orange: '#FF5630',
  purple: '#8777D9',
  dark_purple: '#5243AA',
}

/**
 * The legacy Epic Colour field's swatch ids, onto the names `EPIC_COLORS` is keyed by.
 *
 * `ghx-label-N` is what a site with the ORIGINAL Jira Software epic field answers —
 * an opaque id, in the sense that nothing about `ghx-label-6` says green. The mapping
 * is Atlassian's and is fixed; it was confirmed against a site that carries both
 * fields, where every epic's two values agree pair for pair.
 *
 * Kept as a second table rather than folded into the first because the two fields are
 * genuinely different vocabularies for one palette, and a site can have either, both,
 * or (a team-managed project) neither.
 */
const GHX_LABEL_NAMES: Record<string, string> = {
  'ghx-label-1': 'dark_grey',
  'ghx-label-2': 'dark_yellow',
  'ghx-label-3': 'yellow',
  'ghx-label-4': 'dark_blue',
  'ghx-label-5': 'dark_teal',
  'ghx-label-6': 'green',
  'ghx-label-7': 'purple',
  'ghx-label-8': 'dark_purple',
  'ghx-label-9': 'orange',
  'ghx-label-10': 'blue',
  'ghx-label-11': 'teal',
  'ghx-label-12': 'grey',
  'ghx-label-13': 'dark_green',
  'ghx-label-14': 'dark_orange',
}

/**
 * One colour field's value as a hex, or `undefined` when it says nothing usable.
 *
 * BOTH vocabularies through one function, because a caller holding a field value does
 * not know which field it came out of — the ids are per site and the two fields are
 * asked for together. A name wins where both would match, which costs nothing: the
 * two tables cannot disagree, since one is defined in terms of the other.
 *
 * `undefined` is the ordinary answer, not a failure: an epic whose colour was never
 * set answers `null`, and a project with no colour field at all answers with the key
 * absent. `JiraEpic.color` is optional for exactly those two cases.
 */
export function readEpicColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const token = value.trim().toLowerCase()
  if (!token) return undefined
  return EPIC_COLORS[token] ?? EPIC_COLORS[GHX_LABEL_NAMES[token] ?? ''] ?? undefined
}

/**
 * How Jira identifies the two fields an epic's colour can live in, whatever ids this
 * site gave them.
 *
 * `SPRINT_FIELD_SCHEMA`'s arrangement one field along, and for its reason: the id is
 * per site (`customfield_10013` here, `customfield_10011` there) and the name is
 * whatever an admin renamed it to, in whatever language, so the TYPE is the only
 * stable handle.
 *
 * Two of them because Jira has shipped two. `jsw-issue-color` is the modern Issue
 * Color and answers a name; `gh-epic-color` is the original Epic Colour and answers
 * a `ghx-label-N`. A long-lived site carries both and they agree; a newer one may
 * carry only the first; a team-managed project may carry neither, which is a site
 * whose epic badges simply draw no dot.
 */
const EPIC_COLOR_SCHEMAS = [
  'com.pyxis.greenhopper.jira:jsw-issue-color',
  'com.pyxis.greenhopper.jira:gh-epic-color',
]

/**
 * The namespace both live in, and the word that identifies them inside it.
 *
 * The SAFETY NET under `EPIC_COLOR_SCHEMAS`, and the reason this is not just an
 * `includes` on that list. Those two strings are the ones Atlassian ships today, and
 * a site whose Jira Software version spells its colour field with a third suffix
 * would silently draw no dots — a failure with no symptom, since the badge still
 * carries the epic's title. Matching the namespace plus `color`/`colour` catches that
 * case and cannot reach anything else: `com.pyxis.greenhopper.jira` is Jira
 * Software's own, and nothing in it is about colour but these.
 *
 * A NAME fallback would be the other option — `findSprintFieldId` has one, for
 * "Sprint" — and is rejected here: that field is called Sprint on nearly every site
 * because nobody renames it, while an epic's colour field is routinely renamed and
 * localised, so a list of English names would be the less reliable of the two.
 */
const GREENHOPPER_NAMESPACE = 'com.pyxis.greenhopper.jira:'
const COLOR_SUFFIX = /colou?r$/

/**
 * This site's ids for the epic colour fields, out of `GET /rest/api/3/field`.
 *
 * An ARRAY rather than one id, and in `EPIC_COLOR_SCHEMAS`' order, because all of
 * them are asked for in the same search and `mapEpicColors` takes the first that
 * answers. Anything matched by the net above and not named in that list comes LAST:
 * the two known fields are the ones whose values `readEpicColor` is written against,
 * so an unknown third is a guess and sorts below both.
 *
 * An empty array is a site with no colour field — never a failure, just a site whose
 * badges are text and no dot.
 *
 * Read off the SAME `/field` response `findSprintFieldId` walks, so discovering it
 * costs no call of its own; the handler makes one lookup per site and both functions
 * read it.
 */
export function findEpicColorFieldIds(fields: unknown[]): string[] {
  const bySchema = new Map<string, string>()
  for (const entry of fields) {
    if (!entry || typeof entry !== 'object') continue
    const { id, schema } = entry as Record<string, unknown>
    if (typeof id !== 'string' || id === '') continue
    const custom = schema && typeof schema === 'object'
      ? (schema as Record<string, unknown>).custom
      : undefined
    if (typeof custom !== 'string') continue
    if (!custom.startsWith(GREENHOPPER_NAMESPACE) || !COLOR_SUFFIX.test(custom)) continue
    // First id wins per schema: a site can carry two fields of one type after a
    // project import, and the older of the two is the one every epic actually fills.
    if (!bySchema.has(custom)) bySchema.set(custom, id)
  }

  const known = EPIC_COLOR_SCHEMAS.flatMap((schema) => {
    const id = bySchema.get(schema)
    return id ? [id] : []
  })
  const rest = [...bySchema]
    .filter(([schema]) => !EPIC_COLOR_SCHEMAS.includes(schema))
    .map(([, id]) => id)
  return [...known, ...rest]
}

/**
 * The epic a ticket hangs off, out of Jira's `parent` field — or `undefined`.
 *
 * THE HIERARCHY LEVEL IS THE WHOLE TEST, and it is why this is not just "map the
 * parent". `parent` is populated for two different relationships: a story's epic,
 * and a sub-task's story. Both arrive in the same field, in the same shape, and a
 * badge that took either would put a story's title behind an epic label on every
 * sub-task in the sprint. Jira puts epics at level 1 and everything schedulable at
 * level 0, on every site and under every localised issue-type name, so `>= 1` reads
 * the relationship rather than guessing at the noun.
 *
 * `>= 1` and not `=== 1` because Atlassian Premium adds levels above the epic —
 * Initiative at 2, and whatever an admin defines above that. A ticket parented
 * directly to one of those has no epic in between, and naming the initiative is a
 * truer answer than naming nothing.
 *
 * NO COLOUR HERE. It is not in the inline `parent` object — Jira sends the parent's
 * status, priority and issue type and nothing else — so it is filled in afterwards by
 * `applyEpicColors`, off a search this cannot make.
 */
export function readEpic(parent: unknown, siteUrl: string): JiraEpic | undefined {
  if (!parent || typeof parent !== 'object') return undefined
  const { key, fields } = parent as Record<string, unknown>
  if (typeof key !== 'string' || key === '') return undefined

  const parentFields = (fields && typeof fields === 'object' ? fields : {}) as Record<string, unknown>
  const issuetype = parentFields.issuetype
  const level = issuetype && typeof issuetype === 'object'
    ? (issuetype as Record<string, unknown>).hierarchyLevel
    : undefined
  // A parent with NO hierarchy level at all is dropped rather than assumed: the field
  // has been on every Jira Cloud response for years, so its absence means a shape
  // this does not understand — and inventing an epic is worse than showing none.
  if (typeof level !== 'number' || level < 1) return undefined

  const summary = parentFields.summary
  return {
    key,
    title: typeof summary === 'string' && summary !== '' ? summary : key,
    url: browseUrl(siteUrl, key),
  }
}

/**
 * The distinct epics a page of tickets hangs off, in first-seen order.
 *
 * What `buildEpicColorJql` is given, and the reason the colour read is one call
 * rather than fifty: a sprint of fifty tickets routinely has three or four epics
 * behind it, and asking about each ticket's parent separately would ask the same
 * question a dozen times over.
 */
export function epicKeys(issues: JiraTaskIssue[]): string[] {
  const seen = new Set<string>()
  for (const issue of issues) {
    if (issue.epic) seen.add(issue.epic.key)
  }
  return [...seen]
}

/**
 * The one query that colours a card's epics: those keys, that colour field.
 *
 * `key in (...)` rather than a call per epic. Quoted through `quoteJql` like every
 * other value here — an issue key cannot contain a quote, but the function is where
 * that guarantee is enforced rather than assumed.
 *
 * Unordered on purpose: the answer is a lookup table, and asking Jira to sort it
 * would be work spent on a shape nothing iterates in order.
 */
export function buildEpicColorJql(keys: string[]): string {
  return `key in (${keys.map(quoteJql).join(', ')})`
}

/**
 * That query's answer as `epic key → hex`.
 *
 * The FIELDS ARRAY IS IN PREFERENCE ORDER and the first that answers wins, which is
 * what lets a site carrying both colour fields be read without deciding, per site,
 * which one to trust: they agree, and where one is empty the other stands in.
 *
 * An epic whose colour is unset appears in the response and not in this map, so the
 * caller leaves `JiraEpic.color` absent — which is the state the badge draws as no
 * dot.
 */
export function mapEpicColors(raw: unknown[], fieldIds: string[]): Record<string, string> {
  const colors: Record<string, string> = {}
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const { key, fields } = entry as Record<string, unknown>
    if (typeof key !== 'string' || key === '') continue
    const issueFields = (fields && typeof fields === 'object' ? fields : {}) as Record<string, unknown>
    for (const fieldId of fieldIds) {
      const color = readEpicColor(issueFields[fieldId])
      if (color) {
        colors[key] = color
        break
      }
    }
  }
  return colors
}

/**
 * The same tickets with their epics coloured in.
 *
 * A NEW ARRAY, and new objects only where something changed. The rows reach React
 * through a `useMemo` keyed on the snapshot, so mutating the issues in place would
 * colour them without the page having any reason to redraw.
 *
 * A missing colour leaves the epic exactly as it was rather than writing
 * `color: undefined` onto it, for the reason `mapIssue` spreads its optional fields:
 * a key present and undefined is a shape every equality assertion downstream then has
 * to know about.
 */
export function applyEpicColors(issues: JiraTaskIssue[], colors: Record<string, string>): JiraTaskIssue[] {
  return issues.map((issue) => {
    const color = issue.epic && colors[issue.epic.key]
    return color && issue.epic ? { ...issue, epic: { ...issue.epic, color } } : issue
  })
}

/**
 * How Jira Software identifies its own Sprint field, whatever id this site gave it.
 *
 * `schema.custom` is the field's TYPE and is the same string on every Jira site;
 * `id` is per-site (`customfield_10020` here, `customfield_10007` there) and `name`
 * is whatever an admin renamed it to, in whatever language. So the type is what is
 * matched on, and the English name is only the fallback for a site whose field
 * metadata omits the schema.
 */
const SPRINT_FIELD_SCHEMA = 'com.pyxis.greenhopper.jira:gh-sprint'

/**
 * This site's id for the Sprint field, out of `GET /rest/api/3/field`.
 *
 * `''` when the site has no such field — a Jira site with no Jira Software on it —
 * which the caller treats as "no sprint name to show", never as a failed read.
 */
export function findSprintFieldId(fields: unknown[]): string {
  let named = ''
  for (const entry of fields) {
    if (!entry || typeof entry !== 'object') continue
    const { id, name, schema } = entry as Record<string, unknown>
    if (typeof id !== 'string' || id === '') continue
    const custom = schema && typeof schema === 'object'
      ? (schema as Record<string, unknown>).custom
      : undefined
    if (custom === SPRINT_FIELD_SCHEMA) return id
    if (!named && name === 'Sprint') named = id
  }
  return named
}

/**
 * The name of the sprint a ticket is IN — "PER Sprint 12", the words the board is
 * known by.
 *
 * The field is an ARRAY, because a ticket can carry the sprints it spilled out of
 * as well as the one it is in now. The open one is what the card is about, so an
 * `active` sprint wins; with none marked (an older site, or a closed sprint the
 * ticket never left) the LAST entry stands in, which is Jira's own order of
 * newest-last.
 *
 * Two shapes are accepted because two are answered. Modern sites send objects;
 * older ones send the Java `toString` of the sprint — `…Sprint@1a2b[id=5,name=Sprint
 * 3,state=ACTIVE,…]` — and a site answering that is a site whose sprint name would
 * otherwise silently be blank.
 */
export function readSprintName(value: unknown): string {
  if (!Array.isArray(value)) return ''
  const sprints = value.flatMap((entry) => {
    const sprint = readSprint(entry)
    return sprint.name ? [sprint] : []
  })
  if (sprints.length === 0) return ''
  return (sprints.find((sprint) => sprint.active) ?? sprints[sprints.length - 1]).name
}

/** One entry of the sprint field, in whichever of the two shapes it arrived. */
function readSprint(entry: unknown): { name: string; active: boolean } {
  if (typeof entry === 'string') {
    const name = /\bname=([^,\]]*)/.exec(entry)
    const state = /\bstate=([^,\]]*)/.exec(entry)
    return {
      name: (name?.[1] ?? '').trim(),
      active: (state?.[1] ?? '').trim().toLowerCase() === 'active',
    }
  }
  if (!entry || typeof entry !== 'object') return { name: '', active: false }
  const { name, state } = entry as Record<string, unknown>
  return {
    name: typeof name === 'string' ? name.trim() : '',
    active: typeof state === 'string' && state.toLowerCase() === 'active',
  }
}

/**
 * The sprint this card is showing, out of the RAW page the search answered.
 *
 * Read off the tickets rather than asked for separately: the query is
 * `sprint in openSprints()`, so every row already carries the answer and a
 * `/rest/agile` call for it would need a board id we do not have and a scope we do
 * not ask for.
 *
 * The FIRST ticket that names one wins. A card can legitimately hold tickets from
 * two open sprints (a project with two boards running), and the header has room for
 * one name — so it names the sprint the first row is in rather than inventing a
 * summary of both.
 */
export function pickSprintName(issues: unknown[], fieldId: string): string {
  if (!fieldId) return ''
  for (const entry of issues) {
    if (!entry || typeof entry !== 'object') continue
    const { fields } = entry as Record<string, unknown>
    if (!fields || typeof fields !== 'object') continue
    const name = readSprintName((fields as Record<string, unknown>)[fieldId])
    if (name) return name
  }
  return ''
}

/**
 * One Jira issue as the page lists it, or null when it cannot be listed.
 *
 * A MAPPER, not a validator: the only field a row cannot do without is the key —
 * it is the identity, the badge, the link and the value the agent cross-reference
 * joins on. Everything else degrades (a ticket with no summary shows its key, one
 * with no timestamp sinks to the bottom of the card) rather than costing the user
 * a row that really is in their sprint.
 */
export function mapIssue(raw: unknown, siteUrl: string): JiraTaskIssue | null {
  if (!raw || typeof raw !== 'object') return null
  const { key, fields } = raw as Record<string, unknown>
  if (typeof key !== 'string' || key === '') return null

  const issueFields = (fields && typeof fields === 'object' ? fields : {}) as Record<string, unknown>
  const summary = issueFields.summary
  const created = issueFields.created
  const status = readStatus(issueFields.status)
  const reporter = readReporter(issueFields)
  const priority = readPriority(issueFields.priority)
  const epic = readEpic(issueFields.parent, siteUrl)

  return {
    key,
    title: typeof summary === 'string' && summary !== '' ? summary : key,
    url: browseUrl(siteUrl, key),
    createdAt: typeof created === 'string' ? created : '',
    statusName: status.name,
    statusCategory: status.category,
    // Omitted rather than present-and-empty for `reporter`'s reason: a ticket whose
    // project has no priority field must not carry one that renders.
    ...(priority ? { priority } : {}),
    // Colourless at this point, always: the hex is not in the inline `parent` object
    // and is patched on afterwards by `applyEpicColors`. Omitted on the same terms as
    // the two fields around it when the ticket hangs off no epic at all.
    ...(epic ? { epic } : {}),
    // Omitted rather than `''` when Jira names nobody: the field is optional in the
    // type, and an empty string would be a person whose name is blank.
    ...(reporter ? { reporter } : {}),
    labels: readLabels(issueFields.labels),
  }
}

/**
 * The sprint's tickets, minus the ones that are finished.
 *
 * `done` is dropped HERE rather than in the query, because the query has to come
 * back empty for a project with no active sprint and only for that (see
 * `buildSprintJql`). Dropping it here also keeps the two facts the caller needs
 * apart: `raw.length === 0` is "no active sprint", `result.length === 0` is "this
 * sprint has nothing left to do".
 *
 * In Progress is KEPT at this layer even though most of it will not be shown. Only
 * the renderer knows which tickets have an agent on them — the roster is cloud and
 * store state that never reaches the main process — so the filter that AC2 asks
 * for lives there, and this side must not pre-empt it.
 */
export function mapSprintIssues(raw: unknown[], siteUrl: string): JiraTaskIssue[] {
  return raw.flatMap((entry) => {
    const issue = mapIssue(entry, siteUrl)
    return issue && issue.statusCategory !== 'done' ? [issue] : []
  })
}

/**
 * A failed Atlassian call as one of the nine named failures the card renders.
 *
 * Takes the ERROR and not a bare status on purpose: `AtlassianApiError` is also
 * what a transport failure and an unreadable body arrive as (status 0 and the
 * original status respectively), so a status-only signature would have nowhere to
 * put either. The message is the error's own — an operation name and a status code,
 * never a response body — and it is for the log, not the screen.
 *
 * `not-connected` and `no-active-sprint` are NOT produced here: neither is a failed
 * call. The first is decided before any request is made, the second by an empty
 * successful answer. Both belong to the caller.
 *
 * The unmapped default is `server-error` rather than something more precise. It is
 * where a 200 with an unreadable body lands — Atlassian's SSO interstitial answers
 * exactly that — and "the site answered something we could not read" is the honest
 * reading of it.
 */
export function classify(error: AtlassianApiError): JiraTaskStatusError {
  return { error: codeFor(error.status), message: error.message }
}

/** A lookup rather than six comparisons, for `CATEGORIES`' reason. */
const CODES: Record<number, JiraTaskStatusError['error']> = {
  // 0 is `send()`'s normalisation of a transport failure — DNS, a refused
  // connection, a machine with no network at all.
  0: 'offline',
  400: 'invalid-query',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  429: 'rate-limited',
}

function codeFor(status: number): JiraTaskStatusError['error'] {
  return CODES[status] ?? 'server-error'
}

/**
 * The same, for anything that reaches the read that is not an `AtlassianApiError`.
 *
 * A bug on our side, in other words — and one that must still land in a card rather
 * than reject a `Promise.all` into a blank page. Its message is deliberately the
 * thrown value's, because only our own code can produce this.
 */
export function classifyUnexpected(error: unknown): JiraTaskStatusError {
  if (error instanceof AtlassianApiError) return classify(error)
  return { error: 'server-error', message: error instanceof Error ? error.message : String(error) }
}
