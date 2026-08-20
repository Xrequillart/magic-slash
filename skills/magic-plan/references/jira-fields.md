# Jira field discovery

Read this file in Step 2.3, and only when the tracker resolved to Jira. It owns the read-only pass
that answers three questions before anything is written: which Jira site, which issue types the
configured names map to, and which required fields the skill cannot fill on its own.

This pass is **read-only, and it runs before the spec exists**. It creates nothing, records nothing,
and defers every question it *can* defer to Step 4 — which owns the asking, while the spec's
`## Framing decisions` owns the record. The two it cannot defer are stops, not questions about
content (§1.2, §4): there is nothing downstream to defer them to, and no spec yet to record an
answer in — a stop leaves no record at all, which is why what it says has to name the config change
that fixes it.

Why so early, when the values are only needed at creation? Because required fields vary by project
**and** by issue type, so nothing in the config can predict them. Discovering them at write time
means a 400 arriving after the brainstorm, the framing and the approval — which is exactly the
outcome this file exists to remove. `references/trackers.md` §3.2 consumes what this returns.

## 1. The three calls, in order

They are **successive calls, not alternatives**. Each one needs the previous one's answer: the site
before the project, the project's types before a type's fields.

### 1.1 The site — `cloudId`

Call `mcp__atlassian__getAccessibleAtlassianResources` and take the `cloudId` of the site holding
the project.

Resolve it **within the run**, every run, exactly as every other skill in this repository does.
Never persist it, and never derive it from `jira.siteUrl`: a site can be reached through a vanity
domain, and no URL contains a `cloudId`. The two keys sitting in one block now makes that worth
repeating — the site URL is for showing a human a link, never for addressing a call. With several
accessible sites and no way to tell which one holds the Jira project (`trackers.md` §1.0), the
project lookup in §1.2 is what settles it — try the sites in the order returned and keep the one
where the project resolves.

### 1.2 The project's issue types — and the names in `plan.issueTypes`

Call `mcp__atlassian__getJiraProjectIssueTypesMetadata` for the Jira project (`jira.projectKey`,
else the legacy `plan.jiraProject` — `trackers.md` §1.0). It returns the issue types that project
actually offers, each with an **id** and a **name**.

That list is **paged**, and its `maxResults` defaults to 50: page with `startAt` until the response
is exhausted before concluding anything about a name, exactly as §1.3 does. A project with more than
fifty issue types is unlikely, but the configured type falling off page one would produce a refusal
saying the project has no issue type of that name when it has one.

Resolve `plan.issueTypes.epic` and `plan.issueTypes.story` **by name** against that list, and carry
**both** values of each resolved type — its **id** and its **name**. The two calls downstream want
different ones: `getJiraIssueTypeMetaWithFields` takes the id, as `issueTypeId` (§1.3), and
`createJiraIssue` takes the name, as `issueTypeName` (`trackers.md` §3.2). What the resolution is
*for* is unchanged — `plan.issueTypes.*` may name a type this project does not offer, and that
check still happens here; only which value each call receives differs.

- Match on the name, case-insensitively, trimming whitespace. Nothing else — do not match on a
  substring, or `Sub-task` would satisfy `Task`.
- **Never hardcode "Epic" and "Story".** They are only the *defaults* of two config keys, and an
  instance renames them freely: `Initiative`, `Feature`, `Chantier`, `Task`, `Requirement` are all
  real. A project that renamed them is one of this feature's acceptance criteria, not an edge case.
- A configured name **absent from the project**, or a project key that resolves nowhere, stops the
  pass — it is never a question. §4 owns what each stop says. Never guess, and never fall back to
  whatever type looks epic-shaped: picking the wrong type files a whole breakdown under a type the
  project's board does not display.

§4's rule is the only behaviour, and it does not depend on which of the two names is missing: this
pass runs at Step 2.3 while the sizing verdict is Step 5, so at this point nothing knows yet whether
the run would have needed the epic type. What the refusal does carry is **which** of the two is
missing — a missing epic type is far more often a `plan.issueTypes.epic` typo than a project that
cannot hold epics, and naming it is what lets the user fix the right key.

### 1.3 That type's required fields

Call `mcp__atlassian__getJiraIssueTypeMetaWithFields` **once per resolved type** — the epic type and
the story type — passing the project and, as `issueTypeId`, the type **id** from §1.2.

Pass `requiredFieldsOnly: false` **explicitly**. It defaults to `true`, and that default returns
only the mandatory fields — but four of the five rows below are *optional* fields on almost every
project (`parent`, `labels`, `assignee`, and `description`'s default). Left at the default they all
read as absent: every project falls to `trackers.md` §3.4's weakest hierarchy route, `defaultLabels`
and `assignToMe` are silently dropped as `screen_omits`, and no description template is ever found.
This is not an over-fetch to optimise back to the default.

**The field list is paged, so page it.** Ask for a generous `maxResults`, then keep calling with an
advancing `startAt` until the response is exhausted — and classify nothing until it is. Widening the
read to the whole create screen is exactly what makes truncation possible for the first time: on a
company-managed project with a large screen, `parent`, the epic-link field, `labels`, `assignee` or
the `description` default can each sit past page one. Classified from page one alone they read as
absent, which collapses the project onto `trackers.md` §3.4's weakest hierarchy route and drops
`plan.defaultLabels` and `plan.assignToMe` into `screen_omits` — the outcome the paragraph above
exists to prevent, arriving by a quieter route because the pass reports success. **A partial read is
never a complete create screen.**

It returns the create screen of *that* type in *that* project: one entry per field, each carrying
its own `fieldId`, its `name` — the display name — whether it is `required`, its `schema`, its
`allowedValues` when it has them, and its default value when it has one. Two types in the same
project routinely disagree, which is why this is one call per type rather than one call per project.

Five things this response answers that nothing else can, and that later steps depend on. Read them
all off this one response: every row below is a value `trackers.md` §1.1 carries, so no later step
calls this again — with one exception, and only one. When paging stopped early and a row came back
`unknown`, `trackers.md` §3.4's `unknown` rule finishes that read at Step 7 rather than letting
"not seen" harden into "absent". Re-reading a half-read screen is not re-deriving what is already
known; it is the only way that row ever becomes known.

| Question | Answered by | Consumed by |
| --- | --- | --- |
| which fields are mandatory | `required: true` | §2, then Step 4's question |
| whether the story type exposes a native `parent` | the presence of the `parent` field | `trackers.md` §3.4, route 1 |
| the epic-link field's id | `schema.custom` = `com.pyxis.greenhopper.jira:gh-epic-link`, on the story type's screen | `trackers.md` §3.4, route 2 |
| whether the type carries a description template | the `description` field's default value | `trackers.md` §3.5 |
| whether `labels` / `assignee` are even on the create screen | their presence | `trackers.md` §3.6 |

**Display names come from each field's own `name`** — there is no map to ask for. That name is what
turns `customfield_10045` into "Acceptance criteria" in the question the user is eventually asked,
and a question naming raw field ids is a question nobody can answer. When an entry carries no
`name`, fall back to the raw id and say the display name could not be read (§3).

**Match the epic-link field on `schema.custom`, never on a display name.** The value is
`com.pyxis.greenhopper.jira:gh-epic-link` on every site, while the label is translated — a German
instance shows "Epic-Verknüpfung", a French one "Lien de l'Epic". A name match would miss those and
drop them to §3.4's weakest route, which is the one case route 2 exists for.

**Take that id from the story type's create screen**, and only that one. Both screens are read here,
but the value is sent on exactly one call — the story's, per `trackers.md` §3.4 route 2 — so the
story's screen is the only one whose answer can be honoured. It stays a single carried value rather
than a per-type one for the same reason: the epic's own screen has no use for it.

**Four response members read above are not in the tool's documented parameter list.** Its schema
documents parameters only; per-field `name`, `allowedValues`, `hasDefaultValue`/`defaultValue` and
`schema.custom` all match Jira's `FieldMetaData` shape without the wrapper promising them. That is
the hedge `jira-custom-fields.md` §2 applies to its own undocumented `-comment`: plausible, not
verified. The one to confirm first is the **description template arriving as the `description`
field's default** — its silent absence is indistinguishable from a project that has no template —
which is why `trackers.md` §3.7's manual pass carries a row for it. A member that is simply not
there is treated as §4 treats an unread screen: unknown, never absent.

`skills/magic-start/references/jira-custom-fields.md` §2 is the model for the *shape* parser only
(see §3). Its `expand: "names"` belongs to the `getJiraIssue` call **that** file makes and does not
transfer here: `getJiraIssueTypeMetaWithFields` has no `expand` parameter, and none is needed.

## 2. Classifying what is required

§1.3's response now carries the optional fields too, so the split starts by **filtering on each
field's own `required` flag**: an optional field is never asked for, however unfamiliar it looks.
Then split the required ones of each type into two lists. Only the second reaches Step 4.

**Auto-filled — the skill supplies these, so they are never asked:**

| Field | Filled with |
| --- | --- |
| `project` | the Jira project (`trackers.md` §1.0) |
| `issuetype` | the **name** resolved in §1.2, sent as `issueTypeName` |
| `summary` | the ticket title from the spec's breakdown |
| `description` | the body composed per `trackers.md` §3.3 |
| `reporter` | the calling user; Jira defaults it, so send nothing unless the field rejects that |
| `parent` | the epic key, on a story — `trackers.md` §3.4 route 1, not a value to ask for |
| anything carrying a usable default | that default, stated in one line so a silent choice is visible |
| `labels` | `plan.defaultLabels` — but **only when it is non-empty**, see below |
| `assignee` | the resolved account id — **only when `plan.assignToMe` is true**, see below |

"A usable default" means the response's `hasDefaultValue` is true and the default is a real value.
A default that is an empty string, an empty array or a placeholder option is not usable — treat the
field as must-ask.

**Config auto-fills a field only when it actually carries a value**, and the same test applies to it.
`plan.defaultLabels` defaults to `[]` and `plan.assignToMe` to `false`, so on a project whose create
screen makes `labels` or `assignee` **required** those two rows auto-fill nothing — and a field
classified as auto-filled that nothing fills is refused by Jira at creation, after the brainstorm and
after the approval. That is exactly the 400 this pass exists to move earlier, arriving through the
classification instead of through a missed field:

| Required field | Config | Classification |
| --- | --- | --- |
| `labels` | `plan.defaultLabels` non-empty | auto-filled |
| `labels` | `plan.defaultLabels` empty — its default | **must-ask** |
| `assignee` | `plan.assignToMe` true **and** an account id resolved | auto-filled |
| `assignee` | `plan.assignToMe` false — its default | **must-ask** |
| `assignee` | `plan.assignToMe` true but no account id resolves | **must-ask** |

`assignee` is the harder of the two, because whether it auto-fills is only knowable once
`trackers.md` §3.6's `atlassianUserInfo` → `lookupJiraAccountId` pair has run. When the field is
**required**, run that resolution here, in this pass, and return the account id as the
`assignee_account_id` row of `## Usage` — that row is the only thing that carries it forward, and a
value this paragraph resolves but the contract does not return is a value Step 7 never sees. §3.6
resolves it once per run anyway, so this spends no extra call, it only moves it earlier. §3.6's
"create the issues unassigned" fallback is not available on a required `assignee`: unassigned *is*
the rejection. When the field is optional, nothing changes — §3.6 keeps resolving it at creation time
and drops it on a rejection.

So a required `assignee` has **two possible provenances and one destination**, and both provenances
end up in the same parameter:

| Case | Value comes from | Travels as |
| --- | --- | --- |
| `plan.assignToMe` true, id resolved | this pass | the `assignee_account_id` row of `## Usage` |
| `plan.assignToMe` false, or no id resolved | Step 4's answer | a `required_field_answers` entry, converted per §3 |

Whichever provenance applies, the value is sent as `createJiraIssue`'s `assignee_account_id`
parameter and **never** through `additional_fields` — `trackers.md` §3.2 owns that routing rule and
states the exception explicitly.

Neither field stops being config-driven. `plan.defaultLabels` and `plan.assignToMe` still decide what
is *sent* whenever they hold a value; the rule above only decides what happens when they hold none
and Jira insists.

**Must-ask — everything else that is `required`**, which in practice means the project's mandatory
custom fields: a required "Team", "Component", "Sprint", "Severity", "Business value". Carry, per
field: its `fieldId`, its display name from its own `name`, which issue type required it, whether it
takes one value or several, and its `allowedValues` if it declares them.

Deduplicate across the two types by field id, but **keep which types required it**: a field
mandatory on the story type and not on the epic is a different situation, and Step 4's question says
so rather than making the user infer it.

An empty must-ask list is the common case, and it is a legitimate answer — but only when the calls
in §1 all succeeded. See §4.

## 3. Rendering the expected value

The question shown to the user has to state what a valid value looks like, and Jira returns those
values in several shapes. Apply `skills/magic-start/references/jira-custom-fields.md` §3 rather than
restating it: its shape list (plain string, ADF document, option object or array of them, array of
strings), its fallback to the raw `customfield_XXXXX` id when no display name resolves, its
1500-character truncation and its credential-stripping rule all hold here, for its reasons. Forking
it would let the two drift. What does **not** carry over is how that file obtains the display names:
here they arrive on each field's own `name` (§1.3), with no `expand` involved.

Three things it does not cover, because it renders a ticket where this renders a question:

- An **option object or array of them** becomes the question's *options*, not prose. A free-text
  answer on a select field is a 400 waiting to happen.
- Shapes that cannot be a prompt at all — user and group pickers, dates, bare numbers — are asked
  for in plain words, naming the field and what Jira expects.
- Its **20-character floor does not transfer.** There the guard picks the field most likely to hold
  a spec, and dropping a short one is safe. Here every field is one Jira will reject the creation
  without, so a mandatory field is always listed however short its rendering — a silently dropped
  one is §4's forbidden false "nothing required", arriving by another route.

**Rendering the question is only half of it — the answer has to be converted back.** Everything
above turns a Jira field into something a person can answer. Nothing above turns what they answered
into something `createJiraIssue` accepts, and the two shapes are not the same: a select rendered as
the options `P1 / P2 / P3` comes back as the string `P1`, while the API wants an object. Sending the
display value straight through is the same 400 this pass exists to move earlier, arriving one step
later. So carry each field's `schema` from §1.3 alongside its `allowedValues`, and convert by it:

| Field `schema` | Answered as | Sent as |
| --- | --- | --- |
| `type: string` | free text | the string |
| `type: number` | free text | a number, unquoted |
| `type: date` / `datetime` | free text | `YYYY-MM-DD` / ISO 8601 |
| `type: option` | one option | `{"id": "<option id>"}` |
| `type: array`, `items: option` | one or more options | `[{"id": "<option id>"}, …]` |
| `type: array`, `items: string` | free text | `["a", "b"]` |
| `type: user` | a name or email, in plain words | `{"accountId": "<id>"}` |
| `type: array`, `items: user` | the same, one or more | `[{"accountId": "<id>"}, …]` |
| `type: group` | free text | `{"name": "<group>"}` |
| `type: array`, `items: version` / `component` | one or more options | `[{"id": "<id>"}, …]` |
| `type: priority` | one option | `{"id": "<option id>"}` |

Two rules are what make that table safe:

- **Resolve an option to the `id` of the `allowedValues` entry the user picked** — never re-type its
  label into `{"value": …}`. The label is what was displayed; the id is what the project stores.
  Labels get renamed and can repeat across contexts, ids do not. This is why `allowedValues` must
  travel **with their ids** rather than as a list of strings: a question built from labels alone
  cannot be converted back. `{"value": …}` is a legitimate fallback only for an entry that carries
  no id.
- **A user field's answer is not an account id yet.** It arrives as a name or an email in plain
  words, so it goes through `mcp__atlassian__lookupJiraAccountId` — the same call `trackers.md` §3.6
  uses — before being sent. If it resolves to nothing, or to several people, ask again rather than
  sending a guess: a wrong assignee is worse than a rejected creation, because it succeeds.

One destination rule goes with them: **`assignee` is the exception that takes no object.** It has its
own `createJiraIssue` parameter, `assignee_account_id`, carrying the bare account id string;
`{"accountId": …}` is for the *other* user-picker fields, which travel in `additional_fields`.
`trackers.md` §3.2 already states that `assignee_account_id` never goes through `additional_fields` —
this is the shape half of that same statement.

**That file's field cap does not transfer here; its ranking does.** Its cap is a context-volume
guard on a *read*, where the fields are candidates and dropping one past the limit costs nothing —
so the number is deliberately not restated here, because it is not a threshold this file has. Every
field here is one Jira refuses the creation without: there is nothing this file could drop at any
count that it would be safe to drop. What does carry over is the *ranking*, applied to different
things: there, candidate fields by how likely one is to hold a specification; here, fields that are
*already* mandatory, so the order is by how answerable each one is (a required select with
`allowedValues` is more answerable than a required free-text audit field), with length only breaking
ties. That order no longer decides what is dropped, only what is asked first.

The one real limit is how many questions a single `AskUserQuestion` batch can carry, which is a
property of that call and not a number configured here. **That limit is not this pass's to test.**
This pass runs at Step 2.3, while the batch is packed at Step 4 alongside Step 4's own framing
questions — and only there is it known how many of the must-ask fields actually fit. So what §3
hands forward is the *ranked* must-ask set and nothing more; the overflow is detected and surfaced
at Step 4, per `MSG_JIRA_REQUIRED_FIELDS`'s note, and the ranking above is what decides which fields
make the cut when it happens.

**When the packed set will not fit that batch, Step 4 neither drops a field nor refuses the run**:
it displays `MSG_JIRA_TOO_MANY_FIELDS` — which names the count, the fields, and how many of them
fit — and lets the user choose between

- **asking in more than one round**: the fields that fit ride in Step 4's batch, the rest come as one
  further `AskUserQuestion` straight after it, and the creation runs with every value answered;
- **asking only what fits**: the creation runs with the rest unanswered and Jira rejects the issues
  that need them, surfaced as `trackers.md` §4's failure naming the field — the 400 this pass exists
  to move earlier, now chosen with that consequence stated rather than met by surprise;
- **stopping**, and giving those fields a default in the project's own configuration or dropping the
  requirement, then running this again.

A project with nine mandatory custom fields is a company-managed project doing something ordinary,
so the overflow is a choice rather than a dead end. What stays forbidden is the fourth option:
**dropping any of them quietly**, which is §4's false "nothing required" arriving by another route.

## 4. Degradation — never fabricate "nothing required"

Every call in §1 can fail, and the failure mode that matters is a specific one: **a failed call must
never be reported as "no required fields".** A false "nothing required" is precisely the
400-after-a-brainstorm this whole pass exists to prevent, and it is worse than the 400 was, because
the user was told the check had run.

| Failure | Behaviour |
| --- | --- |
| `getAccessibleAtlassianResources` fails or returns no site | stop; no site is reachable, so no brainstorm |
| the Jira project resolves on no accessible site | stop; name the key and the sites checked |
| `getJiraProjectIssueTypesMetadata` fails | stop; no issue type can be resolved, and creation needs one |
| a configured issue-type name is absent | stop the pass, never ask — see below |
| `getJiraIssueTypeMetaWithFields` fails for one type | the pass continues **degraded** — see below |
| a `startAt` page of that call fails mid-list | the screen was read incompletely: the five §1.3 values are **unknown**, not false — see below |
| `$ATLASSIAN_ENABLED` is `false` | this pass never runs — `trackers.md` §1.2 already refused the tracker |

**A configured issue-type name the project does not have stops the pass**, and stops it with
`MSG_JIRA_NOT_CONFIGURED` whose `{reason}` names the project's *actual* types, so the user fixes
`plan.issueTypes`. It is deliberately not an `AskUserQuestion`: silently picking a different type
files the epic under the wrong type, which is §1.2's whole point. This is the one place that
behaviour is stated — `trackers.md` §3.7 expects exactly this refusal.

**A `getJiraIssueTypeMetaWithFields` failure on one type is the only non-stop failure here** —
whether it is the first call or a later page of it. Name the type that could not be read and that
mandatory fields on it are unknown, then let the user choose between continuing with that risk
stated and stopping. That is what `degraded` carries, and `MSG_JIRA_FIELDS_UNKNOWN` is the message
that surfaces it — an `AskUserQuestion` whose body carries those two options, per the convention
`MSG_APPROVAL` and `MSG_TRACKER_ASK` follow: a promised choice needs a message that presents it.

`MSG_TRACKER_ERROR` is deliberately **not** that message. It closes on "the spec is intact", and at
Step 2.3 there is no spec — Step 2.4 is what creates it — so at this one call site it would state
something untrue. It stays what it already is: the Step 3.3 and Step 7 message for a tracker that
stopped answering after the spec exists.

**On a page that fails mid-list, the same invariant governs the other four values**
(`story_has_parent_field`, `epic_link_field_id`, `description_template`, `screen_omits`): it is the
rule this section opens with, applied to a screen read in part rather than not at all, so they are
reported as **unknown** and never as `false`, an empty id or an omitted field. "Not seen yet" is not
"absent", and a partially read screen presented as a complete one is the same fabrication as a
failed call presented as "nothing required". `trackers.md` §3.4's `unknown` rule is what consumes
that invariant: an `unknown` value makes its route **attempted**, not skipped, so a partial read
costs a call rather than the hierarchy.

The last line of a *stop* is always the same: nothing was created, nothing was explored, and the
config change that fixes it is named. A stop here costs the user one question; a fabricated pass
costs them the whole session.

Retry a failing call **once** before treating it as a failure — these are network calls and a single
timeout is not a verdict.

## Usage

Step 2.3 of `SKILL.md` reads this file **only** when the tracker resolved to Jira. Once read,
execute §1, then §2, then §3 — with §4 governing every call in all three — and return these values.
This table is the whole contract; `SKILL.md` restates none of it:

| Returned | Shape | Consumer |
| --- | --- | --- |
| `cloudId` | the resolved site id | Step 3.3's JQL, `trackers.md` §3.3's create calls |
| `project_key` | the Jira project, confirmed to resolve | same |
| `issue_types` | `{epic, story}` → `{id, name}` — the id for §1.3, the name for the create call | `trackers.md` §3.2 |
| `must_ask_fields` | per field: id, name, requiring types, cardinality, its `schema`, and `allowedValues` **with their ids** | `MSG_JIRA_REQUIRED_FIELDS`, then §3's conversion |
| `story_has_parent_field` | true when the story type's create screen carries `parent` | `trackers.md` §3.4 route 1 |
| `epic_link_field_id` | the epic-link `customfield_XXXXX` on the **story** type's screen, empty when none | `trackers.md` §3.4 route 2 |
| `description_template` | per type, the `description` field's default, empty when it has none | `trackers.md` §3.5 |
| `screen_omits` | which of `labels` / `assignee` are absent, per type | `trackers.md` §3.6 |
| `assignee_account_id` | the account id resolved by §2 for a **required** `assignee` when `plan.assignToMe` is true; empty in every other case | `trackers.md` §3.2, §3.6 |
| `degraded` | what could not be read, empty when everything resolved | `MSG_JIRA_FIELDS_UNKNOWN` (§4), never silent |

Nothing here is written to the spec: the spec does not exist yet at Step 2.3. The values travel as
`references/trackers.md` §1.1's carried resolution, which is why no later step calls any of §1's
three calls again — except to finish a read that paging left incomplete, per §1.3's `unknown`
exception and `trackers.md` §3.4's rule.

**If this file is missing on disk**: do not improvise the discovery, and do not proceed as if there
were no required fields. Say in one line that Jira field discovery cannot run because its reference
file is absent, that mandatory custom fields on the project would therefore only surface as a
rejection at creation time, and offer the two honest options — continue with that risk stated in the
open, or stop before the brainstorm. Silence on this point is the one thing that is not allowed.
