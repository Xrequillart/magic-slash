# Final summary placeholders

Read by `SKILL.md` Step 5.5.3, to populate every placeholder of `MSG_FINAL_SUMMARY` / `MSG_FINAL_SUMMARY_FULLSTACK` (`references/messages.md`).

**Data generated in step 5.5:**
- `{confidence_score}` — final score from the evaluation loop (5.5.2)
- `{test_steps}` — manual testing steps generated in 5.5.1
- `{positive_points}` — strengths identified during confidence evaluation (5.5.2)
- `{attention_points}` — remaining concerns after auto-fix iterations (5.5.2). When Step 2.4 ended on a blocker the user chose to start anyway, or on an unresolvable one, prepend that blocker (id, title, PR state) here: the critic never saw it, so nothing else would carry it into the summary.

**Data available from prior steps / context:**
- `{TICKET-ID}` — ticket identifier (available since step 1)
- `{modified_files}` — list files changed during implementation (`git diff --name-only HEAD` in the worktree, from step 5.4.5)
- `{created_files}` — list untracked files added during implementation (`git ls-files --others --exclude-standard` in the worktree, from step 5.4.5)
- `{summary}` — concise description of what was implemented (synthesize from the plan and actual changes)
- `{decisions}` — key implementation decisions made during planning and implementation (e.g., library choices, architectural trade-offs, deviations from the original plan)

**Fullstack-only placeholders** (for `MSG_FINAL_SUMMARY_FULLSTACK`):
- `{backend_path}`, `{frontend_path}` — worktree paths (available since step 4)
- `{backend_modified}`, `{backend_created}` — same as `{modified_files}`/`{created_files}` but scoped to the backend worktree
- `{frontend_modified}`, `{frontend_created}` — same but scoped to the frontend worktree
- `{interaction}` — summary of how the backend and frontend changes interact (e.g., new API endpoints consumed by the frontend); derive from the cross-repo interactions noted in the step 5.1 exploration and the actual changes made
