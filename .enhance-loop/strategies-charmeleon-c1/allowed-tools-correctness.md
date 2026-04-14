# Strategy Brief: T1 — Allowed-tools correctness

## Current State
- **Score**: 6.0/10
- **Target**: 8.0/10
- **Status**: OK
- **Iteration**: 1

## Pattern — Why This Topic Is Low
Three skills (magic-continue, magic-resolve, magic-commit) use user-interaction patterns but don't declare `AskUserQuestion` in frontmatter. magic-continue over-declares Edit/Glob/Grep it never uses. Likely incremental adoption — magic-start and magic-pr were updated more recently.

## North Star — What 9-10/10 Looks Like
Every tool referenced in the skill body appears in frontmatter. No tool is declared unless actually used. The frontmatter is a precise contract.

## Cross-Examiner's Recommended Strategy
1. Add `AskUserQuestion` to magic-continue, magic-resolve, and magic-commit frontmatter
2. Remove `Edit`, `Glob`, `Grep` from magic-continue frontmatter (keep `Write` for CLAUDE.local.md)
3. Audit each "ask the user" pattern to confirm it uses AskUserQuestion explicitly

## Key Issues

### Confirmed
- magic-continue missing AskUserQuestion (Steps 0.4, 3, 4 handle user choices)
- magic-resolve missing AskUserQuestion (Steps 2.5, 4, 4.1, 5.5, 5.9, 6.4 handle user choices)
- magic-commit missing AskUserQuestion (Step 5.1 says "Ask the user")
- magic-continue over-declares Edit, Glob, Grep (never used in skill body)

### New (found by cross-examination)
None

## User Context (from situational questioning)
_To be filled after Phase 1_

## Refined Strategy (from Phase 2)
_To be filled after Phase 2_

## Confirmation Status
_To be filled after Phase 3_
