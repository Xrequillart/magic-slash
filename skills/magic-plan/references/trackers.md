# Tracker abstraction

Read §1 in Step 2.3, when the tracker is resolved, and §2-§4 in Step 7 once the user has approved
the ticket structure. This file owns everything about turning an approved breakdown into real
tickets: which tracker receives them, what each tracker requires, how a parent/child hierarchy is
created, and how a partial failure is reported.

It is a **branch per tracker**, on purpose. GitHub (§2) and Jira (§3) each own their own section
and neither touches `SKILL.md`: the steps before this file are tracker-agnostic — an idea, a spec,
a sizing verdict and an approval mean the same thing whatever the backlog is. Adding Linear later
fills a third section here. If a new tracker ever forces a change to `SKILL.md`, the abstraction
has leaked and the fix belongs here.

Step 2 already resolved **which** tracker, and refused the run only when the resolved tracker
cannot receive a ticket at all (§1.2). Reaching Step 7 therefore means the tracker is usable — do
not re-detect it and do not re-ask: §1.1's carried resolution is the only source for it.

## 1. Detection — owned by Step 2, documented here

Detection runs in Step 2 rather than here because a tracker that cannot be served must stop the
skill *before* the brainstorm, not after it. The resolution order:

| Order | Source | Outcome |
| --- | --- | --- |
| 1 | `plan.tracker` is `github` or `jira` | that tracker, no question asked |
| 2 | `plan.tracker` is `ask` and only one of `issues.githubIssuesUrl` / `issues.jiraUrl` is set | the one that is set |
| 3 | `plan.tracker` is `ask`, and both are set | ask with `MSG_TRACKER_ASK` |
| 4 | `plan.tracker` is `ask`, and neither is set, but `git remote get-url origin` is a GitHub remote | GitHub |
| 5 | nothing resolves | ask with `MSG_TRACKER_ASK`, offering every tracker that can actually receive a ticket |

Row 4 is what makes the common case silent: a repository cloned from GitHub with no `issues.*`
configured at all still plans without a question. Row 2 beats row 4 deliberately — an explicitly
configured Jira project outranks the fact that the code happens to live on GitHub.

Rows 3 and 5 offer **every tracker that could actually receive the tickets, and only those**. Jira
qualifies when `integrations.atlassian` is on and `plan.jiraProject` is set — the project key alone
is enough, even with `issues.jiraUrl` empty, because the key is what a write needs while that URL
only decides whether a browse link can be displayed (§3.1). GitHub qualifies when
`issues.githubIssuesUrl` is set, or the `origin` remote is a GitHub one.

When **neither** qualifies — no GitHub remote, no `issues.githubIssuesUrl`, no `plan.jiraProject` —
there is nothing to ask: a question whose only options lead nowhere is worse than a refusal. Refuse
the run with `MSG_TRACKER_NONE`, which names the two settings that would give this repository a
backlog, at Step 2.3, before the brainstorm, for §1.2's reason. A repository added by path and never
cloned reaches this legitimately.

An unknown value in `plan.tracker` (the field is `string`-typed jsonb the webapp writes wholesale,
so it can hold anything) is treated as `ask`, never as a failure.

### 1.1 The resolution is carried, not re-derived

The resolution has **three** consumers, not one: the required-field discovery of Step 2.3, the
duplicate search of Step 3.3, and the creation in Step 7. Resolve it once, at Step 2.3, and carry
these values for the rest of the run:

| Carried | Shape | Read by |
| --- | --- | --- |
| `tracker` | `github` / `jira` | Step 3.3, Step 7 |
| `tracker_target` | `github.com/acme/api`, or `PROJ` on the Jira site | `MSG_APPROVAL`, `MSG_TICKETS_CREATED` |
| `owner/repo` | GitHub only, parsed per §2.1 | §2.3, Step 3.3 |
| `required_field_answers` | Jira only, the Step 4 answers keyed by field id | §3.2 |

On a Jira run, **everything `references/jira-fields.md`'s `## Usage` table returns is carried
alongside those** — the site, the project key, the issue types, the must-ask fields, the four
create-screen values §3.4-§3.6 read, and `degraded`. That table is the contract for their shapes and
their consumers and it is deliberately **not restated here**: two tables listing the same rows are
two tables that drift. What §1.1 owns is that the resolution exists, travels, and has those three
consumers — not the row-by-row shapes.

`required_field_answers` is the one Jira row above because it is the one that pass does not produce:
it comes from **Step 4**, which asks for the pass's `must_ask_fields` once the spec exists to record
the answers in.

This is what makes "asks exactly once" true. A branch that re-derives the tracker asks
`MSG_TRACKER_ASK` a second time on a `plan.tracker: ask` repository, which reads as the skill having
forgotten the answer — and a branch that re-resolves the `cloudId` or the issue-type ids spends
calls to learn what it already knows. `references/jira-fields.md` owns those calls and the rules
behind them; §3 spends none of them a second time, with the single exception §3.4's `unknown` rule
names — a create screen that paging left half-read is finished there rather than guessed at.

### 1.2 When the resolved tracker cannot receive a ticket

Jira resolves (row 1, 2, 3 or 5) but `integrations.atlassian` is `false`, or `plan.jiraProject` is
empty: **refuse the run** with `MSG_JIRA_NOT_CONFIGURED`, at Step 2.3, before the brainstorm.

Two things that refusal must not become:

- **Never a silent fallback to GitHub.** Filing a Jira-destined idea in a GitHub backlog nobody on
  that project reads is the failure mode this file exists to prevent. A ticket in the wrong tracker
  is worse than no ticket: it looks filed.
- **Never a refusal after the brainstorm.** The two conditions are known from the config alone, so
  there is nothing to explore before checking them. An hour of framing that ends on "I cannot
  create this" is the outcome the Step 2.3 placement exists to avoid.

`MSG_JIRA_NOT_CONFIGURED` names which of the two conditions fired, because they are fixed in
different places — the integrations toggle and the repository's Plan settings.

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

## 3. Jira — implemented

Every rule below is explicit about what is discovered before a call and what is never guessed at
call time: this is the only branch in the product that writes to Jira, and a guess here files a real
issue in a real backlog.

Where a rule is identical to GitHub's, this section points at §2 rather than restating it. When a
third tracker arrives, the shared rules move up into a preamble and both branches point at that.

### 3.1 Resolving the target

The destination is `plan.jiraProject` — the project **key**, e.g. `PROJ` — on the site named by the
`cloudId` carried in §1.1.

`issues.jiraUrl` is **not** the target. It is the base of the browse URL shown to the user
(`{jiraUrl}/browse/PROJ-123`) and nothing else — one site hosts many projects, so the project key
comes from `plan.jiraProject` and the site from the carried `cloudId`, never from that URL.

When `issues.jiraUrl` is empty, the issues are still created and still reported — use the `self`
link the create response returns and say the browse URL is unconfigured, rather than inventing a
host.

### 3.2 Required fields

Discovered **before** the structure is proposed, never at write time. `references/jira-fields.md`
§2 owns the auto-fill/must-ask split: every field on the create screen is either filled from there
or answered from the carried `required_field_answers`. What is decided *here* is only this:

| Field | Source | Notes |
| --- | --- | --- |
| `summary` | the spec's breakdown section | imperative, no ticket-type prefix — `Add …`, not `[Story] Add …` |
| `description` | generated **from the spec** | never from conversation memory; see §3.3 |
| the parent link | §3.4 | a hierarchy decision, not a body field |

`issueTypeName` carries the **name** of the type resolved in `jira-fields.md` §1.2 — that is the
only issue-type parameter `createJiraIssue` has. The id carried alongside it is what the discovery
call consumed (`jira-fields.md` §1.3) and is not sent here. The resolution itself still matters for
its original reason: `plan.issueTypes.*` may name a type this project does not offer, and that stops
the run before the brainstorm rather than producing a guess.

**`additional_fields` is the only channel for a field with no parameter of its own.** It takes a
JSON object keyed by field name or field id, and it is how three things reach the create call: the
epic-link custom field (§3.4 route 2), `labels` (§3.6), and every answer in the carried
`required_field_answers` — **except `assignee`**. `summary`, `description` with `contentFormat`,
`assignee_account_id` and `parent` each have their own parameter, so they never go through
`additional_fields`.

**`assignee` is the one field that is both.** It can be a `required_field_answers` entry — a project
that makes it mandatory while `plan.assignToMe` is false sends the user to Step 4 like any other
must-ask field (`jira-fields.md` §2) — *and* it has its own `createJiraIssue` parameter. The two
rules above would send it to both places, so the exception wins: whichever of its two provenances
applies, the value goes in `assignee_account_id`.

| Provenance | Carried as | Sent as |
| --- | --- | --- |
| the pre-flight resolved it (`plan.assignToMe` true) | `jira-fields.md`'s `assignee_account_id` | `assignee_account_id` |
| Step 4 answered it (must-ask) | a `required_field_answers` entry | `assignee_account_id`, **not** `additional_fields` |

And it is a **bare account id string** in both cases, not the `{"accountId": …}` object other
user-picker fields use — `jira-fields.md` §3's conversion table states that exception at the shape
level; this is the routing half of it. An `assignee` answer left in `additional_fields` is either
rejected or, worse, accepted while the issue stays unassigned — a silent miss on a field the project
declared mandatory.

**The answers travel already converted.** `required_field_answers` holds each value in the shape
`createJiraIssue` accepts — an option object, an array of them, an account id object — never the
display string the user answered with. `jira-fields.md` §3 owns that conversion and the table that
drives it; what §3.2 owns is only putting the converted value in the right channel. A display value
arriving here unconverted is the same defect as a missing one, and gets the same treatment as the
rule below: name the field, and do not send a call whose only possible answer is a 400.

**Send a per-type field only on the type that required it.** `jira-fields.md` §2 deliberately keeps
which issue type made each field mandatory: a "Team" required on the story type is not on the epic's
create screen, and sending it there is a rejection on a field that project never asked for.

The description is written in `languages.ticket`, per §2.2 — same rule, same reason: the spec *is*
the source text, so a description in another language would mean it was composed from somewhere
else.

A required field arriving at §3.3 without a value is a **defect in the discovery pass, not
something to guess**. Say which field and which issue type, and do not send a call whose only
possible answer is a 400.

### 3.3 Creating an issue

Use `mcp__atlassian__createJiraIssue`, one call per ticket.

Create the **epic first**, then the stories, for §2.3's reason: the parent must exist before a child
can point at it.

Compose each description from **§2.3's five spec sections, in §2.3's order**, including its
per-story slicing and its omission of section 3 on the epic. That list is deliberately not restated
here: there is **one** body format in this file and §2.3 holds it. A second, Jira-flavoured
structure would make two tickets planned by the same skill from the same spec read differently
depending on which backlog they landed in — and the spec is what the user approved, in both cases.

Pass the description as markdown text and let the tool carry it; do not hand-build an ADF document.
If a call is rejected on the body shape, retry it once with the same five sections as plain text
with plain headings, and say in one line that the formatting degraded — the content of a ticket
matters and its rich text does not.

### 3.4 The hierarchy — three discovered routes, not a guess

A Jira epic/story hierarchy is not one mechanism but three, and which one a project exposes depends
on the Jira version and the project type. Try them in this order, stop at the first that works, and
**state which one landed** — that is a stated requirement of this feature, not a nicety, because it
is what decides whether the epic will show a progress bar in the Jira UI.

| # | Route | Available when | How |
| --- | --- | --- | --- |
| 1 | native `parent` | `story_has_parent_field` is true, or `unknown` | send `parent` with the epic key in the story's create call |
| 2 | the epic-link custom field | `epic_link_field_id` is set, or `unknown` | send it with the epic key in `additional_fields` |
| 3 | an issue link | neither of the above, or both were rejected | create the story unparented, then `mcp__atlassian__createIssueLink` |

**`unknown` is not `false`, so the route is attempted rather than skipped.** `jira-fields.md` §4
reports these values as `unknown` — never as `false`, an empty id or an omitted field — when the
create screen was read only in part, and `unknown` means "not seen", not "absent". A route attempted
on an `unknown` value either works, because the field was there and simply unread, or it is rejected
and the cascade advances exactly as it does for a rejection below. Only `false` or an empty value
skips a route, and only because it means the screen was read to the end and the field genuinely is
not there. Reading `unknown` as `false` drops a partially-read screen straight onto route 3, which
is the outcome that file's paging rules exist to prevent. Route 2 is the one route with nothing to
send on `unknown` — there is no id yet — so there the attempt is to finish the read that stopped,
paging `getJiraIssueTypeMetaWithFields` for the story type again, and route 3 follows only once that
read completes with no epic-link field. §3.5 and §3.6 read their own carried values the same way.

**Route 1 costs no extra call**, which is why it is first: `parent` is part of the story's create
payload, so the story is parented the instant it exists and there is no window in which it is an
orphan. Routes 2 and 3 exist for older instances and for projects whose create screen does not
carry `parent`.

`createJiraIssue` documents its `parent` parameter as "Parent for subtasks", and route 1 sends the
epic key through it regardless — that is what modern team-managed projects accept for a story under
an epic. On an instance where `parent` really is subtask-only, the call is rejected and route 2
takes over, which is one of the reasons the cascade has three routes rather than one.

**A rejection advances the cascade; it is not a §4 failure.** Re-create the same story with the
epic link carried in `additional_fields` (route 2). If *that* call is rejected too, one route is
left, and reaching it takes a step the other two do not need: **create the story unparented** — no
`parent`, no epic-link field — and then link it with route 3. Route 3 is the only route whose
hierarchy is a second call, which is precisely why it is the only one that needs the story to exist
first. §4 applies only when route 3 itself fails: either its unparented create, or its link call.

Be precise about the state a rejection leaves: a rejected create call created nothing, so there is
no orphan story to delete and nothing to roll back — which is what makes advancing safe and keeps
§4's never-roll-back rule intact. Reporting a partial creation on a rejection would report a failure
on a project where the next route was about to work. The one state that is *not* clean is route 3's
own window: between the unparented create and the link, the story exists with no parent. If the link
fails there both issues exist, and that is §4's mildest case — reported, never rolled back.

**Never hardcode a `customfield_` id for route 2.** The epic-link field has a different numeric id
on every Jira site; a hardcoded one either 400s or, worse, writes into an unrelated field that
happens to share the number. Use the carried `epic_link_field_id`, sent in `additional_fields` per
§3.2 — `jira-fields.md` §1.3 already read that create screen and matched the field on its
`schema.custom`. Empty means route 2 is unavailable: fall through to route 3, never guess an id, and
never re-read the screen looking for one. `unknown` is the one case where you do re-read, per the
rule above — empty and unknown are different answers.

**Never hardcode a link type name for route 3.** Link type names are configured per site, exactly
as `skills/magic-start/references/dependencies.md` §2.1 states for the blocker gate. Call
`mcp__atlassian__getIssueLinkTypes` and keep the type whose labels mean parent/child — "Epic-Story",
"Parent-Child", and "Relates" only as a last resort. If `getIssueLinkTypes` fails, fall back to the
literal string `Relates` and say the link type resolution degraded, per the route-announcement rule
above.

**Derive the direction from the type you kept, never from a convention.** `createIssueLink` takes
an `inwardIssue` and an `outwardIssue`, and the tool's own example fixes which is which: for "A is
blocked by B" it documents `inwardIssue: B, outwardIssue: A`. On the `Blocks` type `outward` is
"blocks" and `inward` is "is blocked by", so B — the `inwardIssue` — is the one that *blocks*. The
rule that follows is **`inwardIssue` {the type's `outward` label} `outwardIssue`**, and
`skills/magic-start/references/dependencies.md` §2.1 states the same thing for the blocker gate:
for "A is blocked by B", `inwardIssue` is B, the blocker. Read the two labels of the type actually
chosen and place the issues by that rule. When the kept type's `outward` label is the parent-side
one — "is Epic of", "is parent of" — the **epic** is `inwardIssue` and the **story** is
`outwardIssue`. When its `outward` label is the child-side one — "is child of", "is Story of" — the
two swap. Deriving it from the labels is what lets a site whose type is named the other way round
still get a correct link. On the `Relates` last resort both labels say the same thing: the type is
symmetric, the order carries no meaning, and either one is right.

**A link created in the wrong direction is a silent failure.** `createIssueLink` accepts it, returns
success, and the response looks exactly like a correct one — the relation simply reads the wrong way
round in the Jira UI, where the story appears to be the parent of its epic. Nothing downstream
detects it and no message reports it, which is why the direction is derived from the resolved type's
own labels rather than assumed: a backwards Epic↔Story link is the failure this route exists to
avoid, and it is the one failure here that would be reported as a success.

Route 3 is the weakest outcome and is named as such. A plain issue link gives no progress bar on the
epic and no parent breadcrumb on the story — but it is a relation, and unlinked issues are what the
"a real hierarchy, visible as such in the Jira UI" requirement forbids. Report route 3 as a
hierarchy that landed **in a degraded form**: not a success to be quiet about, not a failure to be
reported as one.

**Depth is one level, per §2.4** — with one difference: Jira will happily nest further than GitHub
does, so here it is a rule to enforce rather than one the tracker enforces for you.

A hierarchy call that fails while both issues exist is §4's mildest case, and it is still reported.

### 3.5 Description templates

When `plan.useRepoTemplates` is `true` (the default), honour the project's own description template
— the carried `description_template` for that issue type, which is what someone filing by hand sees
pre-filled in the create screen.

- §2.5's fill rules apply unchanged, for its reasons: map the spec onto the template's **own**
  headings, never append the §3.3 structure below them, and give a section the spec cannot answer an
  explicit `N/A` rather than leaving the placeholder as shipped.
- An empty `description_template` means the type has no template. Use the §3.3 structure.
- An **`unknown`** one does not mean that. Per §3.4's `unknown` rule the value was never read, so
  there is no template text to fill: use the §3.3 structure, but say in one line that the type's
  template could not be read. A body composed as if the project had no template is a claim this run
  is not in a position to make.

**The epic still carries no acceptance criteria.** `references/sizing.md` §3.5 states that as a
contract — the epic is done when its stories are, and criteria on both levels means the same
requirement is checked twice and drifts in one of the two places. A description template with an
"Acceptance criteria" heading does **not** override it: on the epic that heading is filled with an
explicit `N/A` and a one-line pointer to the stories. A template decides the shape of a body, never
what the body is allowed to assert.

When `plan.useRepoTemplates` is `false`, use the §3.3 structure.

### 3.6 Labels and assignee

- **Labels**: `plan.defaultLabels` on every created issue, epic included, sent in
  `additional_fields` per §3.2 — `createJiraIssue` has no `labels` parameter. Jira labels are
  **free-form** — an unknown one is created on the spot — so there is no missing-label rejection to
  recover from and §2.6's GitHub 422 retry has **no equivalent here**; do not copy it. The failure
  that does happen is the `labels` field being absent from that issue type's create screen, which
  company-managed projects do configure — and the carried `screen_omits` already names it, *before*
  any call. Drop the labels then, say in one line that the issue type carries no `labels` field, and
  create the issue without them. Never discover this as an error. **A `labels` field the screen makes
  *required* while `plan.defaultLabels` is empty is a different case and is not dropped**:
  `jira-fields.md` §2 classified it must-ask, so its value comes from `required_field_answers` and
  rides in `additional_fields` like any other answer. Dropping it here would be the 400 that pass
  exists to prevent. That is the `false` reading —
  `screen_omits` naming `labels` on a screen read to the end. An `unknown` one is not an omission:
  per §3.4's `unknown` rule the labels are sent, and dropped only if the call comes back rejected on
  that field.
- **Assignee**: §2.6's rule, with the account id in place of the login — resolved once per run, not
  per issue, and sent as `assignee_account_id`, which is a parameter of its own and not an
  `additional_fields` entry. **Read the carried `assignee_account_id` first**: on a required
  `assignee` the pre-flight already resolved it (`jira-fields.md` §2), and re-resolving here would
  spend the same two calls again to learn the same answer. It is empty in every other case, and only
  then does the resolution below run. Resolving "me" takes **two calls, in this order**, because Jira exposes
  no single equivalent of `mcp__github__get_me`: `mcp__atlassian__atlassianUserInfo` first — it takes
  no parameters and answers who the authenticated user is — then
  `mcp__atlassian__lookupJiraAccountId` with that identity as its `searchString`, since that tool is
  a search and has no current-user mode. Skip the second call when the first already carries an
  account id. **Never substitute a search term of your own**: §2.6 forbids inferring the identity
  from `git config user.email`, and a `searchString` invented here is that same guess wearing a Jira
  parameter. If neither call yields an account id, say so in one line and create the issues
  unassigned — `plan.assignToMe` is a convenience, never worth failing a creation over. **That
  fallback is unavailable when the screen makes `assignee` required**: there, unassigned *is* the
  rejection, so `jira-fields.md` §2 has already classified the field must-ask — whether because
  `plan.assignToMe` is false or because no account id resolved — and its value arrives through
  `required_field_answers`. As with
  `labels`, an issue type whose create screen has no `assignee` field is named by the carried
  `screen_omits`: say so and continue — and an `unknown` there reads as §3.4's rule says, the account
  id sent and dropped only on a rejection.

### 3.7 Manual verification

`skills/evals/eval_set.json` is trigger-only — a query mapped to an expected skill — so no eval
entry can exercise a Jira write. This checklist is the verification instead, run by hand against a
real Jira project before this branch is trusted. One entry per scenario: the setup, then what must
be observed.

- Renamed issue types — epic type `Initiative`, story type `Task`, `plan.issueTypes` set to those
  names.
  - Expected: creation succeeds, the issues carry those types, and nothing anywhere says "Epic" or
    "Story".
- `plan.issueTypes.story` names an absent type.
  - Expected: `MSG_JIRA_NOT_CONFIGURED` lists real types, no question, no ticket.
- A mandatory custom field on the story type only — typically a required "Team" or "Component"
  select.
  - Expected: Step 4 asks once, inside the framing batch, offering its `allowedValues`; the answer
    lands in `## Framing decisions`; creation succeeds; the epic is never asked.
- Both `issues.jiraUrl` and `issues.githubIssuesUrl`, `plan.tracker: jira`.
  - Expected: no tracker question, tickets in Jira.
- The same repository, `plan.tracker: ask`.
  - Expected: exactly **one** question, at Step 2.3 — the duplicate check and the creation reuse
    that answer.
- `plan.tracker: jira`, `plan.jiraProject` empty.
  - Expected: `MSG_JIRA_NOT_CONFIGURED` before the brainstorm, no GitHub fallback.
- A create screen that makes `labels` **required**, with `plan.defaultLabels` left at its `[]`
  default — then the same with `assignee` required and `plan.assignToMe` left at `false`.
  - Expected: both reach Step 4's question as must-ask fields, per `jira-fields.md` §2, and creation
    succeeds with the answered values. What must **not** happen is the field being treated as
    config-filled and the creation rejected on it after the approval.
- The same required `assignee`, this time with `plan.assignToMe` **true** — the other provenance.
  - Expected: no question at all; the pre-flight resolves the account id, carries it as
    `assignee_account_id`, and the created issues are assigned to you. What must **not** happen is
    the id being resolved and then lost between the pass and the create call.
- A required single-select custom field, then a required user-picker one — a "Severity" with
  `allowedValues`, and a "Reviewer" naming a person.
  - Expected: the select is asked with its options and sent as `{"id": …}` resolved from the picked
    `allowedValues` entry, not as its label; the user-picker answer goes through
    `lookupJiraAccountId` and is sent as `{"accountId": …}`. Creation succeeds. What must **not**
    happen is the displayed string reaching `additional_fields` verbatim.
- The story type uncreatable for the user, the epic type creatable.
  - Expected: the epic survives; the report names its key and URL plus every story that did not
    land, with its reason; `## Created tickets` holds the epic; nothing is rolled back.
- A team-managed project, then an older company-managed one.
  - Expected: a real parent/child relation visible in the Jira UI both times, and a line naming the
    route used — `parent`, then `epic_link`.
- A project whose story create screen pre-fills a description template.
  - Expected: that template arrives as the `description` field's default value in
    `jira-fields.md` §1.3's response — the read-but-undocumented assumption that file flags — and
    §3.5's fill rules shape the body, not §3.3's structure.

An observed outcome that differs from the expected one is a defect in this file, not a project
misconfiguration: §3.2 and §3.4 exist precisely so that project variation is discovered rather than
assumed.

## 4. Partial failure

Ticket creation is **not** transactional and must not pretend to be. Several calls are made in
sequence, and any one of them can fail on its own.

**Never roll back.** A created issue is a real issue with a real identifier — `#412`, `PROJ-1234` —
and closing or deleting it to restore a clean slate destroys a URL that may already be in someone's
notification feed. Report instead.

Track, as you go: which tickets were created (identifier + URL), which failed and with what reason,
and which hierarchy links landed. On any failure:

1. Stop the creation sequence. Do not keep creating stories under an epic that failed to be created
   — they would be orphans with no parent to attach to.
2. Append what **was** created to the spec (§5 of `references/spec-template.md`), before displaying
   anything. If the report is the only record and the session ends, the numbers are lost.
3. Display `MSG_PARTIAL_CREATION` with the created list, the failed list, and a per-failure reason
   precise enough to resume from — the HTTP status and what it was refusing, not "an error".
4. Send the metadata call anyway (Step 7.1 of `SKILL.md`), carrying whatever ticket id does exist.
   A half-created plan is still a plan the sidebar should show.

**A rejection on the hierarchy is not a failure here, and the sequence above must not fire on it**:
a story create call rejected on `parent` (§3.4, route 1) or on the epic-link field (route 2). That
is the cascade advancing — to route 2, then to route 3, which creates the story unparented and links
it — and each rejected call created nothing, so there is no partial state to report and no orphan to
clean up. This becomes a failure only when route 3 fails: its unparented create, or its link call.
Then it is one failure, not three.

A hierarchy link that fails while both issues exist is the mildest case and still gets reported:
the tickets are usable, but the epic will show no progress and the story no parent, so someone has
to link them by hand. Say exactly that, and list the story keys so it takes one edit.

That covers both branches — a failed `mcp__github__sub_issue_write` on GitHub, and on Jira route 3
failing after routes 1 and 2 were unavailable or rejected, which is what "all three exhausted"
means. A rejection on route 1 or 2 alone is not this case, per the rule above, and neither is a
degraded route that *did* land: §3.4 announces route 3 as a success carrying its route.

## Usage

Step 7 of `SKILL.md` reads §2-§4 **after** the user has approved the structure. Once read, execute
§1's already-resolved outcome, then the matching tracker section, then §4 if anything fails, and
return these values — this table is the whole contract; `SKILL.md` restates none of it:

| Returned | Shape | Consumer |
| --- | --- | --- |
| `tracker` | `github` or `jira` | Step 7 metadata, `MSG_TICKETS_CREATED` |
| `tracker_target` | concrete destination — `github.com/acme/api`, or `PROJ` on `{jiraUrl}` / on the resolved site when that URL is unset | `MSG_APPROVAL`, `MSG_TICKETS_CREATED` |
| `created` | ordered list of `{id, title, url, kind}`, `kind` ∈ `epic` / `story`; `id` is `#412` or `PROJ-1234` | spec append, metadata, `MSG_NEXT_STEPS` |
| `failed` | list of `{title, reason}`, empty on success | `MSG_PARTIAL_CREATION` |
| `hierarchy_ok` | true when every parent/child link landed | `MSG_TICKETS_CREATED` / `MSG_PARTIAL_CREATION` |
| `hierarchy_route` | Jira only: `parent` / `epic_link` / `issue_link` | `{hierarchy_route}` in `MSG_TICKETS_CREATED` |
| `primary_ticket_id` | the epic on a breakdown, the story on a single — `#412` or `PROJ-1234` | `ticketId` in the Step 7.1 metadata call |

`primary_ticket_id` is the epic on a breakdown because the agent planned the whole epic — that is
what this terminal did. `MSG_NEXT_STEPS` still offers the **first story** for `/magic:start`: what
the agent represents and what a person checks out a branch for are two different things.

**If this file is missing on disk**: create nothing. Say in one line that ticket creation cannot run
because its reference file is absent, point at the finished spec, and stop. The spec is the valuable
artefact of the session and it already exists by this point — a hand-created ticket from a good spec
is a fine outcome, while a ticket improvised without this file's rules is not.
