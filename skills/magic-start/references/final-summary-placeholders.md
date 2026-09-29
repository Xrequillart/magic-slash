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

**Next steps** (both messages):
- `{next_steps}` — the workflow's next steps, computed at the end of the run as `references/workflow.md` §4 says, from the links Step 0.1 read. The "Test the changes" bullet above it is this skill's own and always stays. Each selected link renders as one bullet, in these words:

  | Link to | en | fr |
  | --- | --- | --- |
  | `magic-commit` (single repo) | `   • Run /magic:commit to create a commit` | `   • Lance /magic:commit pour créer un commit` |
  | `magic-commit` (full-stack) | `   • Run /magic:commit in each worktree to create commits` | `   • Lance /magic:commit dans chaque worktree pour créer les commits` |
  | `magic-pr` | `   • Run /magic:pr to create a Pull Request` | `   • Lance /magic:pr pour créer une Pull Request` |
  | any other skill | `MSG_WORKFLOW_NEXT_STEP_LINE` (`references/workflow.md` §7) | same |

  A link to `magic-commit` is followed by one bullet per `suggest` link **leaving the commit node** in the graph that is unconditional or on outcome `committed` (the outcome a commit ends on when it succeeds; for the default flow, `/magic:pr`), never a commit link on another outcome: committing and opening the Pull Request are one gesture once the implementation is done, and the summary has always named both. Never list the same skill twice. With no selected link, `{next_steps}` is empty and the block keeps only the "Test the changes" bullet.
