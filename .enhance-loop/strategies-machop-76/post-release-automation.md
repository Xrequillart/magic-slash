# Strategy Brief: Post-release workflow automation

## Current State
- **Score**: 2.8/10
- **Target**: 8.0/10
- **Status**: OK
- **Iteration**: 1

## Pattern — Why This Topic Is Low
Step 7.3 was designed as a "manual reminder" section and was never modernized when the rest of the skill adopted AskUserQuestion-driven interactive workflows. The automation philosophy drops off a cliff after Step 7.1.

## North Star — What 9-10/10 Looks Like
After version file updates and verification, the skill proposes each git operation (diff review, commit, tag, push, gh release) via AskUserQuestion, executes on confirmation via Bash, reports the result, and handles errors with retry or abort options.

## Cross-Examiner's Recommended Strategy
1. Replace Step 7.3's static text block with a sequential AskUserQuestion loop: for each operation (commit, tag, push, gh release), propose the action with a preview, wait for user confirmation, execute via Bash, and show the result.
2. Add a git diff --stat review step before proposing the commit, so the user sees a summary of all changes before agreeing to commit.
3. Add error handling for each git operation (tag already exists, push rejected, commit hook failure) with AskUserQuestion-based recovery prompts.

## Key Issues

### Confirmed
- Step 7.3 dumps manual commands instead of interactive execution | ROOT CAUSE: Designed as a post-release cheat sheet. | FIX: Replace with sequential propose-confirm-execute loop.
- No git diff preview before proposing commit | ROOT CAUSE: Manual workflow delegates diff review to user. | FIX: Run `git diff --stat` and present before commit proposal.
- No error handling for git operations | ROOT CAUSE: Manual commands leave error handling to user. | FIX: Check exit codes and propose recovery actions.

### New (found by cross-examination)
None

## User Context (from situational questioning)
- The CI workflow (release.yml) auto-creates GitHub releases from tags — no need for `gh release create` in the skill.
- Scope limited to: commit + tag + push. The skill should mention that the CI will handle the rest.
- Signal: keep it focused, no over-automation beyond the 3 core git operations.

## Refined Strategy (from Phase 2)
1. Replace Step 7.3's static text block with a sequential AskUserQuestion-driven workflow for 3 operations: (a) show `git diff --stat` preview then propose commit, (b) propose tag creation, (c) propose push with --tags. Each step: propose via AskUserQuestion → execute via Bash on confirmation → report result. Mention that CI will auto-create the GitHub release from the tag.
2. Add pre-flight checks before the commit proposal: run `git diff --stat` to show all changes, and only stage the specific files the skill modified (not `git add -A`) to avoid contaminating the release commit.
3. Add error handling for each git operation: tag already exists → propose incrementing or aborting; push rejected → propose pull-rebase or force; commit hook failure → show error and propose retry after fix.

## Confirmation Status
Confirmed — "C'est bon" — proceeding with refined strategy as-is.
