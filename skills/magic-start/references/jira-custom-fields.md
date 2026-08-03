# Jira custom-field discovery

Read this file only when Step 2A's completeness check has fired: a Jira ticket whose description is too
short, or which states neither what to build nor any acceptance criterion. It explains how to re-read the
issue for the custom fields that may hold the real spec, what to keep out of the response, and what to do
when discovery finds nothing either.

Both `/magic:start` and `/magic:continue` read this file, and the two copies are byte-identical. Where the
callers genuinely differ — essentially what the discovered text feeds into downstream — the difference is
stated inline below; do not fork the file.

## 1. The trigger, in full

The gate is one question, asked of `fields.description`: **does it state what to build?** If it does, return
to `SKILL.md` and continue with what the first call returned. If it does not, run the discovery pass. Length
never decides on its own — it only tells you where to look first.

1. **Absent, or under 80 characters** of useful text once markup and whitespace are stripped. At that length
   a description almost never holds a spec, so treat it as triggering — **unless** the little text there is
   does state what to build, as a one-liner like "Bump the Stripe SDK to v14" does. A complete one-line spec
   is a spec; do not spend a second full-issue call on it.
2. **Longer, but still no spec** — no statement of what to build and no acceptance criteria. Typically the
   project-wide template whose real content sits in a field named something like "Acceptance criteria".
   Signals: every section heading present but its body empty or a placeholder (`_No response_`, `N/A`,
   `TBD`, `-`); nothing but a checklist, a definition of done, or boilerplate identical in every ticket of
   the project; text that defers elsewhere ("see below", "voir ci-dessous", "cf. le champ", "détails dans");
   a bare link with no prose.

Both conditions are about substance — judge them the way a reader would. A description that does say what to
build does **not** trigger discovery, however short, however badly written, and however much boilerplate
surrounds it. In doubt, skip: this must not become a second full-issue call on every Jira ticket.

80 is a heuristic for where to stop reading closely, not a verdict: higher, and you scrutinise descriptions
that were plainly fine; lower, and a title-only ticket slips through unexamined.

`SKILL.md` carries an abridged form of these two conditions — only what is needed to decide whether to read
this file. This section is the authoritative wording.

## 2. The discovery call

Re-read the **same** issue with `mcp__atlassian__getJiraIssue`, this time passing `fields: ["*all","-comment"]`,
`expand: "names"` and `responseContentFormat: "markdown"`:

- `*all` is the documented way to return every field, custom ones included — Step 2A's first call cannot
  name a `customfield_10045` nobody knew existed.
- `expand: "names"` returns the fieldId → display-name map in the *same* response, so labelling
  `customfield_10045` as "Acceptance criteria" costs no second call.
- `responseContentFormat: "markdown"` means no ADF tree to flatten, and makes §1's 80-character threshold
  measurable on plain text.

**`-comment` is an assumption, not a documented parameter.** It is Jira REST field-negation syntax, while the
MCP tool documents only `*all` and `comment`, so the wrapper may honour it, ignore it or reject it — and the
ignore case fails silently: the call succeeds and the entire comment thread rides in on `*all`, which is
exactly the cost this gated pass exists to avoid. If the response carries a `comment` field anyway, drop it
on the spot, before it reaches any summary, prompt or artefact, and never carry the thread into the ticket
context (under `/magic:start`, design references living in comments remain
`references/design-context.md` §2.1's job, gated on a UI signal; `/magic:continue` never reads a comment
thread at all). If the call errors outright on the negation, retry once with plain `["*all"]` and apply the
same drop-on-arrival rule.

A failure of the discovery pass is never blocking: continue with what the first call returned, and say so.

## 3. What to keep

Keep only keys matching `customfield_\d+` whose value carries text, whatever shape Jira returns it in:

- a plain string (short text, URL, number rendered as text);
- an **ADF document** — `{"type":"doc","version":1,"content":[…]}`, the shape of every rich-text custom field,
  which is exactly where a long "Acceptance criteria" lives. Flatten its `content` tree to plain text. Do not
  assume `responseContentFormat: "markdown"` spared you this: that parameter governs the description and
  comment bodies, and a custom field may still arrive as ADF. A doc object has no top-level `value`, so a
  filter that only accepts strings and `value` objects drops the single most important field on the ticket
  and sends a fully-specified ticket down the empty-ticket path;
- an option object (`{"value":"…"}`) or an array of them — join their `value`s;
- an array of strings — join them.

Skip shapes that cannot carry a spec: user and group pickers (arrays of account objects — their
stringification is account IDs and email addresses, never a specification), dates, and numbers on their own.

When the name map does not resolve a field, fall back to its raw `customfield_XXXXX` id — an unlabelled field
is still content.

Volume guards: skip anything under **20 characters**, keep at most **8 fields**, truncate each to
**1500 characters**.

Choose those 8 by relevance before length. `expand: "names"` already paid for the display names, so use them:
a field named for a specification — acceptance, criteria, spec, scope, besoin, exigence, définition, user
story, description — is kept ahead of a longer one named for history, sprint notes or an audit trail. Ranking
by length alone would drop a short, decisive "Acceptance criteria" behind three long changelog fields, which
is precisely the field this pass exists to find. Length only breaks ties.

They bound what *propagates downstream*, not what enters the context — a payload can only be filtered once
received. §1's check is therefore the only real ingestion guard, which is why discovery is gated behind it
instead of running on every ticket.

A custom field is also a common home for customer data, an internal URL or an outright credential, and what
is kept here is summarised into a URL-encoded `curl` query string: drop every password, token, API key,
one-time code and personal datum from what you propagate — quote the spec, not the credentials.

## 4. Outcome

### 4.1 Custom fields with content found

Display `MSG_JIRA_CUSTOM_FIELDS_FOUND` from `references/messages.md`, listing the display names of the fields
kept (`{field_names}`), and treat that text as part of the ticket description from then on:

- Under **`/magic:start`**, for everything downstream without exception: the Step 2.5.1 description, the
  Step 3.2 scope score (which counts it **+2 once**, never +2 per field), the Step 5.0 UI-signal check (a
  mockup link often lives in a custom field), exploration, plan and acceptance criteria alike.
- Under **`/magic:continue`**, for the Step 2.5.1 description and the Step 8 resume summary. That skill
  writes no plan and scores no scope, so there is nothing else for the text to feed.

### 4.2 Still empty after discovery

Display `MSG_JIRA_TICKET_EMPTY`, then use `AskUserQuestion` with exactly the three options that message lists
(their labels live only in `references/messages.md`). Handle all three — none of them may fall through to
undefined behaviour.

- **Option 1 — describe what has to be done** → take the free-text answer as the ticket's specification and
  continue as if the description had carried it.
- **Option 2 — continue with the title alone** → permitted, because the user chose it, but never silently.
  State in one line the assumption you are working from: the goal you read into the title, and the criteria
  you will implement against. Then carry an "underspecified ticket" caveat forward for the rest of the run —
  under `/magic:start` into the plan of Step 5.2, named next to the assumption so the plan review of Step
  5.2.3 sees it, and into `{attention_points}` of the final summary (Step 5.5.3); under `/magic:continue`,
  as one line immediately after the Step 8 resume summary, since that template is a fixed box with no
  attention-points slot — do not bend the template, follow it. A caveat stated only at the moment of the
  choice is forgotten by the time the work is read back, which is how a guessed criterion ends up looking
  like a specified one.
- **Option 3 — stop** → the skill stops here. Under `/magic:start`, Step 6 still runs: it closes the run
  record opened when the skill started, with `outcome` `failed` since the workflow did not complete — an
  unclosed record is counted as abandoned and the run disappears from the statistics. Under
  `/magic:continue`, stop the way Step 5 Case 3 does; its Step 9 already covers a workflow that stopped
  early.

**Never invent acceptance criteria from the title alone** survives this branch in the only two forms
compatible with option 2: never invent *silently* — the assumption is always stated and always carried
forward — and never without the user having explicitly chosen that path. Option 2 is never the default, and
never inferred from silence, a timeout or an unparseable answer; those go back to the question.

## Usage

Step 2A of `SKILL.md` evaluates the trigger inline and reads this file **only** when it fires. Once read,
execute §2, then §3, then §4, then return to Step 2A's continuation (`/magic:start`: Step 2.4, then 2.5, then
2.6, then 2.7; `/magic:continue`: Step 2.5, then 2.6) — except on option 3 of §4.2, which stops the skill.
The `/magic:start` continuation goes through the dependency gate like any other: a thin ticket is exactly the
kind that carries a dependency link, so skipping 2.4 here would transition it and create its worktree with no
verdict.
