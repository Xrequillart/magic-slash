# CI & review watcher

Specification for the post-creation watch phase of `/magic:pr` (Step 7.4).

The watch phase has two actors with strictly separated responsibilities:

| Actor | Role | May modify code? |
| ----- | ---- | ---------------- |
| **Watcher sub-agent** | Observes: waits for checks, collects failures and review feedback, classifies it, returns a report | **No** — read-only |
| **Main session** | Acts: auto-fixes CI failures, chains into `/magic:resolve`, talks to the user | Yes |

Keeping the polling inside a sub-agent is what stops 30 minutes of `gh` output from
flooding the main context. The sub-agent returns a compact JSON report; the main
session never sees the raw poll output.

## Prerequisites

Resolve these before launching the watcher and pass them in the prompt:

```bash
PR_NUMBER=<from Step 6.3>
REPO_SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner)
HEAD_BRANCH=$(git branch --show-current)
HEAD_SHA=$(git rev-parse HEAD)
```

`$HEAD_SHA` matters: review feedback attached to an older commit may already have
been addressed, so the watcher uses it to tell fresh feedback from stale feedback.

## Time budget

| Phase | Budget | Notes |
| ----- | ------ | ----- |
| Waiting for checks to finish | up to 30 min total | Hard cap, measured from watcher start |
| Bot grace period after checks settle | 180 s | Review bots usually post *after* the checks go green |
| Per-`gh`-call watch window | 480 s | Keeps each Bash call well under the tool timeout; loop until the cap |

The 30 min cap is a wall-clock ceiling on the whole watcher, not per phase. When it
is reached, the watcher stops and reports whatever it knows with
`checks.state = "timed_out"` — it never reports success it did not observe.

## Phase 1 — Wait for the checks

Each iteration blocks for at most 480 s, so the loop must be re-entered until the
checks settle or the 30 min cap is hit:

```bash
OUT=$(timeout 480 gh pr checks "$PR_NUMBER" --repo "$REPO_SLUG" --watch --interval 30 2>&1)
echo "exit=$?"
echo "$OUT" | tail -40
```

Interpret the exit code:

| Exit | Meaning | Action |
| ---- | ------- | ------ |
| `0` | All checks finished and passed | Go to Phase 3 (bot grace) |
| `1` | Checks finished, at least one failed | Go to Phase 2, then Phase 3 |
| `1` + output contains `no checks reported` | The repo has no CI on this branch | `checks.state = "no_checks"`, go to Phase 3 |
| `8` | Still pending | Re-enter the loop |
| `124` | Our own 480 s window elapsed | Re-enter the loop if budget remains, else `timed_out` |
| other | `gh` error (auth, rate limit, deleted PR) | Report `checks.state = "error"` with the message; do not retry more than twice |

> Do **not** pass `--fail-fast`: the whole point is to know about *every* failing
> check in one pass so the main session can fix them together.

Snapshot the final state once the loop exits:

```bash
gh pr checks "$PR_NUMBER" --repo "$REPO_SLUG" --json bucket,name,state,link,workflow,completedAt 2>/dev/null | jq -c .
```

The `bucket` field collapses `state` into `pass` / `fail` / `pending` / `skipping` /
`cancel`. Count `fail` and `cancel` as failures; `skipping` is not a failure.

That same snapshot is also where `checks.deploy_checks` comes from: the names of the checks that
look like a deployment or preview provider. Match case-insensitively on the check **name**, keep
the array empty when nothing matches, and note that the outcome is irrelevant — a *green* deploy
check is exactly the interesting case, and it appears nowhere else in the report:

```bash
# "$SNAPSHOT" holds the JSON from the call above; no extra `gh` call is involved.
jq -c '[.[] | select(.name | ascii_downcase
  | test("vercel|netlify|amplify|cloudflare|preview|deploy")) | .name]' \
  <<<"${SNAPSHOT:-[]}" 2>/dev/null || echo '[]'
```

Verified against real PRs: `["Vercel Preview Comments","Vercel"]` on a Vercel-backed repo, `[]` on
one whose checks are only CI jobs (lint / test / typecheck). This is still pure observation — the
watcher reports a name its own snapshot already contained and acts on nothing.

## Phase 2 — Diagnose the failures

For each failing check, extract the job id from its `link`
(`https://github.com/o/r/actions/runs/<run>/job/<job>`) and read only the failing
log lines:

```bash
JOB_ID=$(printf '%s' "$LINK" | sed -n 's#.*/job/\([0-9]*\).*#\1#p')
gh run view --repo "$REPO_SLUG" --job "$JOB_ID" --log-failed 2>/dev/null | tail -80
```

Constraints that keep the report small enough to be useful:

- At most **3** failing jobs diagnosed in detail; list the rest by name only
- At most **80** log lines per job, and only the tail
- Non-GitHub-Actions checks (CircleCI, Vercel, Sonar…) have no readable log via
  `gh` — record the `link` and set `diagnosis` to `"external check, see link"`

For each diagnosed failure, produce: the error class (lint / type / test / build /
security / deploy), a one-line diagnosis, and the file paths named in the log.
Those paths are what lets the main session fix without re-running the whole suite.

## Phase 3 — Collect review feedback

Review bots typically post 30 s to 3 min after the checks complete. Poll every
30 s for up to the 180 s grace period, stopping early once at least one known
review bot has posted on `$HEAD_SHA`.

Three separate surfaces must all be read — bots do not agree on where to post:

```bash
# Review summaries (Greptile and Claude Code review usually land here)
gh api "repos/$REPO_SLUG/pulls/$PR_NUMBER/reviews" --paginate \
  --jq '[.[] | {id, login: .user.login, state, commit_id, submitted_at, body}]'

# Inline code comments
gh api "repos/$REPO_SLUG/pulls/$PR_NUMBER/comments" --paginate \
  --jq '[.[] | {id, login: .user.login, path, line, original_commit_id, in_reply_to_id, created_at, body}]'

# PR-level conversation comments
gh api "repos/$REPO_SLUG/issues/$PR_NUMBER/comments" --paginate \
  --jq '[.[] | {id, login: .user.login, created_at, body}]'
```

### Known review sources

Treat a comment as review feedback when its author matches (case-insensitive,
`[bot]` suffix optional) any of:

`greptile`, `greptile-apps`, `coderabbitai`, `claude`, `claude-code`, `cursor`,
`ellipsis-dev`, `sourcery-ai`, `qodo`, `codiumai`, `deepsource`, `sonarcloud`,
`sonarqubecloud`, `codecov`, `snyk-bot`, `github-advanced-security`

…**or** any human other than the PR author. The list is a hint, not a whitelist:
an unknown author posting a concrete code request is still actionable.

### Classification

Every collected comment goes into exactly one bucket:

- **actionable** — asks for a specific change: a suggested diff, "consider…",
  "this will break when…", a flagged vulnerability, a failing edge case
- **informational** — no change requested: PR summaries, walkthroughs, coverage
  deltas, deploy previews, `LGTM`, "no issues found", "0 issues", approvals,
  emoji-only reactions
- **stale** — the comment's `original_commit_id` / `commit_id` is an ancestor of
  `$HEAD_SHA` **and** the referenced file changed since, or a reply in the thread
  withdraws the request ("never mind", "ignore this", "actually fine")

Only the **actionable** bucket drives what happens next. A PR where Greptile
posted a three-paragraph summary and nothing else is a zero-comment PR.

Also skip the comment `/magic:pr` itself posted on the linked ticket, and any
comment authored by the PR author unless it explicitly asks for a change.

## The report

The watcher's final message must be **only** this JSON object — no prose around it:

```json
{
  "pr": 42,
  "checks": {
    "state": "all_passed | failed | no_checks | timed_out | error",
    "total": 8,
    "passed": 7,
    "failed": 1,
    "skipped": 0,
    "failures": [
      {
        "name": "lint",
        "workflow": "CI",
        "link": "https://github.com/org/repo/actions/runs/1/job/2",
        "error_class": "lint",
        "diagnosis": "ESLint: 'foo' is assigned a value but never used",
        "suspected_files": ["desktop/src/main/config/config.ts"],
        "log_excerpt": "…last lines of the failing step…"
      }
    ],
    "undiagnosed": ["e2e (external check, see link)"],
    "deploy_checks": ["Vercel"]
  },
  "review": {
    "reviewers": ["greptile-apps[bot]"],
    "actionable_count": 2,
    "informational_count": 3,
    "stale_count": 1,
    "actionable": [
      {
        "source": "greptile-apps[bot]",
        "kind": "inline | review | issue_comment",
        "id": 123456,
        "path": "desktop/src/main/config/config.ts",
        "line": 340,
        "severity": "high | medium | nit",
        "request": "One-line statement of what the reviewer wants changed"
      }
    ]
  },
  "waited_seconds": 640,
  "notes": "Anything the main session needs to know that the fields above cannot carry"
}
```

Rules the watcher must respect:

- Report only what was observed. Never guess a check outcome that never completed.
- `checks.deploy_checks` carries the deployment/preview-looking check names from the Phase 1
  snapshot, `[]` when none match — it is a *hint for the main session* (Step 7.4.2.5 uses it to
  decide whether the preview-URL bot-comment fallback is worth a call) and never something the
  watcher acts on itself.
- `path` / `line` are `null` for review-level and conversation-level comments.
- Truncate every `body` / `request` to 400 characters.
- If a `gh` call fails, say so in `notes` rather than silently dropping a surface.

## What the main session does with it

| Report | Action |
| ------ | ------ |
| `all_passed` or `no_checks`, `actionable_count == 0` | Display `MSG_CI_ALL_GREEN`, set metadata status, finish |
| `failed` | Display `MSG_CI_FAILED`, run the auto-fix loop (max 3 rounds), re-launch the watcher after each push |
| `all_passed`, `actionable_count > 0` | Display `MSG_REVIEW_COMMENTS_FOUND`, chain into `/magic:resolve` |
| `timed_out` | Display `MSG_CI_WATCH_TIMEOUT` with what is known, finish without claiming success |
| `error` | Report the error, tell the user to check the PR manually, finish |

CI failures are always handled **before** review comments: fixing CI pushes a new
commit, which re-triggers both the checks and the bots, making any comment list
gathered beforehand obsolete.
