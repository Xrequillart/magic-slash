---
name: magic:plan
description: Turns an idea into tickets — brainstorm, a reviewable spec, then an epic and its stories. Use when nothing exists yet and the user is floating an idea rather than resuming tracked work. Triggers on "I have an idea", "j'ai une idée", "we should add", "on devrait ajouter", "brainstorm", "réfléchir à", "plan a feature", "planifier une feature", "create the tickets for", "créer les tickets pour", "write the spec", "écrire la spec", or any proposal with no ticket behind it. Do NOT use it when the work already exists in a tracker — "PROJ-123", "#456", "work on X", "start", "commencer" all mean the ticket is there, so use /magic:start instead.
argument-hint: <idea or feature description>
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion, mcp__github__*, mcp__atlassian__*
---

# magic-slash v0.86.0 - /plan

You are an assistant that turns an idea into tickets: brainstorm it against the real codebase,
write a spec the user can review, get their approval, then create the epic and its stories.

Nothing exists yet when this skill starts — no ticket, no branch, no worktree. That is the whole
difference with `/magic:start`, and it shapes every step: the only artefact produced before the
user approves is a spec file, and the only thing created after is tickets.

Follow each step in order. Each step builds on the previous one.

## References

- `references/messages.md` — All bilingual messages (MSG_*). Read the relevant section as needed (not the whole file at once).
- `references/spec-template.md` — The spec's filename, structure, progressive-write order and closing append. Read in Step 2, before creating the file.
- `references/sizing.md` — The single-story-vs-epic heuristic, the breakdown rules and the acceptance-criteria formats. Read in Step 5.
- `references/trackers.md` — Tracker detection, creation calls, the parent/child hierarchy and partial-failure handling. Read §1 in Step 2.3 (detection, the carried resolution, and the refusal); read §2-§4 in Step 7, after approval.
- `references/jira-fields.md` — Jira site, project and issue-type resolution, and the required-field discovery that must happen before the structure is proposed. Read in Step 2.3, only when the tracker resolved to Jira.
- `references/api.md` — Magic Slash Desktop API reference (endpoints `/metadata`, `/repositories`, `/plan/spec` and `/plan/tickets`).

## Step 0: Configuration

### 0.1: Read the live config

```bash
# Magic Slash Desktop is the single source of truth (Supabase). The port comes from the
# environment inside an app terminal, and from the file the app publishes anywhere else —
# so a Claude started from a plain terminal reaches the same live config.
MS_PORT="${MAGIC_SLASH_PORT:-$(cat ~/.config/magic-slash/port 2>/dev/null)}"
CONFIG_FILE=""
if [ -n "$MS_PORT" ]; then
  MS_TMP_CONFIG="$(mktemp)"
  trap 'rm -f "$MS_TMP_CONFIG"' EXIT
  # A published port may name a server that has since died: -sf turns that into a failure.
  if curl -sf --max-time 5 "http://127.0.0.1:$MS_PORT/config" -o "$MS_TMP_CONFIG" 2>/dev/null \
     && [ "$(jq '.repositories | length' "$MS_TMP_CONFIG" 2>/dev/null || echo 0)" -gt 0 ]; then
    CONFIG_FILE="$MS_TMP_CONFIG"
  fi
fi
[ -z "$CONFIG_FILE" ] && echo "APP_NOT_RUNNING" || echo "OK"
```

If `APP_NOT_RUNNING`, the app is not running and the cloud config is unreachable: display
`MSG_APP_NOT_RUNNING` and stop. Never proceed on a guessed config. There is no local config file to
fall back on — any `~/.config/magic-slash/config.json` still on the machine predates the cloud
migration and must not be read.

Keep the config in memory: `$CONFIG_FILE` is a temp file that does not survive into a later bash
block.

### 0.2: Determine the three languages

This skill needs **three** languages, and they are independent.

| Value | Read from | Default | Governs |
| --- | --- | --- | --- |
| discussion | `.repositories.<key>.languages.discussion` | `en` | every message from `references/messages.md`, every question |
| ticket | `.repositories.<key>.languages.ticket` → `.languages.jiraComment` → `en` | — | the ticket bodies and their acceptance criteria |
| spec | `.repositories.<key>.languages.spec` → the resolved **ticket** language | — | the `.magic/spec-*.md` document |

The ticket and spec languages are **fallback chains**, not defaulted fields: neither
`languages.ticket` nor `languages.spec` exists in the config defaults, because materialising `en`
there would pin every existing repository to English and make the chain unreachable. Resolve each at
read time, in the order above, and take the first non-empty value. Treat an empty string as unset —
the config is a jsonb blob written wholesale, so `''` does arrive.

Note the spec chains onto the **resolved** ticket language, not onto `jiraComment`: a repository that
set only `languages.ticket` must carry that value through to its spec.

**When the two differ, the spec is the source text and Step 7 translates as it composes.** Reviewing
a document and filing a ticket have different audiences — the author reads the spec, the team reads
the tracker — so `spec: fr` with `ticket: en` is a configuration to serve, not to correct. What it
must never become is a licence to recompose a body from the conversation: see Step 7.

A French-speaking developer who files English tickets for an international team is the normal case
here, not an edge case. Talking in one language and writing in another is expected behaviour — do
not "helpfully" align them.

Both are per-repository, so neither is known until Step 2 has picked one. Until then, use English.

### 0.3: Read the user profile

If `~/.config/magic-slash/profile.md` exists, read its YAML frontmatter (`name`, `role`,
`technical_level`, `communication_style`, `languages`) and adapt accordingly: vocabulary and
technical depth to `technical_level`, the level of detail to `role`, the response format to
`communication_style`. If it does not exist, continue with default behaviour.

This matters more here than in the coding skills. A product manager planning a feature and a staff
engineer planning the same feature need the same tickets out of very different conversations.

### 0.4: Read the `plan` and `jira` blocks

Read `.repositories.<key>.plan` for the repository selected in Step 2. Defaults, applied per key:

| Key | Default | Used in |
| --- | --- | --- |
| `tracker` | `ask` | Step 2.3 |
| `issueTypes.epic`, `issueTypes.story` | `Epic` / `Story` | Step 2.3, then carried to Step 7 |
| `useRepoTemplates` | `true` | Step 7 |
| `splitting` | `balanced` | Step 5 |
| `acceptanceCriteria` | `checklist` | Step 5, Step 7 |
| `defaultLabels` | `[]` | Step 7 |
| `assignToMe` | `false` | Step 7 |
| `duplicateCheck` | `true` | Step 3.3 |

The three enum fields are `string`-typed jsonb the webapp writes wholesale, so an unknown value can
genuinely arrive. Treat one as its default rather than as an error — a bad setting must not stop a
plan.

Note what is **not** in that table: the depth of the codebase exploration, and the human review
before creation. Neither is configurable, by design.

### 0.5: Check the Atlassian integration

Read `integrations.atlassian` from config. Default: `true` (backward compatibility). It is
account-level, not per-repository, so it is read here rather than with the `plan` block above.

```bash
# Every bash block runs in its own shell: $MS_PORT does not survive from Step 0.1,
# so resolve it again here. One line, and it costs nothing to repeat.
MS_PORT="${MAGIC_SLASH_PORT:-$(cat ~/.config/magic-slash/port 2>/dev/null)}"
curl -sf --max-time 5 "http://127.0.0.1:$MS_PORT/config" | jq -r '.integrations.atlassian // true'
```

Store the result as `$ATLASSIAN_ENABLED` — the same value, read the same way, as Step 0.3 of
`/magic:start`. Step 2.3 is where it decides anything (`references/trackers.md` §1.2).

## Step 1: Capture the idea

If `$ARGUMENTS` is provided, that is the idea. Take it as stated.

If the skill was invoked bare, use `AskUserQuestion` with `MSG_DESCRIBE_IDEA` and let the user
describe it in free text.

Do not start refining, scoping or judging the idea here. One sentence is a perfectly good input —
Steps 3 and 4 are what turn it into something specific, and doing it now would mean doing it
without having looked at the code.

## Step 2: Target repository, tracker, and spec

This is the step everything else rests on. Without the repository we can neither explore the code,
nor detect the tracker, nor check for duplicates — so it comes before any exploration.

### 2.1: Pre-select, never decide

Rank the configured repositories to make the question easy to answer:

1. **The repository containing the current `pwd`** goes first, labelled as such. Match `$PWD`
   against each repository's `path`, accepting a worktree or a subdirectory of it.
2. **Keyword score** for the rest: score the idea text against each repository's `keywords`,
   case-insensitively and tolerating the usual variants (`backend` matches `back-end`). +5 per
   keyword found in the idea, counted once per keyword.
3. Everything else follows, unranked.

This is a pre-selection and nothing more. **Every configured repository stays offered**, and the
user always has the final say: the idea is one sentence long at this point, so keyword scoring on
it is a weak signal — much weaker than the labels and components `/magic:start` scores against.

**Short-circuit**: with a single repository configured, use it and skip the question.

### 2.2: Ask

Use `AskUserQuestion` with `MSG_REPO_SELECT`, filling `{repo_list}` in the ranked order and stating
the reason next to each pre-selected entry. Keep the answer as the repository's **config key** — the
key under `.repositories`, which is not always the directory name, since two organizations can each
have an `api` and the second one's key carries a suffix.

Read `.repositories.<key>.jira` for the same repository — `projectKey`, the Jira project the tickets
are filed under, and `siteUrl`, the browse base URL used to link them. Both are chains, not plain
keys: `references/trackers.md` §1.0 gives the fallbacks onto the two config keys they replaced, and
reading either raw would make a repository configured before that move look like it has no Jira.

Now resolve Step 0.2's two languages and Step 0.4's blocks for that key, and switch the conversation
into the discussion language.

### 2.3: Resolve the tracker — here, not at Step 7

Follow `references/trackers.md` §1: `plan.tracker` first (`jira` / `github` / `ask`), then the
repository's own coordinates — the Jira project or site, the GitHub target — then the GitHub remote,
asking with `MSG_TRACKER_ASK` only when it is still genuinely ambiguous. §1.0 of that file names the
three config values and their fallbacks; read them there rather than reaching for a key directly.

Resolve it **once**, at this step, and carry the result: §1.1 of that file defines what to carry and
which of the three consumers — this step's Jira discovery, Step 3.3's duplicate search, Step 7's
creation — reads each value. Nothing re-derives it.

**If the tracker resolves to Jira**, apply `references/trackers.md` §1.2 before going any further:
it decides whether Jira can receive a ticket at all and refuses the run with
`MSG_JIRA_NOT_CONFIGURED` when it cannot.

**If it can**, read `references/jira-fields.md` now and run its pass. Its `## Usage` table is what
it hands forward, and Step 4 owns the question for whatever it could not fill.

Both of those happen **here**, before the brainstorm — not at Step 7. Anything that would refuse the
write has to be found before an hour of exploration, framing and spec-writing, not after: a refusal
on the second question still leaves the user able to redirect the idea or file the ticket by hand.

### 2.4: Create the spec file

Read `references/spec-template.md` now. It owns the filename, the structure and the write order.

**Exclude `.magic/` from git first**, before writing anything:

```bash
cd {REPO_PATH}
EX="$(git rev-parse --git-path info/exclude)"; mkdir -p "$(dirname "$EX")"; touch "$EX"
grep -qxF '.magic/' "$EX" || { [ -s "$EX" ] && [ -n "$(tail -c1 "$EX")" ] && printf '\n' >> "$EX"; printf '.magic/\n' >> "$EX"; }
```

`cd {REPO_PATH}` is not optional, and it is not the cwd. `/magic:plan` is invoked from wherever the
user happens to be standing, and Step 2.2 exists precisely because that is usually **not** the
repository they picked — so both commands here are relative to a repo this shell has not entered
yet. Without the `cd`, `git rev-parse` resolves the exclude file of the wrong repository and
`mkdir -p .magic` writes the spec there: two silent side effects in a repository nobody asked about,
and no spec where one was promised. Substitute the path from the config entry chosen in Step 2.2,
and keep every later command in this step in the same directory.

The exclusion itself is idempotent: `grep -qxF` makes any later run a no-op. The newline guard is not
cosmetic — if `info/exclude` does not end with a newline, a plain append produces
`node_modules.magic/`, `.magic/` is then **not** ignored, and the `git add -A` of `/magic:commit`
commits the spec.

Then create the file, still in `{REPO_PATH}`:

```bash
mkdir -p .magic
echo ".magic/spec-{SLUG}-$(date +%Y%m%d-%H%M%S).md"
```

`{SLUG}` is a placeholder you substitute, not a shell variable — nothing above assigns it, so leaving
it as `$SLUG` would expand to the empty string and produce `spec--20260820-093000.md`. Derive it from
the idea: lower-cased, non-alphanumerics collapsed to hyphens, ~5 words or 30 characters. **The timestamp is not decoration.** The slug derives from the idea, so planning the
same idea twice on one repository produces the same filename — and #194 keys a spec's cloud row on a
hash of its path, so the second session would silently overwrite the first, on disk and in the
cloud. It also gives `.magic/` a chronological sort, which is what makes a directory of specs
readable.

**Do not delete a pre-existing spec.** `/magic:start` deletes a stale `.magic/design-brief.md`
because a brief belongs to the ticket being started. That reasoning does not transfer: an older
`spec-*.md` here is **a different plan**, quite possibly one whose tickets are open right now. Leave
every existing spec alone, and never overwrite one.

Write the header and the `## Idea` section immediately, then display `MSG_SPEC_CREATED`. Everything
after this point is written into the spec **as it is established**, never accumulated in the
conversation and dumped at the end: the file is the live record of the session, #171 renders it as
it fills, and an interrupted session must leave behind everything that was settled up to that point.

### 2.5: Metadata — first write

**Put each composed value on disk with the `Write` tool, then let the shell read the file.** Never
substitute the text into the command itself — see `## Metadata contract` for why this shape is
mandatory rather than stylistic. Write these three files under the `.magic/` directory created in
2.4 (it is git-excluded, so nothing here can be committed):

| File | Content |
| --- | --- |
| `.magic/.mp-title` | `{IDEA_SHORT}` — a short form of the idea, max 30 chars |
| `.magic/.mp-spec-path` | `{SPEC_ABS_PATH}` — the **absolute** path of the file created in 2.4 |
| `.magic/.mp-repo-path` | `{REPO_PATH}` — the target repository root |

Then run the calls. The only thing the command line ever contains is a fixed literal path:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(jq -Rs -c '[sub("\n$";"")]' < .magic/.mp-repo-path | jq -sRr 'sub("\n$";"") | @uri')" > /dev/null 2>&1 || true
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(jq -Rsr 'sub("\n$";"") | @uri' < .magic/.mp-title)&status=planning&type=planner&specPath=$(jq -Rsr 'sub("\n$";"") | @uri' < .magic/.mp-spec-path)" > /dev/null 2>&1 || true
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/plan/spec?id=$MAGIC_SLASH_TERMINAL_ID" > /dev/null 2>&1 || true
rm -f .magic/.mp-title .magic/.mp-spec-path .magic/.mp-repo-path
```

`specPath` is the absolute path, in the main checkout. `sub("\n$";"")` drops the single trailing
newline the file carries. The `repos` value is built as a real JSON array by `jq -c` and then
URI-encoded **once** — not `@json`, which would encode the array into a JSON *string* and make the
server receive `"[\"…\"]"` instead of `["…"]`.

`{IDEA_SHORT}` is a short form of the idea (max 30 chars). `{SPEC_ABS_PATH}` is the **absolute**
path of the file created in 2.4, in the main checkout. The `repos` array is built by `jq -nc --arg`
rather than by pasting the path between literal brackets, so a path containing a quote produces
valid JSON instead of a broken payload.

`specPath` is sent **now**, at creation time, before the brainstorm starts. Consumers tolerate the
file not existing yet — the writer announces where the spec will be, and nothing checks the
filesystem — but they cannot tolerate a path that arrives ten minutes late, because the whole point
is that the user can open the spec while it fills.

**The third call — `/plan/spec` — must stay last in this block, and must not be moved earlier.** It
carries no payload: it says "the spec at the path you already know has changed on disk", and the
desktop reads the file itself. Which is exactly why it cannot run at Step 2.4, however tempting it
looks there — the desktop only learns `specPath` from the `/metadata` call on the line above, so a
ping issued before it resolves to an agent with no spec path and is a guaranteed no-op. After the
`/metadata` call, the first ping is what records the session in the cloud.

**Ping it again after every later write to the spec** — at the end of Step 3 (`## Codebase findings`,
`## Related tickets`), Step 4 (`## Framing decisions`), Step 5 (`## Sizing`, `## Proposed tickets`),
each Step 6 edit, and the Step 7 append. One line, unchanged, in the directory the spec lives in:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/plan/spec?id=$MAGIC_SLASH_TERMINAL_ID" > /dev/null 2>&1 || true
```

Pinging often is free and pinging rarely is not: the desktop coalesces bursts before it uploads, so
an extra call costs nothing, while a skipped one leaves the last section of a spec invisible to
everyone else until the next write happens to land.

See `## Metadata contract` at the end of this file for the fields this skill never sends, and why.

## Step 3: Contextual brainstorm

Now the idea meets the real code. Everything this step establishes goes into the spec's
`## Codebase findings` and `## Related tickets` sections as it is established.

### 3.1: Explore the codebase

Display `MSG_EXPLORING`, then launch an `Agent` with `subagent_type` `Explore` against the target
repository. Delegating keeps the main context clean — this session still has a framing dialogue, a
sizing pass, a review and a creation phase ahead of it, and none of them needs the raw file
contents.

Give the agent the idea, the repository path, and ask for a structured summary:

1. how the area the idea touches works today, with file paths
2. the existing patterns anything new here should follow
3. what would have to change, and roughly how widely it spreads
4. what already exists that the idea may be duplicating in code
5. constraints the code imposes — schemas, limits, abstractions, feature flags

Ask for a summary, not file contents. Scale the breadth to the idea: `medium` for something
localized, `very thorough` when the idea plainly crosses several surfaces. That judgement is
deliberately not a setting — it follows the size of the idea, and a knob would only let it be wrong.

### 3.2: Read the project's own conventions

If the target repository has a `CLAUDE.md`, read it. It states the project's structure, stack and
conventions, and it routinely answers questions that would otherwise be asked in Step 4 — which is
exactly the kind of question that must not be asked.

### 3.3: Check for duplicates

When `plan.duplicateCheck` is `true` (the default), search the tracker for existing work before
proposing anything new — the tracker **carried** from Step 2.3, never re-derived. Search on the
strongest nouns from the idea, across **open and closed** tickets: a closed one is often the more
valuable find, because it may carry the reason this was rejected before.

| Tracker | Call | Scope |
| --- | --- | --- |
| GitHub | `mcp__github__search_issues` | the `owner/repo` carried from Step 2.3 |
| Jira | `mcp__atlassian__searchJiraIssuesUsingJql` | the carried Jira project, on the carried `cloudId` |

The Jira call takes the same `{"jql": …, "fields": [...]}` shape `/magic:start` uses, scoped to the
project and asking only for `summary`, `status` and `issuetype`:
`project = PROJ AND text ~ "rate limit" ORDER BY updated DESC`. No status clause — `text ~` already
spans open and closed issues, and filtering on status would drop exactly the closed ticket worth
finding. Report the issue key (`PROJ-123`), not a `#number`.

- **Matches found** → display `MSG_DUPLICATES_FOUND` and ask. Every entry states *why* it looked
  related; an unexplained list is noise the user has to re-investigate. Write the list into the
  spec's `## Related tickets` whatever the answer is.
- **Nothing found** → display `MSG_NO_DUPLICATES`, with `{searched_scope}` = the Scope cell above,
  and write `None found` into that section.
- **Search fails twice** → display `MSG_TRACKER_ERROR` — `{tracker}` = the tracker that did not
  answer, `{operation}` = `duplicate search` — and continue with `Not checked` in the spec.
  A failed duplicate check degrades the run; it does not end it. But `Not checked` and `None found`
  are different facts and must never read the same.

When `plan.duplicateCheck` is `false`, skip the search entirely and write `Not checked`.

## Step 4: Framing dialogue

Use `AskUserQuestion` on the points that are **genuinely ambiguous** — and only those:

- **Scope** — where the line is drawn, when the idea admits an obvious bigger and smaller version
- **Target users** — who this is for, when it changes what gets built
- **Success criteria** — how anyone will know it worked
- **Non-goals** — what is explicitly out, stated as a decision rather than an omission

**Never ask what the code or the config already answers.** Which framework, where the tests live,
which language the tickets are written in, which tracker receives them — all of that was resolved in
Steps 0, 2 and 3. Asking anyway wastes the user's attention on the one step where their attention is
the scarce resource, and it makes the exploration look like theatre.

Ask few questions and ask them well. Two questions that change the shape of the plan beat six that
confirm what the exploration already showed. If the idea is unambiguous after Step 3 — and small,
well-specified ideas often are — ask nothing and say so in one line.

**Fields the tracker requires that nothing else can answer.** When Step 2.3's pre-flight handed
forward required fields it cannot fill itself — today only Jira's, as `must_ask_fields`
(`references/jira-fields.md` §2) — ask for them inside this same `AskUserQuestion` batch, using
`MSG_JIRA_REQUIRED_FIELDS`, whose note owns the shape of the question. This is the one addition that
does not break the rule above: neither the code nor the config can answer it, and the tracker
refuses the creation without it.

When they do not all fit this batch alongside the framing questions, display
`MSG_JIRA_TOO_MANY_FIELDS` and follow the option the user picks. Its first option asks the overflow
in one further `AskUserQuestion` immediately after this batch — the only second round this step ever
makes, and the reason the cap is tested here rather than at Step 2.3, which cannot know what this
batch will hold. Never drop a field silently: one mandatory field left unasked comes back as a 400
at creation time, after the whole brainstorm.

It belongs here rather than at Step 2.3 because the spec only exists from Step 2.4, so a value
collected at 2.3 has nowhere to be recorded — and an unrecorded answer is one nothing keeps once the
session ends. Detection at 2.3, the question here, and Step 5 is still the first step that writes
`## Proposed tickets`.

Write each resolved answer into the spec's `## Framing decisions` table **as it is answered**, with
its reason. A decision recorded without its reason is a decision nobody can revisit later. A Jira
required-field answer is recorded the same way, its reason naming the issue type that required it —
that row is the audit trail of what was sent to Jira and why, and it is what makes the spec explain
the created ticket on its own, to a reader now or to a resume feature later.

## Step 5: Sizing

Read `references/sizing.md` and apply it. That file owns the whole heuristic — the deliverable
count, the reviewable-PR ceiling, how `plan.splitting` moves the threshold, the breakdown rules and
the acceptance-criteria formats. Do not restate its rules here.

The verdict is one of two shapes:

- **Single story** — one coherent deliverable, one reasonable PR.
- **Epic + N stories** — several independently mergeable deliverables, or several surfaces touched.

Two rules from that file are worth repeating because they are what a breakdown usually gets wrong.
Stories must be **independently shippable**: if only one of them ships and the epic is cancelled
tomorrow, the product is still coherent. And they must **never be horizontal slices** — "the
backend", "the frontend", "the tests", "the migration" each ship something that does nothing on its
own and force a sibling to land before anyone can see the feature. Slice vertically instead: one
capability, end to end, across whatever layers it needs.

Write `## Sizing` and `## Proposed tickets` into the spec, including the acceptance criteria per
story in the `plan.acceptanceCriteria` format. Then display `MSG_SIZING_VERDICT`.

## Step 6: Review, then approve

The spec is complete. Display `MSG_SPEC_REVIEW` with its path so the user can open and read it, then
ask with `MSG_APPROVAL`:

1. **Create them** → Step 7.
2. **Adjust the breakdown** → merge, split, reorder or reword. Every edit goes back into the spec,
   in place, before asking again. Loop here as many times as the user wants.
3. **Stop** → display `MSG_ABANDONED`. The spec stays on disk: the thinking is worth keeping even
   when the tickets are not.

Nothing is created before an explicit approval — no issue, no label, no sub-issue link. Approval is
never inferred from silence, from a timeout, or from an answer that could be read either way; those
go back to the question.

**This step is not configurable, and must never become configurable.** There is no setting to skip
it, and a request to add one should be refused: a setting that allows ticket creation without review
is a setting that eventually floods someone's backlog with tickets nobody asked for, in a repository
someone else owns. The review is the one thing standing between a good brainstorm and a bad backlog.

### 6.1: Metadata — second write

Once the structure is approved, refine the title to the agreed wording — the epic's title on a
breakdown, the story's on a single.

Write `{AGREED_TITLE}` to `.magic/.mp-title` with the `Write` tool, then:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(jq -Rsr 'sub("\n$";"") | @uri' < .magic/.mp-title)" > /dev/null 2>&1 || true
rm -f .magic/.mp-title
```

## Step 7: Ticket creation

Read `references/trackers.md` and follow the branch of the tracker carried from Step 2.3. That file
owns the creation calls (`mcp__github__issue_write`, `mcp__atlassian__createJiraIssue`), the real
hierarchy (GitHub sub-issues via `mcp__github__sub_issue_write`; on Jira the native `parent`, the
`Epic Link` field or an issue link, whichever the project exposes — never a markdown checklist), the
templates honoured when `plan.useRepoTemplates` is on (`.github/ISSUE_TEMPLATE/*`, or the Jira issue
type's description template), `plan.defaultLabels`, the `plan.assignToMe` assignee, and the
partial-failure rules. Its `## Usage` table is the contract it returns on.

Two things this step must get right, whatever the tracker:

**Bodies come from the spec, not from memory.** Compose each ticket body from the spec's sections —
that is what the user just reviewed and approved. Recomposing from the conversation reintroduces
everything the spec was written to pin down, and the ticket then says something subtly different
from the document that was approved. Bodies and criteria are written in the **ticket** language from
Step 0.2.

When that language differs from the spec's, **translate the spec's own words** — do not go back to
the conversation for an easier source in the target language. A translated body still says what was
approved; a re-remembered one does not, and this is the exact failure the rule above exists to
prevent. Keep the spec's structure, its criteria and its numbers intact through the translation, and
carry proper nouns, identifiers, file paths and code across verbatim.

**A partial failure is reported, not smoothed over.** Epic created and story 3 of 5 failing is a
real outcome. Nothing is rolled back — a created issue is a real issue someone may already have been
notified about. Append what exists to the spec first, then display `MSG_PARTIAL_CREATION` with the
created list, the failed list, and a reason per failure precise enough to resume from: the status
and what it refused, never "an error occurred".

On success, display `MSG_TICKETS_CREATED`, then append the created IDs and URLs to the spec's
`## Created tickets` table and set its status. The spec stops being a working document at that point
and becomes the record: months later it is the only place holding why the epic was cut this way.

### 7.1: Metadata — third write

Write `{TICKET_ID}: {TICKET_TITLE}` to `.magic/.mp-title` with the `Write` tool, then:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&ticketId={TICKET_ID}&title=$(jq -Rsr 'sub("\n$";"") | @uri' < .magic/.mp-title)&status=planned" > /dev/null 2>&1 || true
rm -f .magic/.mp-title
```

`{TICKET_ID}` is a tracker-issued identifier (`#412`, `PROJ-1234`) and is the one value still
substituted directly — it cannot carry shell syntax. Everything free-form goes through a file.

`{TICKET_ID}` is the **epic** on a breakdown: the epic is what this agent planned, and it is what
the sidebar should show. `{TICKET_TITLE}` is capped at 30 characters, and the `TICKET-ID: Title`
shape is the same convention `/magic:start` uses, so the two skills produce comparable rows.

**Never send `description`.** The planning agent's sidebar card shows the spec itself, not a
description field — the field is not rendered there at all, so anything written to it would be
invisible while still overwriting whatever the user had typed. The spec is this skill's long-form
output and the tickets carry their own bodies; there is nothing left for a summary to say. This is
about the **agent metadata** field only: the ticket descriptions composed in `trackers.md` §3.3 are
a tracker field and are unaffected.

Run this call even after a partial failure, carrying whatever ticket id does exist. A half-created
plan is still a plan the sidebar should show.

### 7.2: The created tickets

The metadata write above carries **one** ticket id — the epic, because that is what the sidebar row
is. This call carries the whole list, so the plan's page in the webapp can show the epic with its
stories under it instead of a single link.

Write the list to `.magic/.mp-tickets.json` with the `Write` tool, as a JSON array of objects with
exactly these five fields:

| Field | Value |
| --- | --- |
| `key` | the tracker's identifier — `#412`, `PROJ-1234` |
| `url` | the ticket's browse URL — **required**, never `null` |
| `title` | the ticket's title, in `languages.ticket` |
| `kind` | `"epic"` or `"story"` — nothing else |
| `parent_key` | the epic's `key` for a story under one, `null` otherwise |

A single-story plan is one object with `kind: "story"` and `parent_key: null`. An epic whose stories
partly failed lists what exists — never a placeholder for what does not.

`url` is the one field with no fallback: an entry missing it is **dropped**, silently, because the
column is `not null` and a ticket nobody can click is not worth a row. If the creation call did not
return a URL, compose it from the tracker coordinates the repo config already carries — `jira.siteUrl`
plus the key, or the GitHub repo's `issues/<number>` — rather than sending `null` and losing the ticket.

```bash
jq -c . < .magic/.mp-tickets.json > .magic/.mp-tickets-min.json
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/plan/tickets?id=$MAGIC_SLASH_TERMINAL_ID&tickets=$(jq -Rsr 'sub("\n$";"") | @uri' < .magic/.mp-tickets-min.json)" > /dev/null 2>&1 || true
rm -f .magic/.mp-tickets.json .magic/.mp-tickets-min.json
```

Three properties of that block are load-bearing, in the terms `## Metadata contract` sets out:

- **The list is never written into the command.** Ticket titles are free text — quotes, apostrophes,
  accents — and this payload is the largest one the skill produces. It goes on disk and the shell
  reads the path, exactly like every other free-form value here.
- **`jq -c` builds it, and `jq -Rsr @uri` encodes it once.** The first pass compacts the array and,
  more importantly, *validates* it: a malformed list fails here, on this machine, instead of arriving
  at the server as a query string nobody can read. Never `@json` before `@uri` — that would encode
  the array into a JSON *string* and the server would receive `"[{…}]"` where it expects `[{…}]`.
- **No `session_id`.** The skill has never seen one: the row is keyed on the spec's path and the
  desktop resolves the id at write time. Sending anything that looks like one would be a guess.

Run this after a partial failure too, with whatever was created. And run it even if `/plan/spec` has
never succeeded — the two are independent, and a list of tickets is worth having on its own.

## Step 8: Chain

Display `MSG_NEXT_STEPS`, offering `/magic:start <TICKET-ID>`.

On an epic breakdown, offer the **first story**, not the epic. The agent carries the epic as its
`ticketId` because that is what it planned, but an epic is not something anyone checks out a branch
for — those are two different questions and this is the one about branches.

Remind the user, in the one line `MSG_NEXT_STEPS` already carries, that the spec lives in the main
checkout: `/magic:start` creates a worktree, and an untracked `.magic/spec-*.md` does not appear
there.

## Step 9: Record the run

**Always run this, as the very last thing you do — including when the workflow stopped early**, on a
Step 2.3 refusal (`MSG_JIRA_NOT_CONFIGURED`, or a Jira project that does not resolve) as much as on
a completed creation.

Magic Slash opened a run record when this skill started. This closes it. Without it the run stays
open and is counted as *abandoned*, so finished work disappears from the usage statistics.

Set `outcome` to `success` when the workflow completed, or `failed` when it stopped on an error you
could not resolve. A user who chose to stop at Step 6 is a `success`: the skill did its job, and the
answer was no.

This writes to a file instead of calling the desktop app, so it works whether or not the app is
running.

```bash
MS_DIR="$HOME/.config/magic-slash"; mkdir -p "$MS_DIR" 2>/dev/null
printf '{"type":"end","skill":"magic-plan","agentId":"%s","outcome":"success","occurredAt":%s000}\n' \
  "$MAGIC_SLASH_TERMINAL_ID" "$(date +%s)" >> "$MS_DIR/pending-skills.ndjson" 2>/dev/null || true
```

---

## Metadata contract

Three writes, and nothing between them:

| When | Fields |
| --- | --- |
| Step 2.5 — repository chosen | `/repositories` with the repository path; then `title` (short idea), `status=planning`, `specPath` (absolute) |
| Step 6.1 — structure approved | `title`, refined to the agreed epic/story wording |
| Step 7.1 — tickets created | `ticketId`, `title` = `TICKET-ID: Title`, `status=planned` — never `description`, see Step 7.1 |

Plus two pings on `/plan/*`, which are notifications rather than metadata: they tell the desktop that
something it already knows where to find has changed.

| When | Call |
| --- | --- |
| Step 2.5, **after** `/metadata` — then after every later write to the spec | `/plan/spec?id=…`, bodyless |
| Step 7.2 — tickets created | `/plan/tickets?id=…&tickets=…`, the five-field list |

`/plan/spec` sends nothing but the terminal id, and the ordering is the whole subtlety: the desktop
learns `specPath` from the `/metadata` call, so a ping placed at Step 2.4 — before that call — has no
path to read and does nothing at all. Last in the 2.5 block, never earlier.

Every call is guarded by `[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ]`, sends
every value through `jq -sRr @uri`, and ends in `|| true`. The skill must work with the desktop app
closed — a plan is still a plan without a sidebar to show it in.

**This skill never talks to Supabase, and must never start.** It holds no URL, no key and no session,
and none of these calls reaches further than `127.0.0.1`. Everything that ends up in the cloud —
the session row, the spec, the ticket list — is written by the desktop app on the user's behalf,
under the user's own credentials and subject to their sync setting, which the skill neither reads nor
respects because it never needs to know: it reports to the local process and stops there.

That is what the guards and the `|| true` are for, and it is the reason they can never be tidied
away. With the app closed there is no port, the guard short-circuits, and the skill runs to
completion writing the spec and filing the tickets exactly as it would otherwise — nothing about the
plan depends on the cloud, and the spec on disk is always the complete artefact. A network call the
skill made itself would break that: it would need a secret, it would need to be online, and a plan
would start being able to fail for reasons that have nothing to do with planning.

**Free text never touches the command line.** Every free-form value — the idea, the agreed title —
is written to a file under `.magic/` with the `Write` tool, and the shell reads it back with
`jq -Rsr 'sub("\n$";"") | @uri' < <path>`. The command line therefore contains nothing but
a fixed literal path. This is a correctness requirement, not a style preference, and it is the part
of these blocks that must survive any later tidying:

- The point is not which quoting scheme is used, but that **no quoting scheme is involved at all**.
  Any attempt to carry the text through the command itself has a pathological input: single quotes
  break on the first apostrophe — and `/magic:plan` runs in a product used in French, where
  `j'ai une idée d'export` is the *normal* case; a quoted heredoc survives quotes, `$` and backticks
  but ends early on a line equal to its own delimiter. Handing the shell a path removes the whole
  class rather than moving its boundary, which is why the earlier heredoc form was replaced.
- `jq -sRr @uri` is not what makes this safe, and it is worth being precise about why: it encodes the
  value it *receives*. A literal that broke apart before `jq` ever ran is not a value it can protect.
  Reading from a file is what guarantees `jq` receives the whole value.
- `.magic/` is already created in Step 2.4 and git-excluded, so these files cost no new directory and
  can never be committed. Delete them right after the call — they are a transport, not an artefact.

Where a value must become JSON rather than a bare string, build it with `jq -c` and encode the result
**once** — never `@json` followed by another encode, which yields a JSON string where the server
expects an array, and never by pasting the value between literal brackets or braces.

`{TICKET_ID}` is the one value still substituted directly into a command, in Step 7.1: it is a
tracker-issued identifier (`#412`, `PROJ-1234`) and cannot carry shell syntax.

`status=planning` and `status=planned` are already members of the `TerminalMetadata.status` union and
already have `statusToAction` entries: the contract was declared before anything sent them, so
there is nothing to add on the desktop side.

**`branchName` and `baseBranch` are never sent. Not once, not empty, not "for completeness".**
`/magic:plan` creates no worktree and no branch, so it has no branch to report and must not claim
one — a plausible wrong branch on an agent is worse than a null one, and every reader (the sidebar,
the back-office agent list) would show it as fact. If a later change to this skill seems to need
them, it means the skill has started creating branches, and that is a different skill.

`specPath` is absolute and stays a **main-checkout** path, for the same reason: `/magic:start`
creates a worktree where an untracked spec does not appear, so the chained skill has to read it
where it actually is.

For the Magic Slash Desktop API reference (endpoints `/metadata`, `/repositories`, `/plan/spec` and
`/plan/tickets`), see `references/api.md`.
