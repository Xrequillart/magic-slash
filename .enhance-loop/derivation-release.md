# Criteria Derivation — Release Skill (Revised)

## User Direction

The user wants two specific improvements:
1. The skill should be more autonomous on post-release actions — propose each step (commit, tag, push) via `AskUserQuestion` and execute them on confirmation, instead of listing manual commands.
2. The skill should auto-generate the CHANGELOG from git commits since the last release tag, not ask the user to describe changes from memory.

Bonus B1 (Sidebar pattern resilience) was also selected.

## Revised Criteria

### T1 — Post-release workflow automation

**Question:** After completing version updates, does the skill interactively propose and execute git operations (commit, tag, push) via AskUserQuestion, or does it just dump manual commands the operator must copy-paste?

- **Stakeholder:** release operator
- **Question type:** function (does it do X?)
- **File focus:** SKILL.md Step 7.3 (lines 266-283)
- **Mon/Disc:** discovery — the author structured Steps 1-6 with interactive AskUserQuestion flows but abandoned interactivity in Step 7.3, reverting to a passive command listing. No AskUserQuestion appears after Step 6.3.
- **Low (3-4):** Lists 5 manual shell commands with no interactivity. The operator must copy-paste each one, with no safety checks (dirty tree, existing tags) and a `git add -A` that could stage unrelated files.
- **High (8-9):** Each post-release step is proposed via AskUserQuestion with clear context. On confirmation, the skill executes the operation and handles errors. Pre-flight checks prevent common mistakes (dirty tree, existing tag). The operator stays in control without leaving the Claude conversation.

### T2 — Commit-driven CHANGELOG generation

**Question:** Does the skill auto-populate the CHANGELOG section from git commits since the last release tag (using conventional commit types to categorize), or does it create empty placeholders requiring the operator to recall changes from memory?

- **Stakeholder:** project historian / downstream reader
- **Question type:** behavior (what happens when the CHANGELOG step runs?)
- **File focus:** SKILL.md Step 6 (lines 149-196)
- **Mon/Disc:** discovery — Step 6 creates an empty Added/Changed/Fixed template with `-` placeholders, then asks the user to describe changes manually. No `git log` or `git tag` command appears anywhere in the skill. The project uses conventional commits (`feat`, `fix`, `refactor`, etc.) which map directly to CHANGELOG categories, but this mapping is never leveraged.
- **Low (3-4):** Empty placeholder template. The user must remember all changes since the last release and manually categorize them. No git awareness whatsoever.
- **High (8-9):** Reads `git log` between the previous release tag and HEAD, parses conventional commit types, pre-fills the CHANGELOG with categorized entries, and presents the draft to the user for review/editing via AskUserQuestion. Edge cases handled (first release, no commits, non-conventional messages).

### B1 (promoted) — Pattern resilience under Sidebar refactoring

**Question:** If Sidebar.tsx changes its version display pattern (different className, wrapper component, CSS-in-JS migration), does the skill detect the failure or silently skip the update, leaving every desktop user seeing the wrong version?

- **Stakeholder:** end user (desktop app)
- **Question type:** behavior (what happens when the pattern breaks?)
- **File focus:** SKILL.md Step 4.2 (lines 124-130) + Step 7.1 verification
- **Mon/Disc:** monitoring — the author chose a specific pattern (`<span className="opacity-60">v`) and would likely be aware of the fragility, but has no fallback or broader search strategy.
- **Low (3-4):** Single hardcoded CSS class pattern — any refactor silently breaks the update, and the current verification may not catch all cases.
- **High (8-9):** Resilient pattern (e.g., search for version string in multiple ways) + verification that explicitly confirms the Sidebar update succeeded.

## Independence Tests (3 pairs)

**T1 vs T2:** Making Step 7.3 interactive (propose `git commit` via AskUserQuestion) improves T1 but doesn't change CHANGELOG generation. Adding `git log` parsing to Step 6 improves T2 but doesn't change post-release workflow. ✓

**T1 vs B1:** Making Step 7.3 interactive doesn't change the Sidebar pattern strategy. Making the Sidebar pattern resilient doesn't change post-release automation. ✓

**T2 vs B1:** Adding git log parsing to CHANGELOG doesn't change Sidebar patterns. Making Sidebar patterns resilient doesn't change CHANGELOG generation. ✓

## Perspective Divergence

| # | Topic | Stakeholder | Question type | File focus | Mon/Disc |
|---|-------|-------------|---------------|------------|----------|
| T1 | Post-release automation | release operator | function | Step 7.3 | discovery |
| T2 | Commit-driven CHANGELOG | project historian | behavior | Step 6 | discovery |
| B1 | Pattern resilience | end user (desktop) | behavior | Step 4.2 + 7.1 | monitoring |

- T1 vs T2: different stakeholder ✓, different question type ✓
- T1 vs B1: different stakeholder ✓, different question type ✓
- T2 vs B1: different stakeholder ✓, same question type (behavior) — but differ on stakeholder, no pair shares both ✓

## Additional Notes

The original verification gap (README.md and docs/documentation.html not verified in Step 7.1) should be addressed during implementation even though it's not a standalone criterion. It will naturally surface during T1 evaluation (since the verification script is part of the post-release workflow) and B1 evaluation (since verification completeness is directly relevant to pattern resilience).
