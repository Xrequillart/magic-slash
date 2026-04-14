# Evaluation Tracker

## Task
Evaluate the 7 magic-slash skills in ./skills for quality, consistency, and completeness

## Status
- **Iteration:** 4
- **Overall Score:** 8.5/10
- **Verdict:** COMPLETE
- **Threshold:** 8.0
- **Eval Depth:** 2
- **Last Updated:** 2026-04-14T18:00:00Z

## Topic Scores

| Topic | Evals | Scores | Median | Consensus | Outlier? | Status |
|-------|-------|--------|--------|-----------|----------|--------|
| T1 — Allowed-tools correctness | 3 | 8, 9, 8 | 8 | 8.5 | None | OK |
| T2 — Consistent patterns | 3 | 8, 9, 8 | 8 | 8.5 | None | OK |
| T3 — Structure and clarity | 3 | 8, 9, 8 | 8 | 8.5 | None | OK |
| T4 — Failure handling | 3 | 8, 9, 8 | 8 | 8.5 | None | OK |
| T5 — eval_set.json coverage | 3 | 8, 9, 8 | 8 | 8.5 | None | OK |

## Iteration History

### Iteration 4 — 8.5/10 (COMPLETE)
- **Changes this iteration:** Created references/messages.md for magic-review (4 messages) and magic-done (7 messages). Normalized magic-commit/references/messages.md to standard format. Removed orphaned messages-en.md and messages-fr.md from magic-start.
- T1 — Allowed-tools correctness: 8.5 (previously 8.5, delta +0.0)
- T2 — Consistent patterns: 8.5 (previously 7.5, delta +1.0)
- T3 — Structure and clarity: 8.5 (previously 8.5, delta +0.0)
- T4 — Failure handling: 8.5 (previously 8.5, delta +0.0)
- T5 — eval_set.json coverage: 8.5 (previously 8.5, delta +0.0)

### Iteration 3 — 8.3/10
- **Changes this iteration:** Created bilingual messages.md for magic-start, copied node-setup.md to magic-pr and magic-resolve, added AskUserQuestion to magic-review, removed mcp__atlassian__* from magic-resolve, added Atlassian check to magic-review Step 12.
- T1 — Allowed-tools correctness: 8.5 (previously 7.0, delta +1.5)
- T2 — Consistent patterns: 7.5 (previously 7.0, delta +0.5)
- T3 — Structure and clarity: 8.5 (previously 8.0, delta +0.5)
- T4 — Failure handling: 8.5 (previously 8.0, delta +0.5)
- T5 — eval_set.json coverage: 8.5 (previously 8.0, delta +0.5)

### Iteration 2 — 7.6/10
- **Changes this iteration:** Fixed frontmatter (T1), standardized references (T2), added retry logic (T4), added eval entries (T5). Incomplete: messages.md not created, node-setup.md not copied, magic-review still missing AskUserQuestion.
- T1 — Allowed-tools correctness: 7.0 (previously 6.0, delta +1.0)
- T2 — Consistent patterns: 7.0 (previously 6.0, delta +1.0)
- T3 — Structure and clarity: 8.0 (previously 8.0, delta +0.0)
- T4 — Failure handling: 8.0 (previously 7.0, delta +1.0)
- T5 — eval_set.json coverage: 8.0 (previously 7.0, delta +1.0)

### Iteration 1 — 6.8/10
- **Changes this iteration:** First evaluation — no prior changes
- T1 — Allowed-tools correctness: 6.0 (first evaluation)
- T2 — Consistent patterns: 6.0 (first evaluation)
- T3 — Structure and clarity: 8.0 (first evaluation)
- T4 — Failure handling: 7.0 (first evaluation)
- T5 — eval_set.json coverage: 7.0 (first evaluation)

## Completion Summary

All 5 evaluation topics meet or exceed the 8.0 threshold after 4 iterations.

### Key improvements made:
- **T1**: Added AskUserQuestion to 4 skills, removed over-declared tools from 2 skills
- **T2**: Unified messages pattern across all 7 skills (created 3 new messages.md files, normalized 1, merged 2 per-language files into 1 bilingual), standardized Node.js detection references, added Atlassian integration checks
- **T4**: Added MCP retry logic to magic-review and PR creation error handling to magic-pr
- **T5**: Added 8 eval entries (negative cases, French commit, malformed inputs)

### Remaining minor items (not blocking):
1. magic-commit MSG_CONFIG_ERROR content uses `[error]` prefix vs emoji prefix in other skills
2. References section at top (5 skills) vs bottom (2 skills)
3. magic-review Step 8 missing retry on `create_pull_request_review`
4. eval_set could expand to ~45 entries with more resolve/continue FR cases
