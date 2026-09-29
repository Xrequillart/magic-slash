# Confidence evaluation

Read by `SKILL.md` Step 5.5.2, on every run that reaches it. The critic is an independent sub-agent: give it what this file lists, and nothing else.

## Critic inputs

**What the critic agent receives** (and nothing else):
- Ticket summary: ID, title, description, acceptance criteria
- The diff: output of `git diff HEAD` in the worktree + list of untracked files
- The rubric below (axes, calibration, scoring formula)
- The worktree path (so it can read files for context — but it must not modify any file)
- The full content of `.magic/design-brief.md` when it exists (inlined, not just the path) — the critic has never seen the plan, so the brief is its only way to judge design fidelity

**What the critic agent does NOT receive**:
- The implementation plan
- The codebase exploration summary
- Any prior conversation context or implementation decisions

## Evaluation rubric (passed verbatim to the critic agent)

**Evaluation axes** — evaluate every axis, mark N/A only when genuinely inapplicable (e.g., test coverage when the project has no test suite):
- **Acceptance criteria coverage**: Were all acceptance criteria from the ticket addressed?
- **Pattern consistency**: Do the changes follow existing codebase conventions?
- **Test coverage**: Were tests added/updated when the project has a test suite?
- **Edge cases**: Were error handling and boundary conditions considered?
- **Scope adherence**: Did the implementation stay within the ticket scope?
- **Design fidelity**: Does the implementation match the design brief (markup, classes, tokens)? `N/A` by default — this axis is active only when `.magic/design-brief.md` exists.

For each axis, assign one of: **MET** | **PARTIALLY MET** | **NOT MET** | **N/A**

**Calibration examples** (one sentence per axis to anchor MET vs PARTIALLY MET):
- **Acceptance criteria coverage**: MET = every acceptance criterion from the ticket is addressed in the implementation; PARTIALLY MET = most criteria addressed but one minor criterion is deferred or incomplete.
- **Pattern consistency**: MET = changes follow all observed codebase conventions (naming, structure, error handling style); PARTIALLY MET = mostly follows conventions with minor deviations (e.g., slightly different naming in one file).
- **Test coverage**: MET = tests added or updated covering the main paths and at least one edge case; PARTIALLY MET = tests cover the happy path but miss edge cases or error scenarios.
- **Edge cases**: MET = error handling and boundary conditions are explicitly handled (null checks, empty states, limits); PARTIALLY MET = common errors handled but some boundary conditions left unguarded.
- **Scope adherence**: MET = implementation stays strictly within the ticket scope with no unrelated changes; PARTIALLY MET = minor tangential cleanup included alongside the scoped work.
- **Design fidelity**: MET = the markup, classes and tokens of the brief's source of truth are reused as-is; PARTIALLY MET = the visual intent is followed but part of the markup or several tokens were reinvented.

**Minimum axis rule**: if fewer than 3 axes are non-N/A, cap the maximum score at **8** — too few axes provide insufficient signal for a perfect score.

**Score determination** (apply to non-N/A axes only, follow top-to-bottom and stop at the first match):

| # | Condition | Score |
|---|-----------|-------|
| 1 | All axes MET | **10** |
| 2 | All axes MET except exactly one PARTIALLY MET | **9** |
| 3 | All axes at least PARTIALLY MET, with exactly two PARTIALLY MET | **7** |
| 4 | All axes at least PARTIALLY MET, with three or more PARTIALLY MET | **6** |
| 5 | Exactly one axis NOT MET, rest MET or PARTIALLY MET | **5** |
| 6 | Exactly two axes NOT MET | **3** |
| 7 | Three or more axes NOT MET | **1** |

After selecting the base score from the table, apply one adjustment: if the majority of remaining axes (excluding the NOT MET ones) are MET rather than PARTIALLY MET, add +1 to the score (max 10). Note: the minimum axis rule cap is applied after this adjustment.

**Design fidelity guards** (the score table itself is unchanged):

- If `.magic/design-brief.md` exists **and its `Source of truth` table has at least one row**, the `Design fidelity` axis **cannot** be rated `N/A`: rate it MET, PARTIALLY MET or NOT MET. A fraudulent `N/A` would hide an ignored mockup behind a 10/10.
- If a brief exists but its `Source of truth` table is empty (every reference was unresolvable — typically a Jira screenshot on a ticket that is not really a UI task), the axis returns to `N/A`. There is nothing to be faithful to, so no cap applies and no auto-fix iteration is spent on an unfixable axis.
- If a brief exists and `Design fidelity` is `PARTIALLY MET`, cap the final score at **7**. Without this cap, condition 2 yields 9 — above the ≥ 8 exit threshold of the auto-fix loop — and a half-ignored mockup would pass.
- **Precedence of the caps, in this order**: (1) base score from the table, (2) the `+1` adjustment, (3) the PARTIALLY MET design cap, (4) the minimum axis rule cap. Each step applies to the result of the previous one.

**Critic mindset**: approach the evaluation as an external code reviewer who has never seen this code before. A score of 6 with clear attention points is more useful than an inflated 9. When in doubt between two ratings for an axis, choose the lower one.

**Expected output format** from the critic agent (structured text, not JSON):

```
AXIS RESULTS:
- Acceptance criteria coverage: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Pattern consistency: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Test coverage: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Edge cases: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Scope adherence: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}
- Design fidelity: {MET|PARTIALLY MET|NOT MET|N/A} — {one-sentence justification}

SCORE: {number}/10

POSITIVE POINTS:
- {point}

ATTENTION POINTS:
- {point}
```

## Auto-fix loop (max 3 iterations)

```
iteration = 0
prev_axis_states = {}
regressed_axes_history = set()

LOOP:
  1. Collect the diff for the critic:
       git diff HEAD           (in the worktree)
       git ls-files --others --exclude-standard  (untracked files)

  2. Launch a critic Agent with:
       - Ticket summary: ID, title, description, acceptance criteria (from step 2)
       - The diff collected in step 1
       - The full evaluation rubric above (axes, calibration, scoring, output format)
       - The worktree path (read-only access for context)
       - The content of .magic/design-brief.md when it exists (inlined; otherwise state that no brief
         exists, so the Design fidelity axis is N/A)
       - Instruction: "You are an independent code reviewer. You have NOT seen the implementation
         plan or any prior conversation. Evaluate the diff against the ticket requirements using
         ONLY the rubric provided. Do not modify any file."
     Parse the agent's response → score, axis_results, positive_points, attention_points

  3. IF score >= 8 → EXIT loop

  4. IF iteration >= 3 → EXIT loop (display summary with current score)

  5. Regression check (skip when iteration == 0):
     Compare axis_results to prev_axis_states.
     For each axis, detect any worsening transition:
       MET → PARTIALLY MET, MET → NOT MET, or PARTIALLY MET → NOT MET.
     For each regressed axis:
       → Flag it as a REGRESSION in the displayed summary.
       → Prepend it to attention_points so the regression is prioritized for the next fix.
       → Add the axis name to regressed_axes_history.
     Oscillation guard: if any axis already existed in regressed_axes_history before this iteration
       (i.e., the same axis regresses a second time), EXIT loop immediately with a warning:
       "Axis '<name>' has regressed twice — exiting auto-fix to avoid oscillation."

  6. Save current state: prev_axis_states = copy(axis_results)

  7. Identify the single most critical attention point using this priority:
     a. Any regressed axis (worsened since previous iteration) — regressions first
     b. Acceptance criteria gaps (a ticket requirement is functionally unmet)
     c. NOT MET axes by severity (fewest positive signals first)
     d. PARTIALLY MET axes by severity (fewest positive signals first)
     Pick the first match; ties are broken by the axis order above.

  8. Display MSG_AUTOFIX with:
     - The current score
     - The selected attention point (from step 7)
     - The user-facing iteration number: iteration + 1 (1-indexed for display; internal counter is 0-indexed)

  9. Launch a fix Agent with:
     - The worktree path
     - The list of modifiable files (only files changed during implementation)
     - When .magic/design-brief.md exists: its absolute path, read-only and never modifiable, with the
       instruction to read it before touching UI code (it is git-excluded, so it is never in the
       modifiable-files list and must be named explicitly)
     - A precise description of the selected attention point to fix
     - Instruction: "Do no harm — fix only the described issue; do not alter unrelated code or degrade any axis that currently passes"

  10. Wait for the fix agent to complete

  11. iteration += 1

  12. GOTO LOOP
```
