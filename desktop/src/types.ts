export type TerminalState = 'idle' | 'working' | 'waiting' | 'completed' | 'error'

export type AggregatedReviewStatus = 'approved' | 'changes-requested' | 'commented' | 'pending'

/** Lifecycle state of the PR itself, independent of its review status. */
export type PRState = 'open' | 'draft' | 'merged' | 'closed'

/**
 * Why the watcher could not read a PR. Returned instead of throwing into the void,
 * so the card can name the failure and its fix rather than staying mute.
 *
 * `no-token` is now reachable where it never was: GraphQL has no anonymous access,
 * whereas the old REST path silently degraded to unauthenticated requests.
 */
export type PRWatchError = 'no-token' | 'not-found' | 'forbidden' | 'rate-limited' | 'network'

export interface PRChecksSummary {
  total: number
  passed: number
  failed: number
  running: number
  skipped: number
}

export interface PRCommentCounts {
  /** Comments attached to a diff line, via review threads. */
  inline: number
  /** The PR conversation — where Greptile and Claude Code post most of the time. */
  conversation: number
  /** Non-empty bodies of the reviews themselves. */
  reviewSummaries: number
}

/**
 * One comment on a pull request, as the card lists it behind the comments fold.
 *
 * Deliberately NOT part of `PRStatusSnapshot`, and never written to
 * `RepositoryMetadata`: that object is copied into the `agents` jsonb on every poll,
 * and comment bodies are one or two orders of magnitude larger than the counts it
 * carries today — the same reasoning that already keeps check URLs out of it (see
 * the note above `checkList` in the watcher). These are fetched on demand when
 * somebody opens the fold, held in renderer memory, and dropped with the card.
 */
export interface PRComment {
  /** GraphQL node id — stable, and the React key. */
  id: string
  /** Which of the three buckets it came from; the card labels and groups by this. */
  kind: 'inline' | 'conversation' | 'review'
  author: string
  /**
   * PLAIN TEXT (`bodyText`), never the markdown source. A sidebar card clamps to a
   * few lines, and Greptile/Claude Code bodies are mostly headings, code fences and
   * tables — rendering them raw is noise, and rendering them properly is a markdown
   * pipeline this card has no business carrying.
   */
  body: string
  /** ISO-8601 as GitHub returns it; the card turns it into "2 h ago". */
  createdAt: string
  /** Permalink to the comment itself, not to the PR. */
  url: string
  /** Inline only: where in the diff the thread hangs. */
  path?: string
  line?: number
  /** Inline only: the thread is settled, so the card can step it back. */
  resolved?: boolean
  /** Reviews only: the verdict the body was submitted with. */
  reviewState?: string
}

/**
 * Every field is optional and every reader must tolerate its absence: this object is
 * persisted inside the `agents.metadata` jsonb and spread back verbatim, so rows
 * written by older versions carry none of the fields below `prClosed`.
 */
export interface RepositoryMetadata {
  prUrl?: string
  prReviewStatus?: AggregatedReviewStatus
  /** Kept for backward compatibility — sum of the three PRCommentCounts buckets. */
  prReviewCommentCount?: number
  prReviewers?: string[]
  prReviewUpdatedAt?: number
  prMerged?: boolean
  prClosed?: boolean
  prState?: PRState
  prChecks?: PRChecksSummary
  /**
   * Every check on the head commit — name and state, no run URLs — sorted
   * worst-first and capped, so the card can list them rather than only count them.
   * `prChecks.total` stays the authority on how many there really are.
   */
  prCheckList?: PRCheck[]
  /** Legacy: running names only, capped at 5. Superseded by `prCheckList`. */
  prRunningChecks?: string[]
  /** Legacy: failing names only, capped at 5. Superseded by `prCheckList`. */
  prFailedChecks?: string[]
  prCommentCounts?: PRCommentCounts
  /** Deduped logins, capped at 8. */
  prCommentAuthors?: string[]
  /** Absent while GitHub still reports UNKNOWN — render "unknown", never "conflicts". */
  prMergeable?: boolean
  prWatchError?: PRWatchError
  prLastCheckedAt?: number
}

/** One CI check or commit status attached to the PR head commit. */
export interface PRCheck {
  name: string
  state: 'running' | 'passed' | 'failed' | 'skipped'
  url?: string
}

export interface AggregatedPRStatus {
  status: AggregatedReviewStatus
  commentCount: number
  reviewers: string[]
  merged: boolean
  closed: boolean
  updatedAt: number
}

export interface PRStatusSnapshot extends AggregatedPRStatus {
  /** Remaining GraphQL budget (points/hour), NOT the REST header pool. */
  rateLimitRemaining: number
  /** `draft` is one of the states here, not a separate flag. */
  state: PRState
  /** `undefined` while GitHub computes it asynchronously (UNKNOWN). */
  mergeable?: boolean
  checks: PRCheck[]
  checksSummary: PRChecksSummary
  commentCounts: PRCommentCounts
  commentAuthors: string[]
  headSha: string
  /** Rollup state, part of the cache key: a check flipping green need not move updatedAt. */
  rollupState?: string
}

export interface PRStatusError {
  error: PRWatchError
  message: string
  /** Epoch ms before which the caller should not retry (Retry-After / X-RateLimit-Reset). */
  retryAtMs?: number
}

/**
 * Generic in the success arm, so the same guard serves every GitHub read that can
 * come back as a named failure — the status snapshot, and the on-demand comment
 * list. `'error' in result` is false for an array, so widening it costs nothing.
 */
export function isPRStatusError<T extends object>(
  result: T | PRStatusError
): result is PRStatusError {
  return 'error' in result
}

/**
 * One OPEN GitHub issue, as the Tasks page lists it.
 *
 * Deliberately thin: the page shows a row, not a ticket. Every field kept here
 * crosses IPC for all fifty issues of every repository on every reload, so what
 * only the DETAIL panel needs — the body, the state, the assignees, the comment
 * count — is not here: it is read one issue at a time by `tasks:getIssueDetail`
 * into a `TaskIssueDetail`, when someone actually opens that issue.
 */
export interface TaskIssue {
  number: number
  title: string
  url: string
  /** When the issue was OPENED, ISO-8601 as GitHub returns it; the rows are sorted on it, newest first. */
  createdAt: string
  /** The login that opened the issue. Absent when GitHub reports no author (deleted account). */
  author?: string
  /** Label names only, in GitHub's own order. Capped by the query at 5. */
  labels: string[]
  /**
   * The issue this one is a sub-issue of, when GitHub reports one. Absent for a
   * top-level issue.
   *
   * `url` is what makes the parent reachable rather than merely named, and it is
   * optional for the reason the mapper gives: a parent GitHub reports without one
   * is still a parent worth showing, just not one worth clicking.
   */
  parent?: { number: number; title: string; url?: string }
  /** Set only when this issue HAS sub-issues; `total` is never 0 here. */
  subIssues?: { total: number; completed: number }
}

/**
 * The rest of ONE issue, read on demand when the detail panel opens on it.
 *
 * Split from `TaskIssue` rather than folded into it because the two reads have
 * opposite lifetimes — the same trade-off `PR_COMMENTS_QUERY` makes next door.
 * The list is read for every GitHub-tracked repository on every page open, fifty
 * issues at a time; this is read once, for the single issue on screen. A body of
 * a few kilobytes is nothing on its own and is hundreds of kilobytes per reload
 * when it rides along with the list.
 *
 * Carries no `number`, `title` or `url`: the panel already holds the `TaskIssue`
 * it was opened on, and a second copy of those fields could only disagree with it.
 */
export interface TaskIssueDetail {
  /** The issue body, GitHub-flavoured markdown. `''` when the issue has none. */
  body: string
  /**
   * Asked for even though `OPEN_ISSUES_QUERY` filters on `states: OPEN`: this read
   * happens later, by number, and an issue closed in the meantime must not go on
   * calling itself open in the panel that just fetched it.
   */
  state: 'OPEN' | 'CLOSED'
  /**
   * Assignee logins only — no avatars. The renderer's CSP is `default-src 'self'`
   * with no `img-src`, so a remote avatar could only be fetched and blocked.
   */
  assignees: string[]
  /**
   * How many comments the issue HAS — `totalCount`, never `comments.length`.
   *
   * The two differ exactly when the thread outran the page `ISSUE_DETAIL_QUERY`
   * asks for, which is what lets the panel say "47 comments" in the byline and
   * "showing the last 50" over the thread rather than presenting a page as the
   * whole conversation. Jira's half says the same thing through the inverse
   * arrangement — see `JiraTaskIssueDetail.commentTotal`, which is absent when
   * nothing was cut.
   */
  commentCount: number
  /**
   * The issue's comments, oldest first.
   *
   * They ride along in the detail read (see `ISSUE_DETAIL_QUERY`) for the reason
   * Jira's do: the panel already makes that request, and the bodies cost one field
   * on a query made once per opened issue rather than a second round trip. This
   * used to be a count alone, and the panel sent the reader to github.com to read
   * a conversation the app was already one field away from having.
   *
   * The TAIL of the thread when it is longer than the page: a discussion is read
   * for where it got to, and the first fifty comments of a hundred-comment issue
   * are the half that is no longer being talked about.
   */
  comments: TicketComment[]
}

/**
 * Jira's own three-way grouping of statuses, and the ONLY status value this app
 * branches on.
 *
 * Every Atlassian site renames its statuses — "To Do" is "Backlog" here, "À faire"
 * there, "Ready" somewhere else — but the CATEGORY behind them is fixed by Jira and
 * cannot be renamed. `new` is the To Do column, `indeterminate` is everything in
 * flight, `done` is finished. Reading the status NAME to decide anything would work
 * on our own site and quietly show the wrong column on everybody else's.
 *
 * The name is still carried alongside (see `JiraTaskIssue.statusName`) — for
 * DISPLAY, because the word the reader knows their board by is the site's, not ours.
 */
export type JiraStatusCategory = 'new' | 'indeterminate' | 'done'

/**
 * Where a ticket sits on Jira's priority scale, and the ONLY priority value this
 * app branches on.
 *
 * `JiraStatusCategory`'s arrangement, for the same reason: a site renames its
 * priorities ("Blocker", "P1", "Urgent", "Élevée") and can define its own, so the
 * word cannot be branched on — but the ORDER is a scale, and a five-step scale is
 * what a colour and an arrow can be read off.
 *
 * `unknown` is the honest answer for a priority this app cannot place: a custom
 * scheme, a site in a language the reader below does not know. It renders in the
 * neutral tier WITH ITS NAME, which is strictly more than the nothing the field
 * showed before — never as "Medium", which would be a guess presented as a fact.
 */
export type JiraPriorityLevel = 'highest' | 'high' | 'medium' | 'low' | 'lowest' | 'unknown'

/**
 * A ticket's priority, as both surfaces that show it need it.
 *
 * The pair `JiraTaskIssue.statusName` / `statusCategory` already is, in one object
 * because — unlike the status — the whole thing is optional: a project can have the
 * priority field switched off, and half a priority (a level with no name, a name
 * with no level) is not a state any renderer here should have to think about.
 *
 * No `iconUrl`, though Jira sends one on every priority. The renderer's CSP is
 * `img-src 'self' data:`, so Atlassian's own icon could only be fetched and blocked
 * — which is why the arrow beside the name is drawn locally from `level`.
 */
export interface JiraPriority {
  /** The priority name as THIS site spells it. Display only — never branched on. */
  name: string
  /** What the badge colours and points on. See `JiraPriorityLevel`. */
  level: JiraPriorityLevel
}

/**
 * The epic a Jira ticket hangs off, as both surfaces that show it need it.
 *
 * `JiraPriority`'s arrangement — the whole thing is optional, because a ticket
 * legitimately belongs to no epic and half an epic (a colour with no title) is not
 * a state any renderer here should have to think about.
 *
 * WHAT COUNTS AS ONE. Jira's `parent` field is not "the epic": on a sub-task it is
 * the story above it, which is a different fact and would put a story's title in a
 * badge that says epic. `readEpic` therefore keeps a parent only at hierarchy level
 * 1 or above, which is where Jira puts epics on every site regardless of what its
 * issue types are called.
 *
 * NO STATUS AND NO PRIORITY, though `parent` carries both. The badge names the epic
 * and nothing else — a second status pill beside the ticket's own would be two
 * statuses on one row with nothing saying which belongs to what.
 */
export interface JiraEpic {
  /** The epic's own issue key — `PROJ-42`. The identity, and what the epic filter groups on. */
  key: string
  /** The epic's summary, as the badge prints it. Falls back to the key when Jira sends none. */
  title: string
  /**
   * `https://acme.atlassian.net/browse/PROJ-42`, or `''` when no site could be
   * resolved — `JiraTaskIssue.url`'s rule, on the epic instead of the ticket.
   */
  url: string
  /**
   * The epic's colour as a hex string, when this site records one.
   *
   * A HEX and not Jira's own token, because the token is unrenderable on its own:
   * a site answers either a name (`green`) or a legacy swatch id (`ghx-label-6`)
   * depending on which colour field it has, and the renderer would have to learn
   * both. `sprint-issues.ts` resolves both into one hex, so the badge draws a dot
   * exactly as the repository dot beside it does.
   *
   * ABSENT rather than a default when the site records none — an epic whose colour
   * was never set, or a project with no colour field at all. The badge then draws
   * no dot rather than an invented colour, which is the same rule `priority`
   * follows one field along.
   */
  color?: string
}

/**
 * One ticket of a Jira project's ACTIVE SPRINT, as the Tasks page lists it.
 *
 * The Jira counterpart of `TaskIssue`, and deliberately NOT the same interface: a
 * Jira ticket has no number (its identity is the key, `PROJ-123`), no labels the
 * page shows, and no sub-issue hierarchy — while it has a status, which a GitHub
 * issue on this page never does because the list only ever holds open ones.
 *
 * Thin for the same reason `TaskIssue` is: this crosses IPC for every ticket of
 * every Jira-tracked repository on every reload. No description, no assignee, no
 * story points, no avatar.
 */
export interface JiraTaskIssue {
  /**
   * The issue key — `PROJ-123`. The identity, where a GitHub issue has a number,
   * and also the value `/magic:start` writes into `agents.ticket_id`, which is what
   * lets the page tell that an agent is already on this ticket.
   */
  key: string
  title: string
  /** `https://acme.atlassian.net/browse/PROJ-123`, or `''` when no site could be resolved. */
  url: string
  /** When the ticket was CREATED, ISO-8601 as Jira returns it; the rows are sorted on it. */
  createdAt: string
  /** The status name as THIS site spells it. Display only — never branched on. */
  statusName: string
  /** What the page actually decides on. See `JiraStatusCategory`. */
  statusCategory: JiraStatusCategory
  /**
   * Who the ticket is reported by — the row's counterpart to `TaskIssue.author`.
   *
   * Jira's `reporter` with its `creator` as the fallback, resolved in the main
   * process (see `readReporter` in `main/jira/sprint-issues.ts`). The two are
   * different fields: `creator` is who pressed the button and cannot be changed,
   * `reporter` is who the ticket is FOR and is what every Jira surface shows. A
   * ticket filed on somebody's behalf names them in `reporter` and the filer in
   * `creator`, so preferring `reporter` puts the same name on the row that the
   * reader sees in Jira itself.
   *
   * A DISPLAY NAME, never an avatar: the renderer's CSP is `img-src 'self' data:`,
   * so an `avatarUrls` entry could only be fetched and blocked. Absent when Jira
   * reports neither person — an anonymous or bot-created ticket, or a site whose
   * privacy settings withhold both.
   */
  reporter?: string
  /**
   * How urgent the ticket is, when the project records it at all.
   *
   * ABSENT rather than a default when Jira sends none: the priority field can be
   * removed from a project's screens entirely, and a row that then showed "Medium"
   * would be inventing a fact about a ticket that has none. The GitHub half of this
   * page has no counterpart — an issue has labels and nothing else — which is why
   * this is the one field on the row with no twin next door.
   */
  priority?: JiraPriority
  /**
   * The epic this ticket belongs to, when it belongs to one.
   *
   * On the ROW rather than only on the detail page, because it answers the question
   * a sprint list is actually scanned with — which piece of work is this part of —
   * and because the page's epic filter is built from it (see `taskFilterEpics`).
   * Absent for a ticket with no parent, one whose parent is a story rather than an
   * epic, and one read before this field was asked for; see `JiraEpic`.
   */
  epic?: JiraEpic
  /**
   * Label names, in Jira's own order. Empty when the ticket has none.
   *
   * `TaskIssue.labels`' twin, and shown by the same `StatusPill` on the row, so a
   * mixed page reads as one list rather than two conventions. Uncapped where the
   * GitHub query caps at 5: Jira returns the whole array in the field it was already
   * asked for, so there is no page budget to spend by keeping them all.
   */
  labels: string[]
}

/**
 * One comment on a ticket, as the detail page renders it — from EITHER tracker.
 *
 * One interface and not two, unlike every other pair on this page. `JiraTaskIssue`
 * and `TaskIssue` are deliberately separate because a Jira ticket and a GitHub issue
 * disagree about what a ticket IS — a key against a number, a status against a set
 * of labels. A comment is the one thing the two trackers genuinely model alike:
 * somebody, at a time, wrote some markdown, and possibly edited it since. Splitting
 * it would buy two identical shapes and force `CommentCard` to take a union it would
 * then have to narrow for no reason.
 *
 * Both are read WITH the ticket rather than by a call of their own — `fields=comment`
 * on Jira's one-ticket read, `comments(last:)` on `ISSUE_DETAIL_QUERY` — so the panel
 * costs one round trip per tracker instead of two. Neither read is made until somebody
 * opens a ticket; see `TaskIssueDetail` and `JiraTaskIssueDetail` for why.
 *
 * No avatars, for `JiraTaskIssue.reporter`'s reason: the CSP would block them.
 */
export interface TicketComment {
  /** The tracker's own comment id — Jira's string, GitHub's node id. The React key, and nothing else. */
  id: string
  /**
   * Who wrote it: a display name on Jira, a bare login on GitHub.
   *
   * `''` when the tracker reports nobody, and the panel then omits the byline. Both
   * have that case and they are different cases — an app posting through Jira's API,
   * a GitHub account since deleted — but neither has a name to print, which is the
   * only thing this field is for.
   *
   * NOT prefixed with `@` on the GitHub side, though the issue's own byline is. The
   * prefix is added where it is rendered, so this stays the login itself.
   */
  author: string
  /** When it was posted, ISO-8601 as the tracker returns it. `''` when absent. */
  createdAt: string
  /**
   * When it was last edited, when that differs from `createdAt`. Absent otherwise.
   *
   * A comment somebody rewrote after the fact is a different thing from the one
   * that was posted, and the panel marks it — silently showing the new text under
   * the original timestamp is the one reading that is actually wrong.
   */
  updatedAt?: string
  /**
   * The comment body as markdown. `''` for an empty comment.
   *
   * Already markdown on GitHub, which authors in it; converted from Atlassian
   * Document Format by the same `adfToMarkdown` the description goes through on
   * Jira. Either way the panel renders it with one `MarkdownView`.
   */
  body: string
}

/**
 * The rest of ONE Jira ticket, read on demand when the detail panel opens on it.
 *
 * The Jira counterpart of `TaskIssueDetail`, and split from `JiraTaskIssue` for
 * exactly its reason: the list is read for every Jira-tracked repository on every
 * page open, fifty tickets at a time, while this is read once for the single ticket
 * on screen. A description is a few kilobytes on its own and hundreds of kilobytes
 * per reload if it rides along with the sprint.
 *
 * Carries no `key`, `title` or `url`: the panel already holds the `JiraTaskIssue`
 * it was opened on, and a second copy of those fields could only disagree with it.
 * The URL in particular is built in the main process from the resolved site (see
 * `browseUrl` in `main/jira/sprint-issues.ts`) and there is nothing better to
 * rebuild it from here.
 *
 * The STATUS is here even though the row already carries one, for
 * `TaskIssueDetail.state`'s reason: this read happens later, by key, and a ticket
 * somebody transitioned in the meantime must not go on showing the word the list
 * captured. The panel prefers these two over the row's.
 *
 * No issue type and no story points: neither is on this story's field list, and
 * every field named here is one more the read pays for.
 */
export interface JiraTaskIssueDetail {
  /**
   * The description, converted from Atlassian Document Format to markdown by
   * `main/jira/issue-detail.ts`. `''` when the ticket has none.
   *
   * Markdown rather than ADF because the panel renders it with the same
   * `MarkdownView` the GitHub body goes through — one renderer, one set of styles,
   * and no HTML (the renderer's markdown pipeline has no `rehype-raw`).
   */
  description: string
  /** The assignee's display name. Absent when the ticket is unassigned. */
  assignee?: string
  /** The reporter's display name. Absent when Jira reports none. */
  reporter?: string
  /** Label names, in Jira's own order. Empty when the ticket has none. */
  labels: string[]
  /** The status name as THIS site spells it, as of the detail read. Display only. */
  statusName: string
  /** What the panel's pill colours on, as of the detail read. See `JiraStatusCategory`. */
  statusCategory: JiraStatusCategory
  /**
   * The ticket's priority as of the detail read, or absent when it has none.
   *
   * Re-read with the status and for its reason: a ticket opened minutes after the
   * list was drawn may have been re-prioritised since, and the panel must not go on
   * showing the value the row captured.
   */
  priority?: JiraPriority
  /**
   * The ticket's comments, oldest first — the order a conversation is read in, and
   * the order Jira returns them in.
   *
   * The GitHub half of this page carries a COUNT and sends the reader to github.com
   * to read them (`TaskIssueDetail.commentCount`). Jira's differ in what they cost:
   * the bodies arrive in the response the panel already makes, so not rendering them
   * would be throwing away content already paid for.
   */
  comments: TicketComment[]
  /**
   * How many comments the ticket HAS, when Jira said so and it is more than arrived.
   *
   * `fields=comment` returns a page whose size Jira picks, so `comments.length` is
   * what the panel can show and not what the ticket holds. Absent when the two agree
   * — which is the common case, and the case where a "showing N of M" line would be
   * noise.
   */
  commentTotal?: number
}

/**
 * Why one repository's Jira sprint could not be listed.
 *
 * The Jira twin of `PRWatchError`, and a separate union rather than a widening of
 * it: two of these have no GitHub equivalent at all, and the fix sentences differ
 * for every member they nominally share ("run `gh auth login`" is not advice about
 * an Atlassian account).
 *
 *  • `not-connected`  — no Atlassian account on this machine, or its credential was
 *    refused and is awaiting a reconnect. Said per group, with the route to Settings.
 *  • `no-active-sprint` — the project answered, and has no sprint in progress. NOT a
 *    failure of ours, and deliberately distinct from "the sprint has nothing to do".
 *  • `invalid-query` — HTTP 400. The likeliest Jira failure here and the one with no
 *    GitHub counterpart: a project key that does not exist, or a project with no Jira
 *    Software in it, where the `sprint` field the query names is not a field at all.
 *  • `offline` — the transport never reached Atlassian (status 0).
 */
export type JiraTaskError =
  | 'not-connected'
  | 'no-active-sprint'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'rate-limited'
  | 'offline'
  | 'server-error'
  | 'invalid-query'

/**
 * A named Jira failure, in `PRStatusError`'s shape so the two halves of the page
 * report trouble the same way.
 *
 * `message` is for the LOG, never for the screen: it is authored in the main
 * process, which cannot know the user's language, and it never carries a response
 * body (see `main/jira/atlassian-api.ts`). The sentences the reader sees are picked
 * from the catalogues by the error CODE.
 */
export interface JiraTaskStatusError {
  error: JiraTaskError
  message: string
}

/**
 * `isPRStatusError` for the Jira reads — the same test, a different named failure.
 *
 * A sibling rather than a widening of that guard: it narrows to `PRStatusError`,
 * whose `error` is a `PRWatchError`, and a caller handed a `JiraTaskStatusError`
 * would be told it holds a GitHub failure code it can never hold. The two unions
 * share no member names beyond three, and the sentences differ for all of them.
 */
export function isJiraStatusError<T extends object>(
  result: T | JiraTaskStatusError
): result is JiraTaskStatusError {
  return 'error' in result
}

/** The fields every group carries, whichever tracker it was read from. */
interface TaskRepoGroupBase {
  /** The key in `Config.repositories` — the identity the renderer's colour map uses. */
  configKey: string
  /** What the card is titled: the repository's name. */
  name: string
  /**
   * WHERE these tickets were read from, as a comparable string — `github:owner/repo`
   * or `jira:site|PROJECT`.
   *
   * Two repositories can be pointed at ONE tracker target: two folders of the same
   * GitHub repo, or two services planned in a single Jira project. Their groups then
   * hold the same tickets, and the page used to draw the same backlog twice under
   * two names. This is what lets the renderer recognise that and merge them into one
   * card — see `buildTaskRows`.
   *
   * Built HERE and not in the renderer, because only this side knows the coordinates
   * the read actually used: a repository that declares no Jira site falls back to the
   * connected account's, which never crosses the bridge. Normalised (lower-cased,
   * trailing slash off, project key upper-cased) so that two spellings of one target
   * produce one string.
   */
  sourceKey: string
}

/**
 * The open issues of ONE GitHub-tracked repository, plus what went wrong if they
 * could not be read.
 */
export interface GitHubTaskRepoGroup extends TaskRepoGroupBase {
  tracker: 'github'
  issues: TaskIssue[]
  /**
   * How many issues are open in total, when the read said so.
   *
   * The query asks for a capped page (`first: 50`), so `issues.length` is what the
   * card can SHOW, not what the repository has. Absent on a group that failed, and
   * on one built before the count was read.
   */
  totalOpen?: number
  error?: PRStatusError
}

/**
 * The active sprint of ONE Jira-tracked repository's project.
 *
 * No `totalOpen`, and that is Jira's doing rather than an omission: `/rest/api/3/
 * search/jql` is paginated by TOKEN and returns no `total` at all, so "50 of 214" is
 * a sentence this side cannot say. `truncated` is what it can say instead — there is
 * another page — and the card words it accordingly.
 */
export interface JiraTaskRepoGroup extends TaskRepoGroupBase {
  tracker: 'jira'
  issues: JiraTaskIssue[]
  /**
   * What the open sprint is CALLED — "PER Sprint 12" — when it could be read.
   *
   * The card's title is the repository, which on the Jira half is only half the
   * answer: the rows under it are one sprint's, and which one was nowhere on the
   * page. Read off the tickets themselves (see `pickSprintName`), so it costs no
   * call of its own.
   *
   * Absent whenever the answer is not known rather than guessed at: a site with no
   * Jira Software on it, a field lookup that failed, an empty sprint. The header
   * simply says less in that case.
   */
  sprintName?: string
  /** Set when Jira offered a further page and the read stopped at the cap. */
  truncated?: boolean
  error?: JiraTaskStatusError
}

/**
 * One repository's card on the Tasks page, from whichever tracker owns its tickets.
 *
 * A UNION discriminated on `tracker`, not one interface with two optional halves:
 * the two sources carry different issues and different failures, and a single shape
 * would let a Jira group be handed a `no-token` error, or a GitHub row be asked for
 * its status category. Every consumer branches on `tracker` once and is then talking
 * about one tracker only.
 *
 * `error` is per group on purpose: a repository whose read fails is reported as
 * failed in its own card while every other repository still renders. A global
 * rejection would blank the page over one bad token scope.
 *
 * No `color` field. The dot's colour is derived in the renderer from the FULL
 * repository list (see renderer/utils/taskRows.ts), so a repo's colour cannot
 * change because another repo's tracker did — a value computed here would depend
 * on the GitHub-tracked subset and drift.
 */
export type TaskRepoGroup = GitHubTaskRepoGroup | JiraTaskRepoGroup

/**
 * Everything the Tasks page draws from one read.
 *
 * `connected` is PER SOURCE, and that is the whole reason it is not the single
 * boolean it used to be: the page short-circuited on the GitHub token, so a user
 * whose repositories are all tracked in Jira and who has never installed `gh` was
 * shown a "GitHub is not connected" wall in place of their sprint. A connection
 * state belongs to the source it is about, and the page consults each one only when
 * a repository actually depends on it.
 *
 * Either flag being false is not "no tickets": it is the state where the source
 * cannot be read at all, and the page must say so and offer the fix rather than
 * render an empty backlog.
 */
export interface TasksSnapshot {
  connected: {
    /** `gh` is installed and logged in. */
    github: boolean
    /** An Atlassian credential is stored on this machine and has not been refused. */
    jira: boolean
  }
  groups: TaskRepoGroup[]
}

export interface TerminalUsage {
  costUsd?: number           // cost.total_cost_usd
  contextPercent?: number    // context_window.used_percentage (0-100)
  contextTokens?: number     // tokens currently occupying the context window
  contextWindowSize?: number // context_window.context_window_size
  model?: string             // model.display_name
  modelId?: string           // model.id
  durationMs?: number        // cost.total_duration_ms
  linesAdded?: number        // cost.total_lines_added
  linesRemoved?: number      // cost.total_lines_removed
  // Plan rate limits — only present for Claude.ai Pro/Max subscribers, after the
  // first API response in the session. Absent for API/Console users.
  fiveHourPercent?: number   // rate_limits.five_hour.used_percentage (0-100)
  fiveHourResetsAt?: number  // rate_limits.five_hour.resets_at (unix epoch seconds)
  sevenDayPercent?: number   // rate_limits.seven_day.used_percentage (0-100)
  sevenDayResetsAt?: number  // rate_limits.seven_day.resets_at (unix epoch seconds)
  updatedAt?: number         // timestamp of last statusline report
}

// Signed-in Claude account (from ~/.claude.json oauthAccount).
export interface ClaudeAccount {
  displayName?: string
  emailAddress?: string
  organizationName?: string
  seatTier?: string       // e.g. 'team_standard'
  billingType?: string    // e.g. 'stripe_subscription'
}

// One spend/usage bucket. costUsd is an API-equivalent ESTIMATE, not billed spend.
export interface SpendBucket {
  tokens: number
  costUsd: number
}

export interface SpendSummary {
  today: SpendBucket
  week: SpendBucket
  allTime: SpendBucket
  hasData: boolean
}

export interface TerminalMetadata {
  title?: string
  branchName?: string
  ticketId?: string
  description?: string
  /**
   * The workflow status the skills report as they go.
   *
   * Every member MUST have an entry in `statusToAction` (terminal-handlers.ts), and
   * every status a SKILL.md sends MUST be a member here. `CI green` was neither for
   * months: magic-pr sent it, it landed in agents.status as an off-enum value, and it
   * produced no activity event at all — so "the CI went green" was a thing the product
   * knew and never recorded. A test now locks both directions of that contract.
   *
   * `planning` / `planned` are the planning phase that PRECEDES any code: an idea
   * being turned into a spec, then a spec ready to become a ticket. They are declared
   * here BEFORE anything sends them, on purpose — the union is closed, so the contract
   * has to exist before a skill can honour it.
   */
  status?: '' | 'planning' | 'planned' | 'in progress' | 'committed' | 'ready for PR' | 'PR created' | 'CI green' | 'in review' | 'changes requested' | 'Review addressed' | 'PR merged'
  baseBranch?: string
  /**
   * Path to the spec file the planning phase writes. ABSOLUTE: an agent can hold
   * several repositories, so the renderer has no single root to resolve a relative
   * path against and must never try. May arrive BEFORE the file exists — the writer
   * announces where the spec will be, and nothing here checks the filesystem.
   */
  specPath?: string
  /**
   * Absent on agents created before the type existed, and on any agent whose skill
   * has not announced one yet. Readers must treat absent as `coder`: that is what
   * every agent was before planning existed, and it is the default for a new one.
   */
  type?: AgentType
  fullStackTaskId?: string
  relatedWorktrees?: string[]
  repositoryMetadata?: Record<string, RepositoryMetadata>
  usage?: TerminalUsage
}

export interface TerminalInfo {
  id: string
  name: string
  state: TerminalState
  repositories: string[]  // List of attached repository paths
  branchName?: string
  createdAt?: Date
  tsCreate?: number
  metadata?: TerminalMetadata
}

/**
 * Allowed values for the enum settings of the `plan` block.
 *
 * Exported as single source of truth: `updateRepositoryPlanSettings` validates
 * against these, and both settings forms build their dropdowns from them, so a
 * value can never be offered by a form and rejected by the write path.
 */
export const PLAN_TRACKERS = ['jira', 'github', 'ask'] as const
export const PLAN_SPLITTING_MODES = ['conservative', 'balanced', 'eager'] as const
export const PLAN_ACCEPTANCE_CRITERIA_FORMATS = ['checklist', 'gherkin', 'none'] as const

/**
 * A settings field as the renderer sends it: its own value, or 'default'/null to
 * clear the key and fall back to the documented default.
 */
export type SettingsField<T> = T | 'default' | null

/** An option block as the renderer sends it: every field a SettingsField. */
export type SettingsInput<T> = {
  [K in keyof T]?: SettingsField<T[K]>
}

/**
 * The shape the renderer sends to write the `plan` block.
 *
 * Lives here rather than beside the writer because all three processes need it —
 * main validates against it, preload types the bridge, the renderer types the hook.
 *
 * Derived from the block itself so the two cannot drift, with `issueTypes` lifted
 * out of the mapping: it is the first two-level nesting inside an option block,
 * and the levels reset independently — `issueTypes: { epic: null }` must clear
 * `epic` and LEAVE `story` alone, where a whole-object assignment would take both.
 */
type PlanBlock = NonNullable<RepositoryConfig['plan']>
export type PlanSettingsInput = Omit<SettingsInput<PlanBlock>, 'issueTypes'> & {
  issueTypes?: SettingsInput<NonNullable<PlanBlock['issueTypes']>>
}

export interface RepositoryConfig {
  // Cloud identity. `id` is the repositories table PK (client-generated on add).
  // `orgId` null/absent = personal repo; set = shared to that org (team repo).
  // `needsLocalPath` = true when this user has no local path bound on this
  // machine yet (the repo shows in a warning state and can't launch agents).
  id?: string
  /**
   * The repository's real name in the cloud. Normally identical to its key in
   * Config.repositories — but names are only unique per scope, so when two of
   * the user's organizations both have an `api`, the second one's KEY carries an
   * org suffix (`api (Acme)`) while this stays `api`. Anything writing back to
   * the repositories table must use this, never the key.
   */
  name?: string
  orgId?: string | null
  ownerId?: string | null
  needsLocalPath?: boolean
  /**
   * Normalised clone address of the repository (`https://github.com/owner/repo`),
   * derived from `git remote get-url origin` when a local path is bound.
   *
   * SHARED, unlike `path`: it is identity, not a machine detail, and it is what
   * lets a teammate who has no clone yet get one in a click. It is never a
   * secret — the clone runs locally with the user's own gh/ssh credentials.
   * Absent when the repo has no GitHub origin, or predates the capture.
   */
  remoteUrl?: string | null
  path: string
  keywords: string[]
  color?: string  // hex color, e.g. '#3B82F6'
  languages?: {
    commit?: string
    pullRequest?: string
    jiraComment?: string
    discussion?: string
    /**
     * The language created tickets are WRITTEN IN — distinct from `discussion`,
     * which is the language a skill TALKS TO YOU in. A French-speaking developer
     * filing tickets in English for an international team is the normal case.
     *
     * Deliberately absent from DEFAULT_REPOSITORY_FIELDS: it is the head of a
     * fallback chain (`ticket` -> `jiraComment` -> 'en'), and materialising a
     * default would pin every repo to 'en' and make the chain unreachable.
     * Resolve it with resolveTicketLanguage() from `desktop/src/languages.ts`.
     */
    ticket?: string
    /**
     * The language the `.magic/spec-*.md` document /magic:plan writes is in.
     * Inherits `ticket` (and therefore the whole chain behind it) when unset, so
     * a repo that never sets this reads exactly as it did before the key existed.
     *
     * Absent from DEFAULT_REPOSITORY_FIELDS for the same reason as `ticket`, and
     * resolved with resolveSpecLanguage() from `desktop/src/languages.ts`.
     */
    spec?: string
  }
  commit?: {
    style?: string
    format?: string
    coAuthor?: boolean
    includeTicketId?: boolean
    /**
     * Whether committing straight onto a protected branch — main, master, develop,
     * and the repo's own `branches.development` — is permitted.
     *
     * Defaults to TRUE, i.e. permitted, because withdrawing a right people already
     * have is a surprising thing for an update to do. What changes at the default is
     * that /magic:commit now ASKS when it finds you on such a branch instead of
     * committing silently.
     *
     * False means there is nothing to ask: the skill moves the work onto a new
     * branch first. See skills/magic-commit/SKILL.md step 4.6.
     */
    allowOnProtectedBranch?: boolean
  }
  resolve?: {
    commitMode?: string        // 'new' | 'amend' | 'ask'
    format?: string            // 'conventional' | 'angular' | 'gitmoji' | 'none'
    style?: string             // 'single-line' | 'multi-line'
    useCommitConfig?: boolean  // true = inherit from commit settings
    replyToComments?: boolean  // true = reply in-thread on GitHub
    replyLanguage?: string     // 'en' | 'fr'
  }
  pullRequest?: {
    autoLinkTickets?: boolean
    watchCI?: boolean            // true = watch checks + review feedback after creating the PR
    testAccounts?: string        // 'off' | 'reference' | 'inline'
    testAccountsSource?: string  // explicit file path or project-skill name holding the accounts
  }
  issues?: {
    commentOnPR?: boolean
    /**
     * @deprecated Superseded by `jira.siteUrl`. Still READ, as the second link of
     * the chain resolveJiraSite() walks, so a repo configured before the move keeps
     * its browse URL — never written again. See desktop/src/tracker.ts and
     * supabase/migrations/20260820090000_repositories_jira.sql.
     */
    jiraUrl?: string
    /**
     * The repository whose GitHub issues this repo files into, when that is NOT the
     * repo the code lives in — issues kept in a separate tracker repository is a
     * real configuration, and `remoteUrl` would silently file them in the wrong
     * place (skills/magic-plan/references/trackers.md §2.1).
     *
     * No longer offered by the settings forms: for everyone else it duplicated
     * `remoteUrl`, which is what asking for it a second time made people believe
     * they had to fill in. Still READ — resolveGitHubIssuesUrl() prefers it and
     * derives from `remoteUrl` when it is unset — so an existing override keeps
     * working; it is simply no longer a field anyone has to answer.
     */
    githubIssuesUrl?: string
  }
  /**
   * Where this repository's Jira lives — the site, and the project key inside it.
   *
   * A property of the REPOSITORY, not of one skill: /magic:start resolves ticket
   * ids against it, /magic:pr and /magic:done link to it, /magic:plan files into
   * it. That is why it is a block of its own rather than a corner of `plan`, whose
   * settings are one skill's behaviour. `plan.tracker` stays in `plan` for the same
   * reason inverted — choosing which tracker receives new tickets IS a planning
   * decision, and it can be `github` on a repo that keeps a Jira site for links.
   *
   * Read it through resolveJiraSite() / resolveJiraProject() (desktop/src/tracker.ts),
   * never field-by-field: both keys are the head of a fallback chain onto the
   * legacy `issues.jiraUrl` / `plan.jiraProject` they replaced.
   *
   * Never a credential. The URL and the key are what every member of the project
   * reads in their address bar; the Atlassian calls use the user's own login.
   */
  jira?: {
    /** Jira site, as a browse base URL: `https://acme.atlassian.net/browse/`. */
    siteUrl?: string
    /** Jira project key the tickets are filed under, e.g. `PROJ`. */
    projectKey?: string
  }
  /**
   * Settings for /magic:plan — turning an idea into an epic and its stories.
   *
   * Nothing consumes this block until the plan skill lands, so a partial rollout
   * is inert rather than broken. The human validation step before ticket creation
   * and the depth of codebase exploration are deliberately NOT configurable: the
   * skill judges the latter from the size of the idea, and the former is not a
   * knob anyone should be able to switch off.
   */
  plan?: {
    // The three enum fields stay `string`: this block is jsonb the webapp writes
    // wholesale, so an unknown value can arrive and updateRepositoryPlanSettings
    // is what refuses it. Allowed values are PLAN_* above, never re-listed here.
    tracker?: string             // see PLAN_TRACKERS
    /**
     * @deprecated Superseded by `jira.projectKey`. Still READ, as the second link
     * of the chain resolveJiraProject() walks — never written again.
     */
    jiraProject?: string
    issueTypes?: {
      epic?: string              // Jira issue type name for epics, e.g. 'Epic'
      story?: string             // Jira issue type name for stories, e.g. 'Story'
    }
    useRepoTemplates?: boolean   // honour .github/ISSUE_TEMPLATE/* and Jira description templates
    splitting?: string           // see PLAN_SPLITTING_MODES
    acceptanceCriteria?: string  // see PLAN_ACCEPTANCE_CRITERIA_FORMATS
    defaultLabels?: string[]     // labels applied to every created ticket
    assignToMe?: boolean         // auto-assign created tickets to the current user
    duplicateCheck?: boolean     // search existing tickets before proposing a structure
  }
  branches?: {
    development?: string  // e.g., "develop", "dev" - defaults to "develop"
  }
  worktreeFiles?: string[]  // Files to copy from main repo to worktree (e.g., ".env", ".env.local")
}

/**
 * A repository as it lives in the cloud `repositories` table (shared identity,
 * no path) plus the current user's own local path binding (`path`, null when the
 * user hasn't cloned/bound it on this machine). The Store speaks this shape;
 * config.ts maps it to/from the name-keyed Config.repositories record.
 */
export interface StoredRepository {
  id: string
  ownerId: string | null
  orgId: string | null
  name: string
  keywords: string[]
  color?: string
  languages?: RepositoryConfig['languages']
  commit?: RepositoryConfig['commit']
  pullRequest?: RepositoryConfig['pullRequest']
  resolve?: RepositoryConfig['resolve']
  issues?: RepositoryConfig['issues']
  plan?: RepositoryConfig['plan']
  jira?: RepositoryConfig['jira']
  branches?: RepositoryConfig['branches']
  worktreeFiles?: string[]
  /** Shared clone address — see RepositoryConfig.remoteUrl. Null when unknown. */
  remoteUrl?: string | null
  /** The caller's own local path binding, or null when unbound on this machine. */
  path: string | null
}

/**
 * Identity fields a repository UPDATE may carry (everything except id/owner/path).
 *
 * `remoteUrl` is excluded even though it is shared identity: it has exactly one
 * writer, `Store.setRepositoryRemoteUrl`, which is fill-only and open to plain
 * members. Leaving it here would make the generic update a second writer that
 * silently bypasses that invariant — and fails RLS for the very members the
 * capture runs on. Creation still carries it, via StoredRepository.
 */
export type RepositoryIdentity = Omit<StoredRepository, 'id' | 'ownerId' | 'path' | 'remoteUrl'>

/**
 * The ways `repo:clone` can refuse, as message catalogue keys.
 *
 * The handler stays language-free by design — its errors are the contract its
 * tests assert on — so it throws the KEY and the renderer, which already holds a
 * bound `t`, turns it into a sentence. Anything else the handler throws is a git
 * message, passed through as-is: precisely the failures where a raw git error
 * still leaves the user with something to act on.
 */
export const CLONE_ERROR_CODES = [
  /** The repository has no known remote — nothing to clone from. */
  'clone.error.noRemote',
  /** The stored remote is not a plain `https://github.com/owner/repo`. */
  'clone.error.invalidRemote',
  /** The destination folder already exists and is not empty. */
  'clone.error.targetExists',
  /** `gh` is not installed, so we cannot even tell whether the user is logged in. */
  'clone.error.ghMissing',
  /** No usable GitHub login: the clone would hang or 404 on a private repo. */
  'clone.error.notAuthenticated',
  /** The key names no repository in the config. */
  'clone.error.unknownRepo',
] as const

export type CloneErrorCode = (typeof CLONE_ERROR_CODES)[number]

export function isCloneErrorCode(value: string): value is CloneErrorCode {
  return (CLONE_ERROR_CODES as readonly string[]).includes(value)
}

export interface Agent {
  id: string
  name: string
  repositories: string[]  // List of attached repository paths
  /**
   * The `repositories` table ids those paths resolve to, in attachment order.
   * Derived locally by resolveRepoIds() (src/repoMatch.ts) — a path is machine-
   * specific, this is the portable link, and it is what the backend derives the
   * agent's organization from. Empty when no path matches a configured repo.
   */
  repositoryIds?: string[]
  tsCreate?: number
  metadata?: TerminalMetadata
  splitPane?: 'left' | 'right'
}

export type SpotlightShortcut =
  | 'Control+Space'
  | 'Control+Shift+Space'
  | 'Alt+Space'
  | 'Alt+Shift+Space'
  | 'Control+M'
  | 'Control+Shift+M'
  | 'Alt+M'
  | 'Alt+Shift+M'

export interface SpotlightConfig {
  enabled: boolean
  shortcut: SpotlightShortcut
}

export type LaunchMode = 'plan' | 'default' | 'acceptEdits' | 'auto' | 'bypassPermissions'

/**
 * What a launch does with the prompt it was handed.
 *
 * `run` is the original behaviour and the default: the prompt rides along as
 * `claude "<prompt>"`, so the agent is already working by the time its terminal is
 * on screen. That is right for `/magic:start`, where the prompt IS the whole
 * instruction and there is nothing to add to it.
 *
 * `draft` types the prompt into Claude Code's input box and stops there — nothing
 * is sent until the person presses Return. It exists for the openings that are the
 * START of a conversation rather than an order: "discuss this issue with me" is
 * worth almost nothing without the sentence the person wanted to say about it.
 */
export type InitialPromptMode = 'run' | 'draft'

/**
 * What kind of work an agent does — the app's own notion, distinct from the status
 * it happens to be at.
 *
 * `coder` runs the implementation cycle (`/magic:start` → commit → pr → resolve →
 * done); `planner` runs `/magic:plan`, which produces a spec and a ticket and never
 * a branch or a PR.
 *
 * This used to be INFERRED from the status: `planning`/`planned` meant a planning
 * agent, everything else meant a coder. That worked only while the agent had already
 * announced a status, so a freshly created agent had no kind at all, and a rename of
 * either status silently changed the layout. The type is declared instead — by the
 * skills over `/metadata?type=`, and by the app at creation.
 */
export const AGENT_TYPES = ['coder', 'planner'] as const
export type AgentType = (typeof AGENT_TYPES)[number]

/**
 * How the left sidebar orders its agent list, picked from the control beside the
 * "new agent" button.
 *
 * `recent` is the default and stays the recommended one: an agent keeps the row it
 * had for as long as it lives, so the list a person learned does not move under
 * their cursor. The other two are opt-in for the sessions where that matters less
 * than finding a group — a dozen agents across four repositories, or a list where
 * the ones waiting on an answer are the only ones you care about.
 */
export const AGENT_SORT_MODES = ['recent', 'status', 'repository'] as const

export type AgentSortMode = (typeof AGENT_SORT_MODES)[number]

export const DEFAULT_AGENT_SORT: AgentSortMode = 'recent'

export function isValidAgentSort(value: unknown): value is AgentSortMode {
  return typeof value === 'string' && (AGENT_SORT_MODES as readonly string[]).includes(value)
}

/**
 * Available appearances, in the order the picker shows them. Adding one is a
 * single entry here plus its colours in the renderer's theme registry — the
 * registry is typed against this list, so TypeScript refuses a theme whose
 * palette is missing. Nothing else knows the list: components name roles
 * (`bg-surface`, `text-ink`), never colours.
 */
// Ordered darkest family first, then the light one — the picker lays them out
// four to a row, so the grouping falls out of the order.
export const THEME_IDS = [
  'dark',
  'midnight',
  'espresso',
  'high-contrast',
  'light',
  'mist',
  'sepia',
  'daylight',
] as const

export type ThemeId = (typeof THEME_IDS)[number]

export const DEFAULT_THEME: ThemeId = 'dark'

/**
 * Which macOS appearance each theme belongs to. It lives here, not in the
 * renderer's registry, because the main process needs it before any window —
 * and any renderer bundle — exists: it drives `nativeTheme.themeSource`, which
 * colours the traffic lights and picks the vibrancy material. Typed as a total
 * record, so a new theme cannot be added without classifying it.
 */
export const THEME_APPEARANCE: Record<ThemeId, 'light' | 'dark'> = {
  dark: 'dark',
  midnight: 'dark',
  espresso: 'dark',
  'high-contrast': 'dark',
  light: 'light',
  mist: 'light',
  sepia: 'light',
  daylight: 'light',
}

export function isValidTheme(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

/**
 * How the syntax highlighting inside the file preview is painted.
 *
 * `auto` — the default and the only one most people should need — takes the
 * appearance of the theme in use, so a light theme stops showing a black slab of
 * code in the middle of a white drawer. The two explicit values exist because
 * reading code is not reading UI: someone on a light interface may still want
 * their code dark, and that preference has nothing to do with the theme.
 */
export const CODE_THEME_MODES = ['auto', 'light', 'dark'] as const

export type CodeThemeMode = (typeof CODE_THEME_MODES)[number]

export const DEFAULT_CODE_THEME_MODE: CodeThemeMode = 'auto'

export function isValidCodeThemeMode(value: unknown): value is CodeThemeMode {
  return typeof value === 'string' && (CODE_THEME_MODES as readonly string[]).includes(value)
}

/**
 * The appearance the highlighter should paint in, from the theme and the mode.
 *
 * Lives here — beside THEME_APPEARANCE, which it reads — rather than in either
 * process, because BOTH have to reach the same answer from the same inputs: the
 * main process picks the shiki theme with it, and the renderer keys its read
 * cache on it so switching theme actually re-highlights. Two copies of this rule
 * would be a preview cached under one appearance and painted in the other.
 *
 * Anything unknown for either argument reads as "never chosen", which is what
 * makes it safe to call with a raw config value.
 */
export function codeAppearance(theme: unknown, mode: unknown): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode
  return THEME_APPEARANCE[isValidTheme(theme) ? theme : DEFAULT_THEME]
}

/**
 * Languages the interface is available in, in the order the picker shows them.
 * Adding one is an entry here plus its catalogue in src/i18n — the catalogue is
 * typed against the English one, so TypeScript refuses a language whose
 * translation is incomplete.
 *
 * This is the APPLICATION locale only. It has nothing to do with the per-repo
 * `languages.{commit,pullRequest,…}` settings (which language Claude writes a
 * commit message in) nor with profile.md's `languages`.
 */
export const LANGUAGE_IDS = ['en', 'fr'] as const

export type LanguageId = (typeof LANGUAGE_IDS)[number]

export const DEFAULT_LANGUAGE: LanguageId = 'en'

/**
 * The BCP-47 tag each language formats dates and numbers with. It lives here,
 * next to the ids, because the main process needs it too — notifications are
 * composed before any renderer exists. Typed as a total record, so a new
 * language cannot be added without giving it a locale.
 */
export const LANGUAGE_LOCALE: Record<LanguageId, string> = {
  en: 'en-US',
  fr: 'fr-FR',
}

export function isValidLanguage(value: unknown): value is LanguageId {
  return typeof value === 'string' && (LANGUAGE_IDS as readonly string[]).includes(value)
}

/**
 * Interface scale, as an Electron zoom factor. The steps are what the +/−
 * buttons and ⌘+ / ⌘− walk through; any value in range is accepted, since the
 * OS and the menu can land on one of their own.
 */
export const ZOOM_STEPS = [0.8, 0.9, 1, 1.1, 1.25, 1.5] as const

export const DEFAULT_ZOOM = 1
export const MIN_ZOOM = ZOOM_STEPS[0]
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1]

export function clampZoom(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_ZOOM
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

/** The step above or below `value`, or `value` itself at either end. */
export function nextZoom(value: number, direction: 1 | -1): number {
  const steps = direction === 1 ? ZOOM_STEPS : [...ZOOM_STEPS].reverse()
  // A small epsilon: zoom factors arrive as floats and 1.1 is never exactly 1.1.
  return steps.find((step) => direction * (step - value) > 0.001) ?? clampZoom(value)
}

export interface Config {
  version: string
  repositories: Record<string, RepositoryConfig>
  /**
   * Absent = never chosen; the app applies DEFAULT_THEME. The interface scale
   * is deliberately NOT here: it compensates for a particular display, so it
   * stays on the machine (see main/appearance.ts) rather than following the
   * account onto a laptop with a different screen.
   */
  theme?: ThemeId
  /** Absent = never chosen; the app applies DEFAULT_LANGUAGE. Like the theme, it
   *  follows the account rather than the machine — reading the app in French is
   *  a property of the person, not of the screen. */
  language?: LanguageId
  /**
   * Whether Claude Code in the terminal panes is repainted to match `theme`.
   * Absent = on: without it, a light theme leaves parts of the transcript white
   * on white, which reads as a bug rather than as a setting nobody enabled.
   * Follows the account like the theme it tracks — see main/claude-theme.ts.
   */
  syncClaudeTheme?: boolean
  /**
   * Which appearance the file preview's syntax highlighting is painted in.
   * Absent = DEFAULT_CODE_THEME_MODE, i.e. follow `theme`. Follows the account
   * for the same reason the theme does — it is a reading preference, not a
   * property of the screen.
   */
  codeTheme?: CodeThemeMode
  splitEnabled?: boolean
  splitActive?: boolean
  autoStartAtLogin?: boolean
  integrations?: {
    github: true
    atlassian?: boolean
  }
  spotlight?: SpotlightConfig
  launchMode?: LaunchMode
  /**
   * What a NEW agent is, when nothing says otherwise. Absent = never chosen, and
   * the app applies `coder` — which is what every agent was before planning
   * existed. Follows the account like the theme: which kind of work you usually
   * start is a property of the person, not of the machine.
   */
  defaultAgentType?: AgentType
  /**
   * How the left sidebar orders its agents. Absent = never chosen, and the app
   * applies `recent` — the order the list has always had. Follows the account
   * like the theme: how you like to read your own list of work is a property of
   * the person, not of the machine.
   */
  agentSort?: AgentSortMode
  usageCardEnabled?: boolean    // show the Claude usage card in the left sidebar
  usageCardMinimized?: boolean  // left sidebar usage card collapsed to gauges only
  agentContextEnabled?: boolean // show the agent's context/session card in the right sidebar
  agentContextMinimized?: boolean // that card collapsed to its context gauge only
  // Activity recording, ON by default: an aggregated usage snapshot is written to
  // usage_events at session end, alongside activity_events and skill_invocations.
  // Only an EXPLICIT false stops it (absent = never touched = on), so every gate
  // tests `=== false`. Gates WRITING your own data only — reading the org
  // aggregate is open to any member regardless of this flag, and the `agents`
  // table syncs regardless too (that is what powers the live Team view).
  usageLogsEnabled?: boolean
  /**
   * Whether `/magic:plan` sessions (the spec and the tickets it produced) are
   * uploaded to the cloud. ON by default, like usageLogsEnabled above, so only an
   * EXPLICIT false opts out.
   *
   * It gates the UPLOAD alone: the spec file is written to the repository either
   * way, and the in-app signal that it changed keeps firing, so turning this off
   * degrades nothing local.
   */
  planSyncEnabled?: boolean
  prReviews?: {
    enabled?: boolean
    pollIntervalMs?: number
    autoLaunchSkills?: boolean
  }
  /**
   * OS notifications. Everything defaults to ON, so an absent block is an app
   * that notifies exactly as it always has — only an explicit `false` silences
   * anything.
   *
   * `enabled` is the master and is checked at the single sink in main/index.ts,
   * which is why it covers kinds that have no switch of their own (a colleague
   * picking up a ticket, the daily digest). The per-kind flags below are checked
   * where the notification is produced.
   *
   * The two `pr*` flags cover the two PR notifications, which come from two
   * different places and are therefore two switches rather than one: `prReview`
   * is the local watcher reporting a review status change on a PR you have open
   * in the app, `prChangesRequested` is the team realtime stream telling you a
   * reviewer asked for changes on one of yours.
   */
  notifications?: {
    enabled?: boolean
    agentWaiting?: boolean
    agentCompleted?: boolean
    prReview?: boolean
    prChangesRequested?: boolean
  }
  // Optional daily team digest (opt-in, default OFF): a single OS notification at
  // 9:00 local summarizing yesterday's team activity (merged PRs / tickets done).
  dailyDigest?: {
    enabled: boolean
  }
}

/**
 * Identity of one machine running the app, recorded in `app_installations` on
 * every launch so the DB always holds the version each user actually runs.
 * `deviceId` is DERIVED (hashed hostname|platform|arch) rather than stored
 * locally — the database is the single source of truth and the app persists
 * nothing on disk to key this row by.
 */
export interface AppInstallationInfo {
  deviceId: string
  deviceName?: string
  appVersion: string
  platform?: string
  arch?: string
}

// ---------------------------------------------------------------------------
// Cloud: auth & organization (optional — the app works fully without any of it)
// ---------------------------------------------------------------------------

export type MembershipRole = 'user' | 'admin'

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

/** Tabs of the Settings/Config page, in rail order. Shared so other views (e.g.
 *  the sidebar account menu) can deep-link a specific tab in a type-safe way.
 *  'connections' holds the links to outside services (Atlassian today), kept
 *  apart from 'account' because a connection is a credential on THIS machine
 *  rather than part of who the user is. 'claude-code' gathers everything about
 *  the Claude Code CLI itself — the account it runs as, its launch mode, and its
 *  rate/spend usage. 'application' is the app itself: how this machine is set up,
 *  plus every feature toggle. */
export type SettingsTab =
  | 'account'
  | 'connections'
  | 'organization'
  | 'repositories'
  | 'application'
  | 'claude-code'
  | 'notifications'
  | 'appearance'
  | 'language'
  | 'shortcuts'
  | 'about'

/**
 * A menu item the main process cannot act on alone.
 *
 * The native menu is built in the main process, but "open Skills" or "create an
 * agent" are renderer state — so these four travel over IPC and are replayed
 * against the store, exactly as the tray already does with its own commands.
 */
export type MenuCommand = 'new-agent' | 'tasks' | 'skills' | 'team' | 'account'

/** Signed-in cloud user identity (subset of the Supabase session). */
export interface CloudUser {
  id: string
  email?: string
}

/** Result of any auth query. `enabled` is false when Supabase env is missing. */
export interface AuthStatus {
  enabled: boolean
  loggedIn: boolean
  user?: CloudUser
}

export interface Org {
  id: string
  name: string
  createdBy?: string
  role: MembershipRole
}

export interface Member {
  userId: string
  email?: string
  role: MembershipRole
  createdAt?: string
}

// ---------------------------------------------------------------------------
// Cloud: org-wide agents roster + realtime (team dashboard "who is working on
// what"). Distinct from the LOCAL `Agent` shape above: an OrgAgent describes a
// teammate's agent as seen over the org roster / realtime feed, keyed by the DB
// row uuid (NOT the app-level metadata.__app.id). It is READ-ONLY — it never
// feeds the local terminal-restoration cache.
// ---------------------------------------------------------------------------
/**
 * Compact per-repository PR review summary for a teammate's agent, sourced from
 * the agent row's metadata.repositoryMetadata (already synced org-wide by the
 * PRReviewWatcher). Read-only; surfaced on the Team page so a teammate's open
 * pull request is one click away without opening their agent.
 */
export interface OrgAgentPRReview {
  /** Repository path key from repositoryMetadata (owner's local path). */
  repo: string
  prUrl?: string
  status?: RepositoryMetadata['prReviewStatus']
  reviewers?: string[]
  merged?: boolean
  closed?: boolean
}

export interface OrgAgent {
  /** The `agents` table row id (uuid). Reconcile realtime events by this. */
  id: string
  /** owner membership user id (auth.users id), or null when ownership was cleared. */
  ownerId: string | null
  /**
   * The organization this agent's work belongs to, DERIVED by the backend from
   * its repositories. Null when it only touches personal repos — such an agent
   * is visible to its owner alone.
   */
  orgId: string | null
  /** Resolved in the renderer from the org member list (owner_id → email). */
  ownerEmail?: string
  name: string
  /**
   * The human title the owner gave the agent (metadata.title), when they set
   * one. Preferred over `name` for display — `name` is the generated terminal
   * label ("Claude 3"), which says nothing about the work.
   */
  title?: string
  ticketId?: string
  status?: string
  repositories: string[]
  /**
   * The `repositories` table ids this agent is attached to (agent_repositories),
   * in attachment order. The portable link — a teammate's paths mean nothing on
   * our machine. Absent on rows delivered by realtime, which carry the agent row
   * alone; consumers keep the ids they already had rather than lose the link.
   */
  repositoryIds?: string[]
  /** PR review state per repo, distilled from metadata.repositoryMetadata. */
  prReviews?: OrgAgentPRReview[]
  /** ISO timestamp of the last write (agents.updated_at). */
  updatedAt?: string
}

/** Realtime channel health for the org-agents subscription. */
export type RealtimeStatus = 'live' | 'reconnecting'

/**
 * A single org-agents realtime change forwarded to the renderer. `id` is always
 * the DB row uuid (present for every event, including DELETE) so the renderer
 * can reconcile by uuid; `agent` carries the mapped row for INSERT/UPDATE only.
 */
export interface OrgAgentChange {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  id: string
  agent?: OrgAgent
}

// ---------------------------------------------------------------------------
// Cloud: /magic:plan sessions. One row per spec file, plus the tickets it created.
// Writing is gated by Config.planSyncEnabled, ON by default (an explicit false opts
// out); the whole upload path lives in the main process (main/store/plan-sync.ts) —
// the skill only pings it, and never talks to Supabase itself.
// ---------------------------------------------------------------------------

/**
 * One `/magic:plan` session, as `public.plan_sessions` holds it.
 *
 * Keyed on `specKey` — a hash of the spec's absolute path — rather than on the path
 * itself: the row is readable by the whole organization, and an absolute path
 * carries the author's home directory.
 */
export interface PlanSession {
  id: string
  ownerId: string
  /** The repository the spec was written in, when its path resolved to one. */
  repoId?: string
  /**
   * DERIVED from `repoId` by a trigger — the client never sends it. Selected but
   * never trusted, exactly like AgentRow.org_id.
   */
  orgId?: string
  /** `agents.id` uuid of the agent that planned. Null once that agent is archived. */
  agentId?: string
  /** Spec filename minus its `spec-` prefix and `.md` suffix. */
  slug: string
  /** sha256 of the spec's absolute path. See specKeyFor in main/store/plan-sync.ts. */
  specKey: string
  title?: string
  /** The body of the spec's `## Idea` section, extracted at upload time. */
  idea?: string
  /** The spec markdown. Absent on a session whose spec was never written. */
  spec?: string
  status: string
  /**
   * When the spec CONTENT was last uploaded — not when the row last changed.
   * `updatedAt` cannot serve here: the org-derivation trigger bumps it, which
   * would make a row look fresher than a spec that really did change.
   */
  specSyncedAt?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * One ticket a planning session created, as `public.plan_tickets` holds it.
 *
 * `session_id` is deliberately absent: it is a server-generated uuid the desktop
 * never sees, so the store resolves it from `(owner_id, spec_key)` at write time.
 */
export interface PlanTicket {
  /** Tracker id — "PROJ-12" on Jira, "#194" on GitHub. */
  key: string
  url: string
  title?: string
  kind: 'epic' | 'story'
  /** The epic this story hangs under, by `key`. Absent on an epic or a lone story. */
  parentKey?: string
}

/**
 * A spec upload. The store resolves everything else — the slug, the spec key, the
 * repository, the title and the status — from `specPath` and from the agent, so a
 * caller (and the offline spool) only has to carry these.
 */
export interface PlanSpecInput {
  /** app agent id ("claude-…"), mapped to the agents.id uuid by the store. */
  agentId: string
  /** ABSOLUTE path to the spec file. Hashed into `spec_key`, never stored raw. */
  specPath: string
  /**
   * The spec markdown. Absent when the file does not exist YET — the session row is
   * still created, which is what records a plan whose agent was closed before any
   * spec was written. An absent spec leaves the stored one untouched.
   */
  spec?: string
}

/** The tickets of ONE planning session, identified the same way as a spec upload. */
export interface PlanTicketsInput {
  agentId: string
  specPath: string
  tickets: PlanTicket[]
}

// ---------------------------------------------------------------------------
// Cloud: usage logs & org stats. One aggregated snapshot is written per session at
// session end (never per statusLine event). Writing is gated by
// Config.usageLogsEnabled, which is ON by default (an explicit false opts out);
// reading the org aggregate is open to any org member (RLS scopes it to the org).
// ---------------------------------------------------------------------------

/** Aggregated end-of-session snapshot to append to the usage_events table. */
export interface UsageEventInput {
  /** app agent id ("claude-…"), mapped to the agents.id uuid by the store. */
  agentId: string
  /** model.display_name at session end — a label, not something to group on. */
  model?: string
  /** model.id at session end (e.g. "claude-opus-4-8"), the stable identity. */
  modelId?: string
  /** Context window of that model, in tokens — a capacity, not a counter, which is
   *  why it is recorded while `tokens` stays null (see appendUsage). */
  contextWindowSize?: number
  /** Every model.id seen during the session, in order of first appearance. More
   *  than one means a /model switch, so the fields above describe the last one only. */
  modelIds?: string[]
  costUsd?: number
  linesAdded?: number
  linesRemoved?: number
  durationMs?: number
  /** epoch ms; defaults to now when omitted. */
  occurredAt?: number
  /** Idempotence key, minted at emission. See main/store/outbox.ts. */
  clientEventId?: string
}

/**
 * One skill invocation, appended to the skill_invocations table.
 *
 * Unlike the activity feed (which records status transitions, so re-running the
 * same skill logs nothing the second time), this counts every single run.
 * The skill's `args` are deliberately NOT collected: they are free text that can
 * carry product context, and RLS makes these rows readable org-wide.
 */
export interface SkillInvocationInput {
  /**
   * app agent id ("claude-…"), mapped to the agents.id uuid by the store.
   * Undefined when the skill ran in a Claude Code the app did not spawn — the
   * run still counts, it just has no agent to attribute it to.
   */
  agentId?: string
  /** Skill name as Claude Code reports it, e.g. "magic-commit" or "plugin:skill". */
  skill: string
  /** epoch ms; defaults to now when omitted. */
  occurredAt?: number
  /** Idempotence key, minted at emission. See main/store/outbox.ts. */
  clientEventId?: string
}

/** How a skill run ended, as the skill itself reported it. */
export type SkillRunOutcome = 'success' | 'failed' | 'cancelled'

/**
 * The closing half of a skill run, reported by the skill's own final step.
 *
 * There is no "skill finished" hook to derive this from — PostToolUse on the Skill
 * tool fires when the instructions load, not when the workflow ends — so this is a
 * voluntary signal, and a run that never sends it reads as abandoned rather than
 * missing. See supabase/migrations/20260801090000_skill_runs.sql.
 */
export interface SkillRunEndInput {
  /** app agent id ("claude-…"); undefined for a Claude Code the app did not spawn. */
  agentId?: string
  /** Skill name; the plugin prefix is folded on both sides when matching. */
  skill: string
  outcome: SkillRunOutcome
  /**
   * epoch ms of when the skill FINISHED — not of when this was sent. A close queued
   * offline for an hour must not add an hour to the run's duration.
   */
  occurredAt: number
}

/**
 * How many times one organization has run each skill, all time — keyed by the skill
 * name with any plugin prefix already folded away by the RPC, so "magic-commit" and
 * never "magic-slash:magic-commit".
 *
 * A plain record rather than a Map because this crosses the contextBridge, whose
 * serialisation is narrower than the structured-clone algorithm the raw IPC channel
 * uses. A skill the org has never run is ABSENT rather than 0, which is the RPC's own
 * shape: it returns no row at all, and `?? 0` at the read site is where absence
 * becomes the number to print.
 *
 * These are the TEAM's totals. A run is attributed to an org through its agent, whose
 * org comes from the agent's repositories, so work on a personal repository belongs
 * to no organization and appears in nobody's counts.
 */
/**
 * What happened across every run of ONE skill, all time.
 *
 * `total` is runs STARTED, which is the only figure the guaranteed signal can give:
 * the counter fires before the skill body does. `completed` is those that reported
 * finishing, and their difference — once old enough to have stopped being in flight —
 * is `abandoned`. Reading the three together is the point: a skill people start and
 * do not finish used to be indistinguishable from a popular one.
 *
 * `total` is deliberately NOT completed + abandoned: a run started ten minutes ago is
 * neither, it is still going.
 */
export interface SkillRunCounts {
  total: number
  completed: number
  abandoned: number
  /** Median of the completed runs, in ms. Null until at least one has finished. */
  medianDurationMs: number | null
}

export type SkillCounts = Record<string, SkillRunCounts>

/**
 * Skill TIME, as opposed to the skill COUNTS above: how long the SIGNED-IN USER has
 * spent inside the /magic:* skills, all time and this week.
 *
 * The one figure on the Team page that is not scoped by the tab on screen, and that is
 * the point rather than an omission — a person's week is not divided by which
 * repository an agent happened to touch. There is deliberately no org variant: the
 * `skill_hours` RPC scopes itself to `auth.uid()` and cannot be bent into one.
 *
 * THE DURATIONS ARE A FLOOR. Only a run that reported finishing carries a duration, so
 * an interrupted one weighs nothing, and `close_skill_run` will not attach an end more
 * than four hours out. Copy on screen has to survive that being pointed out, which is
 * why the card carries the caveat.
 *
 * Mirrors `webapp/lib/skillHours.ts`, like SkillStats mirrors `lib/skills.ts`: two
 * builds with no code path between them, held together by the RPC's own column names.
 */
export interface SkillHours {
  totalSeconds: number
  weekSeconds: number
  /**
   * ISO date of the first MEASURED run — not the first run. Null means nothing has been
   * measured, the one state the card cannot phrase as a period.
   */
  firstMeasuredAt: string | null
  /**
   * ISO date of the last run STARTED, closed or not — which is what "last used" means,
   * and why it is not restricted to closed runs like the durations are. It can therefore
   * be more recent than the period the hours cover.
   */
  lastRunAt: string | null
  /** What that last run was working on — the agent's name, or null when there is none. */
  lastRunAgent: string | null
}

/** A single usage_events row, normalized for client-side aggregation. */
export interface UsageStatRow {
  userId: string | null
  agentId: string | null
  model: string | null
  costUsd: number
  tokens: number | null
  linesAdded: number
  linesRemoved: number
  durationMs: number
  /** ISO timestamp of when the session ended. */
  occurredAt: string
}

/** Org-wide usage rows for the dashboard, aggregated client-side by the renderer. */
export interface UsageStats {
  rows: UsageStatRow[]
  /** True when the query hit its row cap, so the aggregated totals are partial (under-counted). */
  capped: boolean
}

/**
 * One org-wide activity_events row, normalized for the Team page's flow metrics.
 *
 * Distinct from HistoryEntry (the personal History feed) on two counts: it spans
 * every member, and it carries `userId` so an in-flight item can be attributed.
 */
export interface OrgActivityEvent {
  id: string
  userId: string | null
  /**
   * agents.id uuid. The DB nulls this when the agent row is deleted (composite FK
   * with `on delete set null`), and closing an agent deletes its row — so EVERY
   * event of a finished ticket has agentId === null. Reliable only for agents that
   * are still alive; `ticketId` is the durable correlation key.
   */
  agentId: string | null
  action: HistoryAction
  ticketId: string | null
  repositories: string[]
  /** ISO timestamp of when the event occurred (client-written, so clocks can skew). */
  occurredAt: string
}

/** Org-wide activity rows for the Team page, aggregated client-side by the renderer. */
export interface OrgActivity {
  events: OrgActivityEvent[]
  /** True when the query hit its row cap: the window is partial, so trim the analysis to `since`. */
  capped: boolean
  /** ISO timestamp of the oldest event the analysis may trust. */
  since: string
}

export interface Invitation {
  id: string
  email: string
  role: MembershipRole
  status: InvitationStatus
  token: string
  expiresAt?: string | null
  createdAt?: string
}

/** Shared org config the invitee inherits (never includes local repo paths). */
export interface OrgSharedConfig {
  languages?: Record<string, string>
  commit?: {
    style?: string
    format?: string
    coAuthor?: boolean
    includeTicketId?: boolean
    /** See RepositoryConfig['commit']. Inherited like every other commit setting:
     *  the DB function projects the whole `commit` object, so a team's protection
     *  rule reaches its members rather than being re-decided per machine. */
    allowOnProtectedBranch?: boolean
  }
  pullRequest?: {
    autoLinkTickets?: boolean
    watchCI?: boolean
    testAccounts?: string        // 'off' | 'reference' | 'inline'
    testAccountsSource?: string
  }
  repoKeywords?: Record<string, string[]>
}

/** GitHub CLI auth status — DISPLAY ONLY. No token is ever stored. */
export interface GitHubAuthStatus {
  loggedIn: boolean
  account?: string
}

/**
 * Atlassian account connection — DISPLAY ONLY.
 *
 * The credential itself never crosses the bridge: it is encrypted by the OS
 * keychain and lives only in the main process (`main/jira/token-store.ts`, whose
 * `StoredJiraCredential` is deliberately NOT declared here). What the renderer gets
 * is a name to show, a site to name, and two booleans to branch on.
 *
 * `unverified` means Atlassian last refused the stored credential — the user
 * probably revoked the app. It is a MARK, not a deletion (a site outage answers 401
 * too), and it is what lets Settings offer "Reconnect" instead of a generic error.
 *
 * `configured` is about the BUILD, not the user: false when no Atlassian client id
 * was baked in, in which case the section says so rather than offering a button
 * that could only fail.
 */
export interface JiraAuthStatus {
  connected: boolean
  accountName?: string
  siteUrl?: string
  unverified?: boolean
  configured: boolean
}

/**
 * Why a connect attempt ended without a credential — DISPLAY ONLY, and the reason
 * the renderer can say something specific instead of leaving the section unchanged.
 *
 * A code rather than a sentence: the message is translated in the renderer, which
 * is the side that knows the user's language.
 *
 * `keychain` is `failed`'s one named special case, and it is named because the
 * acceptance criteria ask for it: when the OS keychain is unavailable the credential
 * cannot be encrypted, so nothing is stored and nothing is claimed. Told apart from a
 * generic failure it is actionable (unlock the keychain, or sign in to the desktop
 * session properly); folded into `failed` it is "Could not connect", which sends the
 * user to look for a problem with their Atlassian account instead.
 */
export type JiraDisconnectReason = 'cancelled' | 'timeout' | 'failed' | 'keychain'

/**
 * Why a connect attempt could not even be STARTED — the synchronous half of the
 * outcome, answered by `jira:connect` itself.
 *
 * A code, exactly like `JiraDisconnectReason`, and for exactly the same reason: the
 * main process authors no user-facing sentence, because it cannot know the user's
 * language. The renderer maps each code to a message in `i18n/en.ts` / `i18n/fr.ts`,
 * so every string the user reads goes through both catalogues.
 *
 *  • `notConfigured`  — no Atlassian client id in this build (see `jira/constants.ts`)
 *  • `noCallbackServer` — the loopback status server is not listening, so the browser
 *    would have nowhere to come back to
 *  • `browser` — `shell.openExternal` refused; the consent screen never opened
 *  • `unexpected` — the bridge call itself failed. Synthesised by the RENDERER, never
 *    sent by the main process: a rejected `ipcRenderer.invoke` carries Electron's own
 *    wrapper text (`Error invoking remote method …`), and that must never reach a toast.
 */
export type JiraConnectFailure = 'notConfigured' | 'noCallbackServer' | 'browser' | 'unexpected'

/**
 * What `jira:connect` answers.
 *
 * `started: true` means the consent screen is on its way and nothing more: the
 * credential arrives minutes later, through the loopback server, and is announced by
 * `jira:statusChanged`. The status carried here is therefore still the disconnected
 * one — it exists so an awaiting caller gets the same object the push will replace.
 *
 * A failure RESOLVES rather than rejecting, so the renderer never has to read an
 * `Error.message` to find out what happened.
 */
export type JiraConnectResult =
  | { started: true; status: JiraAuthStatus }
  | { started: false; failure: JiraConnectFailure }

export interface PRTemplate {
  exists: boolean
  path?: string
  fullPath?: string
  content?: string
}

export interface GitCheckResult {
  isGit: boolean
  exists: boolean
  expandedPath?: string
}

export interface CommandHistoryEntry {
  command: string
  timestamp: number
  count: number  // Usage frequency
}

export type HistoryAction =
  /** A planning session opened on an idea (status 'planning'). */
  | 'planning'
  /** The plan reached a spec ready to become a ticket (status 'planned'). */
  | 'planned'
  | 'started'
  | 'committed'
  | 'pr_created'
  /**
   * A reviewer picked the PR up (status 'in review'). Historic rows also carry
   * this value for 'Review addressed' — which is why the flow metrics treat a
   * bare `review` as a WEAK first-response signal and prefer the explicit
   * verdicts. Rows written from now on distinguish the two.
   */
  | 'review'
  /** The author pushed fixes answering a review (status 'Review addressed'). */
  | 'review_addressed'
  | 'merged'
  | 'review_approved'
  | 'review_changes_requested'
  /** The PR's CI went green (status 'CI green'), reported by magic-pr's watcher. */
  | 'ci_green'
  /** The work is finished and waiting for a PR (status 'ready for PR'). */
  | 'ready_for_pr'
  | 'waiting'
  | 'completed'
  | 'agent_created'
  | 'agent_closed'
  | 'agent_renamed'
  | 'agent_errored'
  // `done` was removed: nothing ever emitted it. magic-done reports 'PR merged',
  // which maps to `merged`, so the value only ever widened the type.

/**
 * One activity event on its way to `activity_events`. Write-only: nothing reads
 * these rows back per-user, so the shape carries no DB id — the row gets its own.
 */
export interface HistoryEntry {
  agentId: string
  agentName: string
  action: HistoryAction
  ticketId?: string
  description?: string
  repositories: string[]
  timestamp: number
  /** Idempotence key, minted at emission. See main/store/outbox.ts. */
  clientEventId?: string
}

/**
 * A named reason nothing is reaching the event tables. Codes rather than sentences,
 * so the renderer can translate them and the main process stays language-free.
 */
export type TelemetryHealthIssue =
  /** The PreToolUse hook is absent from ~/.claude/settings.json — no run is counted. */
  | 'hook-missing'
  /** `jq` is not on PATH; the hook parses Claude Code's payload with it and silently emits nothing. */
  | 'jq-missing'
  /** No Supabase session, so every write is a no-op. */
  | 'signed-out'
  /** The retry queue hit its cap and dropped its oldest events; some activity is permanently lost. */
  | 'queue-overflowed'

/**
 * Whether telemetry is actually being recorded, and what is holding it up.
 *
 * Exists because every link in the chain fails quietly (see main/usage/telemetry-health.ts):
 * without this, an empty dashboard and a broken pipeline are indistinguishable.
 */
export interface TelemetryHealth {
  /** The user's recording opt-in. False is a CHOICE, never an issue. */
  recordingEnabled: boolean
  signedIn: boolean
  hookInstalled: boolean
  jqInstalled: boolean
  /** Events written but not yet accepted by the backend; they retry on their own. */
  queuedEvents: number
  /** Skill runs the hook recorded that the app has not yet read. Drains on its own. */
  spooledSkillRuns: number
  /** Events lost to queue overflow since launch. Never recoverable. */
  droppedEvents: number
  /** Empty when everything that should be recording is. */
  issues: TelemetryHealthIssue[]
}

/**
 * Machine setup — what the `curl | bash` install script used to check and configure,
 * now owned by the app (see main/setup/).
 *
 * Codes and booleans only, no sentences: the main process stays language-free and the
 * renderer translates, same contract as TelemetryHealth above.
 */
export type PrerequisiteId = 'claude' | 'node' | 'git' | 'jq' | 'gh'

export interface PrerequisiteStatus {
  id: PrerequisiteId
  installed: boolean
  /** Installed, but below the minimum major version. Treated like missing. */
  outdated: boolean
  /** Detected version for display, e.g. "20.11.0". Null when absent or unparseable. */
  version: string | null
  /** Minimum major version, when one is enforced. */
  minVersion: string | null
  /** False for tools whose absence only degrades a feature (`gh`). */
  required: boolean
  /** Command that installs it, to show or to copy. Null when we can only link to docs. */
  installCommand: string | null
  /** True when the app can run installCommand itself — macOS with Homebrew present. */
  installable: boolean
  /** Where to send someone Homebrew cannot help (Claude Code's own installer). */
  docsUrl: string | null
}

export type McpServerId = 'atlassian' | 'github'

export interface McpServerStatus {
  id: McpServerId
  /**
   * - `configured` — registered at the URL this version provisions.
   * - `missing`    — absent; the app adds it on its own.
   * - `legacy`     — registered differently (the deprecated stdio GitHub package, or a
   *                  URL the user chose). Never rewritten without asking; see main/setup/mcp.ts.
   */
  state: 'configured' | 'missing' | 'legacy'
  url: string | null
  /** Set for a stdio server: the command it spawns. */
  command?: string | null
}

export interface SetupStatus {
  prerequisites: PrerequisiteStatus[]
  /** Whether Homebrew is available, i.e. whether one-click installs are offered. */
  homebrew: boolean
  mcpServers: McpServerStatus[]
  integrations: { github: boolean; atlassian: boolean }
  /** False until the user has been asked once — drives the first-run wizard. */
  integrationsChosen: boolean
  installedSkills: string[]
  missingSkills: string[]
  /** A required prerequisite is missing or too old: no skill can run. */
  blocked: boolean
  /**
   * Whether to open the first-run wizard. Decided in the main process (see
   * main/setup/status.ts) so the rule for "is this machine ready" lives in one place
   * rather than being restated by every surface that asks.
   */
  needsSetup: boolean
}

export type ScriptCategory = 'dev' | 'build' | 'test' | 'lint' | 'other'
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

export interface PackageScript {
  name: string
  command: string
  category: ScriptCategory
}

export interface ProjectScripts {
  packageManager: PackageManager
  scripts: PackageScript[]
}

export interface ScriptTerminalInfo {
  id: string
  scriptName: string
  fullCommand: string
  agentId: string
  agentName: string
  projectPath: string
  state: 'running' | 'error'
}

/** One selectable answer of an `AskUserQuestion` call. */
export interface TrayQuestionOption {
  label: string
  description?: string
}

/**
 * A question an agent is blocked on, surfaced in the menu bar panel so it can be
 * answered without bringing the app to the front (see main/questions/).
 *
 * `token` is what makes a late click safe: it is minted per question, and
 * `tray:answerQuestion` compares it against the store BEFORE writing anything to
 * the PTY. Answer the same question in the main window and the store is cleared,
 * so a click on the panel's now-stale card writes nothing at all.
 *
 * `unsupported` marks a question the panel cannot answer (several questions in one
 * call, no readable option, or the user has since typed in the terminal): the card
 * is still shown, but only offers "Open agent".
 */
export interface TrayQuestion {
  token: string
  /** `ask` = an AskUserQuestion tool call; `permission` = a permission prompt. */
  kind: 'ask' | 'permission'
  prompt: string
  /**
   * Empty for `permission`: the panel renders Allow / Deny from its own catalogue
   * rather than parroting the TUI's wording, which we never see.
   */
  options: TrayQuestionOption[]
  /**
   * Several options may be picked at once — the card renders checkboxes and a submit
   * button instead of one-click rows, and the answer carries every index.
   */
  multiSelect?: boolean
  /** Last lines of the terminal, ANSI-stripped — the real prompt, for permissions. */
  preview?: string
  receivedAt: number
  unsupported?: boolean
}

/**
 * What the user clicked on a question card. Indexes are 0-based and refer to
 * `TrayQuestion.options` (for a permission, index 0 is Allow).
 *
 * `options` is the multiSelect answer: every box the user ticked, submitted in one
 * go. It is a separate variant rather than an array on `option` so that a card and
 * a question that disagree about multiSelect cannot silently half-work — `keysFor`
 * matches the variant against the question and refuses the mismatch.
 */
export type TrayAnswerChoice =
  | { kind: 'option'; index: number }
  | { kind: 'options'; indexes: number[] }
  | { kind: 'deny' }

/**
 * Outcome of `tray:answerQuestion`. `ok: false` always means nothing at all was
 * written to the PTY — which is the only distinction the panel acts on. Why it
 * refused (a stale token, or keystrokes we would have had to guess) is logged in
 * main rather than carried here, since no caller branches on it.
 */
export interface TrayAnswerResult {
  ok: boolean
}

/**
 * One row of the menu bar panel (renderer/pages/TrayPopover). A flattened
 * AgentSummary: `createdAt` is a number because it crosses IPC, where a Date
 * would arrive as a string.
 */
export interface TrayAgent {
  id: string
  name: string
  state: TerminalState
  ticketId: string
  title: string
  createdAt: number
  /** Absent for the overwhelmingly common case: an agent nobody is waiting on. */
  pendingQuestion?: TrayQuestion
}

/**
 * The panel's view of the updater — deliberately narrower than main's
 * `UpdateStatus`, because the panel only has a version chip in its header to say
 * this with: it either offers a check, reports one in flight, or offers a restart.
 */
export type TrayUpdate =
  | { phase: 'idle' }
  | { phase: 'checking' }
  /** Found AND being fetched — the download starts on its own (see `autoDownload`). */
  | { phase: 'downloading'; percent: number }
  | { phase: 'ready'; version: string }
  | { phase: 'error' }

/** Everything the menu bar panel paints, in one poll (see `tray:getState`). */
export interface TrayState {
  version: string
  update: TrayUpdate
  agents: TrayAgent[]
}

/**
 * Where a modified file changed, as line numbers in the file as it stands now.
 *
 * `removedBefore` is a "sits before" position, not a line that exists: a deletion is
 * rendered as an extra visual row inserted ahead of that line. Neither array is a DOM
 * row index for that reason — anything positioning against the rendered document has
 * to measure it, not count these.
 */
export interface ChangedLines {
  added: number[]
  removedBefore: number[]
}

/** How git describes what happened to a file, as the sidebar's stats report it. */
export type ChangedFileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'

/**
 * One entry of a repository's uncommitted-changes list.
 *
 * It lives HERE rather than beside the sidebar that first read it because the store
 * now holds a snapshot of these — the review drawer stacks every changed file of a
 * repository, and the list it renders is frozen at the moment the reader clicked so
 * the five-second git poll cannot re-key the cards mid-read. The store may not import
 * from a component folder, so the shape moved to the shared module instead of the
 * dependency being pointed the wrong way.
 *
 * `additions`/`deletions` are the repository's own count, not a measurement of the
 * rendered document: an untracked file arrives as 0/0 because git has nothing to diff
 * it against, which is why every reader of these two has to treat "both zero" as "no
 * figure to show" rather than as "nothing changed".
 */
export interface ChangedFile {
  path: string
  additions: number
  deletions: number
  status: ChangedFileStatus
}

/** Everything `config:readFile` can answer, as the renderer receives it. */
export type FilePreviewResult =
  | {
      encoding: 'utf8'
      content: string
      highlightedHtml: string | null
      /**
       * The same document with everything but the changed regions left out, each
       * kept with a few lines of unchanged code around it and every cut marked.
       *
       * Present only where there is something to collapse: a modified or renamed
       * file whose changes do not already cover it. Absent on an added, untracked or
       * deleted file — every line there is a change, so the collapsed view would be
       * the full one — and absent when the file is short enough that the context
       * reaches both ends. Its absence is the signal the preview's header reads to
       * decide whether to offer the expand toggle at all.
       *
       * `highlightedHtml` above stays the whole file either way. This is a second
       * rendering of the same read, not a replacement for it: the toggle switches
       * between the two without going back to disk.
       *
       * One spelling of "absent", deliberately: the field is either a string or
       * missing. Admitting `null` as well would give a two-state fact three states,
       * and every reader would have to normalise before asking the only question
       * anyone asks of it — is there a second rendering or not.
       */
      changesOnlyHtml?: string
      size: number
      mimeHint: string
      /**
       * Present only for a file read against a diff. On an added, untracked or
       * deleted file every line is changed, so the positions would say nothing the
       * status does not already say — and spelling out `[1..n]` for a large file
       * would be pure IPC weight.
       */
      changedLines?: ChangedLines
    }
  | { encoding: 'binary'; size: number; mimeHint: string; content?: never }
  | { encoding: 'image'; content: string; size: number; mimeHint: string }
  | { error: 'too_large'; size: number }
  | { error: 'path_traversal' | 'not_found' }

export interface BranchCommit {
  hash: string
  shortHash: string
  subject: string
  author: string
  date: string
  relativeDate: string
  isPushed: boolean
}

export interface UserProfile {
  name: string
  role: 'product' | 'dev' | 'design' | 'qa' | 'ops' | 'manager' | 'other'
  technical_level: 'beginner' | 'intermediate' | 'expert'
  communication_style?: 'simple' | 'technical' | 'detailed'
  languages?: string[]
  freeText?: string
}

// The display labels for these fields used to live here as English literals.
// They are now catalogue keys in i18n/profileLabels.ts — this module cannot hold
// them, because it is what i18n/ imports (LanguageId, LANGUAGE_LOCALE), and
// reaching back for MessageKey would close the cycle.
