# Canonical ticket id

Read by `SKILL.md` Step 1 and Step 2.5.2 when in doubt about which id goes where. The rule itself stays in `SKILL.md`: `$TICKET_ID` is the canonical tracker id, set in Step 1 and never rewritten.

## Why the shape is load-bearing (Step 1)

That shape is load-bearing, not cosmetic. The Desktop derives the ticket link from the id alone:
bare digits resolve against the repo's issues URL, a Jira key against Jira, and **anything else is
stored as dead text** — the sidebar shows the id with no link for the whole life of the agent, and
the "resume this task" launcher hands `/magic:continue magic-slash-268` to a skill whose Step 1
cannot parse it. The repo-prefixed form exists for **branch names only**, as `$BRANCH_ID`
(Step 4.1). Keep the two variables apart, and never send `$BRANCH_ID` to `/metadata`.

## `ticketId` on `/metadata` (Step 2.5.2)

`ticketId` carries `$TICKET_ID` in its canonical Step 1 shape and nothing else — `PROJ-123`, or
`268` for a GitHub issue. Not the branch id, not the worktree directory name: substitute
`magic-slash-268` here and the ticket loses its link in the sidebar. Sanity-check the value before
sending it — a GitHub id that is not `^\d+$` means a repo prefix leaked in, so strip it back to the
number.
