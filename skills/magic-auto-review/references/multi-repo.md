# Multi-repo reviews

> Shared, byte for byte, by `magic-auto-review` and `magic-review`. A test holds the two copies
> identical: edit one, copy it to the other.

A full-stack ticket can have one pull request per repository. This applies only when the target
was found **from a ticket ID** (never when the user named one PR by number or URL).

## 1. Find the other pull requests

For `/magic:auto-review`, from the worktrees of the ticket:

```bash
# One line per configured repository: "<name> <path>", from the config read in Step 0.
for wt in {REPO_PATH}-{TICKET_ID}; do [ -d "$wt" ] && echo "$wt"; done
```

For `/magic:review`, from GitHub: for each configured repository, `mcp__github__search_pull_requests`
with `"{TICKET_ID}" is:open repo:{owner}/{repo}`.

Keep each open pull request whose head branch or title carries the ticket ID.

## 2. Review each one

Run the review steps (context to posting) once per pull request, each from its own repository
(its worktree for `/magic:auto-review`, so its config and its `/workflow/next` answer are its
own). Build the intent sheet **once** for the ticket, then mark in each review which requirements
that repository is responsible for: a backend PR is not missing the button the frontend PR adds.

Ask the posting question once per pull request: the user may want to post on one and not on the
other.

## 3. Summarise

Display `MSG_SUMMARY_FULLSTACK`, one line per pull request with its result. For
`/magic:auto-review`, the run's single outcome is `findings` if any pull request got one, else
`clean`, else none; each repository's next step is still asked from its own worktree
(`references/workflow.md`, "Multi-repo runs").
