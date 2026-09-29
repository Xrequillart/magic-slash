# Blocker follow-up: the 🔴 question and the base branch

Read by `SKILL.md` Step 2.4 (§1, on a 🔴 verdict) and Step 4.1 (§2 and §3), only when Step 2.4 read `references/dependencies.md` because the ticket declares at least one blocker. On a start with no declared blocker, `$BASE_BRANCH` and `$BASE_REF` are `$DEV_BRANCH` in every repo and nothing here applies.

## 1. The 🔴 question (Step 2.4)

**The 🔴 question is asked here**, before anything is created. Use `AskUserQuestion` with `MSG_BLOCKER_HARD` (no PR found) or `MSG_BLOCKER_ABANDONED_PR` (closed unmerged PR — a distinct outcome, never folded into the first) and exactly three options:

1. **Start this ticket anyway** → continue to Step 2.5 as usual, carrying the blocker into `{attention_points}` of the final summary.
2. **Start the blocker instead** → re-enter this skill at Step 1 with the blocker's ID as `$ARGUMENTS`. The guard is a **note carried in the conversation** — state that the gate has already run this session, and the second pass skips Step 2.4 on seeing it. The gate is depth 1 by design: direct blockers only, never the blockers of blockers, so without that note the blocker's own blockers would ask the same question one level down.
3. **Stop here** → the skill stops. Step 6 still runs, with `outcome` `failed` since the workflow did not complete — an unclosed run record is counted as abandoned and the run disappears from the statistics.

## 2. Resolve the base branch, per repo (Step 4.1)

**Resolve the base branch, per repo.** If Step 2.4 returned a 🟡 verdict with a candidate base branch, ask the question **now** — this is the earliest point where it can be asked, because `$DEV_BRANCH` is only resolved in Step 0.4 ("execute after repo is identified in step 3") and the repo set is only known after Step 3. Asking at Step 2.4 would name a default that does not exist yet, and Step 0.4 would then ask about the dev branch anyway. The verdict is computed at 2.4; only the question moves here.

Use `AskUserQuestion` with `MSG_BLOCKER_IN_FLIGHT`, offering the blocker's PR head branch and `$DEV_BRANCH` (the default). Keep the answer **per repo, keyed by config key**, the way Step 0.5 keeps the test-account pair: the blocker's PR head branch exists in exactly **one** repo, so a single `$BASE_BRANCH` scalar would send that ref to repos where it does not exist and fail `git worktree add` in all of them. Every other repo keeps `$DEV_BRANCH`.

**Re-check any 🟢 that rested on a merged PR, before creating anything.** `references/dependencies.md` §3.5 clears a blocker whose PR merged into the branch the worktree will start from — but at Step 2.4 it could only compare against the *configured* development branch, since `$DEV_BRANCH` is resolved here in Step 0.4 and the user may have answered with a different branch. Compare the gate's `merge_target_checked_against` (its `## Usage` contract) with the `$DEV_BRANCH` now in hand:

- **Same branch** — the 🟢 stands. Continue.
- **Different, and the PR merged into `$DEV_BRANCH` too** — the 🟢 stands. Continue.
- **Different, and it did not** — the blocker's code is *not* on the branch this worktree starts from, so the 🟢 was earned against the wrong base. Downgrade to 🟡 and ask the question above. Say in one line which two branches diverged, so the user sees this came from their Step 0.4 answer and not from the PR.

**On this downgrade, offer `mergeCommit.oid`, not `headRefName`.** The blocker's PR is merged, and GitHub deletes the head branch on merge by default — so `headRefName` names a branch that usually no longer exists, and offering it would produce a 🟡 with nothing checkoutable behind it. The merge commit always exists. `references/dependencies.md` §3.4 requests both fields for exactly this reason: `headRefName` is the base to offer on an **open** PR, `mergeCommit.oid` on a **merged** one. A detached base ref is fine here — the worktree gets its own new branch either way, since Step 4.1 passes `-b "$BRANCH_NAME"`.

**And the `$DEV_BRANCH` fallback below does not apply on this path.** That fallback exists for a base branch that cannot be resolved, where continuing on the dev branch is harmless. Here it is the opposite: this re-check just established that `$DEV_BRANCH` lacks the blocker's code, so silently falling back to it would undo the very finding that triggered the downgrade — a false 🟢 restored one step after being caught, and invisible because the fallback is silent. If the merge commit cannot be resolved either (`git fetch origin <oid>` then `git rev-parse --verify` both fail), do not create anything. Display `MSG_BLOCKER_CHECK_UNAVAILABLE` for the reason — that key reports, it does not ask — then ask with `MSG_BLOCKER_HARD`'s three options, exactly as the 🔴 path does: start on `$DEV_BRANCH` anyway, start the blocker instead, or stop. Better to stop than to start on a base known to be wrong.

This is the only verdict that can move after Step 2.4, and it can only move in the safe direction — 🟢 → 🟡, never the reverse. A 🔴 was already settled with the user before anything was created, and a 🟡 is re-asked here anyway.

## 3. Resolve `$BASE_REF` when the base is not `$DEV_BRANCH` (Step 4.1)

Run this after `SKILL.md` Step 4.1 has refreshed `$DEV_BRANCH` (the `git checkout` / `git pull --rebase` pair), in each repo whose `$BASE_BRANCH` differs from `$DEV_BRANCH`.

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
