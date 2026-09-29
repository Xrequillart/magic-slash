# Metadata contract

The calls this skill sends to Magic Slash Desktop, when, and why each one has the shape it has.
Read §1 in Step 2.5, §2 in Step 6.1, §3 in Step 7.1 and §4 in Step 7.2, and run the block each one
holds. §5 (the Step 8 close line) and §6 (the full contract) are reasoning: read them when a call's
shape is in doubt, or before changing any call.

Every block runs from `{REPO_PATH}`, where `.magic/` lives, and every free-form value it reads
was put on disk with the `Write` tool first (§6).

## 1. Step 2.5: the first write

Write these three files under the `.magic/` directory created in 2.4 (it is git-excluded, so nothing
here can be committed):

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

**The third call, `/plan/spec`, must stay last in the block.** It carries no payload: it says "the
spec at the path you already know has changed on disk", and the desktop reads the file itself. Which
is exactly why it cannot run at Step 2.4, however tempting it looks there — the desktop only learns
`specPath` from the `/metadata` call on the line above, so a ping issued before it resolves to an
agent with no spec path and is a guaranteed no-op. After the `/metadata` call, the first ping is
what records the session in the cloud.

Pinging often is free and pinging rarely is not: the desktop coalesces bursts before it uploads, so
an extra call costs nothing, while a skipped one leaves the last section of a spec invisible to
everyone else until the next write happens to land.

## 2. Step 6.1: the second write

With `{AGREED_TITLE}` written to `.magic/.mp-title`:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(jq -Rsr 'sub("\n$";"") | @uri' < .magic/.mp-title)" > /dev/null 2>&1 || true
rm -f .magic/.mp-title
```

## 3. Step 7.1: the third write

With `{TICKET_ID}: {TICKET_TITLE}` written to `.magic/.mp-title`:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(jq -Rsr 'sub("\n$";"") | @uri' < .magic/.mp-title)&status=planned" > /dev/null 2>&1 || true
rm -f .magic/.mp-title
```

**Why the write is not optional.** `status=planned` is the planner's terminal status, and the agent
stays at `planning` until this call lands — a session whose tickets are already filed still showing
as *planning* reads as one that is still thinking, its `planned` event never reaches the history the
flow metrics are computed from, and the desktop keeps the agent's close button hidden, because it
only offers it at a workflow's end. So the transition is part of the deliverable: the tickets exist,
and the agent has to say so.

**Why `ticketId` is never sent.** A planner is linked to its **plan**, not to a ticket, and it is
linked from the first minute: the desktop creates the plan's row when Step 2.5 announces `specPath`,
and writes that row's id back onto the agent itself — the sidebar's plan badge opens it. The tickets
hang off the plan (Step 7.2), which is where the Plans page and the ticket's own page read them. A
`ticketId` here would make the planner an agent *on* the epic, which it is not: nobody works on an
epic, and the Tasks board would show a finished planning session as someone busy on it.

**Why `description` is never sent.** The planning agent's sidebar card shows the spec itself, not a
description field — the field is not rendered there at all, so anything written to it would be
invisible while still overwriting whatever the user had typed. The spec is this skill's long-form
output and the tickets carry their own bodies; there is nothing left for a summary to say.

**Why the call still runs after a partial failure.** A half-created plan is still a plan the sidebar
should show, and the planning is over either way: what is missing is tickets, not a decision.
Leaving such an agent at `planning` would make the one case where the user most needs to act on the
result the one case where the sidebar hides that there is a result.

## 4. Step 7.2: the ticket list

Write the list to `.magic/.mp-tickets.json` with the `Write` tool, as a JSON array of objects with
exactly these five fields:

| Field | Value |
| --- | --- |
| `key` | the tracker's identifier — `#412`, `PROJ-1234` |
| `url` | the ticket's browse URL — **required**, never `null` |
| `title` | the ticket's title, in `languages.ticket` |
| `kind` | `"epic"` or `"story"` — nothing else |
| `parent_key` | the epic's `key` for a story under one, `null` otherwise |

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

## 5. Step 8: why the agent is closed

`MSG_NEXT_STEPS` says this agent has finished and can be closed, and that `/magic:start` belongs in
a **new** one. That is not a courtesy line. A planner's work ends at `planned`: it holds no branch
and no worktree, and everything it has to hand on is already in the spec and in the tickets — so the
conversation behind it is spent context, and continuing in it would start the implementation with
the window mostly full of a debate that has been settled. The close button the line points at is on
this agent at `planned` (Step 7.1), so the instruction matches something the user can actually see
and click.

## 6. The contract

Three writes, and nothing between them:

| When | Fields |
| --- | --- |
| Step 2.5 — repository chosen | `/repositories` with the repository path; then `title` (short idea), `status=planning`, `specPath` (absolute) |
| Step 6.1 — structure approved | `title`, refined to the agreed epic/story wording |
| Step 7.1 — tickets created | `title` = `TICKET-ID: Title`, `status=planned` — never `ticketId` nor `description`, see Step 7.1 |

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
