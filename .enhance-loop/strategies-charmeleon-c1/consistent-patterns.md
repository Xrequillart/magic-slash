# Strategy Brief: T2 — Consistent patterns

## Current State
- **Score**: 6.0/10
- **Target**: 8.0/10
- **Status**: OK
- **Iteration**: 1

## Pattern — Why This Topic Is Low
The 7 skills evolved independently, leading to divergent implementations of shared concerns: messages file structure, Node.js detection, Atlassian integration checking, dependency installation coverage.

## North Star — What 9-10/10 Looks Like
All skills use identical patterns for shared concerns. A change to one pattern only requires updating one reference file, not 7 skills.

## Cross-Examiner's Recommended Strategy
1. Standardize messages: update magic-start to use single bilingual `messages.md` (6/7 already do)
2. Extract inline Node.js detection from magic-pr and magic-resolve into `references/node-setup.md`
3. Standardize Atlassian check as Step 0.3 across all skills using MCP Atlassian tools

## Key Issues

### Confirmed
- Messages file structure split (magic-start uses per-language, others use bilingual)
- Node.js detection inlined in magic-pr (Step 0.6) and magic-resolve (Step 0.1)
- Atlassian integration check inconsistency across skills
- Dependency install coverage gap (magic-start: 10 PMs, magic-continue: 4)

### New (found by cross-examination)
- Dependency install coverage inconsistency

## User Context (from situational questioning)
_To be filled after Phase 1_

## Refined Strategy (from Phase 2)
_To be filled after Phase 2_

## Confirmation Status
_To be filled after Phase 3_
