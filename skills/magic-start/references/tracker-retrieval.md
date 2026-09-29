# Tracker retrieval and status update

Read by `SKILL.md` Step 2A (Jira), Step 2B (GitHub) and Step 2.6: only the sections for the ticket's tracker.

## 2A: Jira fields and remote links

Pass an explicit `fields` array so design references are never dropped:

```json
["summary","description","issuetype","status","labels","components","attachment","issuelinks"]
```

`attachment` is metadata only (`filename`, `mimeType`, `content`) and is what Step 5.0 needs to spot an image attachment. Comments are **not** requested here: they are retrieved later, and only if Step 5.0 detects a UI signal (see `references/design-context.md` §2.1), so a backend ticket never pays for its comment thread.
`issuelinks` rides along with the retrieval already performed, which is what makes Jira "is blocked by" links visible to Step 2.4 — they are absent from the MCP default field set — and what makes the dependency gate free when no blocker is declared.

In parallel, also call `mcp__atlassian__getJiraIssueRemoteIssueLinks` for the same issue: a Figma file is very often attached as a remote link rather than pasted in the description. Extract `object.url` and `object.title` from each entry and keep them for Step 5.0.

## 2B.2: Identify GitHub repos

For each configured repo, get owner/repo from the remote URL:

```bash
cd {REPO_PATH} && git remote get-url origin
```

Parse `owner/repo` from either `git@github.com:owner/repo.git` or `https://github.com/owner/repo.git`.

## 2B.3: Keep the dependency summary

Keep the `issue_dependencies_summary` object this call already returns (`blocked_by`, `total_blocked_by`, `blocking`, `total_blocking`): it carries counts only, no IDs, but that is enough for Step 2.4 to short-circuit at zero cost when `blocked_by == 0`. Only a non-zero count justifies resolving the actual blocker IDs.

## 2B.5: Scan the comments for design references

A Figma link is often dropped in a follow-up comment rather than in the issue body, so Tier 2 detection in Step 5.0 needs to see one. Fetching the whole thread would put it in context on every ticket, backend included — so filter it in the shell instead, and let only the matches through:

```bash
gh issue view {number} --repo {owner}/{repo} --comments 2>/dev/null \
  | grep -ioE '(figma\.com|\.fig\b|design/|mockups?/|[a-z0-9_./-]+\.(html|css|styles\.ts))[^[:space:]]*' \
  | sort -u | head -20
```

On a ticket with no design reference this prints nothing, so it costs nothing — and empty output is the nominal backend case, not a failure. (`grep` exits 1 when it matches nothing, but the pipeline's status is `head`'s, so the command still succeeds.) If `gh` is unavailable or fails, continue with the issue body alone. The full thread is never retrieved here: `references/design-context.md` §2.1 reads it later, once a signal has actually fired.

## 2.6A: Jira ticket

1. Retrieve transitions with `mcp__atlassian__getTransitionsForJiraIssue`
2. Look for: "In Progress", "En cours", "In Development", "Started", "In Work"
3. Apply with `mcp__atlassian__transitionJiraIssue`
4. On failure: Display `MSG_TRANSITION_FAILED`

## 2.6B: GitHub issue

1. Check if a progress label exists: "in-progress", "wip", "in progress", "working"
2. If found: Add via `mcp__github__issue_write` with `method: "update"` — read the current labels first (`mcp__github__issue_read`, `method: "get_labels"`) and pass the **whole** set, because `labels` replaces the list rather than appending to it
3. If not found: Continue without modification (do not create a label)
4. On failure: Display `MSG_LABEL_FAILED`
