# Dependency gate

Read this file only when Step 2.4 of `SKILL.md` has found that the ticket declares at least one blocker. It
owns the detection vocabulary, the resolution calls, the decision matrix and the behaviour per verdict. Only
`/magic:start` reads it; `/magic:continue` deliberately has no gate, since the work it resumes has already
started.

## 1. Scope

Nothing here runs on a ticket that declares no blocker — that is what keeps an always-on gate free on the
common case.

Depth 1 only: the blockers of blockers are never resolved, because a chain is the tracker's problem and one hop
is what a person can act on at the moment they start a ticket.

## 2. Detection — the three sources

A blocker is declared if **any** of the three matches. They are complementary, not ranked: a Jira link and a
description sentence often describe the same dependency, so deduplicate by blocker ID before resolving.

### 2.1 Jira issue links

`fields.issuelinks` is an array of link objects, each carrying a `type` and either an `inwardIssue` or an
`outwardIssue`. Only the inward direction of a "blocked by" / "depends on" type is a blocker.

**For "A is blocked by B", `inwardIssue` is B — the blocker.** An entry carrying `outwardIssue` on the same
type means this ticket blocks something else, which is not a reason to stop.

Link type names are configurable per Jira site ("Blocks" / "Bloque" / "Dependency" / "Precedes" all exist in
the wild), so resolve them instead of hardcoding: call `mcp__atlassian__getIssueLinkTypes` and keep the types
whose `inward` label means "is blocked by" or "depends on". Call it **only when `issuelinks` is non-empty**.

If `getIssueLinkTypes` fails, fall back to matching the link's own `type.inward` string against
`is blocked by`, `est bloqué par`, `depends on`, `dépend de` — and say the type resolution degraded, per §6.

### 2.2 Native GitHub issue dependencies

`mcp__github__get_issue` already returns `issue_dependencies_summary`, but with **counts only, no IDs**:

```json
{ "blocked_by": 2, "total_blocked_by": 2, "blocking": 0, "total_blocking": 0 }
```

`blocked_by == 0` short-circuits at zero cost. A non-zero count justifies one call for the actual IDs:

```bash
gh api "repos/{owner}/{repo}/issues/{number}/dependencies/blocked_by" \
  --jq '.[] | {number, title, state, state_reason}' 2>/dev/null
```

The MCP tool exposes no equivalent, which is why this one path goes through `gh`.

### 2.3 Free text in the description

The primary requested path, and the only one that works on both trackers regardless of link configuration.
Scan the description (including custom-field text discovered in Step 2A) for a dependency keyword with a
ticket reference **adjacent** to it.

| Language | Keywords |
| --- | --- |
| EN | `blocked by`, `depends on`, `dependent on`, `needs`, `requires`, `waiting on`, `waiting for`, `after` |
| FR | `bloqué par`, `bloque par`, `dépend de`, `depend de`, `nécessite`, `en attente de`, `après` |

A ticket reference is `[A-Z][A-Z0-9]+-\d+` (Jira) or `#\d+` (GitHub). **Adjacency is required**: the reference
must follow the keyword within roughly 30 characters, allowing only filler like `the`, `on`, `:`, `ticket`,
`issue`, `PR`, `le`, `la`, `du`. Without adjacency, "this needs a rewrite of the parser, see PROJ-9 for
context" would be read as a hard block on PROJ-9, and the gate would stop a ticket nothing is blocking.

**Negated forms are skipped, never matched.** Check the words immediately preceding the keyword:

| Skip when preceded by | Example that must trigger nothing |
| --- | --- |
| `not`, `no longer`, `isn't`, `is not`, `nothing` | `not blocked by anything`, `no longer blocked by PROJ-1` |
| `pas`, `plus`, `n'est pas`, `rien` | `pas bloqué par PROJ-1`, `plus bloqué par le refacto` |

Both checks are kept: adjacency alone misses `no longer blocked by PROJ-1`, which does carry an ID.

## 3. Resolving the blockers

### 3.1 Deriving `owner/repo`

Reuse the slugs `SKILL.md` Step 2B.2 already resolved when they exist. On a Jira start they do not: Step 2B.2
lives in the GitHub branch only, so derive them here with the same parsing Step 2B.2 describes.

Either way, cover **every** configured repo, not just the one this ticket will be scoped to — the blocker's PR
may live elsewhere, and Step 3 has not run yet. A path with no origin remote, or a remote that is not GitHub,
is skipped silently: it simply cannot host the blocker's PR.

### 3.2 Jira blocker status — one JQL call

Resolve **all** Jira blockers in a single call, never one `getJiraIssue` per blocker:

```json
{
  "jql": "key in (PROJ-2, PROJ-3)",
  "fields": ["summary", "status"]
}
```

Use `mcp__atlassian__searchJiraIssuesUsingJql`. Decide the verdict from `status.statusCategory.key` —
`new`, `indeterminate` or `done` — and **never** from `status.name`. Names are per-project and per-language
("Backlog", "À faire", "Ready for dev", "Recette"); the category key is the only stable value, and the matrix
in §4 is written against it.

`status.name` has exactly one use: it is the source of the `{blocker_status}` placeholder, shown to the user so
the line reads `status Backlog` rather than `status new`. The same response carries both, so this costs nothing.
Display only — it must never reach the matrix. On the GitHub path (§3.3) `{blocker_status}` is the issue `state`,
plus `state_reason` when it is `not_planned`.

A key absent from the JQL response (deleted ticket, no permission, wrong project) is not a blocker: report it
as unresolvable per §6 rather than assuming `new`, which would manufacture a 🔴.

### 3.3 GitHub blocker status

Blockers discovered in §2.2 already carry `number`, `title`, `state` and `state_reason`, so this applies only to
`#N` references found in free text (§2.3). For those, launch the calls in parallel, one per blocker:
`gh issue view 123 --repo {owner}/{repo} --json number,title,state,stateReason`. Map the result
onto the same three categories so §4 stays single-table: `open` → `indeterminate`, `closed` with reason
`completed` → `done`, `closed` with reason `not_planned` → `done` for gate purposes (nobody is waiting on it
any more) while mentioning the reason in the line shown to the user.

### 3.4 PR lookup — cross-repo fan-out

A blocker's PR is not necessarily in the repo the blocker's ticket suggests, so search **every** repo resolved
in §3.1, in parallel:

```bash
gh pr list --repo {owner}/{repo} --search "{BLOCKER_ID}" --state all \
  --json number,title,state,mergedAt,headRefName,baseRefName,url 2>/dev/null
```

`headRefName` comes back on that same response, so the branch the 🟡 offer needs requires no second call, and
`title` is requested for the same reason — it fills `{pr_title}` in `MSG_BLOCKER_IN_FLIGHT` without a
`gh pr view` round-trip. `baseRefName` is what §3.5 needs.

**Every result must then be validated — `--search` is full-text, and it is not a filter.** It matches the
blocker ID anywhere in the title, body or comments, so a PR that merely *mentions* the blocker comes back
alongside the one that implements it, and `PROJ-1` also matches `PROJ-15` and `PROJ-158`. Ranking an unvalidated
result would let an unrelated merged PR clear a dependency that has not landed — a false 🟢, the worst outcome
this gate can produce, since it starts the ticket silently.

Keep a result only when the blocker ID appears in its `title` or `headRefName` as a **whole token**: the
character before it must not be alphanumeric, and the character after must be neither a digit nor a hyphen
followed by a digit. `PROJ-1` therefore matches `PROJ-1`, `[PROJ-1]` and `feature/PROJ-1-refactor`, but not
`PROJ-15`, `PROJ-158` or `PROJ-1-2`. For a GitHub `#N` blocker, require `#N` on the same boundary rule — `#15`
must not satisfy `#1`. Discard everything else silently: a PR that only mentions the blocker in its body is not
evidence the blocker landed.

Then keep the most advanced surviving match per blocker: `merged` beats `open`, `open` beats `closed`. `state` is
`MERGED` / `OPEN` / `CLOSED`; a draft reports as `OPEN` and is treated as open.

No surviving match across all repos means **no PR found** — a different verdict from a closed unmerged PR, and
§4 keeps them apart. A search that returned rows which all failed validation is *also* "no PR found", not a
weaker form of evidence.

### 3.5 A merged PR only counts if it merged into the base the worktree will use

`MERGED` alone is not "the code has landed". A PR merged into a release branch, a stacked feature branch or
another team's integration branch is merged, yet its commits are absent from `$DEV_BRANCH` — which is exactly
where the new worktree starts. Accepting it would produce a 🟢, start the ticket, and leave the user building on
code that is not in their tree: silent, and harder to diagnose than a 🔴.

So compare `baseRefName` against the development branch configured for the repo that hosts the PR
(`.repositories.<config key>.branches.development`), not against the scoped repo's — a cross-repo match (§3.1)
is resolved against its own repo's config:

| `baseRefName` | Treated as |
| --- | --- |
| the hosting repo's development branch | **merged** — the code is on the branch the worktree starts from |
| anything else | **open**, with the target branch named in the line shown to the user |

Downgrading to `open` rather than to "no PR" is deliberate: the work demonstrably exists and has a head branch,
so the 🟡 path can still offer `headRefName` as the worktree base. That is the useful outcome here — it is how
the user builds on a dependency that landed somewhere they do not branch from.

When the hosting repo has no `branches.development` configured, fall back to its remote default branch
(`gh repo view --repo {owner}/{repo} --json defaultBranchRef -q .defaultBranchRef.name`) and say in one line
which branch the comparison used, so a 🟡 caused by configuration rather than by the PR is legible.

## 4. The decision matrix

Blocker status (§3.2, from `status.statusCategory.key`) crossed with the state of any PR carrying its ID:

| status ↓ / PR → | merged | open/draft | closed unmerged | none |
| --- | --- | --- | --- | --- |
| done | 🟢 clear | 🟢 clear | 🟢 clear | 🟢 clear |
| indeterminate (in progress) | 🟢 code landed | 🟡 in flight | 🔴 abandoned? | 🟡 in flight, no code |
| new (backlog / to do) | 🟢 clear ⚠️ stale ticket | 🟡 in flight | 🔴 abandoned | 🔴 hard blocked |

**Master rule: a merged PR, or a blocker whose status category is `done`, is green — regardless of what the
tracker says.** The code is on the development branch, and that is the only thing that actually matters to the
ticket being started. A backlog ticket with a merged PR is a stale ticket, not a blocked start.

"Merged" in that rule means merged **as §3.4 and §3.5 define it**: a PR whose ID validated as a whole token, and
whose `baseRefName` is the development branch of the repo hosting it. The rule's own justification is what
forces both conditions — it is green *because* the code is on the branch the worktree starts from, so a PR that
merged elsewhere, or one that merely mentions the blocker, does not satisfy it and never reaches the `merged`
column.

Two distinctions the matrix exists to preserve:

- 🔴 **closed unmerged** is reported **distinctly** from 🔴 **no PR found**. "Someone abandoned this work" and
  "nobody has started" call for different decisions from the user, and collapsing them into one message throws
  away the more actionable of the two.
- 🟢 **merged PR on a `new` ticket** adds one line about the staleness (`MSG_BLOCKER_STALE_TICKET`). The start
  proceeds; the tracker is simply behind.

**Aggregation: the overall verdict is the worst verdict across all blockers** — 🔴 beats 🟡 beats 🟢. One
unlanded dependency is enough to hold the ticket, and a green sibling does not offset it. When several
blockers are 🟡, offer the head branch of the one whose PR is most advanced; when several are 🔴, list them all
in the single question.

## 5. Behaviour per verdict

Every user-facing string lives in `references/messages.md`, by key. Never inline the wording here or in
`SKILL.md`: the messages are bilingual and the language is only known once Step 0.2 has read the repo config.

### 5.1 🟢 Clear

Emit one line for `{blocker_line}` of `MSG_TASK_SUMMARY` — `MSG_BLOCKER_CLEAR`, or
`MSG_BLOCKER_STALE_TICKET` on the merged-PR-but-backlog-ticket cell. Ask nothing, and continue to Step 2.5
normally.

### 5.2 🟡 In flight

Display `MSG_BLOCKER_IN_FLIGHT` and offer to base the new worktree on the blocker's PR head branch, with
`$DEV_BRANCH` as the other option. The message carries the one-line warning that a force-push or a rebase on
that PR propagates into the user's worktree — that is the real cost of the convenience, and it is stated
before the choice, not after.

`SKILL.md` Step 4.1 owns the question; this file only returns the candidate branch and the repo it belongs to
(see `## Usage`). `{blocker_line}` stays **empty** on this path: the message is a multi-line block with a choice
in it, so it cannot be folded into the summary box. The blocker still reaches the user, through `blockers` →
`{attention_points}`. The same holds for §5.3 when the user starts the ticket anyway.

### 5.3 🔴 Hard blocked

Display `MSG_BLOCKER_HARD` (no PR found) or `MSG_BLOCKER_ABANDONED_PR` (closed unmerged), then ask with
`AskUserQuestion`. `SKILL.md` Step 2.4 owns the question, its three options and their mechanics — including
that nothing is created before the answer.

## 6. Degradation — never fabricate a verdict

Every failure path says what it could not check and continues; none of them invents an answer.

| Failure | Detection | Behaviour |
| --- | --- | --- |
| `gh` not installed | `command -v gh` | `MSG_BLOCKER_CHECK_UNAVAILABLE`, no PR verdict |
| `gh` not authenticated | `gh auth status` non-zero | `MSG_BLOCKER_CHECK_UNAVAILABLE`, no PR verdict |
| `$ATLASSIAN_ENABLED` false, Jira blocker | Step 0.3 value | `MSG_BLOCKER_CHECK_UNAVAILABLE`, no status |
| JQL call fails, or a key is missing from the response | §3.2 | that blocker is unresolvable, not `new` |
| `getIssueLinkTypes` fails | §2.1 | fall back to literal `type.inward` matching, say so |

The `$ATLASSIAN_ENABLED == false` row matters more than it looks. Free-text detection (§2.3) happily finds
`blocked by PROJ-138` in a GitHub issue on a site with no Atlassian integration — and with no way to read that
ticket's status, defaulting it to `new` would produce a confident 🔴 on a dependency that may well have
shipped months ago. Degrade like a missing `gh` instead: report that the blocker could not be resolved and let
the user decide.

```bash
command -v gh > /dev/null 2>&1 && gh auth status > /dev/null 2>&1 && echo "OK" || echo "UNAVAILABLE"
```

`MSG_BLOCKER_CHECK_UNAVAILABLE` is never blocking on its own: the start continues, and the unchecked
dependency is carried into `{attention_points}` of Step 5.5.3 so it is not forgotten by the end of the run.

## Usage

`SKILL.md` Step 2.4 reads this file **only** when its declaration check has fired. Once read, execute §2, then
§3, then §4, then §5, and return these values — this table is the whole contract; Step 2.4 restates none of it:

| Returned | Shape | Consumer |
| --- | --- | --- |
| `verdict` | `none` / `clear` / `in_flight` / `hard_blocked` / `unavailable`, worst (§4) | Step 2.4 |
| `blocker_line` | `MSG_BLOCKER_CLEAR` / `_STALE_TICKET` / `_CHECK_UNAVAILABLE`, else empty | Step 5 |
| `base_branch_candidate` | map **keyed by repo config key** → branch; empty unless 🟡 | Step 4.1 |
| `blockers` | id, title and PR state per blocker | `{attention_points}` of Step 5.5.3 |

`none` is the verdict when §2 finds nothing after all — Step 2.4's cheap pre-filter is deliberately broader than
§2.3 — and it behaves exactly like Step 2.4's early exit: say nothing, continue.

Then return to Step 2.4's continuation, except on the "stop here" option of §5.3, which stops the skill after
Step 6.
