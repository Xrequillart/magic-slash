---
name: magic:start
description: This skill should be used when the user mentions a ticket ID like "PROJ-123", "#456", says "start", "commencer", "travailler sur", "je vais bosser sur", "begin work on", "work on ticket", "work on issue", "démarre", "démarrer", or indicates they want to start working on a specific task.
argument-hint: <TICKET-ID>
allowed-tools: Bash(*), Read, Write, Edit, Glob, Grep, WebFetch, Agent, AskUserQuestion, mcp__atlassian__*, mcp__github__*
---

# magic-slash v0.77.0 - /start

You are an assistant that helps start a development task from a Jira ticket or a GitHub issue.

Follow each step in order. Each step builds on the previous one.

## References

- `references/messages.md` — All bilingual messages (MSG_*). Read relevant sections as needed (not the whole file at once).
- `references/node-setup.md` — Node.js version manager detection. Read before installing dependencies (Step 4.3).
- `references/plan-template-{type}-{lang}.md` — Implementation plan template. Read the matching file (`single`/`fullstack` + `en`/`fr`) in Step 5.2.
- `references/design-context.md` — Design reference detection, resolution and the `.magic/design-brief.md` artifact. Read in Step 5.0, only when a UI signal is detected.
- `references/glossary.md` — EN/FR terminology for git concepts. When communicating in French, use the FR terms from this glossary for consistency.
- `references/api.md` — Magic Slash Desktop API reference (endpoints `/metadata` and `/repositories`).
- `references/test-accounts.md` — Test-account modes, discovery cascade, and the credential guardrails. Read in Step 5.5.1, only when `pullRequest.testAccounts` is not `off`.
- `references/jira-custom-fields.md` — Jira custom-field discovery: the `*all` re-read, its volume guards, and the empty-ticket options. Read in Step 2A, only when the ticket description carries no usable spec.
- `references/dependencies.md` — Dependency detection, blocker resolution, the decision matrix and the per-verdict behaviour. Read in Step 2.4, only when the ticket declares at least one blocker.

## Step 0: Configuration

### 0.1: Check config file exists

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

If `APP_NOT_RUNNING`, the app is not running and the cloud config is unreachable: display `MSG_APP_NOT_RUNNING` and stop. Never proceed on a guessed config.

### 0.2: Determine language

Once the repo is identified (step 3), read `.repositories.<name>.languages.discussion` from config. Default: `"en"`. Until the repo is identified, use English for all messages.

### 0.3: Check Atlassian integration

Read `integrations.atlassian` from config. Default: `true` (backward compatibility).

```bash
# Every bash block runs in its own shell: $MS_PORT does not survive from Step 0,
# so resolve it again here. One line, and it costs nothing to repeat.
MS_PORT="${MAGIC_SLASH_PORT:-$(cat ~/.config/magic-slash/port 2>/dev/null)}"
curl -sf --max-time 5 "http://127.0.0.1:$MS_PORT/config" | jq -r '.integrations.atlassian // true'
```

Store the result as `$ATLASSIAN_ENABLED`. If `false`, only GitHub issue format (`#123`) is accepted in Step 1.

### 0.4: Determine development branch (execute after repo is identified in step 3)

Read `.repositories.<name>.branches.development` from config.

- **If configured**: Use `AskUserQuestion` with the configured branch as default option and a free-text alternative. Display `MSG_BRANCH_CONFIRM` as the question text.
- **If not configured**: Use `AskUserQuestion` to ask. Display `MSG_BRANCH_ASK` as the question text.

Store the result as `$DEV_BRANCH`.

### 0.5: Determine the test-account mode (execute after repo is identified in step 3)

Read `.repositories.<name>.pullRequest.testAccounts` from config. Default: `"off"`. Read `.repositories.<name>.pullRequest.testAccountsSource` the same way. Default: `""`. These are the first `pullRequest.*` values this skill reads.

`<name>` is the **config key** of the repo selected in step 3 — the key it is stored under in `.repositories`, which is not always the repo directory name (two orgs can share a repo name, so keys are disambiguated). Use the key from the entry step 3 already resolved; do not re-derive it from `basename "$PWD"`, and do not read this before step 3 has picked a repo.

Keep the mode and source **per repo**, keyed by config key (e.g. `api → reference`, `web → off`) — a fullstack ticket resolves them once per repo, never once for the ticket. Do not collapse them into a single `$TA_MODE` / `$TA_SOURCE` pair: on a multi-repo start the second repo would overwrite the first. Step 5.5.1 re-reads the pair for the repo it is currently describing. If a repo's mode is `off` (the default) or any value other than `reference` / `inline`, Step 5.5.1 skips test-account resolution for that repo entirely. Otherwise it reads `references/test-accounts.md`.

## Step 1: Detect ticket type

Analyze `$ARGUMENTS`:

- **Jira**: Alphabetic prefix + hyphen + digits (regex: `^[A-Za-z]+-\d+$`, normalize to uppercase) → Step 2A
  - **If `$ATLASSIAN_ENABLED` is `false`**: Do not match Jira format. If the user provides a Jira ID (e.g., `PROJ-123`), display:
    > ⚠️ Atlassian integration is not configured. Only GitHub issues (#123) are supported.
    > To enable Atlassian, open the Magic Slash app → Settings → Integrations.
    
    Then stop.
- **GitHub**: Number with optional `#` (regex: `^#?\d+$`) → Step 2B
- **Unrecognized**: Ask user to clarify.

## Step 2A: Retrieve the Jira ticket

Use `mcp__atlassian__getJiraIssue` to retrieve ticket details. If you don't know the `cloudId`, use `mcp__atlassian__getAccessibleAtlassianResources` first.

Pass an explicit `fields` array so design references are never dropped:

```json
["summary","description","issuetype","status","labels","components","attachment","issuelinks"]
```

`attachment` is metadata only (`filename`, `mimeType`, `content`) and is what Step 5.0 needs to spot an image attachment. Comments are **not** requested here: they are retrieved later, and only if Step 5.0 detects a UI signal (see `references/design-context.md` §2.1), so a backend ticket never pays for its comment thread.
`issuelinks` rides along with the retrieval already performed, which is what makes Jira "is blocked by" links visible to Step 2.4 — they are absent from the MCP default field set — and what makes the dependency gate free when no blocker is declared.

In parallel, also call `mcp__atlassian__getJiraIssueRemoteIssueLinks` for the same issue: a Figma file is very often attached as a remote link rather than pasted in the description. Extract `object.url` and `object.title` from each entry and keep them for Step 5.0.

If the MCP call fails (timeout, auth error), retry once. If it fails again, ask the user to provide the ticket title and description manually so the workflow can continue. A failure on the remote links call is never blocking: continue without them.

**Completeness check.** The ticket's real spec may sit in a custom field. Read `references/jira-custom-fields.md` and follow it whenever `fields.description` does not state what to build: it is absent or null; or under **80 characters** of useful text once markup is stripped and not a complete one-liner ("Bump the Stripe SDK to v14" is a spec); or longer, yet stating neither what to build nor any acceptance criterion (every heading present with an empty or placeholder body, pure boilerplate, a deferral to another field, a bare link with no prose). A description that does say what to build never triggers it, however short — in doubt, skip, so this does not become a second full-issue call on every ticket. That file owns the discovery call, the volume guards, what the discovered text feeds into, and the handling of a ticket still empty afterwards. If it is missing on disk, skip discovery and degrade to the warning alone: say in one line that the ticket looks underspecified, ask the user for the missing context, and never fill the gap from the title alone.

→ Continue to Step 2.4, then Step 2.5, then Step 2.6, then Step 2.7.

## Step 2B: Retrieve the GitHub issue

### 2B.1: Read repos configuration

Read the live config fetched in Step 0 (kept in memory — `$CONFIG_FILE` does not survive into later bash blocks) to get the list of configured repos.

### 2B.2: Identify GitHub repos

For each configured repo, get owner/repo from the remote URL:

```bash
cd {REPO_PATH} && git remote get-url origin
```

Parse `owner/repo` from either `git@github.com:owner/repo.git` or `https://github.com/owner/repo.git`.

### 2B.3: Search for the issue

Use `mcp__github__get_issue` for each repo — launch all calls in parallel for speed. Collect all found issues. If an MCP call fails, retry once; if still failing, skip that repo and continue with the others.

Keep the `issue_dependencies_summary` object this call already returns (`blocked_by`, `total_blocked_by`, `blocking`, `total_blocking`): it carries counts only, no IDs, but that is enough for Step 2.4 to short-circuit at zero cost when `blocked_by == 0`. Only a non-zero count justifies resolving the actual blocker IDs.

### 2B.4: Resolution

- **No issue found**: Display `MSG_NO_ISSUE_FOUND`.
- **Single issue**: Use it. Scope = that repo.
- **Multiple issues**: Use `AskUserQuestion` with the list of issues as options. Display `MSG_GITHUB_MULTI_ISSUE` as the question text.

### 2B.5: Scan the comments for design references

A Figma link is often dropped in a follow-up comment rather than in the issue body, so Tier 2 detection in Step 5.0 needs to see one. Fetching the whole thread would put it in context on every ticket, backend included — so filter it in the shell instead, and let only the matches through:

```bash
gh issue view {number} --repo {owner}/{repo} --comments 2>/dev/null \
  | grep -ioE '(figma\.com|\.fig\b|design/|mockups?/|[a-z0-9_./-]+\.(html|css|styles\.ts))[^[:space:]]*' \
  | sort -u | head -20
```

On a ticket with no design reference this prints nothing, so it costs nothing — and empty output is the nominal backend case, not a failure. (`grep` exits 1 when it matches nothing, but the pipeline's status is `head`'s, so the command still succeeds.) If `gh` is unavailable or fails, continue with the issue body alone. The full thread is never retrieved here: `references/design-context.md` §2.1 reads it later, once a signal has actually fired.

→ Continue to Step 2.4, then Step 2.5, then Step 2.6, then Step 2.7.

## Step 2.4: Dependency gate

A ticket that depends on unlanded work is not ready to start. This step resolves that dependency against reality — and a **merged PR carrying the blocker's ID means the dependency has landed, whatever the tracker says**.

**Position.** The gate sits here because everything before it is read-only and everything after it mutates something — so it runs on the ticket already retrieved in Step 2A/2B, before any of it.

**Early exit — the zero-blocker case.** First decide, from data already in hand, whether the ticket declares a dependency at all. It does when either tracker signal fires:

- Jira: `fields.issuelinks` (requested in Step 2A) holds a link whose type is inward "is blocked by" / "depends on".
- GitHub: `issue_dependencies_summary.blocked_by > 0` (returned by Step 2B.3).

…or when the description — including any custom-field text discovered in Step 2A — carries a dependency keyword that is **not** preceded by a negation (`not`, `no longer`, `pas`, `plus`). The keyword list is the one in `references/dependencies.md` §2.3, in full and verbatim — EN `blocked by`, `depends on`, `dependent on`, `needs`, `requires`, `waiting on`, `waiting for`, `after`; FR `bloqué par`, `bloque par`, `dépend de`, `depend de`, `nécessite`, `en attente de`, `après`. That is a string scan, not an API call, so it stays free.

This pre-filter must never be narrower than §2.3, only looser: it skips the adjacency window and the full negation skip-list, both of which §2.3 applies afterwards and which can still conclude that nothing is declared — a `none` verdict, handled exactly like this early exit. Dropping a keyword here instead early-exits a ticket that §2.3 would have matched, and the reference file is never read to catch it. `after PROJ-4` is the case that makes this concrete: it is a detection case the ticket names explicitly, and it fires on `after` alone.

If nothing is declared, the gate ends here: do not read `references/dependencies.md`, make **no** extra API call, say nothing, and continue.

**Otherwise, read `references/dependencies.md`** and follow it. That file owns detection, the blocker resolution calls, the `owner/repo` derivation, the decision matrix, the worst-verdict aggregation, every message key, and the values this gate returns to its callers (its `## Usage` section). Do not restate its rules here.

**If `references/dependencies.md` is missing on disk**: skip the gate, say in one line that the dependency check could not run because its reference file is absent, and continue to Step 2.5 — never fabricate a verdict from the blocker's tracker status alone. The same applies to any degradation the file itself defines (`gh` absent or unauthenticated, `$ATLASSIAN_ENABLED` false with a Jira-shaped blocker): report `MSG_BLOCKER_CHECK_UNAVAILABLE` and continue.

**The 🔴 question is asked here**, before anything is created. Use `AskUserQuestion` with `MSG_BLOCKER_HARD` (no PR found) or `MSG_BLOCKER_ABANDONED_PR` (closed unmerged PR — a distinct outcome, never folded into the first) and exactly three options:

1. **Start this ticket anyway** → continue to Step 2.5 as usual, carrying the blocker into `{attention_points}` of the final summary.
2. **Start the blocker instead** → re-enter this skill at Step 1 with the blocker's ID as `$ARGUMENTS`. The guard is a **note carried in the conversation** — state that the gate has already run this session, and the second pass skips Step 2.4 on seeing it. The gate is depth 1 by design: direct blockers only, never the blockers of blockers, so without that note the blocker's own blockers would ask the same question one level down.
3. **Stop here** → the skill stops. Step 6 still runs, with `outcome` `failed` since the workflow did not complete — an unclosed run record is counted as abandoned and the run disappears from the statistics.

Nothing is created before the answer: no `/metadata` POST, no Jira transition, no GitHub label, no worktree, no branch. "Stop here" is never inferred from silence, a timeout or an unparseable answer; those go back to the question.

**The 🟡 branch question is asked in Step 4.1**, not here — only the verdict is computed at this step.

## Step 2.5: Update Magic Slash Desktop metadata

This step updates the Magic Slash Desktop sidebar so the user sees their task context at a glance. Without it, the UI shows a blank/stale entry.

### 2.5.1: Generate ticket description

Generate a concise description (2-3 sentences max) in the configured language, based on the ticket title, description, and acceptance criteria.

Custom-field text discovered in Step 2A feeds this summarisation but must never reach `/metadata` raw: the description is URL-encoded into a `curl` query string (Step 2.5.2).

### 2.5.2: Send metadata

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&title=$(echo -n '{TICKET_ID}: {TICKET_TITLE}' | jq -sRr @uri)&ticketId={TICKET_ID}&description=$(echo -n '{DESCRIPTION}' | jq -sRr @uri)&status=in%20progress&type=coder&baseBranch={DEV_BRANCH}" > /dev/null 2>&1 || true
```

Replace `{TICKET_ID}`, `{TICKET_TITLE}` (max 30 chars), `{DESCRIPTION}`, `{DEV_BRANCH}`.

## Step 2.6: Update ticket status to "In Progress"

This step never blocks the process. On failure, display a warning and continue.

### 2.6A: Jira ticket

1. Retrieve transitions with `mcp__atlassian__getTransitionsForJiraIssue`
2. Look for: "In Progress", "En cours", "In Development", "Started", "In Work"
3. Apply with `mcp__atlassian__transitionJiraIssue`
4. On failure: Display `MSG_TRANSITION_FAILED`

### 2.6B: GitHub issue

1. Check if a progress label exists: "in-progress", "wip", "in progress", "working"
2. If found: Add via `mcp__github__update_issue` (keep existing labels)
3. If not found: Continue without modification (do not create a label)
4. On failure: Display `MSG_LABEL_FAILED`

## Step 2.7: Generate branch slug

Generate a short, human-readable slug from the ticket title to append to the branch name.

```bash
SLUG=$(echo "$TICKET_TITLE" | \
  tr '[:upper:]' '[:lower:]' | \
  sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' | \
  cut -d'-' -f1-5 | cut -c1-30 | sed 's/-$//')
```

If `$SLUG` is empty after processing (e.g., title with only special characters), skip the slug — the branch name falls back to the ticket ID alone.

## Step 3: Analyze ticket scope (smart repo selection)

**Short-circuit**: If only one repo is configured, use it directly — skip scoring (steps 3.2-3.4).

### 3.1: Read configuration (if not already done)

### 3.2: Extract ticket information

**Jira**: labels, components, title, description.
**GitHub**: labels, title, description.

Custom-field text discovered in Step 2A folds into the `description` source and scores **+2 once**, not +2 per field. Eight discovered fields would otherwise outweigh a +10 label match and silently change which repo gets selected.

### 3.3: Calculate relevance score for each repo

For each configured repo, calculate a score based on its keywords. **All matching is case-insensitive** and supports common variants (with/without hyphens, e.g. "backend" matches "back-end"):

| Match source | Points |
| --- | --- |
| Jira label/component or GitHub label matching a keyword | +10 |
| Keyword found in title | +5 |
| Keyword found in description | +2 |

**Example**: Ticket "Add an API endpoint for users", labels: ["backend"]
- api (keywords: ["backend", "api", "server"]) → 10 (label "backend") + 5 (title "API") = **15**
- web (keywords: ["frontend", "ui", "react"]) → **0**

### 3.4: Scope resolution

- **Single repo with score > 0**: Use it directly.
- **Multiple repos with scores > 0**: Use `AskUserQuestion` with the repos as numbered options (include scores and matched keywords). Display `MSG_SCOPE_MULTIPLE` as the question text.
- **No match (all scores = 0)**: Use `AskUserQuestion` listing all repos. Display `MSG_SCOPE_NONE` as the question text.
- **GitHub special case**: If the issue was found in a single repo (step 2B), scope is automatic.

## Step 4: Create worktrees

### 4.0: Check if worktree already exists

```bash
WORKTREE_PATH="../${REPO_NAME}-$TICKET_ID"
[ -d "$WORKTREE_PATH" ] && echo "EXISTS" || echo "NEW"
```

If it exists, use `AskUserQuestion` with `MSG_WORKTREE_EXISTS` options:
- Option 1: `cd` into existing worktree, continue to step 4.2
- Option 2: `git worktree remove --force {path}` then recreate
- Option 3: Stop

### 4.1: Create the worktree

**Resolve the base branch, per repo.** If Step 2.4 returned a 🟡 verdict with a candidate base branch, ask the question **now** — this is the earliest point where it can be asked, because `$DEV_BRANCH` is only resolved in Step 0.4 ("execute after repo is identified in step 3") and the repo set is only known after Step 3. Asking at Step 2.4 would name a default that does not exist yet, and Step 0.4 would then ask about the dev branch anyway. The verdict is computed at 2.4; only the question moves here.

Use `AskUserQuestion` with `MSG_BLOCKER_IN_FLIGHT`, offering the blocker's PR head branch and `$DEV_BRANCH` (the default). Keep the answer **per repo, keyed by config key**, the way Step 0.5 keeps the test-account pair: the blocker's PR head branch exists in exactly **one** repo, so a single `$BASE_BRANCH` scalar would send that ref to repos where it does not exist and fail `git worktree add` in all of them. Every other repo keeps `$DEV_BRANCH`.

**Re-check any 🟢 that rested on a merged PR, before creating anything.** `references/dependencies.md` §3.5 clears a blocker whose PR merged into the branch the worktree will start from — but at Step 2.4 it could only compare against the *configured* development branch, since `$DEV_BRANCH` is resolved here in Step 0.4 and the user may have answered with a different branch. Compare the gate's `merge_target_checked_against` (its `## Usage` contract) with the `$DEV_BRANCH` now in hand:

- **Same branch** — the 🟢 stands. Continue.
- **Different, and the PR merged into `$DEV_BRANCH` too** — the 🟢 stands. Continue.
- **Different, and it did not** — the blocker's code is *not* on the branch this worktree starts from, so the 🟢 was earned against the wrong base. Downgrade to 🟡 and ask the question above. Say in one line which two branches diverged, so the user sees this came from their Step 0.4 answer and not from the PR.

**On this downgrade, offer `mergeCommit.oid`, not `headRefName`.** The blocker's PR is merged, and GitHub deletes the head branch on merge by default — so `headRefName` names a branch that usually no longer exists, and offering it would produce a 🟡 with nothing checkoutable behind it. The merge commit always exists. `references/dependencies.md` §3.4 requests both fields for exactly this reason: `headRefName` is the base to offer on an **open** PR, `mergeCommit.oid` on a **merged** one. A detached base ref is fine here — the worktree gets its own new branch either way, since Step 4.1 passes `-b "$BRANCH_NAME"`.

**And the `$DEV_BRANCH` fallback below does not apply on this path.** That fallback exists for a base branch that cannot be resolved, where continuing on the dev branch is harmless. Here it is the opposite: this re-check just established that `$DEV_BRANCH` lacks the blocker's code, so silently falling back to it would undo the very finding that triggered the downgrade — a false 🟢 restored one step after being caught, and invisible because the fallback is silent. If the merge commit cannot be resolved either (`git fetch origin <oid>` then `git rev-parse --verify` both fail), do not create anything. Display `MSG_BLOCKER_CHECK_UNAVAILABLE` for the reason — that key reports, it does not ask — then ask with `MSG_BLOCKER_HARD`'s three options, exactly as the 🔴 path does: start on `$DEV_BRANCH` anyway, start the blocker instead, or stop. Better to stop than to start on a base known to be wrong.

This is the only verdict that can move after Step 2.4, and it can only move in the safe direction — 🟢 → 🟡, never the reverse. A 🔴 was already settled with the user before anything was created, and a 🟡 is re-asked here anyway.

For each selected repo, resolve that repo's own value once, up front — so every use below reads a variable that is always set:

```bash
cd {REPO_PATH}
REPO_NAME=$(basename "$PWD")
BASE_BRANCH="${BASE_BRANCH:-$DEV_BRANCH}"
git fetch origin
```

If `git fetch` fails (network issue), display `MSG_FETCH_FAILED` and continue with local state.

```bash
git checkout $DEV_BRANCH
git pull --rebase origin $DEV_BRANCH
```

This pair always targets `$DEV_BRANCH`, never `$BASE_BRANCH`: pulling a remote feature branch into the local dev branch would rewrite the dev branch with the blocker's commits, in the user's main checkout, for every later ticket. Refresh the dev branch here, and get the blocker's branch as a ref instead — it may not exist locally at all, so fetch it before using it as a base:

The base may be a **branch name** (an open blocker PR's `headRefName`) or a **commit SHA** (a merged one's `mergeCommit.oid`, per the downgrade above). They fetch differently, so branch on the shape:

```bash
BASE_REF="$DEV_BRANCH"
if [ "$BASE_BRANCH" != "$DEV_BRANCH" ]; then
  if printf '%s' "$BASE_BRANCH" | grep -qE '^[0-9a-f]{7,40}$'; then
    git fetch origin "$BASE_BRANCH" 2>/dev/null || true
    git rev-parse --verify --quiet "${BASE_BRANCH}^{commit}" > /dev/null && BASE_REF="$BASE_BRANCH"
  else
    git fetch origin "$BASE_BRANCH:refs/remotes/origin/$BASE_BRANCH" 2>/dev/null || true
    git rev-parse --verify --quiet "origin/$BASE_BRANCH" > /dev/null && BASE_REF="origin/$BASE_BRANCH"
  fi
fi
```

`$BASE_REF`, not `$BASE_BRANCH`, is what the worktree is created from. The distinction matters: a blocker's branch is fetched into `refs/remotes/origin/`, so a **local** branch of that name usually does not exist, and `git worktree add … "$BASE_BRANCH"` would fail with `invalid reference` on exactly the 🟡 path this feature exists to serve. `$DEV_BRANCH` is safe bare because the checkout above created it locally; a remote-only base is not. Keeping `$BASE_BRANCH` as the plain value is still useful — it is what the messages and the `baseBranch` metadata report.

The hex test is a safety net, not the decision: you already know which kind of base the gate handed over — `headRefName` for an open PR, `mergeCommit.oid` for a merged one — so use that knowledge and treat the test as a guard against the rare branch whose name is bare hex.

`$BASE_REF` is left at `$DEV_BRANCH` when the fetch leaves the base unresolvable — say so in one line, and never let a missing base branch abort the start. **One exception, and it is not optional**: on the 🟢 → 🟡 downgrade above, this re-check has already established that `$DEV_BRANCH` lacks the blocker's code, so falling back to it would silently undo that finding. There, an unresolvable base stops and asks with `MSG_BLOCKER_CHECK_UNAVAILABLE` instead of defaulting. The rule is only safe where the fallback is harmless.

If `git pull --rebase` fails with conflicts, use `AskUserQuestion` with `MSG_REBASE_CONFLICT` options.

**Create the worktree:**

```bash
BRANCH_NAME="feature/$TICKET_ID"
[ -n "$SLUG" ] && BRANCH_NAME="feature/$TICKET_ID-$SLUG"
git worktree add -b "$BRANCH_NAME" ../${REPO_NAME}-$TICKET_ID "$BASE_REF"
```

If this fails because the branch already exists, use `AskUserQuestion` with `MSG_BRANCH_ALREADY_EXISTS` options:
- Option 1: `git worktree add ../${REPO_NAME}-$TICKET_ID $BRANCH_NAME` (use existing branch)
- Option 2: `git branch -D $BRANCH_NAME` then retry creation
- Option 3: Stop

**Branch naming**:
- Jira: `feature/PROJ-1234-implement-stripe-refunds`
- GitHub: `feature/repo-name-123-add-user-profile` (prefix with repo name to avoid conflicts)
- If the slug is empty, falls back to `feature/$TICKET_ID` (no trailing hyphen)

**Change to the worktree** — the rest of the skill operates from inside the worktree, so all subsequent file operations and commands target the right directory:

```bash
cd ../${REPO_NAME}-$TICKET_ID
```

**Attach the worktree to the agent** — this tells the Desktop sidebar which project this terminal belongs to, so the user sees it grouped correctly:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(echo -n '["'$(pwd)'"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

**Report the branch** — a second metadata call rather than a parameter on the one in step 2.5, because that one runs before the branch exists: the slug is only generated in step 2.7 and `$BRANCH_NAME` only composed above. Without this the agent's `branch_name` stays null for its whole life, and every reader (the Desktop sidebar, the back-office agent list) has to fall back to the ticket id.

Read from `git branch --show-current` rather than echoing `$BRANCH_NAME` back: that reports what git actually checked out, so it stays correct on the "branch already exists" path where the user chose to reuse it.

`baseBranch` rides along to **overwrite** the value Step 2.5.2 already sent. That earlier call reports `$DEV_BRANCH` because it runs before the 🟡 question is answered; on the 🟡 path the real base is the blocker's branch, and only this call knows it. Sending it unconditionally keeps the two paths identical: on a nominal start the value is `$DEV_BRANCH` either way.

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&branchName=$(echo -n "$(git branch --show-current)" | jq -sRr @uri)&baseBranch=$(echo -n "$BASE_BRANCH" | jq -sRr @uri)" > /dev/null 2>&1 || true
```

In a multi-repo start this runs once per worktree and the agent keeps the last one, since `branch_name` is a single column. For Jira that is the same name in every repo; for GitHub, where the name is prefixed per repo, the last repo processed wins.

### 4.2: Copy worktree files

Check if the repo has `worktreeFiles` configured (`.repositories.<name>.worktreeFiles`).

#### Case A: `worktreeFiles` is configured

Copy each file from the main repo to the worktree. Only copy files that exist; silently skip missing ones. Display `MSG_WORKTREE_FILES_COPIED`.

#### Case B: Not configured — auto-detect

Scan for common untracked files in the main repo:

```bash
MAIN_REPO="{REPO_PATH}"
CANDIDATES=(.env .env.local .env.development .env.development.local .env.test .env.test.local .env.production.local .npmrc .yarnrc .yarnrc.yml .python-version .tool-versions)
for f in "${CANDIDATES[@]}"; do
  [ -f "$MAIN_REPO/$f" ] && ! git -C "$MAIN_REPO" ls-files --error-unmatch "$f" > /dev/null 2>&1 && echo "$f"
done
```

If files detected: Use `AskUserQuestion` with `MSG_WORKTREE_FILES_DETECTED` (y/n). If user says yes, persist the choice to the cloud:

```bash
# The app owns the write: it is the only process holding the cloud session. Silent and
# non-blocking, as every write endpoint is. Its own shell, so resolve the port again.
MS_PORT="${MAGIC_SLASH_PORT:-$(cat ~/.config/magic-slash/port 2>/dev/null)}"
curl -s "http://127.0.0.1:$MS_PORT/config/worktree-files?path=$(echo -n "$PWD" | jq -sRr @uri)&files=$(echo -n '["file1","file2"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

Then copy the files either way. If no files detected, skip silently.

### 4.3: Install dependencies

Read `references/node-setup.md` to detect the Node.js version manager and set `$NODE_PREFIX`.

**Detect package manager** — check lock files in worktree root, **first match wins** (stop at first detected):

| Priority | Lock file | Package manager | Install command |
|----------|-----------|----------------|-----------------|
| 1 | `bun.lockb` or `bun.lock` | bun | `bun install` |
| 2 | `yarn.lock` | yarn | `yarn install` |
| 3 | `pnpm-lock.yaml` | pnpm | `pnpm install` |
| 4 | `package-lock.json` | npm | `npm install` |
| 5 | `requirements.txt` | pip | `pip install -r requirements.txt` |
| 6 | `pyproject.toml` + `poetry.lock` | poetry | `poetry install` |
| 7 | `Cargo.toml` | cargo | `cargo build` |
| 8 | `go.mod` | go | `go mod download` |
| 9 | `Gemfile.lock` | bundler | `bundle install` |
| 10 | `composer.lock` | composer | `composer install` |

If no lock file but `package.json` exists, default to `npm install`.
If no recognizable project file exists, skip this step.

**Monorepo note**: If the project uses a monorepo structure (e.g. `pnpm-workspace.yaml`, `"workspaces"` in `package.json`, or `lerna.json`), install from the worktree root — the package manager will handle workspace packages automatically.

For Node.js projects, prepend `$NODE_PREFIX` to the install command.

Display `MSG_INSTALLING_DEPS`. On failure, display `MSG_INSTALL_FAILED` and continue.

## Step 4.5: Report context (multi-repo only)

If multiple worktrees were created:

1. Send full-stack metadata — links all worktrees together in the Desktop UI so the user sees them as one task:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/metadata?id=$MAGIC_SLASH_TERMINAL_ID&fullStackTaskId={TICKET_ID}&relatedWorktrees=$(echo -n '["{PATH_1}","{PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

2. Attach all worktrees:

```bash
[ -n "$MAGIC_SLASH_PORT" ] && [ -n "$MAGIC_SLASH_TERMINAL_ID" ] && curl -s "http://127.0.0.1:$MAGIC_SLASH_PORT/repositories?id=$MAGIC_SLASH_TERMINAL_ID&repos=$(echo -n '["{PATH_1}","{PATH_2}"]' | jq -sRr @uri)" > /dev/null 2>&1 || true
```

## Step 4.6: Create full-stack context file (multi-repo only)

Create a `CLAUDE.local.md` in each worktree using `MSG_MULTI_REPO_CONTEXT` from messages. Then `cd` into the first worktree.

## Step 5: Planning and implementation

Display `MSG_TASK_SUMMARY` (or `MSG_TASK_SUMMARY_FULLSTACK` for multi-repo).

`{blocker_line}` carries the one line Step 2.4 produced; `references/messages.md` documents the placeholder and how it renders when no dependency was declared.

### 5.0: Design context (conditional)

Check the ticket (title, description, custom-field text discovered in Step 2A, labels, components, attachment metadata, remote links, and the filtered comment matches from Step 2B.5) for a UI signal — a mockup link often lives in a custom field. Full comment threads are not available yet: they are fetched in `references/design-context.md` §2.1 once a signal has fired.

- **Tier 1** — a label or component in {`frontend`, `front`, `ui`, `ux`, `design`, `css`, `web`}: sufficient alone.
- **Tier 2** — a resolvable reference: repo-relative path to `.html`/`.css`/a spec `.md`/a `*.styles.ts`, a `figma.com` URL, an image attachment, a `design/` or `mockups/` folder, a `.fig` file: sufficient alone.
- **Tier 3** — at least **two** of these keywords: `maquette`, `mockup`, `design`, `écran`/`screen`, `composant`/`component`, `bouton`/`button`, `modal`, `layout`, `responsive`, `style`.

**If a signal is detected**: Read `references/design-context.md` to resolve the references and write `.magic/design-brief.md` in each worktree. The brief must exist before the plan is written in Step 5.2.

**If no signal is detected** (e.g. backend-only labels `backend`, `api`, `db`, `infra`, `ci` with no Tier 1 or Tier 2 hit): do not read `references/design-context.md`, do not write a brief, and leave the `Design fidelity` axis of Step 5.5.2 at `N/A`.

One thing still has to happen on this path. A worktree reused via Step 4.0 may already hold a brief from an earlier ticket, and every downstream prompt keys off "when `.magic/design-brief.md` exists" — so a leftover file would make sub-agents follow a mockup that has nothing to do with this task, and make the critic grade against it. Delete it before continuing:

```bash
rm -f .magic/design-brief.md
```

Run it in each worktree, and mention the deletion to the user if the file was there — a brief disappearing is worth one line, not silence.

### 5.1: Codebase exploration (conditional)

Evaluate whether codebase exploration is needed before launching a sub-agent.

**Skip exploration when ALL of these are true:**
- The ticket specifies exact files or components to modify
- The acceptance criteria are precise and self-contained (no ambiguity about what to change)
- The change is localized (e.g., update a string, add a field, tweak a config)

**Require exploration when ANY of these is true:**
- The ticket is high-level or vague (e.g., "improve performance", "add a new feature for X")
- You need to discover existing patterns, conventions, or architecture before implementing
- The ticket references components whose location or structure you don't know
- The change spans multiple modules or layers
- It's a full-stack task (multi-repo)
- A design brief exists (step 5.0 wrote `.magic/design-brief.md`) — the mockup's markup and classes must be located in the codebase

**If exploration is needed**: Launch an `Agent` (subagent_type=`Explore`) to explore the codebase. Request a structured summary: (1) project structure & framework, (2) config & stack, (3) existing patterns with file paths, (4) impacted files with current state, (5) cross-repo interactions if full-stack. Target 5-15 files, return summary only — not raw file contents. Use the sub-agent's returned summary to create the implementation plan in step 5.2.

If `.magic/design-brief.md` exists, add to the prompt: read it first (give the absolute path) and report which existing components, styles or tokens match the referenced design.

**If exploration is skipped**: Proceed directly to step 5.2, building the implementation plan from the ticket information alone.

### 5.2: Create implementation plan

Read the matching plan template from `references/plan-template-{type}-{lang}.md`:
- `{type}`: `single` or `fullstack`
- `{lang}`: value of `languages.discussion` (`en` or `fr`)

Keep the plan focused: aim for **3-7 implementation steps**, each with 2-3 concrete actions. A plan that's too detailed wastes context; too vague and the implementation drifts.

The template carries a design-context section (`### Design context` / `### Contexte design`). If `.magic/design-brief.md` exists, fill it in and name each resolved reference explicitly (e.g. the mockup file path) so the plan can be checked against it. If no brief exists, drop the section.

### 5.2.3: Plan review (via sub-agent)

Launch an `Agent` to review the implementation plan. Provide: ticket summary (ID, title, description, acceptance criteria), codebase exploration summary (from step 5.1), and the full proposed plan. When `.magic/design-brief.md` exists, give its absolute path and instruct the agent to read it.

The agent reviews the plan on these axes:
- **Completeness**: Does the plan cover all acceptance criteria?
- **Step ordering**: Are dependencies between steps respected?
- **Missing files**: Are there impacted files forgotten (tests, types, migrations, configs)?
- **Over-engineering**: Does the plan do more than what the ticket asks for?
- **Design fidelity** (only when a brief exists): Does the plan reference each resolved design reference explicitly, and does it reuse the mockup's markup and classes instead of inventing a layout?

The agent returns a short list of actionable suggestions, or explicitly states the plan looks good.

Integrate pertinent suggestions into the plan before proceeding. Do not blindly apply all suggestions — use judgment to filter out noise.

### 5.2.5: Dispatcher (execution strategy)

Analyze the plan to choose between **Solo** and **Multi-agent**:

**Decision rules** (in order of priority):

1. **Multi-agent if**: Multiple repos are involved (strong signal — each repo gets its own agent)
2. **Multi-agent if**: Single repo with > 8 files to modify/create AND steps are parallelizable (no dependency between them)
3. **Solo otherwise**: Steps are sequential, few files, or tightly coupled changes

Display `MSG_STRATEGY_SOLO` or `MSG_STRATEGY_MULTI` as part of the plan output.

### 5.3: Request approval

Use `AskUserQuestion` with `MSG_APPROVAL` as the question text and the following options:
- Option 1: Approve and start implementation
- Option 2: Request modifications to the plan
- Option 3: Reject and stop

Never start implementation without explicit user approval.

- **Approve** → Step 5.4
- **Modifications** → Adjust plan based on feedback, present again, re-request approval
- **Reject** → Stop

### 5.4: Implementation

#### 5.4A: Solo mode (via sub-agent)

Display `MSG_PROGRESS_SOLO` (with step 1/1 since the sub-agent handles all steps).

Launch an `Agent` with: ticket summary (ID, title, 2-3 sentence goal), acceptance criteria, full plan (verbatim), worktree path, constraints (no commits, use `Edit`/`Write`, follow patterns). For full-stack: list all paths, implement backend first. If `.magic/design-brief.md` exists, instruct the agent to read it first at its absolute path and to follow its `Mandatory rule` section (reuse the mockup's markup and classes). Review sub-agent output after completion.

#### 5.4B: Multi-agent mode

Display `MSG_PROGRESS_MULTI`. Use the `Agent` tool to launch subagents in parallel.

Each subagent prompt includes (keep it concise — summary, not the full ticket dump):
- Ticket summary: ID, title, and a 2-3 sentence description of what to achieve
- Acceptance criteria (if any)
- Assigned plan steps (copy the relevant steps verbatim from the plan)
- Worktree path to work in
- If `.magic/design-brief.md` exists: its absolute path in that worktree, with the instruction to read it before writing any UI code and to follow its `Mandatory rule` section
- Constraints: no commits, follow project patterns, use `Edit`/`Write`
- Note: subagents have access to Bash, Read, Write, Edit, Glob, Grep only (no MCP tools)

After all subagents complete:
1. Review changes from each subagent
2. Check for conflicts/inconsistencies
3. Fix integration issues if needed

### 5.4.5: Simplify pass (via sub-agent)

After implementation completes (step 5.4), run a simplification pass **only on the files changed during this task**.

1. Collect the list of changed files:

```bash
cd {WORKTREE_PATH}
git diff --name-only HEAD
git ls-files --others --exclude-standard
```

2. If no files changed, skip this step silently.
3. Display `MSG_SIMPLIFY`.
4. Launch an `Agent` with: worktree path, changed files list (only these modifiable), instruction to invoke `/simplify` (may explore full codebase but modify only changed files). If `.magic/design-brief.md` exists, give its absolute path as read-only context: simplification must not drop markup or classes required by the mockup.
5. If no issues found, continue silently.

### 5.5: Confidence assessment and final summary

This step runs as an iterative loop: evaluate confidence, auto-fix if needed, then display the final summary.

#### 5.5.1: How to test

Generate 2-5 concrete manual testing steps based on:
- The acceptance criteria from the ticket
- The actual changes made (new routes, UI components, modified logic)
- Any setup required (env vars, seed data, running a specific service)

Each step must be actionable: describe what the user should do and what they should expect to see. Include specific URLs, commands, or UI paths when possible.

**Test account.** Run this paragraph **once per worktree, from inside that worktree**, using that repo's own mode and source (Step 0.5) — look them up by that repo's config key, never reuse a sibling's. If a repo's mode is `off` — the default — or any value other than `reference` / `inline`: skip this paragraph for that repo entirely. Do not run the cascade, do not call `gh`, and do not mention its test accounts anywhere in `{test_steps}` or in the chat.

Otherwise, read `references/test-accounts.md` (the copy inside **this** skill's `references/` directory) and follow it: modes, the four-tier discovery cascade seeded with that repo's source, the source guardrails (`.env*` / `secrets/` / keychain / git-ignored blacklist plus the `git check-ignore` check), the public-repo guard, and the exact shape of the line. Then prefix that repo's `{test_steps}` with the resulting single line, as (or folded into) the setup line that already carries env vars, seed data and services.

- If nothing was resolved, write the one-line "no test account documented" statement (`No test account documented for this project` / `Aucun compte de test documenté pour ce projet`), display `MSG_TEST_ACCOUNTS_NOT_FOUND`, and continue. Never invent an account.
- If the public-repo guard downgrades `inline` to `reference`, display `MSG_TEST_ACCOUNTS_PUBLIC_REPO_GUARD` and continue.
- If `references/test-accounts.md` is missing on disk, treat the mode as `off`, say so in one line, and continue. `/magic:pr` Step 6.1.1 degrades identically, so the two skills never disagree about the same repo.
- **Multi-repo (fullstack)**: `{test_steps}` covers several worktrees, so each account line must be attributed to the repo it came from (e.g. `api — Test account: …`, `web — Test account: …`). A repo's accounts may appear **only** under that repo: a repo at `off` contributes nothing even when its sibling is at `inline`, and an unattributed shared line is forbidden. Never let one repo's mode or login govern another's — that is exactly the bleeding this feature must not cause.

#### 5.5.2: Confidence evaluation loop

The confidence evaluation is performed by an **independent critic agent** — a separate sub-agent that has no knowledge of the implementation plan, the implementation conversation, or the decisions made along the way. This prevents self-serving bias: the agent that wrote the code must not be the one grading it.

**What the critic agent receives** (and nothing else):
- Ticket summary: ID, title, description, acceptance criteria
- The diff: output of `git diff HEAD` in the worktree + list of untracked files
- The rubric below (axes, calibration, scoring formula)
- The worktree path (so it can read files for context — but it must not modify any file)
- The full content of `.magic/design-brief.md` when it exists (inlined, not just the path) — the critic has never seen the plan, so the brief is its only way to judge design fidelity

**What the critic agent does NOT receive**:
- The implementation plan
- The codebase exploration summary
- Any prior conversation context or implementation decisions

##### Evaluation rubric (passed verbatim to the critic agent)

**Evaluation axes** — evaluate every axis, mark N/A only when genuinely inapplicable (e.g., test coverage when the project has no test suite):
- **Acceptance criteria coverage**: Were all acceptance criteria from the ticket addressed?
- **Pattern consistency**: Do the changes follow existing codebase conventions?
- **Test coverage**: Were tests added/updated when the project has a test suite?
- **Edge cases**: Were error handling and boundary conditions considered?
- **Scope adherence**: Did the implementation stay within the ticket scope?
- **Design fidelity**: Does the implementation match the design brief (markup, classes, tokens)? `N/A` by default — this axis is active only when `.magic/design-brief.md` exists.

For each axis, assign one of: **MET** | **PARTIALLY MET** | **NOT MET** | **N/A**

**Calibration examples** (one sentence per axis to anchor MET vs PARTIALLY MET):
- **Acceptance criteria coverage**: MET = every acceptance criterion from the ticket is addressed in the implementation; PARTIALLY MET = most criteria addressed but one minor criterion is deferred or incomplete.
- **Pattern consistency**: MET = changes follow all observed codebase conventions (naming, structure, error handling style); PARTIALLY MET = mostly follows conventions with minor deviations (e.g., slightly different naming in one file).
- **Test coverage**: MET = tests added or updated covering the main paths and at least one edge case; PARTIALLY MET = tests cover the happy path but miss edge cases or error scenarios.
- **Edge cases**: MET = error handling and boundary conditions are explicitly handled (null checks, empty states, limits); PARTIALLY MET = common errors handled but some boundary conditions left unguarded.
- **Scope adherence**: MET = implementation stays strictly within the ticket scope with no unrelated changes; PARTIALLY MET = minor tangential cleanup included alongside the scoped work.
- **Design fidelity**: MET = the markup, classes and tokens of the brief's source of truth are reused as-is; PARTIALLY MET = the visual intent is followed but part of the markup or several tokens were reinvented.

**Minimum axis rule**: if fewer than 3 axes are non-N/A, cap the maximum score at **8** — too few axes provide insufficient signal for a perfect score.

**Score determination** (apply to non-N/A axes only, follow top-to-bottom and stop at the first match):

| # | Condition | Score |
|---|-----------|-------|
| 1 | All axes MET | **10** |
| 2 | All axes MET except exactly one PARTIALLY MET | **9** |
| 3 | All axes at least PARTIALLY MET, with exactly two PARTIALLY MET | **7** |
| 4 | All axes at least PARTIALLY MET, with three or more PARTIALLY MET | **6** |
| 5 | Exactly one axis NOT MET, rest MET or PARTIALLY MET | **5** |
| 6 | Exactly two axes NOT MET | **3** |
| 7 | Three or more axes NOT MET | **1** |

After selecting the base score from the table, apply one adjustment: if the majority of remaining axes (excluding the NOT MET ones) are MET rather than PARTIALLY MET, add +1 to the score (max 10). Note: the minimum axis rule cap is applied after this adjustment.

**Design fidelity guards** (the score table itself is unchanged):

- If `.magic/design-brief.md` exists **and its `Source of truth` table has at least one row**, the `Design fidelity` axis **cannot** be rated `N/A`: rate it MET, PARTIALLY MET or NOT MET. A fraudulent `N/A` would hide an ignored mockup behind a 10/10.
- If a brief exists but its `Source of truth` table is empty (every reference was unresolvable — typically a Jira screenshot on a ticket that is not really a UI task), the axis returns to `N/A`. There is nothing to be faithful to, so no cap applies and no auto-fix iteration is spent on an unfixable axis.
- If a brief exists and `Design fidelity` is `PARTIALLY MET`, cap the final score at **7**. Without this cap, condition 2 yields 9 — above the ≥ 8 exit threshold of the auto-fix loop — and a half-ignored mockup would pass.
- **Precedence of the caps, in this order**: (1) base score from the table, (2) the `+1` adjustment, (3) the PARTIALLY MET design cap, (4) the minimum axis rule cap. Each step applies to the result of the previous one.

**Critic mindset**: approach the evaluation as an external code reviewer who has never seen this code before. A score of 6 with clear attention points is more useful than an inflated 9. When in doubt between two ratings for an axis, choose the lower one.

**Expected output format** from the critic agent (structured text, not JSON):

```
AXIS RESULTS:
- Acceptance criteria coverage: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Pattern consistency: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Test coverage: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Edge cases: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Scope adherence: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Design fidelity: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}

SCORE: {number}/10

POSITIVE POINTS:
- {point}

ATTENTION POINTS:
- {point}
```

##### Auto-fix loop (max 3 iterations)

```
iteration = 0
prev_axis_states = {}
regressed_axes_history = set()

LOOP:
  1. Collect the diff for the critic:
       git diff HEAD           (in the worktree)
       git ls-files --others --exclude-standard  (untracked files)

  2. Launch a critic Agent with:
       - Ticket summary: ID, title, description, acceptance criteria (from step 2)
       - The diff collected in step 1
       - The full evaluation rubric above (axes, calibration, scoring, output format)
       - The worktree path (read-only access for context)
       - The content of .magic/design-brief.md when it exists (inlined; otherwise state that no brief
         exists, so the Design fidelity axis is N/A)
       - Instruction: "You are an independent code reviewer. You have NOT seen the implementation
         plan or any prior conversation. Evaluate the diff against the ticket requirements using
         ONLY the rubric provided. Do not modify any file."
     Parse the agent's response → score, axis_results, positive_points, attention_points

  3. IF score >= 8 → EXIT loop

  4. IF iteration >= 3 → EXIT loop (display summary with current score)

  5. Regression check (skip when iteration == 0):
     Compare axis_results to prev_axis_states.
     For each axis, detect any worsening transition:
       MET → PARTIALLY MET, MET → NOT MET, or PARTIALLY MET → NOT MET.
     For each regressed axis:
       → Flag it as a REGRESSION in the displayed summary.
       → Prepend it to attention_points so the regression is prioritized for the next fix.
       → Add the axis name to regressed_axes_history.
     Oscillation guard: if any axis already existed in regressed_axes_history before this iteration
       (i.e., the same axis regresses a second time), EXIT loop immediately with a warning:
       "Axis '<name>' has regressed twice — exiting auto-fix to avoid oscillation."

  6. Save current state: prev_axis_states = copy(axis_results)

  7. Identify the single most critical attention point using this priority:
     a. Any regressed axis (worsened since previous iteration) — regressions first
     b. Acceptance criteria gaps (a ticket requirement is functionally unmet)
     c. NOT MET axes by severity (fewest positive signals first)
     d. PARTIALLY MET axes by severity (fewest positive signals first)
     Pick the first match; ties are broken by the axis order above.

  8. Display MSG_AUTOFIX with:
     - The current score
     - The selected attention point (from step 7)
     - The user-facing iteration number: iteration + 1 (1-indexed for display; internal counter is 0-indexed)

  9. Launch a fix Agent with:
     - The worktree path
     - The list of modifiable files (only files changed during implementation)
     - When .magic/design-brief.md exists: its absolute path, read-only and never modifiable, with the
       instruction to read it before touching UI code (it is git-excluded, so it is never in the
       modifiable-files list and must be named explicitly)
     - A precise description of the selected attention point to fix
     - Instruction: "Do no harm — fix only the described issue; do not alter unrelated code or degrade any axis that currently passes"

  10. Wait for the fix agent to complete

  11. iteration += 1

  12. GOTO LOOP
```

#### 5.5.3: Display final summary

Display `MSG_FINAL_SUMMARY` (or `MSG_FINAL_SUMMARY_FULLSTACK` for multi-repo). Populate **all** placeholders using the sources below.

**Data generated in step 5.5:**
- `{confidence_score}` — final score from the evaluation loop (5.5.2)
- `{test_steps}` — manual testing steps generated in 5.5.1
- `{positive_points}` — strengths identified during confidence evaluation (5.5.2)
- `{attention_points}` — remaining concerns after auto-fix iterations (5.5.2). When Step 2.4 ended on a blocker the user chose to start anyway, or on an unresolvable one, prepend that blocker (id, title, PR state) here: the critic never saw it, so nothing else would carry it into the summary.

**Data available from prior steps / context:**
- `{TICKET-ID}` — ticket identifier (available since step 1)
- `{modified_files}` — list files changed during implementation (`git diff --name-only HEAD` in the worktree, from step 5.4.5)
- `{created_files}` — list untracked files added during implementation (`git ls-files --others --exclude-standard` in the worktree, from step 5.4.5)
- `{summary}` — concise description of what was implemented (synthesize from the plan and actual changes)
- `{decisions}` — key implementation decisions made during planning and implementation (e.g., library choices, architectural trade-offs, deviations from the original plan)

**Fullstack-only placeholders** (for `MSG_FINAL_SUMMARY_FULLSTACK`):
- `{backend_path}`, `{frontend_path}` — worktree paths (available since step 4)
- `{backend_modified}`, `{backend_created}` — same as `{modified_files}`/`{created_files}` but scoped to the backend worktree
- `{frontend_modified}`, `{frontend_created}` — same but scoped to the frontend worktree
- `{interaction}` — summary of how the backend and frontend changes interact (e.g., new API endpoints consumed by the frontend); derive from the cross-repo interactions noted in the step 5.1 exploration and the actual changes made

## Step 6: Record the run

**Always run this, as the very last thing you do — including when the workflow stopped early.**

Magic Slash opened a run record when this skill started. This closes it. Without it the run stays open and is counted as *abandoned*, so finished work disappears from the usage statistics.

Set `outcome` to `success` when the workflow completed, or `failed` when it stopped on an error you could not resolve.

This writes to a file instead of calling the desktop app, so it works whether or not the app is running.

```bash
MS_DIR="$HOME/.config/magic-slash"; mkdir -p "$MS_DIR" 2>/dev/null
printf '{"type":"end","skill":"magic-start","agentId":"%s","outcome":"success","occurredAt":%s000}\n' \
  "$MAGIC_SLASH_TERMINAL_ID" "$(date +%s)" >> "$MS_DIR/pending-skills.ndjson" 2>/dev/null || true
```

---

For the Magic Slash Desktop API reference (endpoints `/metadata` and `/repositories`), see `references/api.md`.
