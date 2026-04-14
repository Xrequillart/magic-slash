# Strategy Brief: T4 — Failure handling

## Current State
- **Score**: 7.0/10
- **Target**: 8.0/10
- **Status**: OK
- **Iteration**: 1

## Pattern — Why This Topic Is Low
Error handling quality varies between skills. magic-start, magic-resolve, and magic-done have comprehensive coverage. magic-review lacks retry logic for MCP calls, and magic-pr doesn't handle PR creation failure.

## North Star — What 9-10/10 Looks Like
Every MCP call has retry-once-then-fallback logic. Every core-deliverable step has explicit error handling with user notification. Pattern: try -> retry -> ask user.

## Cross-Examiner's Recommended Strategy
1. Add retry logic to magic-review Steps 2 and 5 for MCP calls
2. Add error handling to magic-pr Step 6.3 for PR creation failure
3. Add error handling to magic-continue Step 3 for git worktree list failure

## Key Issues

### Confirmed
- magic-review missing MCP retry logic (Steps 2, 5)
- magic-pr missing PR creation error handling (Step 6.3)

### New (found by cross-examination)
- magic-continue Step 3 missing error handling for git worktree list failure

## User Context (from situational questioning)
_To be filled after Phase 1_

## Refined Strategy (from Phase 2)
_To be filled after Phase 2_

## Confirmation Status
_To be filled after Phase 3_
