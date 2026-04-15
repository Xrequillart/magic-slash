# Strategy Brief: Commit-driven CHANGELOG generation

## Current State
- **Score**: 2.3/10
- **Target**: 8.0/10
- **Status**: OK
- **Iteration**: 1

## Pattern — Why This Topic Is Low
The CHANGELOG step was designed as a scaffold-and-ask workflow that creates empty templates, completely ignoring the git history that conventional commits provide. The project has commitlint configured but the release skill never reads commit data.

## North Star — What 9-10/10 Looks Like
The skill detects the last release tag, runs git log with conventional commit parsing, maps commit types to Keep a Changelog categories (feat->Added, fix->Fixed, refactor/chore/docs->Changed), auto-populates the CHANGELOG section, and presents it to the user for review and editing via AskUserQuestion.

## Cross-Examiner's Recommended Strategy
1. Add a new sub-step before Step 6.1 that detects the last release tag via `git tag --sort=-version:refname | head -1` and runs `git log <last-tag>..HEAD --oneline` to collect all commits since the last release.
2. Add conventional commit type-to-category mapping: feat->Added, fix->Fixed, refactor/chore/perf/style/docs/ci/build/test->Changed, with scope extraction for bullet formatting (e.g., "**scope**: description").
3. Replace Step 6.3's manual input flow with a pre-filled CHANGELOG presented via AskUserQuestion for review, letting the user confirm, edit, or add entries.

## Key Issues

### Confirmed
- No git log parsing to auto-populate CHANGELOG | ROOT CAUSE: Step was designed before git log parsing was considered. | FIX: Run `git log <last-tag>..HEAD --format="%s"` and parse commit types.
- No last-release-tag detection | ROOT CAUSE: No mechanism to find where current release's changes begin. | FIX: Add `git tag --sort=-version:refname | grep "^v[0-9]" | head -1`.
- No conventional commit type-to-category mapping | ROOT CAUSE: Mapping never codified despite project using commitlint. | FIX: Add explicit mapping table: feat->Added, fix->Fixed, else->Changed.

### New (found by cross-examination)
None

## User Context (from situational questioning)
- The user currently asks Claude manually to read the last commits since the previous release during the release process. This is tedious and is the core pain point.
- The user wants the skill itself to automate this — detect the last tag, parse commits, and pre-fill the CHANGELOG.
- Signal: high priority, direct workflow improvement requested by user.

## Refined Strategy (from Phase 2)
1. Add sub-step 6.0 that detects the last release tag via `git tag --sort=-version:refname | grep "^v[0-9]" | head -1` and runs `git log <last-tag>..HEAD --format="%s"` to collect all commit subjects since the last release.
2. Parse conventional commit types and map to CHANGELOG categories: feat->Added, fix->Fixed, everything else (refactor, chore, perf, style, docs, ci, build, test)->Changed. Extract scope for bullet formatting using **Scope**: pattern matching existing CHANGELOG entries.
3. Auto-populate the CHANGELOG template in Step 6.1 with categorized entries instead of empty placeholders. Present the pre-filled CHANGELOG via AskUserQuestion for the user to review, confirm, or request edits.

## Confirmation Status
Confirmed — "C'est bon" — proceeding with refined strategy as-is.
