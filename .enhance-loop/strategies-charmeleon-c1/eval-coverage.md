# Strategy Brief: T5 — eval_set.json coverage

## Current State
- **Score**: 7.0/10
- **Target**: 8.0/10
- **Status**: OK
- **Iteration**: 1

## Pattern — Why This Topic Is Low
The eval set covers all 7 skills with good ambiguous cases but has systematic gaps: no negative cases, no French magic-commit entries, no malformed input testing.

## North Star — What 9-10/10 Looks Like
Complete eval set with: positive cases in both languages for all skills, ambiguous cross-skill cases, negative cases, malformed inputs, multi-intent queries.

## Cross-Examiner's Recommended Strategy
1. Add 3-5 negative cases (expected_skill: null)
2. Add 2-3 French magic-commit entries
3. Add 2-3 malformed input cases

## Key Issues

### Confirmed
- No negative cases in eval set
- No French entries for magic-commit

### New (found by cross-examination)
- No malformed input test cases
- No multi-skill-trigger test cases

## User Context (from situational questioning)
_To be filled after Phase 1_

## Refined Strategy (from Phase 2)
_To be filled after Phase 2_

## Confirmation Status
_To be filled after Phase 3_
