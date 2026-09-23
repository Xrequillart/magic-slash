# Tracker operations for a rework

Read §1 in Step 1.3, §2 in Step 3, and §3-§6 in Step 6 once the user has approved the diff. This
file owns everything a rework does to a tracker: which tracker the plan's tickets are in, how their
live state is read, and the three writes a diff can hold (update, add, close), with the rules for a
partial failure.

It is a **branch per tracker**, like `../magic-plan/references/trackers.md`, and it leans on that
file rather than restating it wherever the rule is the same: an added story is created exactly the
way `/magic:plan` creates one, and there is **one** body format for a planned ticket, held there in
§2.3. What this file adds is what a first plan never does: edit a ticket, and close one.

## 1. Resolution: from the tickets, not from the settings

The tracker is the one the plan's tickets are already in. Read it off the `## Created tickets` rows,
never off `plan.tracker`: that setting says where the **next** plan goes, and may have changed since
this one was filed.

| Row key | Tracker | Target |
| --- | --- | --- |
| `#412` | GitHub | `owner/repo` parsed from the row's URL (`https://github.com/owner/repo/issues/412`) |
| `PROJ-1234` | Jira | the project `PROJ` (the key's prefix), on the site the row's URL names |

Rows of both shapes in one table do not happen from `/magic:plan`, which files one plan in one
tracker. If they do, stop and say so in one line: a hand-edited table is not something to guess
about.

**GitHub** needs nothing more: the MCP server is the GitHub account the user already has, and the
target is in the URL. A repository the URL names and the account cannot write to is a failure the
first write reports (§6), not a reason to refuse up front.

**Jira** needs two checks, both made **here**, before the spec is touched:

1. `integrations.atlassian` (SKILL.md Step 0.4) is on. Off → `MSG_JIRA_UNAVAILABLE`, stop.
2. A `cloudId` for the row's site: `mcp__atlassian__getAccessibleAtlassianResources`, keeping the
   resource whose `url` matches the host of the row's URL, then, when the row URL is not a Jira
   browse URL, the host of the repository's `jira.siteUrl` (`../magic-plan/references/trackers.md`
   §1.0 gives its fallback). No match → `MSG_JIRA_UNAVAILABLE`, stop.

Carry the result for the rest of the run, exactly as `/magic:plan` carries its resolution:
`tracker`, `tracker_target` (`github.com/owner/repo`, or `PROJ` on the site), `owner/repo` or
`cloudId`. Nothing below re-derives it.

## 2. Reading the live state

One read per ticket, launched in parallel. Retry a failed read once; a read that fails twice on
**every** ticket is the tracker being down → `MSG_TRACKER_ERROR`, stop before Step 4. A read that
fails on one ticket only leaves that ticket out of the diff, flagged as unreadable.

### 2.1 GitHub

`mcp__github__issue_read` with `method: "get"` on `owner/repo` and the number. Keep `title`, `body`,
`state`, `state_reason`, `assignees`, and the sub-issue parent where it is reported.

**In progress** on GitHub means an open issue that any of these is true of:

- it has an assignee who is not the user (`mcp__github__get_me` names the user, once per run)
- an open pull request references it: `mcp__github__search_pull_requests` with
  `repo:owner/repo is:pr is:open {number}`, keeping only a result whose body or title carries
  `#{number}`, `Closes #{number}` or the issue URL
- a local branch is named after it: `git -C {REPO_PATH} branch --list '*-{number}-*'`

### 2.2 Jira

`mcp__atlassian__getJiraIssue` on the carried `cloudId` and the key, with
`fields: ["summary", "description", "status", "assignee", "issuetype", "parent"]`. The status
**category** decides, never the status name, which every project spells its own way:
`new` → open, `indeterminate` → in progress, `done` → closed. An assignee who is not the user makes an
open ticket in progress too (`mcp__atlassian__atlassianUserInfo` names the user, once per run).

## 3. Update

Only the fields the diff line names: a line that changes criteria sends a body, not a title.

| Tracker | Call |
| --- | --- |
| GitHub | `mcp__github__issue_write`, `method: "update"`, `owner`, `repo`, `issue_number`, and `title` and/or `body` |
| Jira | `mcp__atlassian__editJiraIssue`, the `cloudId`, the key, `fields` with `summary` and/or `description` |

**The body is the ticket's current body, reworked**, not a body regenerated from the spec: Step 3
read it, and anything a person added since it was filed (a note, a screenshot link, a clarified
criterion) survives the update. The spec says what changes; the live body is what it changes. When
the ticket body still matches what `/magic:plan` wrote, the two are the same thing and the section
structure of `../magic-plan/references/trackers.md` §2.3 is kept as it was.

Never touch labels, assignees, milestones, the status or the parent on an update: those belong to
whoever is running the ticket now. The one exception is re-parenting a story under an epic filed on
`MSG_SHAPE_CHANGE`'s option 1, per §4.

On Jira, pass the description as markdown text, and on a rejection of its shape retry once as plain
text, saying in one line that the formatting degraded (`../magic-plan/references/trackers.md` §3.3).

## 4. Add

A new story is created **exactly** the way `/magic:plan` creates one, by following
`../magic-plan/references/trackers.md`:

| Tracker | Read | For |
| --- | --- | --- |
| GitHub | §2.2, §2.3, §2.5, §2.6 | the fields, the body, the issue template, `plan.defaultLabels` and `plan.assignToMe` |
| GitHub | §2.4 | the sub-issue link to the epic, `mcp__github__sub_issue_write` |
| Jira | `../magic-plan/references/jira-fields.md`, for the **story** issue type only | the required-field pass, before the diff is shown (Step 5): a required field nobody can fill is a question for the user, asked with the diff, not a 400 after approval |
| Jira | §3.3, §3.5, §3.6 | the create call, the description template, labels and assignee |
| Jira | §3.4 | the hierarchy cascade (`parent`, then the epic-link field, then an issue link), and naming the route that landed |

The parent is the plan's **existing** epic, the `epic` row of `## Created tickets`. Depth stays one
level.

On `MSG_SHAPE_CHANGE`'s option 1, the epic is itself an add, created first (the parent must exist
before a child points at it), and the existing story is then **linked** under it with the same
hierarchy call a new story gets. It is not recreated.

## 5. Close

A ticket leaves the plan by being **closed, never deleted**: a deleted ticket takes its history, its
comments and its URL with it, and the URL may be in someone's notifications, a commit, a PR.

Comment first, then close, so whoever opens the ticket from the notification sees why:

| Tracker | Comment | Close |
| --- | --- | --- |
| GitHub | `mcp__github__add_issue_comment` | `mcp__github__issue_write`, `method: "update"`, `state: "closed"`, `state_reason: "not_planned"` |
| Jira | `mcp__atlassian__addCommentToJiraIssue` | `mcp__atlassian__getTransitionsForJiraIssue`, then `mcp__atlassian__transitionJiraIssue` with the transition whose target status is in the `done` category, preferring one named like "Won't Do" / "Abandonné" / "Cancelled" over a plain "Done" |

The comment is one or two sentences in the ticket language: the plan was reworked, this ticket is no
longer part of it, and why, from the change log entry. When it was merged into another story, it
names that story (`Merged into #412.`), which is why closes run after updates and adds.

`not_planned` and a "won't do" transition are the truthful close: the work was not done. A plain
"Done" is the fallback only when the workflow offers nothing else, and the comment then says it was
dropped, not delivered.

A Jira workflow with no transition to a `done`-category status from the ticket's current one is a
failure of that line (§6), reported with the transitions that were available. Never walk a ticket
through intermediate statuses to reach one: that would write a history of work that never happened.

## 6. Partial failure

A rework is **not** transactional and must not pretend to be. Never roll back: an edit that landed is
a real edit, a story that was filed is a real story.

Track, as you go, each diff line as landed or failed, with the reason (the status and what it
refused). Then:

1. **Keep going** with every line that does not depend on a failed one. An update that failed does
   not stop an unrelated add. What depends on a failed line is **skipped** and reported as such: a
   close whose comment points at a story that failed to be added, a story whose epic failed to be
   created.
2. **Write the table from what landed** (SKILL.md Step 7.1): a failed add has no row, a failed close
   keeps its row without the ` (closed)` suffix, a failed update keeps its old title.
3. Display `MSG_CHANGE_PARTIAL`.
4. Send `/plan/tickets` anyway, with what the tracker actually holds (SKILL.md Step 7.2).

A hierarchy link that fails while the story exists is the mildest case, as in `/magic:plan`: the
story is usable, the epic will not show it. Report it and name the story key so it takes one edit.

A rejection that advances Jira's hierarchy cascade is not a failure here either, per
`../magic-plan/references/trackers.md` §4.

## Usage

SKILL.md reads §1 in Step 1.3, §2 in Step 3, §4's Jira required-field pass in Step 5 when the diff
adds a story, and §3-§6 in Step 6. This table is what the file returns; SKILL.md restates none of it:

| Returned | Shape | Consumer |
| --- | --- | --- |
| `tracker` | `github` or `jira` | every later step |
| `tracker_target` | `github.com/owner/repo`, or `PROJ` on the site | `MSG_CHANGE_DIFF`, `MSG_CHANGE_APPROVAL`, `MSG_CHANGE_APPLIED` |
| `live` | per ticket: `{key, title, body, state, in_progress_reason?}`, `state` ∈ `open` / `in_progress` / `closed` / `unreadable` | Step 3, Step 5 |
| `landed` | ordered list of `{action, key, title, url}`, `action` ∈ `update` / `add` / `close`; an added story's `key` is the tracker-issued one | Step 7, `MSG_CHANGE_APPLIED`, `MSG_CHANGE_NEXT_STEPS` |
| `failed` | list of `{action, key_or_title, reason}`, empty on success; a skipped line carries `skipped` and the line it depended on | `MSG_CHANGE_PARTIAL` |
| `hierarchy_route` | Jira only, per added story: `parent` / `epic_link` / `issue_link` | `MSG_CHANGE_APPLIED` |

**If this file is missing on disk**: change no ticket. The spec rework of Step 4 stands on its own;
say in one line that the tickets cannot be updated because this reference is absent, point at the
reworked spec and its change log, and stop.
