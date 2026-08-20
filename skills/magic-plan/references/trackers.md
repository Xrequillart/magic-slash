# Tracker abstraction

Read this file in Step 7, once the user has approved the ticket structure. It owns everything
about turning the approved breakdown into real tickets: which tracker receives them, what each
tracker requires, how a parent/child hierarchy is created, and how a partial failure is reported.

It is a **branch per tracker**, on purpose. Adding Jira (#199) or Linear later fills in a section
here and touches nothing in `SKILL.md`: the steps before this file are tracker-agnostic — an idea,
a spec, a sizing verdict and an approval mean the same thing whatever the backlog is. If a new
tracker ever forces a change to `SKILL.md`, the abstraction has leaked and the fix belongs here.

Step 2 already resolved **which** tracker, and stopped the skill if it was one this file cannot
serve. Reaching Step 7 therefore means the tracker is supported — do not re-detect it.

## 1. Detection — owned by Step 2, documented here

Detection runs in Step 2 rather than here because a tracker that cannot be served must stop the
skill *before* the brainstorm, not after it. The resolution order:

| Order | Source | Outcome |
| --- | --- | --- |
| 1 | `plan.tracker` is `github` or `jira` | that tracker, no question asked |
| 2 | `plan.tracker` is `ask`, and exactly one of `issues.githubIssuesUrl` / `issues.jiraUrl` is set | the one that is set |
| 3 | `plan.tracker` is `ask`, and both are set | ask with `MSG_TRACKER_ASK` |
| 4 | `plan.tracker` is `ask`, and neither is set, but `git remote get-url origin` is a GitHub remote | GitHub |
| 5 | nothing resolves | ask with `MSG_TRACKER_ASK`, listing only supported trackers |

Row 4 is what makes the common case silent: a repository cloned from GitHub with no `issues.*`
configured at all still plans without a question. Row 2 beats row 4 deliberately — an explicitly
configured Jira project outranks the fact that the code happens to live on GitHub.

An unknown value in `plan.tracker` (the field is `string`-typed jsonb the webapp writes wholesale,
so it can hold anything) is treated as `ask`, never as a failure.

## 2. GitHub — implemented

### 2.1 Resolving the target

```bash
cd {REPO_PATH} && git remote get-url origin
```

Parse `owner/repo` from either `git@github.com:owner/repo.git` or
`https://github.com/owner/repo.git`. Prefer `issues.githubIssuesUrl` when it is set and names a
different repository — a repo whose issues live in a separate tracker repository is a real
configuration, and the remote would silently file the tickets in the wrong place.

### 2.2 Required fields

| Field | Source | Notes |
| --- | --- | --- |
| `title` | the spec's breakdown section | imperative, no ticket-type prefix — `Add …`, not `[Story] Add …` |
| `body` | generated **from the spec** | never from conversation memory; see §2.3 |
| `labels` | `plan.defaultLabels` + any label the template declares | see §2.5 |
| `assignees` | `plan.assignToMe` | see §2.6 |

The body is written in `languages.ticket`, the same language the spec is written in. That is not a
coincidence to preserve loosely: the spec *is* the source text, so a body in another language would
mean the body was re-composed from somewhere else.

### 2.3 Creating an issue

Use `mcp__github__issue_write` with `method: "create"`, one call per ticket.

Create the **epic first**, then the stories. The parent must exist before a sub-issue can point at
it, and a story created before its epic leaves an orphan that has to be re-parented by hand.

Each body is composed from the spec sections, in this order:

1. **Context** — the idea as stated, plus the framing decisions that apply to this story
2. **Scope** — what this ticket delivers, and explicitly what it does not
3. **Codebase pointers** — the files and patterns the Step 3 exploration identified for this story
4. **Acceptance criteria** — in the `plan.acceptanceCriteria` format (`references/sizing.md` §4)
5. **Parent** — on a story, a line naming the epic; on the epic, the list of its stories

Sections 1-4 are per-story slices of the spec, not the whole spec pasted into every ticket. A story
carrying its four siblings' criteria is a story nobody can tell is done.

On the epic, section 3 is omitted: an epic is not implemented directly, and file pointers on it go
stale before the last story is picked up.

### 2.4 The hierarchy — real sub-issues, not a checklist

Once the epic and all stories exist, link each story to the epic with
`mcp__github__sub_issue_write` (`method: "add"`, the epic as the parent, the story as the
sub-issue).

A markdown task list in the epic body is **not** a substitute. GitHub's native sub-issue links are
what drive the progress bar on the epic, the parent breadcrumb on each story, and the
`issue_dependencies_summary` other skills read. A checklist gives none of that, and it silently
rots the moment a title is edited.

Add a task list **in addition** when you like — but the sub-issue calls are the contract, and a
failure on one of them is a real failure (§4), not a cosmetic one.

**Depth is one level.** Epic → stories, never epic → story → sub-story. `references/sizing.md`
produces exactly that shape, and a deeper tree is a sign the epic should have been two epics.

### 2.5 Issue templates

When `plan.useRepoTemplates` is `true` (the default), honour the repository's own templates:

```bash
ls .github/ISSUE_TEMPLATE/ 2>/dev/null
```

- Pick the template whose name matches the ticket's nature (`feature`, `enhancement`, `bug`,
  `task`). With several plausible matches, prefer the one whose YAML frontmatter `labels` overlap
  `plan.defaultLabels`; with none, prefer `feature`/`enhancement` for a feature idea.
- Fill the template's **own** sections with the spec content — do not append the §2.3 structure
  after it. A repository that asks for "Steps to reproduce" wants the spec mapped onto its
  headings, not a second document below them.
- A section the spec cannot answer gets an explicit `N/A` line, never a placeholder left as shipped.
  A body still carrying `<!-- describe the bug here -->` is how a template makes a ticket worse.
- Merge the template's declared `labels` with `plan.defaultLabels`; the union, deduplicated.
- Issue **forms** (`.yml` with a `body:` list) cannot be submitted through the API as a form. Map
  each field's `label` to a markdown heading and fill it. Required fields must all be answered.
- `config.yml` is not a template. Skip it.

When `plan.useRepoTemplates` is `false`, or no template directory exists, use the §2.3 structure.

### 2.6 Labels and assignee

- **Labels**: `plan.defaultLabels` on every created ticket, epic included, plus the template's
  labels per §2.5. A label that does not exist in the repository makes the whole create call fail
  with a 422 — so on that failure, retry once **without** the labels rather than losing the ticket,
  and say in one line which label was dropped. A ticket with a missing label beats no ticket.
- **Assignee**: when `plan.assignToMe` is `true`, resolve the current user once with
  `mcp__github__get_me` and assign every created ticket. Once, not per ticket — the login does not
  change between two calls in the same run. When it is `false` (the default), send no assignee at
  all; do not guess from the git config `user.email`.

## 3. Jira — not implemented (#199)

**This section is deliberately empty.** Jira creation is not available, and Step 2 stops the skill
with `MSG_JIRA_NOT_AVAILABLE` before any exploration happens. Nothing downstream should attempt a
Jira write, and no fallback should quietly file a Jira-destined idea as a GitHub issue instead —
that would put tickets in a backlog nobody on that project reads.

When #199 lands, this is the slot it fills, and the shape it has to fill:

| Concern | What #199 must supply |
| --- | --- |
| Target project | `plan.jiraProject` (config key already exists), plus the `cloudId` |
| Issue types | `plan.issueTypes.epic` / `plan.issueTypes.story` (config keys already exist) |
| Creation call | `mcp__atlassian__createJiraIssue`, epic first, then stories |
| Hierarchy | the project's own epic link — parent field or `Epic Link`, discovered per project, never hardcoded |
| Required fields | discovered with `mcp__atlassian__getJiraIssueTypeMetaWithFields`; a mandatory custom field is a hard blocker, not something to guess |
| Templates | the project's description template, when `plan.useRepoTemplates` is on |
| Labels / assignee | `plan.defaultLabels` and `plan.assignToMe`, resolved via `mcp__atlassian__lookupJiraAccountId` |
| Gate to remove | the Step 2 stop, and this section's header |

Everything before Step 7 already works for Jira as written — the idea, the spec, the framing and
the sizing never touch a tracker. That is the whole point of this file existing.

## 4. Partial failure

Ticket creation is **not** transactional and must not pretend to be. Several calls are made in
sequence, and any one of them can fail on its own.

**Never roll back.** A created issue is a real issue with a real number, and closing or deleting it
to restore a clean slate destroys a URL that may already be in someone's notification feed. Report
instead.

Track, as you go: which tickets were created (number + URL), which failed and with what reason, and
which sub-issue links landed. On any failure:

1. Stop the creation sequence. Do not keep creating stories under an epic that failed to be created
   — they would be orphans with no parent to attach to.
2. Append what **was** created to the spec (§5 of `references/spec-template.md`), before displaying
   anything. If the report is the only record and the session ends, the numbers are lost.
3. Display `MSG_PARTIAL_CREATION` with the created list, the failed list, and a per-failure reason
   precise enough to resume from — the HTTP status and what it was refusing, not "an error".
4. Send the metadata call anyway (Step 7 of `SKILL.md`), carrying whatever ticket id does exist.
   A half-created plan is still a plan the sidebar should show.

A sub-issue link that fails while both issues exist is the mildest case and still gets reported:
the tickets are usable, but the epic will show no progress and the story no parent, so someone has
to link them by hand. Say exactly that.

## Usage

Step 7 of `SKILL.md` reads this file **after** the user has approved the structure. Once read,
execute §1's already-resolved outcome, then the matching tracker section, then §4 if anything
fails, and return these values — this table is the whole contract; `SKILL.md` restates none of it:

| Returned | Shape | Consumer |
| --- | --- | --- |
| `tracker` | `github` (only supported value today) | Step 7 metadata, `MSG_TICKETS_CREATED` |
| `tracker_target` | concrete destination, e.g. `github.com/acme/api` | `MSG_APPROVAL`, `MSG_TICKETS_CREATED` |
| `created` | ordered list of `{id, title, url, kind}`, `kind` ∈ `epic` / `story` | spec append, metadata, `MSG_NEXT_STEPS` |
| `failed` | list of `{title, reason}`, empty on success | `MSG_PARTIAL_CREATION` |
| `hierarchy_ok` | true when every sub-issue link landed | `MSG_TICKETS_CREATED` / `MSG_PARTIAL_CREATION` |
| `primary_ticket_id` | the epic on a breakdown, the story on a single | `ticketId` in the Step 7 metadata call |

`primary_ticket_id` is the epic on a breakdown because the agent planned the whole epic — that is
what this terminal did. `MSG_NEXT_STEPS` still offers the **first story** for `/magic:start`: what
the agent represents and what a person checks out a branch for are two different things.

**If this file is missing on disk**: create nothing. Say in one line that ticket creation cannot run
because its reference file is absent, point at the finished spec, and stop. The spec is the valuable
artefact of the session and it already exists by this point — a hand-created ticket from a good spec
is a fine outcome, while a ticket improvised without this file's rules is not.
